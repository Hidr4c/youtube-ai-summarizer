import esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

// Ensure dist/ directory exists
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

const buildTargets = [
  {
    entryPoints: [path.join(rootDir, 'src/content/index.js')],
    outfile: path.join(distDir, 'content.js'),
    format: 'iife'
  },
  {
    entryPoints: [path.join(rootDir, 'src/background/index.js')],
    outfile: path.join(distDir, 'background.js'),
    format: 'iife'
  },
  {
    entryPoints: [path.join(rootDir, 'src/popup/index.js')],
    outfile: path.join(distDir, 'popup.js'),
    format: 'iife'
  },
  {
    entryPoints: [path.join(rootDir, 'src/injected/index.js')],
    outfile: path.join(distDir, 'main_world.js'),
    format: 'iife'
  }
];

async function runBuild() {
  console.log('⚡ Building YouTube AI Summarizer bundles into dist/ ...');
  const start = performance.now();

  for (const target of buildTargets) {
    await esbuild.build({
      entryPoints: target.entryPoints,
      outfile: target.outfile,
      bundle: true,
      format: target.format,
      target: ['chrome110'],
      minify: false,
      sourcemap: false
    });
    console.log(`  ✓ Built ${path.relative(rootDir, target.outfile)}`);
  }

  // Copy static UI assets into dist/
  fs.copyFileSync(path.join(rootDir, 'src/content/content.css'), path.join(distDir, 'content.css'));
  console.log('  ✓ Synced dist/content.css');
  fs.copyFileSync(path.join(rootDir, 'src/popup/popup.css'), path.join(distDir, 'popup.css'));
  console.log('  ✓ Synced dist/popup.css');
  fs.copyFileSync(path.join(rootDir, 'src/popup/popup.html'), path.join(distDir, 'popup.html'));
  console.log('  ✓ Synced dist/popup.html');

  const duration = Math.round(performance.now() - start);
  console.log(`✨ All bundles compiled successfully into dist/ in ${duration}ms!`);
}

runBuild().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
