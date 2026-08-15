# harness/run.ps1 — Run the IsaacVerse video agent harness
# Usage: .\harness\run.ps1 "your query here"

$PYTHON = "C:\Users\DELL\AppData\Local\Programs\Python\Python313\python.exe"
$HARNESS_DIR = "$PSScriptRoot"

# Check API key
$hasKey = $false
foreach ($k in @("GOOGLE_API_KEY", "ANTHROPIC_API_KEY", "OPENAI_API_KEY", "OPENROUTER_API_KEY")) {
    if ([Environment]::GetEnvironmentVariable($k)) { $hasKey = $true; break }
}
if (-not $hasKey) {
    Write-Host "ERROR: No API key found." -ForegroundColor Red
    Write-Host "Set one: `$env:GOOGLE_API_KEY = 'your-key'"
    Write-Host "Or:     `$env:ANTHROPIC_API_KEY = 'your-key'"
    exit 1
}

$query = if ($args.Count -gt 0) { $args -join " " } else { "What can you do?" }
Write-Host "[harness] Running with query: $query`n" -ForegroundColor Cyan

& $PYTHON "$HARNESS_DIR\agent.py" $query
