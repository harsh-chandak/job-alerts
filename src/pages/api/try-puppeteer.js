// /pages/api/try-puppeteer.js
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import { sendFailureDiscordNotification } from '@/utils/failure-notify';

export default async function handler(req, res) {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ success: false, error: 'Missing URL' });
  }

  try {
    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });
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
    await sendFailureDiscordNotification(err, `Try-puppeteer API failed.`)
    console.error('[Puppeteer Error]', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to scrape page',
    });
  }
}
