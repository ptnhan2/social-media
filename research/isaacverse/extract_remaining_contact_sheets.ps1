$ErrorActionPreference = "Continue"
$items = @(
  @{ Dir = "01-growth"; File = "01 - How I Blew Up My Youtube Channel.mp4" },
  @{ Dir = "05-ai-video"; File = "05 - I Tried Making a Viral AI Video.mp4" },
  @{ Dir = "07-one-video"; File = "07 - How I Broke Youtube with 1 Video.mp4" },
  @{ Dir = "08-shorts"; File = "08 - I Tried Youtube Shorts for 365 Days.mp4" }
)

foreach ($item in $items) {
  $outDir = Join-Path $PSScriptRoot ("forensics\{0}\frames" -f $item.Dir)
  if (-not (Test-Path -LiteralPath $outDir)) { New-Item -ItemType Directory -Path $outDir -Force | Out-Null }
  $input = Join-Path $PSScriptRoot ("source\{0}" -f $item.File)
  "===== $($item.Dir) ====="
  ffmpeg -hide_banner -loglevel error -y -i $input -vf "fps=1/20,scale=300:-2,tile=5x5:padding=4:margin=4" -q:v 3 (Join-Path $outDir "contact-%03d.jpg")
  "DONE $($item.Dir)"
  Start-Sleep -Seconds 2
}
