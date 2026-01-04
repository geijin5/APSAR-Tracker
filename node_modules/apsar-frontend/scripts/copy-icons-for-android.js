// Script to copy icons to Android resources after Capacitor sync
// This ensures the logo is used as the Android app icon

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicDir = path.join(__dirname, '../public');
const androidDir = path.join(__dirname, '../android');

// Icon sizes needed for Android
const androidIconSizes = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192
};

// Check if Android directory exists
if (!fs.existsSync(androidDir)) {
  console.log('Android directory not found. Run "npx cap add android" first.');
  process.exit(0);
}

// Check if logo.png exists
const logoPath = path.join(publicDir, 'logo.png');
if (!fs.existsSync(logoPath)) {
  console.error('Error: logo.png not found in frontend/public/');
  process.exit(1);
}

console.log('Copying icons for Android...');

try {
  const sharp = (await import('sharp')).default;
  const logo = sharp(logoPath);
  
  // Generate icons for each density
  for (const [folder, size] of Object.entries(androidIconSizes)) {
    const iconDir = path.join(androidDir, 'app/src/main/res', folder);
    const iconPath = path.join(iconDir, 'ic_launcher.png');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(iconDir)) {
      fs.mkdirSync(iconDir, { recursive: true });
    }
    
    // Generate icon
    await logo
      .clone()
      .resize(size, size, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .toFile(iconPath);
    
    console.log(`✓ Created ${folder}/ic_launcher.png (${size}x${size})`);
  }
  
  // Also create round icon (for Android 7.1+)
  for (const [folder, size] of Object.entries(androidIconSizes)) {
    const iconDir = path.join(androidDir, 'app/src/main/res', folder);
    const iconPath = path.join(iconDir, 'ic_launcher_round.png');
    
    // Generate round icon
    await logo
      .clone()
      .resize(size, size, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .toFile(iconPath);
    
    console.log(`✓ Created ${folder}/ic_launcher_round.png (${size}x${size})`);
  }
  
  console.log('\n✅ Android icons generated successfully!');
  console.log('Icons are ready for your Android APK build.');
  
} catch (error) {
  if (error.code === 'ERR_MODULE_NOT_FOUND' || error.message.includes('sharp')) {
    console.error('\n❌ Error: sharp package not found');
    console.error('Install sharp: npm install sharp --save-dev');
    process.exit(1);
  } else {
    console.error('Error generating Android icons:', error.message);
    process.exit(1);
  }
}

