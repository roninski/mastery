$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

$venv = Join-Path $root ".venv"
$python = Join-Path $venv "Scripts\python.exe"
$pip = Join-Path $venv "Scripts\pip.exe"

if (-not (Test-Path $python)) {
    Write-Host "Creating virtual environment..."
    python -m venv $venv
}

$req = Join-Path $root "requirements.txt"
$stamp = Join-Path $venv ".installed"

$reqHash = (Get-FileHash $req -Algorithm MD5).Hash
$installedHash = if (Test-Path $stamp) { Get-Content $stamp } else { "" }

if ($reqHash -ne $installedHash) {
    Write-Host "Installing dependencies..."
    & $pip install -r $req --quiet
    $reqHash | Set-Content $stamp
}

Write-Host "Starting Mastery..."
& $python (Join-Path $root "main.py")
