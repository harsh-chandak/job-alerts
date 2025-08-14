// utils/scraper.js (or wherever this lives)
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import { notifyDiscord } from './discordhelper';
import { scrapeGenericApiCompany } from './dynamicApiScraper';
import { sendFailureDiscordNotification } from './failure-notify';

const constraints = {
  include: ['intern', 'internship', 'co-op', 'software', 'developer', 'engineering', 'data', 'engineer'],
  // dropped hard location requirement for broader catch; filter below by include/exclude only
  exclude: ['senior', 'director', 'citizen', 'sr', 'manager', 'principal', 'staff'],
};

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function norm(s) {
  return (s || '').toString().trim();
}

function matchesConstraints(title = '', location = '') {
  const text = `${title} ${location}`.toLowerCase();
  const hasInclude = constraints.include.some(word => text.includes(word));
  const hasExclude = constraints.exclude.some(word => text.includes(word));
  return hasInclude && !hasExclude;
}

// Heuristics to pull jobs out of various API responses
function tryParseJobsFromJSON(json) {
  const results = [];

  const visit = (node) => {
    if (!node) return;
    if (Array.isArray(node)) {
      for (const item of node) visit(item);
      return;
    }
    if (typeof node === 'object') {
      // Common shapes: {title, url|applyUrl|link, id|jobId|reqId, location|locations}
      const title = node.title || node.jobTitle || node.positionTitle;
      const url = node.url || node.applyUrl || node.jobUrl || node.link;
      const id = node.id || node.jobId || node.reqId || node.requisitionId;
      const location =
        node.location ||
        node.jobLocation ||
        (Array.isArray(node.locations) ? node.locations.join(', ') : node.locations);

      if (title && (url || id)) {
        results.push({
          title: String(title),
          url: url ? String(url) : undefined,
          id: String(id ?? url),
          location: location ? String(location) : '',
        });
      }

      for (const k of Object.keys(node)) visit(node[k]);
    }
  };

  try { visit(json); } catch (_) { /* ignore */ }
  // Dedup by (id or url + title)
  const seen = new Set();
  return results.filter(j => {
    const key = (j.id || j.url || '') + '::' + j.title;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function tryParseJobsFromAjaxHTML(html) {
  // Very loose: grab anchors that look like job links/titles
  // This is intentionally simple to avoid adding cheerio/JSDOM.
  const out = [];
  const re = /<a[^>]+href="([^"]+)"[^>]*>(.*?)<\/a>/gis;
  let m;
  while ((m = re.exec(html))) {
    const href = m[1];
    const text = m[2].replace(/<[^>]+>/g, '').trim();
    if (!href || !text) continue;

    // Heuristic: likely job-ish if text has one of the include words
    const lower = text.toLowerCase();
    const looksLikeJob = constraints.include.some(w => lower.includes(w));
    if (!looksLikeJob) continue;

    const id = href.split(/[/?#]/).filter(Boolean).slice(-1)[0] || href;
    out.push({ title: text, url: href, id, location: '' });
  }

  // Dedup
  const seen = new Set();
  return out.filter(j => {
    const key = (j.id || j.url || '') + '::' + j.title;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function scrapeAndNotify(req, db, user) {
  const companies = await db.collection('companies').find().toArray();

  const browser = await puppeteer.launch({
    args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
    ignoreHTTPSErrors: true,
  });

  const page = await browser.newPage();

  // Spoof a real browser & reduce bot friction
  await page.setUserAgent(UA);
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'en-US,en;q=0.9',
    'Upgrade-Insecure-Requests': '1',
  });

  const allNewJobs = [];

  for (const company of companies) {
    try {
      // 1) If company has a Custom API config, use that path (fast + robust)
      if (company.customApi) {
        const apiJobs = await scrapeGenericApiCompany(company, db, constraints, user);
        for (const job of apiJobs) {
          // filter again just in case
          if (!matchesConstraints(job.title, job.location)) continue;
          const dedupId = String(job.id || job.url || `${company.name}:${job.title}`);
          const exists = await db.collection('sentJobs').findOne({
            id: dedupId,
            company: job.company,
            title: job.title,
          });
          if (!exists) {
            allNewJobs.push(job);
            await db.collection('sentJobs').insertOne({
              id: dedupId,
              ts: new Date(),
              company: job.company,
              title: job.title,
              location: job.location || undefined,
            });
          }
        }
        continue;
      }

      // 2) Generic careers page: capture XHR/Fetch responses while page loads
      const captured = [];
      const listener = async (response) => {
        try {
          const url = response.url();
          const ct = (response.headers()['content-type'] || '').toLowerCase();

          // Heuristics: endpoints that often serve jobs
          const looksLikeJobs =
            /job|careers|posting|search|position|api|graphql|requisition|opening|vacancy|ajax/i.test(url);

          if (!looksLikeJobs) return;

          let text;
          try {
            text = await response.text(); // works for JSON & HTML
          } catch {
            return;
          }

          if (!text) return;

          // JSON first
          if (ct.includes('application/json') || text.trim().startsWith('{') || text.trim().startsWith('[')) {
            try {
              const json = JSON.parse(text);
              captured.push(...tryParseJobsFromJSON(json));
              return;
            } catch {
              // fall through
            }
          }

          // Some endpoints return HTML snippets (DoorDash-like ajax)
          if (ct.includes('text/html') || /ajax=1/i.test(url)) {
            captured.push(...tryParseJobsFromAjaxHTML(text));
          }
        } catch {
          // ignore parse errors per-response
        }
      };

      page.on('response', listener);

      await page.goto(company.careersUrl, { waitUntil: 'networkidle2', timeout: 45000 });

      // Give any lazy XHR some time (small buffer)
      await page.waitForTimeout(1500);

      // 3) Try DOM if jobs are rendered client-side in the page
      const domJobs = await page.evaluate(() => {
        const out = [];

        // Common job card patterns (broad but safe)
        const candidates = [
          ...document.querySelectorAll('a[href*="job"], a[href*="careers"], a[href*="posting"], a[href*="position"]'),
          ...document.querySelectorAll('[data-automation*="job"] a, [data-qa*="job"] a, [data-test*="job"] a'),
        ];

        const seen = new Set();
        for (const a of candidates) {
          const href = a.getAttribute('href') || '';
          const title = (a.textContent || '').trim();
          if (!href || !title) continue;
          const key = href + '::' + title;
          if (seen.has(key)) continue;
          seen.add(key);

          let abs = href;
          try {
            abs = new URL(href, location.href).href;
          } catch (_) { /* ignore */ }

          const id = abs.split(/[/?#]/).filter(Boolean).slice(-1)[0] || abs;
          out.push({ title, url: abs, id, location: '' });
        }

        return out;
      });

      page.off('response', listener); // stop capturing for this company

      // Merge sources: network-captured first (usually richer), then DOM
      const merged = [];
      const mark = new Set();
      for (const arr of [captured, domJobs]) {
        for (const j of arr) {
          const key = (j.id || j.url || '') + '::' + j.title;
          if (mark.has(key)) continue;
          mark.add(key);
          merged.push(j);
        }
      }

      // 4) Persist new jobs (with constraints)
      for (const job of merged) {
        const title = norm(job.title);
        const location = norm(job.location);
        if (!matchesConstraints(title, location)) continue;

        const id = String(job.id || job.url || `${company.name}:${title}`);
        const exists = await db.collection('sentJobs').findOne({
          id,
          company: company.name,
          title,
        });

        if (!exists) {
          const toPush = {
            ...job,
            id,
            company: company.name,
            career_page: company.careersUrl,
          };
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
      await sendFailureDiscordNotification(err, `Error scraping ${company.name} for ${user.name}.`);
    }
  }

  await browser.close();

  if (allNewJobs.length) {
    await notifyDiscord(allNewJobs.reverse(), user);
  }
}
