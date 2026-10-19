<#
.SYNOPSIS
  Generates the official 1080p English promotional video for YouTube AI Summarizer.
.DESCRIPTION
  1. Generates studio-quality neural voiceover audio via Edge-TTS (en-US-ChristopherNeural).
  2. Renders realistic YouTube interface HTML5 slides to 1920x1080 PNG via Microsoft Edge headless.
  3. Pads audio with natural lead-in and lead-out timings.
  4. Encodes synchronized 1080p video clips using FFmpeg (H.264 / AAC).
  5. Concatenates all scenes into a final broadcast-ready MP4 promo video.
#>

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  YouTube AI Summarizer - Promo Video Generator" -ForegroundColor Cyan
Write-Host "  Studio Neural Voiceover + Realistic YouTube UI" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Check prerequisites
$EdgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path $EdgePath)) {
    $EdgePath = "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
}
if (-not (Test-Path $EdgePath)) {
    throw "Microsoft Edge executable not found at expected paths."
}

$FfmpegCmd = Get-Command "ffmpeg" -ErrorAction SilentlyContinue
if (-not $FfmpegCmd) {
    throw "FFmpeg command was not found in PATH."
}

# 2. Step 1: Generate Studio Neural Voiceovers via Python edge-tts
Write-Host "`n>>> [Step 1/4] Generating Studio Neural Voiceovers (edge-tts)..." -ForegroundColor Yellow
$PythonCmd = Get-Command "python" -ErrorAction SilentlyContinue
if ($PythonCmd) {
    & python "$ScriptDir\generate-audio.py"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Warning: generate-audio.py returned code $LASTEXITCODE. Checking if audio files exist..." -ForegroundColor Yellow
    }
}

# 3. Define Scene data
$Scenes = @(
    @{
        Id = 1
        Html = "scene-1.html"
        Image = "scene-1.png"
        AudioSource = "audio-1.mp3"
        AudioPadded = "audio-1-pad.wav"
        VideoClip = "clip-1.mp4"
    },
    @{
        Id = 2
        Html = "scene-2.html"
        Image = "scene-2.png"
        AudioSource = "audio-2.mp3"
        AudioPadded = "audio-2-pad.wav"
        VideoClip = "clip-2.mp4"
    },
    @{
        Id = 3
        Html = "scene-3.html"
        Image = "scene-3.png"
        AudioSource = "audio-3.mp3"
        AudioPadded = "audio-3-pad.wav"
        VideoClip = "clip-3.mp4"
    },
    @{
        Id = 4
        Html = "scene-4.html"
        Image = "scene-4.png"
        AudioSource = "audio-4.mp3"
        AudioPadded = "audio-4-pad.wav"
        VideoClip = "clip-4.mp4"
    },
    @{
        Id = 5
        Html = "scene-5.html"
        Image = "scene-5.png"
        AudioSource = "audio-5.mp3"
        AudioPadded = "audio-5-pad.wav"
        VideoClip = "clip-5.mp4"
    }
)

# 4. Process Each Scene
$ClipList = [System.Collections.Generic.List[string]]::new()

foreach ($Scene in $Scenes) {
    Write-Host "`n>>> Processing Scene $($Scene.Id)..." -ForegroundColor Yellow

    # Step A: Render HTML slide to 1080p PNG
    $HtmlUri = "file:///" + (Resolve-Path $Scene.Html).Path.Replace("\", "/")
    $ImgOut = (Resolve-Path .).Path + "\" + $Scene.Image
    Write-Host "  [1/3] Rendering 1920x1080 Slide: $($Scene.Html) -> $($Scene.Image)" -ForegroundColor Gray

    $EdgeArgs = @(
        "--headless",
        "--disable-gpu",
        "--hide-scrollbars",
        "--window-size=1920,1080",
        "--screenshot=$ImgOut",
        "$HtmlUri"
    )
    $proc = Start-Process -FilePath $EdgePath -ArgumentList $EdgeArgs -Wait -PassThru
    if ($proc.ExitCode -ne 0 -or -not (Test-Path $ImgOut)) {
        throw "Failed to render slide image for scene $($Scene.Id)"
    }

    # Step B: Pad neural audio with 0.35s lead-in and 0.65s lead-out for natural breathing room
    $AudioSrcPath = Join-Path $ScriptDir $Scene.AudioSource
    if (-not (Test-Path $AudioSrcPath)) {
        throw "Missing audio file: $AudioSrcPath"
    }
    $AudioPadPath = Join-Path $ScriptDir $Scene.AudioPadded
    Write-Host "  [2/3] Padding neural audio with FFmpeg..." -ForegroundColor Gray
    $FfPadArgs = "-y -i `"$AudioSrcPath`" -af `"adelay=350|350,apad=pad_dur=0.65`" `"$AudioPadPath`""
    $padProc = Start-Process -FilePath "ffmpeg" -ArgumentList $FfPadArgs -Wait -NoNewWindow -PassThru
    if ($padProc.ExitCode -ne 0) {
        throw "FFmpeg audio padding failed for scene $($Scene.Id)"
    }

    # Step C: Encode synchronized 1080p MP4 clip
    $ClipPath = Join-Path $ScriptDir $Scene.VideoClip
    Write-Host "  [3/3] Encoding Scene Video Clip: $($Scene.VideoClip)..." -ForegroundColor Gray
    $FfEncArgs = "-y -loop 1 -i `"$ImgOut`" -i `"$AudioPadPath`" -c:v libx264 -tune stillimage -pix_fmt yuv420p -r 30 -c:a aac -b:a 192k -shortest `"$ClipPath`""
    $encProc = Start-Process -FilePath "ffmpeg" -ArgumentList $FfEncArgs -Wait -NoNewWindow -PassThru
    if ($encProc.ExitCode -ne 0) {
        throw "FFmpeg video clip encode failed for scene $($Scene.Id)"
    }

    $ClipList.Add("file '$($Scene.VideoClip)'")
}

# 5. Concatenate all scenes into master promo video
Write-Host "`n>>> Concatenating all scenes into master video..." -ForegroundColor Yellow
$ConcatFile = Join-Path $ScriptDir "concat-list.txt"
$ClipList | Set-Content -Path $ConcatFile -Encoding ASCII

$FinalVideo = Join-Path $ScriptDir "youtube-ai-summarizer-promo.mp4"
$FfConcatArgs = "-y -f concat -safe 0 -i `"$ConcatFile`" -c copy `"$FinalVideo`""
$catProc = Start-Process -FilePath "ffmpeg" -ArgumentList $FfConcatArgs -Wait -NoNewWindow -PassThru
if ($catProc.ExitCode -ne 0) {
    throw "FFmpeg concatenation failed."
}

# 6. Verify final video
if (Test-Path $FinalVideo) {
    $VideoItem = Get-Item $FinalVideo
    $SizeMB = [math]::Round($VideoItem.Length / 1MB, 2)
    Write-Host "`n==========================================================" -ForegroundColor Green
    Write-Host "  SUCCESS! Promo video created successfully." -ForegroundColor Green
    Write-Host "  File: $($FinalVideo)" -ForegroundColor White
    Write-Host "  Size: $($SizeMB) MB" -ForegroundColor White
    Write-Host "==========================================================" -ForegroundColor Green
} else {
    throw "Final promo video was not found!"
}
