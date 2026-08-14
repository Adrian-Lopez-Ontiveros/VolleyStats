$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$src = Join-Path $root "public\logo.png"
if (-not (Test-Path $src)) {
  $src = Join-Path $root "public\icons\logo.png"
}
if (-not (Test-Path $src)) {
  throw "Missing public/logo.png"
}

$outDir = Join-Path $root "public\icons"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$img = [System.Drawing.Image]::FromFile($src)

function Save-Png([int]$size, [string]$path) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $g.Clear([System.Drawing.Color]::White)
  $g.DrawImage($img, 0, 0, $size, $size)
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose()
  $bmp.Dispose()
}

function Save-Ico([string]$pngPath, [string]$icoPath) {
  $png = [System.IO.File]::ReadAllBytes($pngPath)
  $fs = [System.IO.File]::Create($icoPath)
  $bw = New-Object System.IO.BinaryWriter $fs
  $bw.Write([uint16]0)
  $bw.Write([uint16]1)
  $bw.Write([uint16]1)
  $size = if ($png.Length -gt 0) { 32 } else { 0 }
  $bw.Write([byte]$size)
  $bw.Write([byte]$size)
  $bw.Write([byte]0)
  $bw.Write([byte]0)
  $bw.Write([uint16]1)
  $bw.Write([uint16]32)
  $bw.Write([uint32]$png.Length)
  $bw.Write([uint32]22)
  $bw.Write($png)
  $bw.Flush()
  $bw.Close()
}

Save-Png 192 (Join-Path $outDir "icon-192.png")
Save-Png 512 (Join-Path $outDir "icon-512.png")
Save-Png 180 (Join-Path $outDir "apple-touch-icon.png")
Save-Png 32 (Join-Path $root "public\favicon-32.png")
Save-Ico (Join-Path $root "public\favicon-32.png") (Join-Path $root "public\favicon.ico")

$img.Dispose()
Write-Output "icons generated from official logo"
