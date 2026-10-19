import esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';

// Ensure dist/ directory exists
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist', { recursive: true });
}

const buildTargets = [
  {
    entryPoints: ['src/content/index.js'],
    outfile: 'dist/content.js',
    format: 'iife'
  },
  {
    entryPoints: ['src/background/index.js'],
    outfile: 'dist/background.js',
    format: 'iife'
  },
  {
    entryPoints: ['src/popup/index.js'],
    outfile: 'dist/popup.js',
    format: 'iife'
  },
  {
    entryPoints: ['src/injected/index.js'],
    outfile: 'dist/main_world.js',
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
    console.log(`  ✓ Built ${target.outfile}`);
  }

  const duration = Math.round(performance.now() - start);
  console.log(`✨ All bundles compiled successfully into dist/ in ${duration}ms!`);
}

runBuild().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
