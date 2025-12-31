#!/usr/bin/env node

// Robust script to build using vite with multiple fallback methods
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { execSync } from 'child_process';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Try multiple methods to build
function build() {
  console.log('🔨 Starting Vite build...\n');

  // Method 1: Try using npx (most reliable)
  try {
    console.log('📦 Method 1: Attempting npx vite build');
    execSync('npx --yes vite build', {
      cwd: projectRoot,
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'production' }
    });
    console.log('\n✅ Build successful using npx!');
    return;
  } catch (error) {
    console.log('❌ Method 1 failed, trying next method...\n');
  }

  // Method 2: Try finding vite binary and running with node
  const possiblePaths = [
    join(projectRoot, 'node_modules/vite/bin/vite.js'),
    join(projectRoot, 'node_modules/vite/dist/node/cli.js'),
    join(projectRoot, 'node_modules/.bin/vite'),
  ];

  for (const vitePath of possiblePaths) {
    const fullPath = resolve(vitePath);
    if (existsSync(fullPath)) {
      try {
        console.log(`📦 Method 2: Attempting node ${fullPath} build`);
        execSync(`node "${fullPath}" build`, {
          cwd: projectRoot,
          stdio: 'inherit',
          env: { ...process.env, NODE_ENV: 'production' }
        });
        console.log('\n✅ Build successful using direct node execution!');
        return;
      } catch (error) {
        console.log(`❌ Failed with ${fullPath}, trying next...\n`);
      }
    }
  }

  // Method 3: Reinstall vite and try again
  try {
    console.log('📦 Method 3: Reinstalling vite and retrying...');
    execSync('npm install vite@^5.0.8 --save-dev --legacy-peer-deps', {
      cwd: projectRoot,
      stdio: 'inherit'
    });
    // Fix permissions after reinstall
    execSync('find node_modules/.bin -type f -exec chmod +x {} \\; 2>/dev/null || true', {
      cwd: projectRoot,
      shell: '/bin/bash'
    });
    execSync('npx --yes vite build', {
      cwd: projectRoot,
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'production' }
    });
    console.log('\n✅ Build successful after reinstall!');
    return;
  } catch (error) {
    console.log('❌ Method 3 also failed\n');
  }

  // If all methods fail
  console.error('❌ All build methods failed!');
  console.error('Please check:');
  console.error('1. Vite is installed: npm list vite');
  console.error('2. Node version is compatible: node --version');
  console.error('3. Dependencies are installed: npm install');
  process.exit(1);
}

build();
