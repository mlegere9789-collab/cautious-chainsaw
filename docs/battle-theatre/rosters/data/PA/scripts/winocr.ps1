# Windows.Media.Ocr (built into Windows 10/11, offline, no account) on image files.
# usage: powershell -File winocr.ps1 -InList list.txt -Out out.jsonl
# list.txt: one image path per line. Output: one JSON object per image: {file, lines:[{text, x, y, w, h}]}
param([string]$InList, [string]$Out)
$ErrorActionPreference = 'Stop'
[System.Diagnostics.Process]::GetCurrentProcess().PriorityClass = 'BelowNormal'
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType = WindowsRuntime]
$null = [Windows.Graphics.Imaging.BitmapDecoder, Windows.Foundation, ContentType = WindowsRuntime]
$null = [Windows.Storage.StorageFile, Windows.Foundation, ContentType = WindowsRuntime]
$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]
function Await($op, $type) {
    $t = $asTaskGeneric.MakeGenericMethod($type).Invoke($null, @($op))
    $null = $t.Wait(-1)
    return $t.Result
}
$engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
$done = @{}
if (Test-Path $Out) { Get-Content $Out | ForEach-Object { try { $done[($_ | ConvertFrom-Json).file] = 1 } catch {} } }
foreach ($path0 in Get-Content $InList) {
    $path = [string]$path0
    if ($done.ContainsKey($path)) { continue }
    try {
        $file = Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync($path)) ([Windows.Storage.StorageFile])
        $stream = Await ($file.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
        $decoder = Await ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
        $bmp = Await ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
        $res = Await ($engine.RecognizeAsync($bmp)) ([Windows.Media.Ocr.OcrResult])
        $lines = @()
        foreach ($l in $res.Lines) {
            $ws = @($l.Words)
            $x0 = ($ws | ForEach-Object { $_.BoundingRect.X } | Measure-Object -Minimum).Minimum
            $y0 = ($ws | ForEach-Object { $_.BoundingRect.Y } | Measure-Object -Minimum).Minimum
            $x1 = ($ws | ForEach-Object { $_.BoundingRect.X + $_.BoundingRect.Width } | Measure-Object -Maximum).Maximum
            $y1 = ($ws | ForEach-Object { $_.BoundingRect.Y + $_.BoundingRect.Height } | Measure-Object -Maximum).Maximum
            $lines += [pscustomobject]@{ text = $l.Text; x = [int]$x0; y = [int]$y0; w = [int]($x1 - $x0); h = [int]($y1 - $y0) }
        }
        $obj = [pscustomobject]@{ file = $path; w = $bmp.PixelWidth; h = $bmp.PixelHeight; lines = $lines }
        ($obj | ConvertTo-Json -Compress -Depth 5) | Add-Content -Path $Out -Encoding UTF8
        $stream.Dispose()
    } catch {
        ([pscustomobject]@{ file = $path; error = $_.Exception.Message } | ConvertTo-Json -Compress) | Add-Content -Path $Out -Encoding UTF8
    }
}
