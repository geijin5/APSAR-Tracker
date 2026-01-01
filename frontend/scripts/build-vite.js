#!/usr/bin/env node

// Simple and reliable vite build script
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

console.log('🔨 Building with Vite...\n');

try {
  // Verify vite is installed
  try {
    execSync('npm list vite', {
      cwd: projectRoot,
      stdio: 'pipe',
      encoding: 'utf8'
    });
  } catch (error) {
    console.error('❌ Error: vite is not installed');
    console.error('Installing vite...');
    execSync('npm install vite@^5.0.8 --save-dev --legacy-peer-deps', {
      cwd: projectRoot,
      stdio: 'inherit'
    });
  }

  // Use vite build - npm run automatically adds node_modules/.bin to PATH
  // But we'll use npx as a fallback
  try {
    execSync('vite build', {
      cwd: projectRoot,
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'production' }
    });
    console.log('\n✅ Build successful!');
    process.exit(0);
  } catch (error) {
    // Try with npx if direct vite fails
    console.log('\n⚠️  Direct vite failed, trying npx...\n');
    execSync('npx vite build', {
      cwd: projectRoot,
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'production' }
    });
    console.log('\n✅ Build successful with npx!');
    process.exit(0);
  }
} catch (error) {
  console.error('\n❌ Build failed!');
  console.error('Error:', error.message);
  process.exit(1);
}
