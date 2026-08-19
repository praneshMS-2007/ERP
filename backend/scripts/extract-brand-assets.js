/**
 * Extract brand assets from the reference internship letter image — final pass.
 * Run: node scripts/extract-brand-assets.js
 */
const sharp = require('sharp');
const path = require('path');

const SRC = path.join(__dirname, '..', 'assets', 'brand', 'reference-internship-letter.jpeg');
const OUT = path.join(__dirname, '..', 'assets', 'brand');

async function main() {
  const meta = await sharp(SRC).metadata();
  console.log(`Source image: ${meta.width}x${meta.height}`);
  const W = meta.width;
  const H = meta.height;

  // 1. Shuroq logo — the logo + sun icon + "TECH REDEFINED"
  //    Sits from about x=30 to x=280, y=40 to y=135 in 853x1280 image
  await sharp(SRC)
    .extract({ left: 30, top: 40, width: 260, height: 100 })
    .png()
    .toFile(path.join(OUT, 'shuroq-logo.png'));
  console.log('✓ shuroq-logo.png');

  // 2. Company circular seal (top-right) — the round seal with "SHUROQ TECHNOLOGIES" text
  //    Sits from about x=600 to x=810, y=85 to y=255
  await sharp(SRC)
    .extract({ left: 600, top: 85, width: 210, height: 170 })
    .png()
    .toFile(path.join(OUT, 'company-seal.png'));
  console.log('✓ company-seal.png');

  // 3. Authorized signature (bottom-left)
  //    Sits from about x=30 to x=240, y=1075 to y=1195
  await sharp(SRC)
    .extract({ left: 30, top: 1075, width: 220, height: 120 })
    .png()
    .toFile(path.join(OUT, 'authorized-signature.png'));
  console.log('✓ authorized-signature.png');

  // 4. MSME logo (bottom-right) — Ashoka pillar + MSME text
  //    Sits from about x=555 to x=795, y=1070 to y=1230
  await sharp(SRC)
    .extract({ left: 555, top: 1070, width: 245, height: 165 })
    .png()
    .toFile(path.join(OUT, 'msme-logo.png'));
  console.log('✓ msme-logo.png');

  console.log('\nAll brand assets extracted to:', OUT);
}

main().catch(console.error);
