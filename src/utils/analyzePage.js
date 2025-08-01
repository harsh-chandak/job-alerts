// /utils/analyzePage.js
import puppeteer from 'puppeteer';

export async function analyzeCareersPage(url) {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  const apiRequests = [];

  page.on('request', (req) => {
    const url = req.url();
    if (req.resourceType() === 'xhr' || req.resourceType() === 'fetch') {
      apiRequests.push(url);
    }
  });

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    await new Promise((res) => setTimeout(res, 5000)); // let dynamic content load

    const content = await page.content();
    const jobLikeText = content.match(/Software Engineer|Intern|Job ID|Requisition/i);

    await browser.close();

    return {
      apiFound: apiRequests.length > 0,
      apiUrls: apiRequests,
      containsJobText: Boolean(jobLikeText),
    };
  } catch (err) {
    await browser.close();
    return {
      error: 'Failed to load page or timed out',
      apiFound: false,
      containsJobText: false,
      apiUrls: [],
    };
  }
}
