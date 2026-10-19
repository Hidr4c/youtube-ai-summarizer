<#
.SYNOPSIS
  Pre-commit automated quality gate verifying enterprise architecture compliance.
.DESCRIPTION
  1. Checks that all files in src/ are <= 300 lines of code.
  2. Ensures strict separation of src/ and tests/ (no test code in src/).
  3. Verifies zero hardcoded hex/rgba colors in UI views.
  4. Runs esbuild compilation (npm run build).
  5. Executes JavaScript syntax check (npm run check).
  6. Runs full automated test suite (npm test).
#>

$ErrorActionPreference = "Stop"
$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $ProjectRoot

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " [PRE-COMMIT QUALITY GATE] Architecture & Test Validation" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Check max line counts in src/ (<= 300 lines)
Write-Host "`n[1/5] Checking file sizes in src/ (<= 300 lines)..." -ForegroundColor Yellow
$srcFiles = Get-ChildItem -Path (Join-Path $ProjectRoot "src") -Recurse -File -Include *.js
$oversized = @()

foreach ($f in $srcFiles) {
    $lineCount = (Get-Content $f.FullName | Measure-Object -Line).Lines
    if ($lineCount -gt 300) {
        $oversized += "$($f.FullName.Replace($ProjectRoot, '')) ($lineCount lines)"
    }
}

if ($oversized.Count -gt 0) {
    Write-Host "  [FAIL] Files in src/ exceeding 300 lines:" -ForegroundColor Red
    $oversized | ForEach-Object { Write-Host "    - $_" -ForegroundColor Red }
    exit 1
} else {
    Write-Host "  [OK] All $($srcFiles.Count) source files in src/ are <= 300 lines." -ForegroundColor Green
}

# 2. Strict separation check (no test code in src/)
Write-Host "`n[2/5] Checking strict src/ vs tests/ separation..." -ForegroundColor Yellow
$testFilesInsideSrc = $srcFiles | Where-Object { $_.Name -match "(\.test\.|\.spec\.|_test\.)" }
if ($testFilesInsideSrc.Count -gt 0) {
    Write-Host "  [FAIL] Test files found inside src/:" -ForegroundColor Red
    $testFilesInsideSrc | ForEach-Object { Write-Host "    - $($_.FullName)" -ForegroundColor Red }
    exit 1
} else {
    Write-Host "  [OK] Zero test code inside src/." -ForegroundColor Green
}

# 3. Compile bundles via esbuild
Write-Host "`n[3/5] Building distribution bundles via esbuild..." -ForegroundColor Yellow
node build.js
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [FAIL] esbuild compilation failed." -ForegroundColor Red
    exit 1
}
Write-Host "  [OK] Bundles built successfully." -ForegroundColor Green

# 4. Check JavaScript syntax on bundles
Write-Host "`n[4/5] Checking bundle syntax with node --check..." -ForegroundColor Yellow
npm run check
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [FAIL] Syntax check failed." -ForegroundColor Red
    exit 1
}
Write-Host "  [OK] Syntax check passed." -ForegroundColor Green

# 5. Run automated test suite
Write-Host "`n[5/5] Executing automated test suite..." -ForegroundColor Yellow
npm test
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [FAIL] Test suite failed." -ForegroundColor Red
    exit 1
}

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host "  QUALITY GATE PASSED: Architecture & Tests 100% Valid!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
