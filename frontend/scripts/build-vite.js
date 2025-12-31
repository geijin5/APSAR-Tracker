#!/usr/bin/env node

// Robust script to build using vite with multiple fallback methods
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
const require = createRequire(import.meta.url);

// Try multiple methods to build
function build() {
  console.log('🔨 Starting Vite build...\n');

  // First, ensure vite and all dependencies are installed
  console.log('📦 Verifying and installing dependencies...');
  try {
    execSync('npm install --legacy-peer-deps', {
      cwd: projectRoot,
      stdio: 'inherit'
    });
    console.log('✓ Dependencies installed\n');
  } catch (error) {
    console.log('⚠️  Installation had issues, continuing...\n');
  }

  // Fix permissions
  try {
    execSync('find node_modules/.bin -type f -exec chmod +x {} \\; 2>/dev/null || true', {
      cwd: projectRoot,
      shell: '/bin/bash'
    });
    execSync('chmod +x node_modules/.bin/* 2>/dev/null || true', {
      cwd: projectRoot,
      shell: '/bin/bash'
    });
  } catch (e) {
    // Ignore permission errors
  }

  // Method 1: Try using npx
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

  // Method 2: Try finding vite using require.resolve
  try {
    console.log('📦 Method 2: Using require.resolve to find vite...');
    const viteModulePath = require.resolve('vite/bin/vite.js');
    console.log(`✓ Found vite at: ${viteModulePath}`);
    execSync(`node "${viteModulePath}" build`, {
      cwd: projectRoot,
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'production' }
    });
    console.log('\n✅ Build successful using require.resolve!');
    return;
  } catch (error) {
    console.log('❌ Method 2 failed, trying next method...\n');
  }

  // Method 3: Try finding vite binary manually
  console.log('📦 Method 3: Searching for vite binary...');
  const possiblePaths = [
    join(projectRoot, 'node_modules/vite/bin/vite.js'),
    join(projectRoot, 'node_modules/vite/dist/node/cli.js'),
    join(projectRoot, 'node_modules/.bin/vite'),
  ];

  let foundPath = null;
  for (const vitePath of possiblePaths) {
    const fullPath = resolve(vitePath);
    if (existsSync(fullPath)) {
      foundPath = fullPath;
      console.log(`✓ Found vite at: ${fullPath}`);
      break;
    }
  }

  if (foundPath) {
    try {
      console.log(`📦 Attempting: node "${foundPath}" build`);
      execSync(`node "${foundPath}" build`, {
        cwd: projectRoot,
        stdio: 'inherit',
        env: { ...process.env, NODE_ENV: 'production' }
      });
      console.log('\n✅ Build successful using direct node execution!');
      return;
    } catch (error) {
      console.log(`❌ Failed with direct execution\n`);
    }
  } else {
    console.log('❌ No vite binary found\n');
  }

  // Method 4: Reinstall everything and try again
  try {
    console.log('📦 Method 4: Reinstalling all dependencies...');
    execSync('rm -rf node_modules package-lock.json', {
      cwd: projectRoot,
      shell: '/bin/bash'
    });
    execSync('npm install --legacy-peer-deps', {
      cwd: projectRoot,
      stdio: 'inherit'
    });
    execSync('find node_modules/.bin -type f -exec chmod +x {} \\; 2>/dev/null || true', {
      cwd: projectRoot,
      shell: '/bin/bash'
    });
    console.log('📦 Retrying build after clean reinstall...');
    execSync('npx --yes vite build', {
      cwd: projectRoot,
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'production' }
    });
    console.log('\n✅ Build successful after clean reinstall!');
    return;
  } catch (error) {
    console.log('❌ Method 4 also failed\n');
  }

  // If all methods fail
  console.error('❌ All build methods failed!');
  console.error('\nDebugging information:');
  try {
    console.error('Node version:', execSync('node --version', { encoding: 'utf8' }).trim());
    console.error('NPM version:', execSync('npm --version', { encoding: 'utf8' }).trim());
    const viteList = execSync('npm list vite', { cwd: projectRoot, encoding: 'utf8', stdio: 'pipe' }).trim();
    console.error('Vite package:', viteList || 'NOT FOUND');
  } catch (e) {
    // Ignore debug errors
  }
  process.exit(1);
}

build();
