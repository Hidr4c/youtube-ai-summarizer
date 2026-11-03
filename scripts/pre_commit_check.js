import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const srcDir = path.join(rootDir, 'src');

const MAX_LINES_PER_FILE = 300;
const isSizeOnly = process.argv.includes('--size-only');

console.log('\n==========================================================');
console.log(' [PRE-COMMIT QUALITY GATE] Architecture & Quality Check');
console.log('==========================================================\n');

// 1. Recursive scan of all .js files in src/
function getAllJsFiles(dir) {
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(getAllJsFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      results.push(fullPath);
    }
  }
  return results;
}

const srcFiles = getAllJsFiles(srcDir);
console.log(`[1/5] Checking file sizes in src/ (strictly <= ${MAX_LINES_PER_FILE} lines)...`);

const oversizedFiles = [];
for (const filePath of srcFiles) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lineCount = content.split('\n').length;
  if (lineCount > MAX_LINES_PER_FILE) {
    oversizedFiles.push({
      path: path.relative(rootDir, filePath),
      lines: lineCount
    });
  }
}

if (oversizedFiles.length > 0) {
  console.error('\n❌ [QUALITY GATE FAILED] Files in src/ exceeding 300 lines limit:');
  for (const item of oversizedFiles) {
    console.error(`   - ${item.path}: ${item.lines} lines (limit: ${MAX_LINES_PER_FILE})`);
  }
  console.error('\nViolates strict architecture rule: No source file may exceed 300 lines of code.\n');
  process.exit(1);
} else {
  console.log(`  ✓ All ${srcFiles.length} source files in src/ are <= ${MAX_LINES_PER_FILE} lines.`);
}

// 2. Strict separation: zero test files in src/
console.log('\n[2/5] Checking strict separation (no test files inside src/)...');
const testFilesInsideSrc = srcFiles.filter(f => /(\.test\.|\.spec\.|_test\.)/i.test(path.basename(f)));
if (testFilesInsideSrc.length > 0) {
  console.error('\n❌ [QUALITY GATE FAILED] Test files found inside src/:');
  for (const f of testFilesInsideSrc) {
    console.error(`   - ${path.relative(rootDir, f)}`);
  }
  process.exit(1);
}
console.log('  ✓ Zero test code inside src/.');

if (isSizeOnly) {
  console.log('\n✓ Size checks passed (--size-only flag active).\n');
  process.exit(0);
}

// 3. Build bundle with esbuild
console.log('\n[3/5] Compiling bundles (npm run build)...');
try {
  execSync('npm run build', { stdio: 'inherit', cwd: rootDir });
  console.log('  ✓ Bundles built successfully.');
} catch (err) {
  console.error('\n❌ [QUALITY GATE FAILED] esbuild compilation failed.');
  process.exit(1);
}

// 4. Syntax check on dist/ bundles
console.log('\n[4/5] Checking syntax on built bundles (npm run check)...');
try {
  execSync('npm run check', { stdio: 'inherit', cwd: rootDir });
  console.log('  ✓ Syntax check passed.');
} catch (err) {
  console.error('\n❌ [QUALITY GATE FAILED] Syntax check failed.');
  process.exit(1);
}

// 5. Automated test suite with coverage
console.log('\n[5/5] Running automated tests (npm test)...');
try {
  execSync('npm test', { stdio: 'inherit', cwd: rootDir });
  console.log('  ✓ Test suite passed.');
} catch (err) {
  console.error('\n❌ [QUALITY GATE FAILED] Automated test suite failed.');
  process.exit(1);
}

console.log('\n==========================================================');
console.log('  ✅ QUALITY GATE PASSED: Architecture & Tests 100% Valid!');
console.log('==========================================================\n');
