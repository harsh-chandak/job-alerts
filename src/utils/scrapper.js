// utils/scraper.js
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import { notifyDiscord } from './discordhelper';
import { scrapeGenericApiCompany } from './dynamicApiScraper';
import { sendFailureDiscordNotification } from './failure-notify';

/* -------------------- Constraints -------------------- */
const constraints = {
  include: ['intern', 'internship', 'co-op', 'software', 'developer', 'engineering', 'data', 'engineer'],
  location: ['remote', 'united states', 'usa'],
  exclude: ['senior', 'director', 'citizen', 'sr', 'manager', 'principle', 'principal', 'staff'],
};

const norm = (s) => (s || '').toString().trim();

/* Loosened location test so US on-site (e.g., “San Francisco, CA”) passes */
function matchesConstraints(title = '', location = '') {
  const text = `${title} ${location}`.toLowerCase();

  const hasInclude = constraints.include.some(w => text.includes(w));
  const hasExclude = constraints.exclude.some(w => text.includes(w));

  // Accept “remote”, “usa/us/united states”, or city, ST patterns
  const hasLocation =
    constraints.location.some(w => text.includes(w)) ||
    /\b([A-Z]{2}),?\s*(USA|US)?\b/i.test(location) ||   // e.g., "CA, USA" / "CA"
    /[A-Za-z]+,\s*[A-Z]{2}/.test(location);            // e.g., "San Francisco, CA"

  // If you want to temporarily ignore location while stabilizing, use:
  // return hasInclude && !hasExclude;

  return hasInclude && hasLocation && !hasExclude;
}

/* -------------------- Browser launcher -------------------- */
/**
 * Works both on serverless (Vercel/Lambda) and local dev.
 * - Serverless: uses @sparticuz/chromium
 * - Local: tries common Chrome paths; you can also set CHROME_PATH
 */
async function getExecutablePath() {
  // Serverless / edge environments
  try {
    const ep = await chromium.executablePath();
    if (ep) return ep;
  } catch (_) {}

  // Local dev fallbacks
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;

  const platform = process.platform;
  if (platform === 'win32') {
    return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  }
  if (platform === 'darwin') {
    return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  }
  // linux
  return '/usr/bin/google-chrome';
}

async function launchBrowser() {
  const isServerless = !!process.env.AWS_REGION || !!process.env.VERCEL;
  const executablePath = await getExecutablePath();

  return puppeteer.launch({
    args: isServerless ? chromium.args : [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
    defaultViewport: isServerless ? chromium.defaultViewport : null,
    executablePath,
    headless: isServerless ? chromium.headless : 'new',
    ignoreHTTPSErrors: true,
  });
}

/* -------------------- Page extraction -------------------- */
/**
 * Generic extractor:
 *  - grabs anchors whose href looks job-like
 *  - finds a nearby title (heading/card-title)
 *  - tries to find nearby location
 */
async function extractJobsFromPage(page) {
  return page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll('a[href]'));

    const looksLikeJobHref = (href) =>
      /job|jobs|position|careers|opening|vacancy|opportunity|posting|requisition|jobId|postingId/i.test(href);

    const pickTitleNear = (a) => {
      const txt = (a.textContent || '').trim();
      if (/\b(intern|internship|engineer|developer|data|software)\b/i.test(txt)) return txt;

      const card = a.closest('[class*="job"],[class*="card"],[class*="result"],[class*="listing"],li,article,section,div');
      if (card) {
        const h = card.querySelector('h1,h2,h3,h4,[class*="title"],[data-testid*="title"],[data-qa*="title"]');
        const t = (h?.textContent || '').trim();
        if (t) return t;
      }
      return null;
    };

    const pickLocationNear = (a) => {
      const card = a.closest('[class*="job"],[class*="card"],[class*="result"],[class*="listing"],li,article,section,div');
      if (!card) return '';
      const locEl =
        card.querySelector('[class*="location"],[data-test*="location"],[data-testid*="location"],[aria-label*="Location"]') ||
        card.querySelector('.text-sm,.meta,small,[class*="meta"]');
      return (locEl?.textContent || '').trim();
    };

    const results = [];
    for (const a of anchors) {
      const href = a.getAttribute('href') || '';
      if (!looksLikeJobHref(href)) continue;

      const title = pickTitleNear(a);
      if (!title) continue;

      const abs = new URL(href, location.href).toString();
      const id = abs.split(/[/?#]/).filter(Boolean).pop() || abs;

      results.push({
        title,
        url: abs,
        id,
        location: pickLocationNear(a) || '',
      });
    }
    return results;
  });
}

/* -------------------- Main entry -------------------- */
export async function scrapeAndNotify(req, db, user) {
  const companies = await db.collection('companies').find().toArray();
  const allNewJobs = [];

  let browser;
  try {
    browser = await launchBrowser();
  } catch (err) {
    await sendFailureDiscordNotification(err, 'Failed to launch Chromium/Chrome');
    throw err;
  }

  const page = await browser.newPage();

  // Helpful UA for some sites (optional)
  try {
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
  } catch {}

  for (const company of companies) {
    try {
      // 1) Custom API path (unchanged)
      if (company.customApi) {
        const apiJobs = await scrapeGenericApiCompany(company, db, constraints, user);
        for (const job of apiJobs) {
          allNewJobs.push(job);
          await db.collection('sentJobs').insertOne({
            id: String(job.id),
            ts: new Date(),
            company: job.company,
            title: job.title,
            location: norm(job.location) || undefined,
          });
        }
        continue;
      }

      // 2) HTML scrape path (generic)
      await page.goto(company.careersUrl, { waitUntil: 'networkidle2', timeout: 45000 });

      const rawJobs = await extractJobsFromPage(page);

      for (const job of rawJobs) {
        const title = norm(job.title);
        const location = norm(job.location);

        // Apply constraints AFTER extraction
        if (!matchesConstraints(title, location)) continue;

        const id = String(job.id || job.url || `${company.name}:${title}`);
        const exists = await db.collection('sentJobs').findOne({ id, company: company.name, title });

        if (!exists) {
          const toPush = { ...job, id, company: company.name, career_page: company.careersUrl };
          allNewJobs.push(toPush);

          await db.collection('sentJobs').insertOne({
            id,
            ts: new Date(),
            company: company.name,
            title,
            location: location || undefined,
          });
        }
      }
    } catch (err) {
      console.error(`Failed to scrape ${company.name}:`, err?.message || err);
      await sendFailureDiscordNotification(err, `Error scraping ${company.name} for ${user.name}`);
    }
  }

  try { await browser.close(); } catch {}

  if (allNewJobs.length) {
    await notifyDiscord(allNewJobs.reverse(), user);
  }
}
