// Simple script to generate placeholder PWA icons
// Replace these with actual branded icons for production

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// This is a minimal 1x1 transparent PNG in base64
const minimalPNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

const publicDir = path.join(__dirname, '../public');

// Create placeholder icons
// In production, replace these with actual 192x192 and 512x512 PNG icons
fs.writeFileSync(path.join(publicDir, 'icon-192.png'), minimalPNG);
fs.writeFileSync(path.join(publicDir, 'icon-512.png'), minimalPNG);

console.log('Placeholder icons created. Please replace with actual icons:');
console.log('- icon-192.png (192x192 pixels)');
console.log('- icon-512.png (512x512 pixels)');

