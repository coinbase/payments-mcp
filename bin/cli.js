#!/usr/bin/env node

const path = require('path');
const fs = require('fs');

const distPath = path.join(__dirname, '..', 'dist', 'cli.js');

if (fs.existsSync(distPath)) {
  require(distPath);
} else {
  console.error('Error: Compiled JavaScript files not found.');
  console.error('Please run "npm run build" to compile the TypeScript source code.');
  process.exit(1);
}