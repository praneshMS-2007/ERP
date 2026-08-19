/**
 * Create a clean white-background Shuroq logo from the cropped version
 * by compositing the logo area onto a white canvas (removing the blue stripe corner).
 */
const sharp = require('sharp');
const path = require('path');

const SRC = path.join(__dirname, '..', 'assets', 'brand', 'reference-internship-letter.jpeg');
const OUT = path.join(__dirname, '..', 'assets', 'brand', 'shuroq-logo.png');

async function main() {
  const meta = await sharp(SRC).metadata();
  console.log(`Source: ${meta.width}x${meta.height}`);

  // The logo text ("Shuroq" + sun icon + "TECH REDEFINED") sits at roughly:
  // x: 30-270, y: 60-140 in the 853x1280 image
  // But the blue diagonal stripe covers the top-right corner.
  // Solution: crop a wider area and flatten on white background

  // First extract a generous area around the logo
  const logoArea = await sharp(SRC)
    .extract({ left: 20, top: 50, width: 280, height: 100 })
    .toBuffer();

  // The logo has white background in the letter area — the blue triangle
  // only covers the top-right. By extracting from y=50 downward we mostly
  // avoid it. Let's flatten it on a white canvas.
  await sharp(logoArea)
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .png()
    .toFile(OUT);

  console.log('✓ Clean logo saved to:', OUT);
}

main().catch(console.error);
