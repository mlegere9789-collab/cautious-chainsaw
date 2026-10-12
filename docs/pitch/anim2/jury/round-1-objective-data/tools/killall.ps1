param([switch]$ListOnly)
# kills every node / chrome process whose command line mentions look-dev\objective (or look-dev/objective), i.e. only this job's harness and its browsers
$me = $PID
$procs = Get-CimInstance Win32_Process | Where-Object { $_.ProcessId -ne $me -and ($_.Name -match '^(node|chrome)(\.exe)?$') -and ($_.CommandLine -match 'look-dev[\\/]objective') }
foreach ($p in $procs) {
  if ($ListOnly) { "{0} {1} {2}" -f $p.ProcessId, $p.Name, $p.CommandLine.Substring(0, [Math]::Min(120, $p.CommandLine.Length)) }
  else { try { Stop-Process -Id $p.ProcessId -Force -ErrorAction Stop } catch { } }
}
"matched: " + @($procs).Count
