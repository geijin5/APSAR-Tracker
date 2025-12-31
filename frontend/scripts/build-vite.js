#!/usr/bin/env node

// Script to build using vite, finding it dynamically
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { spawn } from 'child_process';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Try different possible vite paths
const possiblePaths = [
  join(__dirname, '../node_modules/vite/bin/vite.js'),
  join(__dirname, '../node_modules/vite/dist/node/cli.js'),
  join(__dirname, '../node_modules/.bin/vite'),
];

let vitePath = null;
for (const path of possiblePaths) {
  const fullPath = resolve(path);
  if (existsSync(fullPath)) {
    vitePath = fullPath;
    break;
  }
}

if (!vitePath) {
  console.error('Could not find vite. Trying npx...');
  process.exit(1);
}

// Run vite build
const child = spawn('node', [vitePath, 'build'], {
  stdio: 'inherit',
  cwd: join(__dirname, '..'),
});

child.on('exit', (code) => {
  process.exit(code || 0);
});

