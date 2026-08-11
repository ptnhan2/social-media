$ErrorActionPreference = "Continue"

$source = Join-Path $PSScriptRoot "source"
$items = @(
  @{ Id = "ciAywjey0cY"; Name = "04 - How I Actually Edit Viral Videos" },
  @{ Id = "KhQTKG3Xtbs"; Name = "03 - How I Actually Make AI Voice Sound Real" },
  @{ Id = "cX8c3R2LFd4"; Name = "02 - How I Actually Write Viral Scripts" },
  @{ Id = "mI7cq4uHCZ4"; Name = "06 - How I Actually Make Viral Thumbnails" },
  @{ Id = "82Mpsgc8cLM"; Name = "01 - How I Blew Up My Youtube Channel" },
  @{ Id = "_rXj297vYYs"; Name = "05 - I Tried Making a Viral AI Video" },
  @{ Id = "GPoti7DZsME"; Name = "07 - How I Broke Youtube with 1 Video" },
  @{ Id = "X1WJlNUJOgg"; Name = "08 - I Tried Youtube Shorts for 365 Days" }
)

foreach ($item in $items) {
  $target = Join-Path $source ("{0}.mp4" -f $item.Name)
  if (Test-Path -LiteralPath $target) {
    "SKIP (exists): $($item.Name)"
    continue
  }

  "===== Downloading: $($item.Name) ====="
  yt-dlp --no-update --no-warnings --retries 5 --fragment-retries 5 --sleep-requests 1 `
    -f "bestvideo[height<=720]+bestaudio/best[height<=720]" `
    --merge-output-format mp4 --write-info-json --write-thumbnail `
    -o "$source\$($item.Name).%(ext)s" "https://www.youtube.com/watch?v=$($item.Id)"

  if ($LASTEXITCODE -ne 0) {
    "FAILED ($LASTEXITCODE): $($item.Name)"
  } else {
    "DONE: $($item.Name)"
  }
  Start-Sleep -Seconds 3
}
