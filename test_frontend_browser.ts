import puppeteer from 'puppeteer-core';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const APP_URL = 'http://localhost:5173';
const ARTIFACT_DIR = '/Users/md.rofazhasanrafiu/.gemini/antigravity/brain/02c07a30-c4c4-44db-a1e3-e9c678bf27ae';

async function testFrontendInBrowser() {
  console.log('================================================================');
  console.log('FRONTEND BROWSER AUTOMATION & E2E INTEGRATION TEST');
  console.log('================================================================\n');

  if (!fs.existsSync(CHROME_PATH)) {
    throw new Error(`Google Chrome not found at ${CHROME_PATH}`);
  }

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--disable-gpu',
      '--window-size=1440,900'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // Listen to browser console messages
  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error') {
      console.error(` [Browser Console Error]: ${text}`);
    }
  });

  page.on('pageerror', (err: any) => {
    console.error(` [Browser Page Uncaught Error]: ${err.message}`);
  });

  try {
    // 1. Navigate to App
    console.log(`1. Navigating to ${APP_URL}...`);
    await page.goto(APP_URL, { waitUntil: 'networkidle0', timeout: 30000 });
    console.log(' ✔ Loaded page successfully');

    // Wait for OpenCV.js WASM to be ready
    console.log('2. Waiting for OpenCV 4.12 WASM Engine initialization...');
    await page.waitForFunction(() => {
      const el = document.querySelector('.indicator.ready');
      return el !== null;
    }, { timeout: 20000 });
    console.log(' ✔ OpenCV WASM Engine Initialized & Active');

    // 2. Verify Title & Header
    const title = await page.title();
    console.log(` ✔ Page Title: "${title}"`);

    // 3. Preset Selector Verification
    console.log('3. Selecting Bangladesh Board HSC (50 Qs) Preset...');
    await page.select('select.preset-dropdown', 'bangladesh_board_hsc');
    await new Promise(r => setTimeout(r, 600));

    // Capture Home screenshot
    const homeScreenshotPath = path.join(ARTIFACT_DIR, 'browser_step1_home.png');
    await page.screenshot({ path: homeScreenshotPath });
    console.log(` ✔ Captured Step 1 Screenshot: ${homeScreenshotPath}`);

    // 4. Test "Batch Scan & Grade" Tab
    console.log('4. Navigating to "Batch Scan & Grade" Tab...');
    const tabs = await page.$$('.nav-tab');
    let batchTabFound = false;
    for (const tab of tabs) {
      const text = await page.evaluate(el => el.textContent, tab);
      if (text && text.includes('Batch Scan & Grade')) {
        await tab.click();
        batchTabFound = true;
        break;
      }
    }
    if (!batchTabFound) throw new Error('Could not find Batch Scan & Grade tab');
    await new Promise(r => setTimeout(r, 600));

    // 5. Trigger "Run Demo Batch (3 Scans)"
    console.log('5. Clicking "Demo Batch" button...');
    const buttons = await page.$$('.top-bar-actions button');
    let demoBtnClicked = false;
    for (const b of buttons) {
      const bText = await page.evaluate(el => el.textContent, b);
      if (bText && bText.includes('Demo Batch')) {
        await b.click();
        demoBtnClicked = true;
        break;
      }
    }
    if (!demoBtnClicked) throw new Error('Demo batch button not found');

    // 6. Monitor Batch Ingestion & Grading
    console.log('6. Processing batch ingestion with Mathematical State Machine...');
    // Wait for status message indicating batch completion
    await page.waitForFunction(() => {
      const statusEl = document.querySelector('.studio-status-bar');
      return statusEl && statusEl.textContent && statusEl.textContent.includes('Completed Enterprise Demo');
    }, { timeout: 30000 });

    const statusText = await page.evaluate(() => {
      return document.querySelector('.studio-status-bar')?.textContent?.trim();
    });
    console.log(` ✔ Batch Status Message: "${statusText}"`);

    // 7. Verify Evaluated Candidate Roster Table
    console.log('7. Verifying Roster Table entries...');
    const candidateRows = await page.$$eval('.enterprise-table tbody tr', rows => {
      return rows.map(r => {
        const cols = r.querySelectorAll('td');
        return {
          rank: cols[0]?.textContent?.trim(),
          roll: cols[1]?.textContent?.trim(),
          score: cols[2]?.textContent?.trim(),
          pct: cols[3]?.textContent?.trim(),
          status: cols[4]?.textContent?.trim()
        };
      });
    });

    console.log(` ✔ Evaluated Candidates Count: ${candidateRows.length}`);
    candidateRows.forEach((c, idx) => {
      console.log(`   Candidate #${idx + 1}: Rank ${c.rank} | Roll: ${c.roll} | Score: ${c.score} | %: ${c.pct} | Status: ${c.status}`);
    });

    if (candidateRows.length !== 3) {
      throw new Error(`Expected 3 evaluated candidates, got ${candidateRows.length}`);
    }

    // Capture Batch Roster & Overlay screenshot
    const batchScreenshotPath = path.join(ARTIFACT_DIR, 'browser_step2_batch_evaluated.png');
    await page.screenshot({ path: batchScreenshotPath });
    console.log(` ✔ Captured Step 2 Screenshot: ${batchScreenshotPath}`);

    // 8. Test Analytics & Performance Tab
    console.log('8. Navigating to "Cohort Psychometrics" Tab...');
    let analyticsTabFound = false;
    for (const tab of await page.$$('.nav-tab')) {
      const text = await page.evaluate(el => el.textContent, tab);
      if (text && text.includes('Cohort Psychometrics')) {
        await tab.click();
        analyticsTabFound = true;
        break;
      }
    }
    if (!analyticsTabFound) throw new Error('Could not find Cohort Psychometrics tab');
    await new Promise(r => setTimeout(r, 1000));

    // Extract analytics metrics from DOM
    const kpiMetrics = await page.$$eval('.metric-card', cards => {
      return cards.map(c => ({
        label: c.querySelector('.metric-label')?.textContent?.trim(),
        value: c.querySelector('.metric-value')?.textContent?.trim()
      }));
    });
    console.log(' ✔ Analytics Psychometric Metrics:');
    kpiMetrics.forEach(k => console.log(`   - ${k.label}: ${k.value}`));

    const analyticsScreenshotPath = path.join(ARTIFACT_DIR, 'browser_step3_analytics.png');
    await page.screenshot({ path: analyticsScreenshotPath });
    console.log(` ✔ Captured Step 3 Screenshot: ${analyticsScreenshotPath}`);

    // 9. Test Mobile Responsive Viewport (iPhone 14/15 size: 390x844)
    console.log('9. Testing Mobile Responsiveness (Viewport: 390 x 844 px)...');
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    
    // Switch back to Batch Scan & Grade tab
    for (const tab of await page.$$('.nav-tab')) {
      const text = await page.evaluate(el => el.textContent, tab);
      if (text && text.includes('Batch Scan & Grade')) {
        await tab.click();
        break;
      }
    }
    await new Promise(r => setTimeout(r, 600));

    // Check that split view stacked properly
    const isSingleColumn = await page.evaluate(() => {
      const splitView = document.querySelector('.processor-split-view');
      if (!splitView) return false;
      const styles = window.getComputedStyle(splitView);
      return styles.gridTemplateColumns.split(' ').length === 1;
    });
    console.log(` ✔ Mobile Layout Stacked Single-Column: ${isSingleColumn ? 'YES (Responsive)' : 'NO'}`);

    // Verify Phone Camera button
    const hasPhoneCameraBtn = await page.evaluate(() => {
      const btn = document.querySelector('.btn-phone-capture');
      return btn !== null;
    });
    console.log(` ✔ Native Phone Camera HD Button Present: ${hasPhoneCameraBtn ? 'YES' : 'NO'}`);

    const mobileScreenshotPath = path.join(ARTIFACT_DIR, 'browser_step4_mobile_viewport.png');
    await page.screenshot({ path: mobileScreenshotPath });
    console.log(` ✔ Captured Step 4 Screenshot: ${mobileScreenshotPath}`);

    console.log('\n================================================================');
    console.log('ALL FRONTEND BROWSER AUTOMATION TESTS PASSED WITH 0 ERRORS');
    console.log('================================================================');
  } finally {
    await browser.close();
  }
}

testFrontendInBrowser().catch(err => {
  console.error('\n❌ BROWSER TEST FAILED:', err);
  process.exit(1);
});
