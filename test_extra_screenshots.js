const puppeteer = require('puppeteer-core');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOT_DIR = 'C:\\Users\\Asus\\.gemini\\antigravity\\brain\\1862edab-27f3-4410-a3cd-61034c63217f\\screenshots';

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1200,900'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 900 });

    // 1. Login page in Light Mode
    await page.goto('http://localhost:5174/login', { waitUntil: 'networkidle2' });
    await page.evaluate(() => {
      document.documentElement.dataset.theme = 'light';
    });
    await new Promise((r) => setTimeout(r, 400));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '1-login-light.png') });
    console.log('Saved 1-login-light.png');

    // 2. Notifications page
    // First log in as an existing user
    await page.type('#login-identifier', 'alex_tester');
    // Let's create session via localStorage and refresh or login
    // Let's visit notifications while empty or after login
  } finally {
    await browser.close();
  }
}

run().catch((e) => console.error(e));

