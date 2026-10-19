import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const action = process.argv[2];
const versionArg = process.argv[3];

function run(cmd, options = {}) {
  return execSync(cmd, { cwd: rootDir, encoding: 'utf8', stdio: options.silent ? 'pipe' : 'inherit', ...options });
}

function runOutput(cmd) {
  try {
    return execSync(cmd, { cwd: rootDir, encoding: 'utf8', stdio: 'pipe' }).trim();
  } catch (err) {
    return '';
  }
}

function getPrimaryBranch() {
  const branches = runOutput('git branch --list main master');
  if (branches.includes('main')) return 'main';
  if (branches.includes('master')) return 'master';
  return 'main';
}

function getCurrentBranch() {
  return runOutput('git branch --show-current');
}

function ensureWorkingTreeClean() {
  const status = runOutput('git status --porcelain');
  if (status.length > 0) {
    console.error('❌ Error: Working tree contains uncommitted changes. Please stash or commit before proceeding:');
    console.error(status);
    process.exit(1);
  }
}

function updateJsonVersion(filePath, newVersion) {
  const fullPath = path.join(rootDir, filePath);
  if (fs.existsSync(fullPath)) {
    const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    data.version = newVersion;
    fs.writeFileSync(fullPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
    console.log(`  -> Updated ${filePath} to version ${newVersion}`);
  }
}

function startCandidate(version) {
  if (!version) {
    console.error('❌ Error: Please specify a candidate version (e.g., node scripts/git_workflow.js start 1.3.1)');
    process.exit(1);
  }

  const cleanVersion = version.replace(/^v/, '');
  const candidateBranch = `candidate/v${cleanVersion}`;
  const primaryBranch = getPrimaryBranch();

  console.log(`\n🚀 Initializing Release Candidate v${cleanVersion}...`);
  ensureWorkingTreeClean();

  console.log(`🔄 Switching to ${primaryBranch} and syncing with origin...`);
  run(`git checkout ${primaryBranch}`);
  try {
    run(`git pull origin ${primaryBranch}`);
  } catch (e) {
    console.log(`  (Note: could not pull from origin ${primaryBranch}, continuing with local)`);
  }

  console.log(`🌿 Creating candidate branch: ${candidateBranch}...`);
  run(`git checkout -b ${candidateBranch}`);

  console.log(`📝 Updating version numbers to ${cleanVersion}...`);
  updateJsonVersion('manifest.json', cleanVersion);
  updateJsonVersion('package.json', cleanVersion);

  console.log(`⚡ Rebuilding extension bundles with new version...`);
  run('npm run build');

  console.log(`💾 Committing candidate initialization...`);
  run('git add manifest.json package.json dist/');
  run(`git commit -m "chore: start release candidate v${cleanVersion}"`);

  console.log(`\n✅ Candidate branch '${candidateBranch}' is active and ready!`);
  console.log(`👉 You can now work and commit freely on '${candidateBranch}'.`);
  console.log(`👉 When all features & tests are green, release to ${primaryBranch} via:`);
  console.log(`   npm run candidate:finish ${cleanVersion}\n`);
}

function showStatus() {
  const current = getCurrentBranch();
  const primary = getPrimaryBranch();
  console.log(`\n📌 Git Release Workflow Status:`);
  console.log(`  - Current Branch: ${current}`);
  console.log(`  - Primary Branch: ${primary}`);

  if (current.startsWith('candidate/')) {
    const diffCount = runOutput(`git rev-list --count ${primary}..${current}`);
    console.log(`  - Commits ahead of ${primary}: ${diffCount}`);
    console.log(`  - Status: Release Candidate development in progress.`);
  } else if (current === primary) {
    console.log(`  - Status: On production branch (${primary}). Ready to start next candidate.`);
  } else {
    console.log(`  - Status: On branch '${current}'.`);
  }

  const changes = runOutput('git status --short');
  if (changes) {
    console.log(`\n📁 Uncommitted Changes:`);
    console.log(changes);
  } else {
    console.log(`  - Working Tree: Clean 🟢`);
  }
  console.log('');
}

function finishCandidate(version) {
  const current = getCurrentBranch();
  const primary = getPrimaryBranch();

  let targetVersion = version ? version.replace(/^v/, '') : null;
  if (!targetVersion && current.startsWith('candidate/v')) {
    targetVersion = current.replace('candidate/v', '');
  }

  if (!targetVersion) {
    console.error('❌ Error: Could not determine release version. Please specify it (e.g. npm run candidate:finish 1.3.1)');
    process.exit(1);
  }

  const candidateBranch = `candidate/v${targetVersion}`;

  console.log(`\n🏁 Finalizing Release v${targetVersion} from branch '${candidateBranch}' to '${primary}'...`);
  ensureWorkingTreeClean();

  // 1. Quality Gates
  console.log('\n--- [Quality Gate 1/4] Compiling Bundles ---');
  run('npm run build');

  console.log('\n--- [Quality Gate 2/4] Syntax Integrity Check ---');
  run('npm run check');

  console.log('\n--- [Quality Gate 3/4] Automated Tests & Coverage (> 80%) ---');
  run('npm test');

  console.log('\n--- [Quality Gate 4/4] Generating Release Archive ---');
  run('node scripts/package.js');

  // Stage any updated dist or package files
  run('git add -A');
  const stagedChanges = runOutput('git diff --cached --name-only');
  if (stagedChanges.length > 0) {
    run(`git commit -m "chore(release): synchronize distribution bundles for v${targetVersion}"`);
  }

  // 2. Checkout Primary branch and pull
  console.log(`\n🔄 Switching to ${primary} and pulling latest updates...`);
  run(`git checkout ${primary}`);
  try {
    run(`git pull origin ${primary}`);
  } catch (e) {
    console.log(`  (Note: could not pull from origin ${primary}, continuing with local)`);
  }

  // 3. Squash Merge Candidate into Primary
  console.log(`\n🔀 Merging '${candidateBranch}' into '${primary}' (Squash - 1 single commit for the release)...`);
  run(`git merge --squash ${candidateBranch}`);

  const releaseCommitMsg = `release: v${targetVersion} - production release candidate consolidation`;
  run(`git commit -m "${releaseCommitMsg}"`);

  // 4. Tag the Release
  const tagName = `v${targetVersion}`;
  const existingTag = runOutput(`git tag -l ${tagName}`);
  if (existingTag) {
    console.log(`  ⚠️ Tag ${tagName} already exists, skipping tag creation.`);
  } else {
    console.log(`🏷️  Creating annotated tag ${tagName}...`);
    run(`git tag -a "${tagName}" -m "Release ${tagName}"`);
  }

  // 5. Push to GitHub
  console.log(`\n🚀 Pushing '${primary}', tag '${tagName}', and '${candidateBranch}' to origin...`);
  try {
    run(`git push origin ${primary} --tags`);
    run(`git push origin ${candidateBranch}`);
    console.log(`  -> Successfully pushed to GitHub!`);
  } catch (err) {
    console.error(`  ⚠️ Git push failed or remote was unreachable. You can manually run:`);
    console.error(`     git push origin ${primary} --tags && git push origin ${candidateBranch}`);
  }

  console.log(`\n🎉 RELEASE v${targetVersion} SUCCESSFULLY COMPLETED!`);
  console.log(`  - Branch '${primary}': Exactly ONE single clean commit for v${targetVersion} 🟢`);
  console.log(`  - Branch '${candidateBranch}': Full granular commit history preserved 🟢`);
  console.log(`  - Tag: ${tagName} created and synced 🟢\n`);
}

// Command routing
switch (action) {
  case 'start':
    startCandidate(versionArg);
    break;
  case 'status':
    showStatus();
    break;
  case 'finish':
  case 'release':
    finishCandidate(versionArg);
    break;
  default:
    console.log(`
Usage: node scripts/git_workflow.js <command> [version]

Commands:
  start <version>   Start a new candidate branch off primary branch (e.g. start 1.3.1)
  status            Show status of current candidate branch and uncommitted files
  finish [version]  Run quality gates, squash candidate into primary, tag, and push

Examples:
  npm run candidate:start 1.3.1
  npm run candidate:status
  npm run candidate:finish 1.3.1
`);
    process.exit(1);
}
