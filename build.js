import esbuild from 'esbuild';

const buildTargets = [
  {
    entryPoints: ['src/content/index.js'],
    outfile: 'content.js',
    format: 'iife'
  },
  {
    entryPoints: ['src/background/index.js'],
    outfile: 'background.js',
    format: 'iife'
  },
  {
    entryPoints: ['src/popup/index.js'],
    outfile: 'popup.js',
    format: 'iife'
  },
  {
    entryPoints: ['src/injected/index.js'],
    outfile: 'main_world.js',
    format: 'iife'
  }
];

async function runBuild() {
  console.log('⚡ Building YouTube AI Summarizer bundles from src/ ...');
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
  console.log(`✨ All bundles compiled successfully in ${duration}ms!`);
}

runBuild().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
