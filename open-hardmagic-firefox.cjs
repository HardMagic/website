const { firefox } = require('playwright');

(async() => {
  const browser = await firefox.launch({
    headless: false,
    args: ['--no-remote', '--new-instance']
  });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto('http://localhost:4321/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  console.log('opened', page.url());
  await new Promise(() => {});
})();
