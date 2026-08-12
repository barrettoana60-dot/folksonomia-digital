const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();

  page.on('console', msg => {
    const args = msg.args();
    Promise.all(args.map(a => a.jsonValue().catch(() => a.toString())))
      .then(vals => console.log('[BROWSER CONSOLE]', msg.type(), ...vals));
  });

  page.on('pageerror', err => console.log('[PAGE ERROR]', err.stack || err.message || err));
  page.on('requestfailed', req => console.log('[REQUEST FAILED]', req.url(), req.failure()?.errorText));

  try {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 30000 });
    // wait a bit for runtime errors
    await page.waitForTimeout(3000);
  } catch (err) {
    console.log('Failed to load page:', err);
  }

  await browser.close();
})();
