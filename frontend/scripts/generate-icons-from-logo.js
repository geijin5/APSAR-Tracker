// Script to generate PWA icons from logo.png
// Requires: npm install sharp --save-dev

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicDir = path.join(__dirname, '../public');
const logoPath = path.join(publicDir, 'logo.png');

// Check if logo.png exists
if (!fs.existsSync(logoPath)) {
  console.error('Error: logo.png not found in frontend/public/');
  console.error('Please copy logo.png to frontend/public/');
  process.exit(1);
}

// Try to use sharp if available, otherwise provide instructions
try {
  const sharp = (await import('sharp')).default;
  
  console.log('Generating icons from logo.png...');
  
  // Generate 192x192 icon
  await sharp(logoPath)
    .resize(192, 192, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .toFile(path.join(publicDir, 'icon-192.png'));
  
  console.log('✓ Created icon-192.png');
  
  // Generate 512x512 icon
  await sharp(logoPath)
    .resize(512, 512, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .toFile(path.join(publicDir, 'icon-512.png'));
  
  console.log('✓ Created icon-512.png');
  
  // Also create favicon (32x32)
  await sharp(logoPath)
    .resize(32, 32, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .toFile(path.join(publicDir, 'favicon.png'));
  
  console.log('✓ Created favicon.png');
  
  console.log('\n✅ All icons generated successfully!');
  console.log('Icons are ready to use in your PWA and Android app.');
  
} catch (error) {
  if (error.code === 'ERR_MODULE_NOT_FOUND' || error.message.includes('sharp')) {
    console.error('\n❌ Error: sharp package not found');
    console.error('\nTo generate icons, install sharp:');
    console.error('  cd frontend');
    console.error('  npm install sharp --save-dev');
    console.error('  npm run generate-icons');
    console.error('\nAlternatively, manually resize logo.png to:');
    console.error('  - icon-192.png (192x192 pixels)');
    console.error('  - icon-512.png (512x512 pixels)');
    process.exit(1);
  } else {
    console.error('Error generating icons:', error.message);
    process.exit(1);
  }
}

