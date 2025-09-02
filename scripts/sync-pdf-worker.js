#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get the package version from package.json
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const pdfVersion = packageJson.dependencies['pdfjs-dist'];

if (!pdfVersion) {
    console.error('pdfjs-dist not found in dependencies');
    process.exit(1);
}

console.log(`Found pdfjs-dist version: ${pdfVersion}`);

// Source and destination paths
const sourcePath = path.join('node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.mjs');
const destPath = path.join('public', 'pdf.worker.min.mjs');

// Check if source exists
if (!fs.existsSync(sourcePath)) {
    console.error(`Source worker file not found: ${sourcePath}`);
    console.error('Please run npm install first');
    process.exit(1);
}

// Copy the file
try {
    fs.copyFileSync(sourcePath, destPath);
    console.log(`✅ Successfully copied PDF worker from ${sourcePath} to ${destPath}`);
    console.log(`📁 Worker file is now in sync with package version ${pdfVersion}`);
} catch (error) {
    console.error('❌ Failed to copy worker file:', error.message);
    process.exit(1);
}
