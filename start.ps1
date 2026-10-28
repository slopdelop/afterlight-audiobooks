param([switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$node = (Get-Command node -ErrorAction Stop).Source
& $node (Join-Path $PSScriptRoot 'tools/build.mjs')
if ($LASTEXITCODE -ne 0) { throw 'Afterlight build failed.' }
$url = 'http://127.0.0.1:8770'
$running = $false
try { $running = (Invoke-RestMethod "$url/health" -TimeoutSec 2).app -eq 'afterlight' } catch {}
if (!$running) {
    $python = (Get-Command python -ErrorAction Stop).Source
    $serverScript = Join-Path $PSScriptRoot 'serve.py'
    $arguments = @('-u', ('"' + $serverScript + '"'), '--port', '8770')
    Start-Process -FilePath $python -ArgumentList $arguments -WindowStyle Hidden
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
        Start-Sleep -Milliseconds 200
        try { $running = (Invoke-RestMethod "$url/health" -TimeoutSec 1).app -eq 'afterlight' } catch {}
        if ($running) { break }
    }
    if (!$running) { throw 'Could not start Afterlight. Port 8770 may already be in use.' }
}
Write-Output "Afterlight is ready at $url"
if (!$NoBrowser) { Start-Process $url }
