# scripts/generate_store_screenshots.ps1
# Generates authentic Chrome Web Store presentation screenshots at exact 1280x800 dimensions.

$ErrorActionPreference = "Stop"

$repoRoot = "e:\Dev\Projets\ChromeExtension"
$storeDir = "$repoRoot\store-assets"
$templateDir = "$storeDir\templates"
$edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

if (-not (Test-Path $edge)) {
  throw "Microsoft Edge not found at $edge"
}

$css = Get-Content -Raw -Path "$repoRoot\content.css"

$screens = @(
  @{
    template = "$templateDir\screenshot-1.html"
    output   = "$storeDir\screenshot-1-instant-summary.png"
    name     = "Screenshot 1: Synthèse IA Instantanée"
  },
  @{
    template = "$templateDir\screenshot-2.html"
    output   = "$storeDir\screenshot-2-interactive-chat.png"
    name     = "Screenshot 2: Chat & Q&A Interactif"
  },
  @{
    template = "$templateDir\screenshot-3.html"
    output   = "$storeDir\screenshot-3-local-and-cloud-ai.png"
    name     = "Screenshot 3: Réglages & Modèles Locaux"
  },
  @{
    template = "$templateDir\screenshot-4.html"
    output   = "$storeDir\screenshot-4-multilingual-and-export.png"
    name     = "Screenshot 4: Transcription & Multi-Formats"
  }
)

foreach ($s in $screens) {
  Write-Host "Rendering $($s.name)..."
  $html = Get-Content -Raw -Path $s.template
  
  # Ensure content.css is inlined so Edge headless renders with 100% fidelity without subresource restrictions
  $inlined = $html -replace '<link rel="stylesheet" href="../../content.css">', "<style>`n$css`n</style>"
  
  $tempHtml = "$storeDir\templates\_temp_render.html"
  Set-Content -Path $tempHtml -Value $inlined -Encoding utf8

  $fileUri = "file:///" + ($tempHtml -replace '\\', '/')
  Start-Process -FilePath $edge -ArgumentList "--headless", "--disable-gpu", "--hide-scrollbars", "--window-size=1280,800", "--screenshot=`"$($s.output)`"", "`"$fileUri`"" -Wait

  if (Test-Path $tempHtml) {
    Remove-Item $tempHtml -Force
  }
}

Write-Host "`nAll 4 screenshots rendered successfully:"
Get-Item "$storeDir\screenshot-*.png" | Select-Object Name, Length, LastWriteTime | Format-Table -AutoSize
