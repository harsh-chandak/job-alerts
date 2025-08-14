import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import chromium from '@sparticuz/chromium';
import { notifyDiscord } from './discordhelper';
import { scrapeGenericApiCompany } from './dynamicApiScraper';
import { sendFailureDiscordNotification } from './failure-notify';

const stealth = StealthPlugin();
stealth.enabledEvasions.delete('chrome.app');
stealth.enabledEvasions.delete('chrome.csi'); // Optional, sometimes breaks too

puppeteer.use(stealth);


const constraints = {
  include: ['intern', 'internship', 'co-op', 'software', 'developer', 'engineering', 'data', 'engineer'],
  location: ['remote', 'united states', 'usa'],
  exclude: ['senior', 'director', 'citizen', 'sr', 'manager', 'principle', 'staff'],
};

function norm(s) {
  return (s || '').toString().trim();
}
function matchesConstraints(title = '', location = '') {
  const text = `${title} ${location}`.toLowerCase();
  const hasInclude = constraints.include.some(word => text.includes(word));
  const hasLocation = constraints.location.some(word => text.includes(word));
  const hasExclude = constraints.exclude.some(word => text.includes(word));
  return hasInclude && hasLocation && !hasExclude;
}

export async function scrapeAndNotify(req, db, user) {
  const companies = await db.collection("companies").find().toArray();

  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
    ignoreHTTPSErrors: true,
  });
  const page = await browser.newPage();
  const allNewJobs = [];

  for (const company of companies) {
    try {
      if (company.customApi) {
        const apiJobs = await scrapeGenericApiCompany(company, db, constraints, user);
        for (const job of apiJobs) {
          allNewJobs.push(job);
          await db.collection("sentJobs").insertOne({ id: String(job.id), ts: new Date(), company: job.company, title: job.title });
        }
        continue;
      }

      await page.goto(company.careersUrl, { waitUntil: 'networkidle2' });
      const jobs = await page.evaluate(() => {
        const anchors = Array.from(document.querySelectorAll('article.markdown-body a[href^="http"]'));
        return anchors
          .filter(a => a.href && a.innerText.trim())
          .map(a => {
            const url = a.href;
            return {
              title: a.innerText.trim(),
              url,
              id: url.split('/').slice(-1)[0] || url,  // fallback to full url
            };
          })
      });
      for (const job of jobs) {
        const title = norm(job.title);
        const location = norm(job.location);
        // 🔒 filter by constraints before doing any DB work
        if (!matchesConstraints(title, location)) continue;
        const id = String(job.id || job.url || `${company.name}:${title}`);
        const exists = await db.collection("sentJobs").findOne({ id, company: company.name, title });
        if (!exists) {
          const toPush = { ...job, id, company: company.name, career_page: company.careersUrl };
          allNewJobs.push(toPush);
          await db.collection("sentJobs").insertOne({
            id,
            ts: new Date(),
            company: company.name,
            title,
            location: location || undefined,
          });
        }
      }
    } catch (err) {
      console.error(err)
      console.error(`Failed to scrape ${company.name}:`, err.message);
      await sendFailureDiscordNotification(err, `Error in scrapping ${company.name} job data for ${user.name} user.`)
    }
  }

  await browser.close();

  if (allNewJobs.length) {
    await notifyDiscord(allNewJobs.reverse(), user);
  }
}
