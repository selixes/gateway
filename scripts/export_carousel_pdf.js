const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function exportPDF() {
  const outputDir = path.resolve(__dirname, '../carousel_slides');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const htmlPath = path.resolve(__dirname, '../linkedin_carousel.html');
  const fileUrl = 'file://' + htmlPath.replace(/\\/g, '/');
  const pdfPath = path.join(outputDir, 'Selixes_LinkedIn_Carousel.pdf');

  console.log('Launching headless browser for PDF export...');
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
  
  await page.setViewport({
    width: 720,
    height: 900,
    deviceScaleFactor: 2
  });

  console.log('Loading carousel HTML:', fileUrl);
  await page.goto(fileUrl, { waitUntil: 'networkidle0' });

  // Hide the top instruction banner in PDF export
  await page.evaluate(() => {
    const banner = document.querySelector('.instruction-banner');
    if (banner) banner.style.display = 'none';
    document.body.style.padding = '0';
    document.body.style.margin = '0';
    document.body.style.gap = '0';
    const container = document.querySelector('.carousel-container');
    if (container) container.style.gap = '0';
  });

  // Wait for web fonts and images to load completely
  await page.evaluateHandle('document.fonts.ready');
  await new Promise(r => setTimeout(r, 1200));

  console.log('Generating PDF...');
  await page.pdf({
    path: pdfPath,
    width: '720px',
    height: '900px',
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 }
  });

  await browser.close();
  const stats = fs.statSync(pdfPath);
  console.log(`✨ PDF successfully created: ${pdfPath} (${(stats.size / 1024).toFixed(1)} KB)`);
}

exportPDF().catch(err => {
  console.error('Error exporting PDF:', err);
  process.exit(1);
});
