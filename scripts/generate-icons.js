const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function generateIcons() {
  const svgPath = path.join(__dirname, '../public/icon.svg');
  const svgBuffer = fs.readFileSync(svgPath);

  const sizes = [
    { size: 512, filename: 'icon-512.png' },
    { size: 192, filename: 'icon-192.png' },
    { size: 180, filename: 'apple-touch-icon.png' },
    { size: 32,  filename: 'favicon-32.png' },
    { size: 16,  filename: 'favicon-16.png' },
  ];

  for (const { size, filename } of sizes) {
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(path.join(__dirname, '../public', filename));
    console.log(`✅ Generated ${filename}`);
  }

  console.log('🎉 All icons generated!');
}

generateIcons().catch(console.error);
