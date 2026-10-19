<#
.SYNOPSIS
  Generates the official 1080p English promotional video for YouTube AI Summarizer.
.DESCRIPTION
  1. Renders HTML5 scene slides to 1920x1080 PNG images via Microsoft Edge headless.
  2. Synthesizes English voiceover narration tracks via System.Speech.Synthesis (Microsoft Zira).
  3. Encodes synchronized video clips using FFmpeg (H.264 / AAC).
  4. Concatenates all scenes into a final broadcast-ready MP4 video.
#>

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  YouTube AI Summarizer - Promo Video Generator" -ForegroundColor Cyan
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

# 2. Define Scene data
$Scenes = @(
    @{
        Id = 1
        Html = "scene-1.html"
        Image = "scene-1.png"
        AudioRaw = "audio-1-raw.wav"
        AudioPadded = "audio-1.wav"
        VideoClip = "clip-1.mp4"
        Narration = "Tired of watching forty-minute videos just to find a single answer? Meet YouTube AI Summarizer - your intelligent video companion right inside YouTube."
    },
    @{
        Id = 2
        Html = "scene-2.html"
        Image = "scene-2.png"
        AudioRaw = "audio-2-raw.wav"
        AudioPadded = "audio-2.wav"
        VideoClip = "clip-2.mp4"
        Narration = "Generate comprehensive summaries in seconds. Choose between quick bullet points or detailed breakdowns, complete with clickable timestamps that jump straight to the key moments."
    },
    @{
        Id = 3
        Html = "scene-3.html"
        Image = "scene-3.png"
        AudioRaw = "audio-3-raw.wav"
        AudioPadded = "audio-3.wav"
        VideoClip = "clip-3.mp4"
        Narration = "Ask anything about the video in natural conversation. Search the transcript, extract code snippets, verify claims, and explore new ideas with smart suggestion chips."
    },
    @{
        Id = 4
        Html = "scene-4.html"
        Image = "scene-4.png"
        AudioRaw = "audio-4-raw.wav"
        AudioPadded = "audio-4.wav"
        VideoClip = "clip-4.mp4"
        Narration = "Your privacy comes first. Run models locally on your own machine with LM Studio or Ollama, or connect directly to Gemini, Groq, and OpenAI with your own API keys."
    },
    @{
        Id = 5
        Html = "scene-5.html"
        Image = "scene-5.png"
        AudioRaw = "audio-5-raw.wav"
        AudioPadded = "audio-5.wav"
        VideoClip = "clip-5.mp4"
        Narration = "Supporting eight languages with instant export to Markdown and JSON. Add YouTube AI Summarizer to Chrome today - fast, free, and open source!"
    }
)

# 3. Setup Speech Synthesizer
Add-Type -AssemblyName System.Speech
$Synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$Voice = $Synth.GetInstalledVoices() | Where-Object { $_.VoiceInfo.Culture.Name -like "en*" } | Select-Object -First 1
if ($Voice) {
    $Synth.SelectVoice($Voice.VoiceInfo.Name)
    Write-Host "[TTS] Selected English Voice: $($Voice.VoiceInfo.Name)" -ForegroundColor Green
} else {
    Write-Host "[TTS] Warning: English voice not found. Using default voice." -ForegroundColor Yellow
}
$Synth.Rate = 0  # Natural conversational pace

# 4. Process Each Scene
$ClipList = [System.Collections.Generic.List[string]]::new()

foreach ($Scene in $Scenes) {
    Write-Host "`n>>> Processing Scene $($Scene.Id)..." -ForegroundColor Yellow

    # Step A: Render HTML slide to 1080p PNG
    $HtmlUri = "file:///" + (Resolve-Path $Scene.Html).Path.Replace("\", "/")
    $ImgOut = (Resolve-Path .).Path + "\" + $Scene.Image
    Write-Host "  [1/4] Rendering 1920x1080 Slide: $($Scene.Html) -> $($Scene.Image)" -ForegroundColor Gray

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

    # Step B: Synthesize voiceover audio
    $AudioRawPath = Join-Path $ScriptDir $Scene.AudioRaw
    $AudioPadPath = Join-Path $ScriptDir $Scene.AudioPadded
    Write-Host "  [2/4] Synthesizing Voiceover narration..." -ForegroundColor Gray
    $Synth.SetOutputToWaveFile($AudioRawPath)
    $Synth.Speak($Scene.Narration)
    $Synth.SetOutputToNull()

    # Step C: Pad audio with 0.35s lead-in and 0.65s lead-out for natural breathing room
    Write-Host "  [3/4] Padding audio timeline with FFmpeg..." -ForegroundColor Gray
    $FfPadArgs = "-y -i `"$AudioRawPath`" -af `"adelay=350|350,apad=pad_dur=0.65`" `"$AudioPadPath`""
    $padProc = Start-Process -FilePath "ffmpeg" -ArgumentList $FfPadArgs -Wait -NoNewWindow -PassThru
    if ($padProc.ExitCode -ne 0) {
        throw "FFmpeg audio padding failed for scene $($Scene.Id)"
    }

    # Step D: Encode synchronized 1080p MP4 clip
    $ClipPath = Join-Path $ScriptDir $Scene.VideoClip
    Write-Host "  [4/4] Encoding Scene Video Clip: $($Scene.VideoClip)..." -ForegroundColor Gray
    $FfEncArgs = "-y -loop 1 -i `"$ImgOut`" -i `"$AudioPadPath`" -c:v libx264 -tune stillimage -pix_fmt yuv420p -r 30 -c:a aac -b:a 192k -shortest `"$ClipPath`""
    $encProc = Start-Process -FilePath "ffmpeg" -ArgumentList $FfEncArgs -Wait -NoNewWindow -PassThru
    if ($encProc.ExitCode -ne 0) {
        throw "FFmpeg video clip encode failed for scene $($Scene.Id)"
    }

    $ClipList.Add("file '$($Scene.VideoClip)'")
}

$Synth.Dispose()

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
