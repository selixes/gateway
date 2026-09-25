const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function exportSlides() {
  const outputDir = path.resolve(__dirname, '../carousel_slides');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const htmlPath = path.resolve(__dirname, '../linkedin_carousel.html');
  const fileUrl = 'file://' + htmlPath.replace(/\\/g, '/');

  console.log('Launching headless browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--allow-file-access-from-files'
    ]
  });

  const page = await browser.newPage();
  
  // Set high DPI viewport (720x900 at 1.5x scale = 1080x1350 crisp LinkedIn resolution)
  await page.setViewport({
    width: 1200,
    height: 1200,
    deviceScaleFactor: 1.5
  });

  console.log('Loading carousel HTML:', fileUrl);
  await page.goto(fileUrl, { waitUntil: 'networkidle0' });

  // Wait for web fonts and images to load completely
  await page.evaluateHandle('document.fonts.ready');
  await new Promise(r => setTimeout(r, 1200));

  const slides = await page.$$('.slide');
  console.log(`Found ${slides.length} slides.`);

  for (let i = 0; i < slides.length; i++) {
    const slideNumber = String(i + 1).padStart(2, '0');
    const outputPath = path.join(outputDir, `slide_${slideNumber}.png`);

    console.log(`Rendering Slide ${slideNumber}...`);
    await slides[i].screenshot({
      path: outputPath,
      type: 'png',
      omitBackground: false
    });

    const stats = fs.statSync(outputPath);
    console.log(`✓ Saved: ${outputPath} (${(stats.size / 1024).toFixed(1)} KB)`);
  }

  await browser.close();
  console.log('✨ All carousel slides rendered successfully!');
}

exportSlides().catch(err => {
  console.error('Error exporting slides:', err);
  process.exit(1);
});
