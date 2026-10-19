# 🌿 Git Candidate & Release Workflow Methodology

This document outlines the strict branching and release methodology used in the **YouTube Summarizer AI** project to keep the production branch (`main`) clean, readable, and linear while maintaining complete granular commit history on candidate branches.

---

## 🎯 Core Principles

1. **`main` is Strictly for Releases** :
   - Contains **only production-ready releases**.
   - Exactly **ONE commit per release version** (e.g. `release: v1.3.0`, `release: v1.3.1`).
   - Every release commit is tagged with an annotated semantic tag (`vX.Y.Z`).
   - Direct, uncoordinated commits to `main` are strictly forbidden.

2. **In-Progress Work Lives on Candidate Branches (`candidate/vX.Y.Z`)** :
   - All feature development, bug fixes, refactorings, test authoring, and WIP commits take place on a candidate branch (e.g. `candidate/v1.3.1`).
   - Developers commit atomically and frequently without worrying about polluting `main`.
   - Continuous Integration (GitHub Actions) automatically runs on candidate branches to ensure test suite and coverage compliance (> 80%).

3. **Automated Squash Consolidation on Release** :
   - When a release is finalized, the candidate branch is consolidated into `main` via a **squash merge**.
   - As a result:
     - `main` receives exactly **1 single, clean commit** representing the release.
     - The `candidate/vX.Y.Z` branch remains preserved on GitHub with all granular intermediate commits.

---

## 🛠️ CLI Automation Commands

Three npm / PowerShell scripts automate this entire lifecycle:

| Action | npm Command | PowerShell Command | Description |
| :--- | :--- | :--- | :--- |
| **Start Candidate** | `npm run candidate:start <version>` | `.\scripts\git_workflow.ps1 start <version>` | Pulls latest `main`, branches `candidate/v<version>`, bumps versions, rebuilds, and commits init. |
| **Check Status** | `npm run candidate:status` | `.\scripts\git_workflow.ps1 status` | Shows active candidate branch, commits ahead of `main`, and working tree health. |
| **Finish Release** | `npm run candidate:finish [version]` | `.\scripts\git_workflow.ps1 finish [version]` | Runs quality gates (build, check, tests >80%), packages zip, squashes to `main`, tags, and pushes. |

---

## 🚀 Step-by-Step Release Lifecycle

### Step 1 : Starting a New Candidate
When beginning work on the next version (e.g. `1.3.1`):
```bash
npm run candidate:start 1.3.1
```
This automatically:
1. Ensures your working tree is clean.
2. Checks out `main` and pulls latest upstream changes.
3. Creates and switches to `candidate/v1.3.1`.
4. Bumps version in `manifest.json` and `package.json` to `1.3.1`.
5. Compiles fresh distribution bundles via `npm run build`.
6. Commits: `chore: start release candidate v1.3.1`.

---

### Step 2 : Developing & Committing on the Candidate Branch
Develop your features, fix bugs, update tests:
```bash
# Work on code...
git add <files>
git commit -m "feat(ui): improve responsive layout"

# Push candidate branch to GitHub for CI verification
git push origin candidate/v1.3.1
```
GitHub Actions will run on every push to `candidate/v*` and verify syntax integrity and test coverage (> 80%).

---

### Step 3 : Finalizing the Release
When all features, bug fixes, and tests are complete:
```bash
npm run candidate:finish 1.3.1
```
This automatically executes the **4 Quality Gates**:
1. ⚡ **Gate 1 - Build**: Compiles all production bundles (`npm run build`).
2. 🔍 **Gate 2 - Syntax**: Runs JavaScript AST verification (`npm run check`).
3. 🧪 **Gate 3 - Tests & Coverage**: Executes the full test suite with coverage enforcement (`npm test`).
4. 📦 **Gate 4 - Packaging**: Generates `releases/youtube-summarizer-ai-v1.3.1.zip` dynamically.

Then it:
- Switches to `main` and syncs with origin.
- Performs a squash merge of `candidate/v1.3.1` into `main`.
- Creates a single release commit: `release: v1.3.1 - production release candidate consolidation`.
- Creates annotated tag `v1.3.1`.
- Pushes `main`, the tag `v1.3.1`, and `candidate/v1.3.1` to GitHub.

---

## 📊 Tree & History Representation

```text
main:         (v1.2.0) ──> [ release: v1.3.0 ] ──────────────────> [ release: v1.3.1 ]
                                \                                         ^ (squash merge)
                                 \                                       /
candidate/v1.3.1:                 ──> [ commit 1 ] ──> [ commit 2 ] ──> [ commit 3 ]
```

- **Visitors on GitHub viewing `main`**: See a clean release log with only major versions.
- **Developers auditing code**: Can switch to `candidate/v1.3.1` to inspect every individual step and experiment.
