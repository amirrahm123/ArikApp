const sharp = require('sharp');
const path = require('path');

const svg = `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="#111111"/>
  ${Array.from({ length: 40 }).map((_, i) =>
    `<rect x="${i * 30}" y="0" width="30" height="12" fill="${i % 3 === 0 ? '#C0392B' : i % 3 === 1 ? '#F5F0E8' : '#1B3A6B'}"/>`
  ).join('')}
  ${Array.from({ length: 40 }).map((_, i) =>
    `<rect x="${i * 30}" y="618" width="30" height="12" fill="${i % 3 === 0 ? '#C0392B' : i % 3 === 1 ? '#F5F0E8' : '#1B3A6B'}"/>`
  ).join('')}
  <text x="600" y="230" text-anchor="middle" font-size="90">&#x2702;&#xFE0F;</text>
  <text x="600" y="360" text-anchor="middle" font-size="110" font-weight="800" fill="#F5F0E8" font-family="Arial, sans-serif" direction="rtl">&#x05E7;&#x05D1;&#x05E2; &#x05EA;&#x05D5;&#x05E8;!</text>
  <rect x="560" y="385" width="80" height="3" rx="2" fill="#C9A84C"/>
  <text x="600" y="435" text-anchor="middle" font-size="32" fill="#9B8E7E" font-family="Arial, sans-serif" letter-spacing="4">ARIK BARBER</text>
  <text x="600" y="475" text-anchor="middle" font-size="22" fill="#6B6B6B" font-family="Arial, sans-serif" letter-spacing="3">BOOK YOUR APPOINTMENT</text>
</svg>`;

sharp(Buffer.from(svg))
  .png()
  .toFile(path.join(__dirname, '../public/og-image.png'))
  .then(() => console.log('✅ og-image.png generated'))
  .catch((err) => console.error('Error:', err));
