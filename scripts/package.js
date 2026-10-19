import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// 1. Read manifest version dynamically
const manifestPath = path.join(rootDir, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const version = manifest.version;

console.log(`\n📦 Packaging YouTube Summarizer AI v${version}...`);

// 2. Ensure dist bundles are fresh
console.log('⚡ Building distribution bundles...');
execSync('node scripts/build.js', { cwd: rootDir, stdio: 'inherit' });

// 3. Prepare releases directory
const releasesDir = path.join(rootDir, 'releases');
if (!fs.existsSync(releasesDir)) {
  fs.mkdirSync(releasesDir, { recursive: true });
}

const zipName = `youtube-summarizer-ai-v${version}.zip`;
const zipPath = path.join(releasesDir, zipName);

// 4. Create zip archive
const filesToPack = ['manifest.json', 'dist', 'icons', 'docs', 'README.md', 'LICENSE'];

console.log(`🗜️  Archiving files into releases/${zipName}...`);
if (process.platform === 'win32') {
  const fileList = filesToPack.join(', ');
  const cmd = `powershell -NoProfile -Command "Compress-Archive -Path ${fileList} -DestinationPath '${zipPath}' -Force"`;
  execSync(cmd, { cwd: rootDir, stdio: 'inherit' });
} else {
  const fileList = filesToPack.join(' ');
  execSync(`zip -r -q '${zipPath}' ${fileList}`, { cwd: rootDir, stdio: 'inherit' });
}

if (fs.existsSync(zipPath)) {
  const stats = fs.statSync(zipPath);
  const sizeKb = (stats.size / 1024).toFixed(1);
  console.log(`✅ Package successfully generated: ${zipPath} (${sizeKb} KB)\n`);
} else {
  console.error(`❌ Packaging failed: ${zipPath} not created.`);
  process.exit(1);
}
