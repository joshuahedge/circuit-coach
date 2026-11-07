# Usage: tests/run-tests.ps1 [-Grep <text>] [-Port <n>] [-WaitSeconds <n>]
# -WaitSeconds is how long to wait for the results (default 45), for each of the run and its one retry.
param([string]$Grep = '', [int]$Port = 0, [int]$WaitSeconds = 45)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$edge = @("${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe", "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe") |
  Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $edge) { Write-Output 'Microsoft Edge not found'; exit 2 }
$serve = Join-Path $PSScriptRoot 'serve.py'

# Runs the test page once and returns @{ Ready; Text; ErrTail }. Ready is false when the server never came
# up. Text is the page's results, or '' when they did not arrive in time (then ErrTail holds Edge's stderr).
# The test page POSTs its results to serve.py, which writes them to a file this function polls on the real
# clock. (Edge's virtual-time mode froze the page clock, so the long-run time budget could never fail.)
function Invoke-TestRun([int]$WantedPort) {
  # One GUID names this run's profile, results and stderr files, so back-to-back runs never share them.
  $runId = [guid]::NewGuid().ToString('N')
  $profileDir = Join-Path $env:TEMP ("src-edge-" + $runId)
  $resultsFile = Join-Path $env:TEMP ("src-test-results-" + $runId + ".txt")
  $outFile = Join-Path $env:TEMP ("src-test-edge-stdout-" + $runId + ".txt")
  $errFile = Join-Path $env:TEMP ("src-test-edge-stderr-" + $runId + ".txt")
  # Port 0 means pick a free one. The listener is stopped before serve.py binds the port.
  $runPort = $WantedPort
  if ($runPort -eq 0) {
    $l = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 0); $l.Start(); $runPort = $l.LocalEndpoint.Port; $l.Stop()
  }
  $server = Start-Process -FilePath python -ArgumentList "`"$serve`"", "$runPort", "`"$root`"", "`"$resultsFile`"" -PassThru -WindowStyle Hidden
  $result = @{ Ready = $false; Text = ''; ErrTail = '' }
  try {
    for ($i = 0; $i -lt 40; $i++) {
      if ($server.HasExited) { break }
      try {
        $r = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$runPort/tests/index.html" -TimeoutSec 2
        if ($r.StatusCode -eq 200) { $result.Ready = $true; break }
      } catch { Start-Sleep -Milliseconds 250 }
    }
    if ($result.Ready) {
      $url = "http://127.0.0.1:$runPort/tests/index.html"
      if ($Grep) { $url += '?grep=' + [uri]::EscapeDataString($Grep) }
      $edgeArgs = @('--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-sync',
        '--disable-background-networking', '--disable-component-update', '--disable-extensions', '--disable-default-apps',
        '--no-pings', '--metrics-recording-only', "--user-data-dir=`"$profileDir`"", $url)
      Start-Process -FilePath $edge -ArgumentList $edgeArgs -RedirectStandardOutput $outFile -RedirectStandardError $errFile -WindowStyle Hidden | Out-Null
      $clock = [Diagnostics.Stopwatch]::StartNew()
      while ($clock.Elapsed.TotalSeconds -lt $WaitSeconds -and -not (Test-Path -LiteralPath $resultsFile)) { Start-Sleep -Milliseconds 100 }
      if (Test-Path -LiteralPath $resultsFile) {
        # serve.py renames a finished temp file into place, so the file is complete once it exists.
        $result.Text = [System.IO.File]::ReadAllText($resultsFile, [System.Text.Encoding]::UTF8)
      } else {
        try { $result.ErrTail = (Get-Content -LiteralPath $errFile -Tail 20 -ErrorAction Stop) -join "`n" } catch { }
      }
    }
  } finally {
    Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue
    # Stop only the Edge processes that use this run's profile (root and children), then remove the profile
    # and this run's files. Cleanup must never fail the run, so errors are ignored, and the query and the
    # deletes are in separate try blocks so a failed query still lets the deletes happen.
    try {
      Get-CimInstance Win32_Process -Filter "Name='msedge.exe'" | Where-Object { $_.CommandLine -like "*$profileDir*" } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
    } catch { }
    try {
      for ($try = 0; $try -lt 5 -and (Test-Path -LiteralPath $profileDir); $try++) {
        if ($try -gt 0) { Start-Sleep -Milliseconds 200 }
        Remove-Item -LiteralPath $profileDir -Recurse -Force -ErrorAction SilentlyContinue
      }
      foreach ($f in @($resultsFile, "$resultsFile.tmp", $outFile, $errFile)) {
        for ($try = 0; $try -lt 5 -and (Test-Path -LiteralPath $f); $try++) {
          if ($try -gt 0) { Start-Sleep -Milliseconds 200 }
          Remove-Item -LiteralPath $f -Force -ErrorAction SilentlyContinue
        }
      }
    } catch { }
  }
  return $result
}

$run = Invoke-TestRun $Port
if ($run.Ready -and -not $run.Text) {
  # Never saw results: show what Edge said, then give the whole run one more go on a fresh port and profile.
  if ($run.ErrTail) { Write-Output 'Last lines of Edge stderr:'; Write-Output $run.ErrTail }
  Write-Output 'TIMEOUT, retrying once'
  $run = Invoke-TestRun 0
  if ($run.Ready -and -not $run.Text) {
    if ($run.ErrTail) { Write-Output 'Last lines of Edge stderr:'; Write-Output $run.ErrTail }
    Write-Output 'TIMEOUT: tests did not finish'
    exit 1
  }
}
if (-not $run.Ready) { Write-Output 'SERVER NOT READY'; exit 1 }
Write-Output $run.Text
if ($run.Text -match '(?m)^ALL PASSED\s*$') { exit 0 } else { exit 1 }
