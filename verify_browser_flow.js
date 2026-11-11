const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOT_DIR = 'C:\\Users\\Asus\\.gemini\\antigravity\\brain\\1862edab-27f3-4410-a3cd-61034c63217f\\screenshots';

async function run() {
  console.log('Launching browser with Chrome for end-to-end verification...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1200,900'],
  });

  const errors = [];
  const http500s = [];

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 900 });

    page.on('console', (msg) => {
      const type = msg.type();
      const text = msg.text();
      console.log(`[BROWSER ${type.toUpperCase()}]:`, text);
      // Filter out expected 401 unauthenticated probe on initial load
      if (type === 'error' && !text.includes('401 (Unauthorized)')) {
        errors.push(text);
      }
    });

    page.on('response', (res) => {
      const status = res.status();
      const url = res.url();
      if (status >= 500) {
        console.error(`[HTTP ${status}]:`, url);
        http500s.push({ status, url });
      } else if (url.includes('/api/')) {
        console.log(`[API ${status}]:`, url.split('?')[0]);
      }
    });

    const rand = Math.floor(Math.random() * 100000);
    const testUsername = `user_${rand}`;
    const testEmail = `user_${rand}@instatest.com`;
    const testPassword = 'Password123!';
    const newPassword = 'NewSecretPass123!';

    // ==========================================
    // 1. SIGNUP WITH NEW EMAIL
    // ==========================================
    console.log(`\n=== 1. SIGNUP: ${testUsername} (${testEmail}) ===`);
    await page.goto('http://localhost:5173/accounts/emailsignup', { waitUntil: 'networkidle2' });
    await page.waitForSelector('input[type="email"]');

    await page.type('input[type="email"]', testEmail);
    await page.type('input[type="password"]', testPassword);

    // Select Month, Day, Year
    const selects = await page.$$('select');
    if (selects.length >= 3) {
      await selects[0].select('5'); // May
      await selects[1].select('15'); // 15
      await selects[2].select('2000'); // 2000
    }

    // Name and Username
    const textInputs = await page.$$('input[type="text"]');
    if (textInputs.length >= 2) {
      await textInputs[0].type('Alex Automation');
      await textInputs[1].type(testUsername);
    }

    // Wait for debounced live username check
    await new Promise((r) => setTimeout(r, 600));

    // Submit form
    console.log('Submitting signup form...');
    const submitBtn = await page.$('form button.btn-blue');
    await submitBtn.click();

    // ==========================================
    // 2. ENTER CONFIRMATION CODE FROM YELLOW DEVBOX
    // ==========================================
    console.log('\n=== 2. ENTER CONFIRMATION CODE ===');
    await page.waitForSelector('.devbox', { timeout: 10000 });
    console.log('Yellow Development mode box is visible!');

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'step1-confirm-code-devbox.png') });
    console.log('Saved step1-confirm-code-devbox.png');

    // Extract code from .devbox .mono
    const code = await page.$eval('.devbox .mono', (el) => el.textContent.trim());
    console.log('Extracted confirmation code from yellow box:', code);

    // Type the 6-digit confirmation code into the code input
    const codeInput = await page.$('.code-input input, input[inputmode="numeric"]');
    await codeInput.type(code);

    // Click Next
    console.log('Submitting confirmation code...');
    const nextBtn = await page.$('button.btn-blue');
    await nextBtn.click();

    // ==========================================
    // 3. VERIFY REDIRECT TO FEED
    // ==========================================
    console.log('\n=== 3. VERIFY REDIRECT TO HOME FEED ===');
    await page.waitForSelector('.nav', { timeout: 10000 });
    console.log('Successfully reached Feed! Navigation bar is active.');

    await new Promise((r) => setTimeout(r, 800));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'step2-feed-after-signup.png') });
    console.log('Saved step2-feed-after-signup.png');

    // ==========================================
    // 4. LOG OUT
    // ==========================================
    console.log('\n=== 4. LOG OUT ===');
    const logoutBtn = await page.$('button.nav-item:last-child');
    await logoutBtn.click();

    await page.waitForSelector('input[autoComplete="username"]');
    console.log('Logged out. On login page.');

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'step3-logged-out.png') });
    console.log('Saved step3-logged-out.png');

    // ==========================================
    // 5. LOG IN WITH ORIGINAL PASSWORD
    // ==========================================
    console.log('\n=== 5. LOG IN WITH ORIGINAL PASSWORD ===');
    await page.type('input[autoComplete="username"]', testUsername);
    await page.type('input[type="password"]', testPassword);
    await page.click('button.btn-blue');

    await page.waitForSelector('.nav', { timeout: 10000 });
    console.log('Successfully logged in! Feed reached again.');

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'step4-logged-in-again.png') });
    console.log('Saved step4-logged-in-again.png');

    // ==========================================
    // 6. FORGOT PASSWORD FLOW
    // ==========================================
    console.log('\n=== 6. FORGOT PASSWORD FLOW ===');
    // Log out first
    const logoutBtn2 = await page.$('button.nav-item:last-child');
    await logoutBtn2.click();
    await page.waitForSelector('input[autoComplete="username"]');

    // Click "Forgot password?"
    console.log('Navigating to Forgot Password page...');
    await page.click('a[href="/accounts/password/reset"]');
    await page.waitForSelector('input[autoComplete="username"]');

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'step5-forgot-password-page.png') });
    console.log('Saved step5-forgot-password-page.png');

    // Enter email and continue
    await page.type('input[autoComplete="username"]', testEmail);
    await page.click('button.btn-blue');

    // Wait for "Check your email" screen with devbox
    await page.waitForSelector('.devbox', { timeout: 10000 });
    console.log('Check your email screen reached with yellow Development mode box!');

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'step6-forgot-done-devbox.png') });
    console.log('Saved step6-forgot-done-devbox.png');

    // Click the reset link inside the yellow devbox
    const resetLinkHref = await page.$eval('.devbox a', (el) => el.href);
    console.log('Opening reset link from devbox:', resetLinkHref);
    await page.goto(resetLinkHref, { waitUntil: 'networkidle2' });

    // ==========================================
    // 7. CREATE NEW PASSWORD
    // ==========================================
    console.log('\n=== 7. RESET PASSWORD CONFIRM ===');
    await page.waitForSelector('input[autoComplete="new-password"]');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'step7-reset-password-page.png') });
    console.log('Saved step7-reset-password-page.png');

    const passInputs = await page.$$('input[type="password"]');
    await passInputs[0].type(newPassword);
    await passInputs[1].type(newPassword);

    await page.click('button.btn-blue');

    // Wait for redirect to /login with notice
    await page.waitForSelector('.notice', { timeout: 10000 });
    const noticeText = await page.$eval('.notice', (el) => el.textContent.trim());
    console.log('Password reset successful! Notice banner:', noticeText);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'step8-login-after-reset.png') });
    console.log('Saved step8-login-after-reset.png');

    // ==========================================
    // 8. LOG IN WITH NEW PASSWORD
    // ==========================================
    console.log('\n=== 8. LOG IN WITH NEW PASSWORD ===');
    await page.type('input[autoComplete="username"]', testUsername);
    await page.type('input[type="password"]', newPassword);
    await page.click('button.btn-blue');

    await page.waitForSelector('.nav', { timeout: 10000 });
    console.log('Successfully logged in with new password! On Feed page.');

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'step9-feed-after-reset-login.png') });
    console.log('Saved step9-feed-after-reset-login.png');

    console.log('\n======================================================');
    console.log('VERIFICATION RESULTS:');
    console.log(`HTTP 500 Errors: ${http500s.length}`);
    console.log(`Browser Errors:  ${errors.length}`);
    console.log('======================================================');

    if (http500s.length > 0) {
      throw new Error(`Found ${http500s.length} HTTP 500 errors!`);
    }
    if (errors.length > 0) {
      throw new Error(`Found ${errors.length} browser console errors!`);
    }

    console.log('ALL TESTS PASSED WITH ZERO 500s AND ZERO RED CONSOLE ERRORS!');
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('\nTest failed with error:', err.message);
  process.exit(1);
});
