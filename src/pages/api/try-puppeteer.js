// /pages/api/try-puppeteer.js
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import chromium from '@sparticuz/chromium';
import { sendFailureDiscordNotification } from '@/utils/failure-notify';

const stealth = StealthPlugin();
stealth.enabledEvasions.delete('chrome.app');
stealth.enabledEvasions.delete('chrome.csi'); // Optional, sometimes breaks too

puppeteer.use(stealth);

// Heuristic: running in a serverless environment?
const isServerless =
  !!process.env.AWS_EXECUTION_ENV ||
  !!process.env.AWS_REGION ||
  !!process.env.VERCEL ||
  !!process.env.NETLIFY;

// Try to resolve a local Chrome/Chromium path on dev machines
const resolveLocalChrome = async () => {
  // 1) honor explicit env override
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  // 2) try puppeteer’s bundled Chromium (only if 'puppeteer' is installed)
  try {
    const p = await import('puppeteer'); // NOT puppeteer-core
    const pExe = p.executablePath();
    if (pExe && fs.existsSync(pExe)) return pExe;
  } catch (_) {
    // ignore — ‘puppeteer’ not installed
  }

  // 3) common OS-specific paths (best-effort)
  const candidates = process.platform === 'win32'
    ? [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
        'C:\\Program Files\\Chromium\\Application\\chrome.exe',
      ]
    : process.platform === 'darwin'
    ? [
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Chromium.app/Contents/MacOS/Chromium',
      ]
    : [
        '/usr/bin/google-chrome',
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
        '/snap/bin/chromium',
      ];

  for (const p of candidates) {
    if (p && fs.existsSync(p)) return p;
  }
  return null; // let launcher throw if nothing found
};

export default async function handler(req, res) {
  const { url } = req.body || {};
  if (!url) return res.status(400).json({ success: false, error: 'Missing URL' });

  try {
    const executablePath = isServerless
      ? await chromium.executablePath()       // Lambda/Vercel: headless chromium
      : await resolveLocalChrome();           // Local dev: system/bundled Chrome

    const launchArgs = isServerless
      ? chromium.args
      : ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'];

    const browser = await puppeteer.launch({
      args: launchArgs,
      defaultViewport: isServerless ? chromium.defaultViewport : null,
      executablePath,
      headless: isServerless ? chromium.headless : 'new', // modern headless on desktop
      ignoreHTTPSErrors: true,
    });

    const page = await browser.newPage();

    // Basic antibot hardening
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    );
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Upgrade-Insecure-Requests': '1',
    });
    await page.setJavaScriptEnabled(true);
    await page.emulateTimezone('America/Los_Angeles');

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    const pageText = await page.evaluate(() => document.body?.innerText || '');
    await browser.close();

    return res.status(200).json({
      success: true,
      message: 'Scraping complete',
      content: pageText.slice(0, 5000),
    });
  } catch (err) {
    console.error('try-puppeteer error:', err);
    await sendFailureDiscordNotification(err, 'Try-puppeteer API failed.');
    return res.status(500).json({ success: false, error: 'Failed to scrape page' });
  }
}
