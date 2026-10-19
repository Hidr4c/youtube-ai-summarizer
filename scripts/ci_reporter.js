import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const testsDir = path.join(rootDir, 'tests');

// Discover all test files in tests/ directory
const testFiles = fs.readdirSync(testsDir)
  .filter((f) => f.endsWith('.test.js'))
  .sort()
  .map((f) => path.join('tests', f));

const args = ['--test', '--experimental-test-coverage', ...testFiles];
const child = spawn(process.execPath, args, {
  cwd: rootDir,
  env: process.env,
  stdio: ['inherit', 'pipe', 'pipe']
});

let output = '';

child.stdout.on('data', (data) => {
  const str = data.toString();
  process.stdout.write(str);
  output += str;
});

child.stderr.on('data', (data) => {
  const str = data.toString();
  process.stderr.write(str);
  output += str;
});

child.on('close', (code) => {
  const summaryFile = process.env.GITHUB_STEP_SUMMARY;
  if (summaryFile) {
    try {
      const markdown = generateStepSummary(output, code);
      fs.appendFileSync(summaryFile, markdown, 'utf8');
      console.log(`\n[ci_reporter] Successfully wrote test report to GITHUB_STEP_SUMMARY.`);
    } catch (err) {
      console.error('[ci_reporter] Failed to write GITHUB_STEP_SUMMARY:', err);
    }
  }
  process.exit(code ?? 0);
});

/**
 * Generate GitHub Step Summary Markdown from test & coverage output.
 * @param {string} rawOutput
 * @param {number|null} exitCode
 * @returns {string}
 */
export function generateStepSummary(rawOutput, exitCode) {
  const totalMatch = rawOutput.match(/# tests (\d+)/);
  const passMatch = rawOutput.match(/# pass (\d+)/);
  const failMatch = rawOutput.match(/# fail (\d+)/);
  const durationMatch = rawOutput.match(/# duration_ms ([\d\.]+)/);

  const total = totalMatch ? parseInt(totalMatch[1], 10) : 0;
  const passed = passMatch ? parseInt(passMatch[1], 10) : 0;
  const failed = failMatch ? parseInt(failMatch[1], 10) : 0;
  const duration = durationMatch ? (parseFloat(durationMatch[1]) / 1000).toFixed(2) : '0';

  const isSuccess = exitCode === 0 && failed === 0;

  // Extract coverage report block
  const startMarker = 'start of coverage report';
  const endMarker = 'end of coverage report';
  const startIdx = rawOutput.indexOf(startMarker);
  const endIdx = rawOutput.indexOf(endMarker);

  let cleanCovTable = '';
  let lineCov = 'N/A';
  let branchCov = 'N/A';
  let funcCov = 'N/A';

  if (startIdx !== -1 && endIdx !== -1) {
    const rawBlock = rawOutput.slice(startIdx + startMarker.length, endIdx);
    cleanCovTable = rawBlock
      .split('\n')
      .map((line) => line.replace(/^#\s?/, ''))
      .join('\n')
      .trim();

    const allFilesLine = cleanCovTable.split('\n').find((l) => l.startsWith('all files'));
    if (allFilesLine) {
      const parts = allFilesLine.split('|').map((p) => p.trim());
      if (parts.length >= 4) {
        lineCov = parts[1] ? `${parts[1]}%` : 'N/A';
        branchCov = parts[2] ? `${parts[2]}%` : 'N/A';
        funcCov = parts[3] ? `${parts[3]}%` : 'N/A';
      }
    }
  }

  const checkBadge = (valStr) => {
    const num = parseFloat(valStr);
    if (isNaN(num)) return '⚪ Unknown';
    return num >= 80 ? `🟢 **${valStr}** *(Target ≥ 80%)*` : `🔴 **${valStr}** *(Below 80%)*`;
  };

  const nodeVersion = process.version;

  let md = `\n## 🧪 Automated Test & Industrial Coverage Report\n\n`;
  md += `> **Environment:** Node.js \`${nodeVersion}\` on GitHub Actions Runner\n\n`;

  md += `### 🎯 Test Execution Overview\n\n`;
  if (isSuccess) {
    md += `✅ **Status:** All tests passed successfully!\n\n`;
  } else {
    md += `❌ **Status:** Tests failed or completed with errors (Exit Code: ${exitCode})\n\n`;
  }

  md += `| Total Tests | Passed | Failed | Duration |\n`;
  md += `| :---: | :---: | :---: | :---: |\n`;
  md += `| **${total}** | **${passed}** 🟢 | **${failed}** ${failed > 0 ? '🔴' : '⚪'} | \`${duration}s\` |\n\n`;

  md += `### 📊 Quality & Coverage Metrics\n\n`;
  md += `| Metric | Current Value | Threshold Compliance |\n`;
  md += `| :--- | :---: | :---: |\n`;
  md += `| **Line Coverage** | ${lineCov} | ${checkBadge(lineCov)} |\n`;
  md += `| **Branch Coverage** | ${branchCov} | ${checkBadge(branchCov)} |\n`;
  md += `| **Function Coverage** | ${funcCov} | ${checkBadge(funcCov)} |\n\n`;

  if (cleanCovTable) {
    md += `<details>\n<summary><b>📋 View Detailed Coverage Breakdown by File</b></summary>\n\n`;
    md += `\`\`\`text\n${cleanCovTable}\n\`\`\`\n\n</details>\n`;
  }

  return md;
}
