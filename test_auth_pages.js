const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOT_DIR = 'C:\\Users\\Asus\\.gemini\\antigravity\\brain\\1862edab-27f3-4410-a3cd-61034c63217f\\screenshots';

async function run() {
  console.log('Launching browser with Chrome...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1200,900'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 900 });

    // Listen to console logs and errors
    page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', (err) => console.error('PAGE ERROR:', err.message));

    // 1. Visit /login
    console.log('1. Testing /login...');
    await page.goto('http://localhost:5174/login', { waitUntil: 'networkidle2' });
    await page.waitForSelector('#login-identifier');

    // Screenshot Login Dark Mode
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '1-login.png'), fullPage: false });
    console.log('Saved 1-login.png');

    // 2. Visit /accounts/password/reset
    console.log('2. Testing /accounts/password/reset...');
    await page.goto('http://localhost:5174/accounts/password/reset', { waitUntil: 'networkidle2' });
    await page.waitForSelector('#forgot-identifier');

    // Open help modal
    await page.click('.cant-reset-link');
    await page.waitForSelector('.modal-card');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '2-forgot-password-help.png') });
    console.log('Saved 2-forgot-password-help.png');

    // Close help modal
    await page.click('.modal-header .icon-btn');
    await new Promise((r) => setTimeout(r, 400));

    // Type identifier and continue
    await page.type('#forgot-identifier', 'alex_tester');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '2-forgot-password.png') });
    console.log('Saved 2-forgot-password.png');

    // 3. Visit /accounts/emailsignup
    console.log('3. Testing /accounts/emailsignup...');
    await page.goto('http://localhost:5174/accounts/emailsignup', { waitUntil: 'networkidle2' });
    await page.waitForSelector('#signup-email');

    // Fill Email and Password
    await page.type('#signup-email', 'testuser_eng@example.com');
    await page.type('#signup-password', 'SecretPass123!');

    // Screenshot top of signup
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '3-signup-top.png') });
    console.log('Saved 3-signup-top.png');

    // Click birthday question help icon
    await page.click('.birthday-help-btn');
    await page.waitForSelector('.modal-card');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '3-signup-birthday-help.png') });
    await page.click('.modal-header .icon-btn');
    await new Promise((r) => setTimeout(r, 400));

    // Fill Name and Username (with live debounced check)
    await page.type('#signup-fullname', 'Alex Testing');
    const uniqueUser = 'alex_' + Math.floor(Math.random() * 100000);
    await page.type('#signup-username', uniqueUser);

    // Wait for debounced availability check
    await new Promise((r) => setTimeout(r, 800));

    // Screenshot bottom of signup
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '4-signup-bottom.png') });
    console.log('Saved 4-signup-bottom.png');

    console.log('All auth screenshots captured successfully!');
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});

