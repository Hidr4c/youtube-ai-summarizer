<#
.SYNOPSIS
    Generates authentic Chrome Web Store promotional assets & video from live YouTube page.
.DESCRIPTION
    Launches browser automation with real extension loaded on a real YouTube video (no account / unauthenticated).
    Captures:
    - 4 Store Screenshots (1280x800): Summary, Chat, Settings, Transcript
    - 2 Promo Tiles: Marquee (1400x560) and Small (440x280)
    - 5 Video Scenes (1920x1080) and encodes master MP4 video via FFmpeg
.EXAMPLE
    .\scripts\generate_store_screenshots.ps1
#>

$ErrorActionPreference = "Stop"
$script = Join-Path $PSScriptRoot "generate_real_store_assets.js"
node $script
