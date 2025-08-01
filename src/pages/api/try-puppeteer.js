// /pages/api/try-puppeteer.js
import puppeteer from 'puppeteer';

export default async function handler(req, res) {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ success: false, error: 'Missing URL' });
  }

  try {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Get visible text
    const pageText = await page.evaluate(() => document.body.innerText);

    // Get raw HTML content (optional)
    // const pageHTML = await page.content();

    await browser.close();

    return res.status(200).json({
      success: true,
      message: 'Scraping complete',
      content: pageText.slice(0, 5000), // limit to avoid overload
    });
  } catch (err) {
    console.error('[Puppeteer Error]', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to scrape page',
    });
  }
}
