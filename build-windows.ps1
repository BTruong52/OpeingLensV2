param([ValidatePattern('^[A-Za-z0-9._-]+$')][string]$ReleaseName)
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$package = Get-Content -LiteralPath (Join-Path $root 'package.json') -Raw | ConvertFrom-Json
$lock = Get-Content -LiteralPath (Join-Path $root 'package-lock.json') -Raw | ConvertFrom-Json -AsHashtable
$runtime = Join-Path $root 'node_modules/electron/dist'
if (!(Test-Path -LiteralPath (Join-Path $runtime 'electron.exe'))) { throw 'Install project dependencies and the Windows x64 Electron runtime before building.' }
$name = if ($ReleaseName) { $ReleaseName } else { "Opening Lens v$($package.version)" }
$exeName = if ($ReleaseName) { "$ReleaseName.exe" } else { 'Opening Lens.exe' }
$stage = Join-Path $root ('.tools/release-' + [guid]::NewGuid().ToString('N'))
$bundle = Join-Path $stage $name
$appPath = Join-Path $bundle 'resources/app'
$output = Join-Path $root 'Releases'
$zipName = if ($ReleaseName) { "$ReleaseName-Windows-x64.zip" } else { "Opening-Lens-v$($package.version)-Windows-x64.zip" }
$zip = Join-Path $output $zipName
if (Test-Path -LiteralPath $zip) { throw "Release already exists: $zip" }
New-Item -ItemType Directory -Path $bundle,$output -Force | Out-Null
Get-ChildItem -LiteralPath $runtime -Force | Copy-Item -Destination $bundle -Recurse
Rename-Item -LiteralPath (Join-Path $bundle 'electron.exe') -NewName $exeName
Rename-Item -LiteralPath (Join-Path $bundle 'electron_wer.dll') -NewName ([IO.Path]::GetFileNameWithoutExtension($exeName) + '_wer.dll')
Remove-Item -LiteralPath (Join-Path $bundle 'resources/default_app.asar')
New-Item -ItemType Directory -Path $appPath -Force | Out-Null
foreach ($nameInApp in 'package.json','src','data','engine') {
  Copy-Item -LiteralPath (Join-Path $root $nameInApp) -Destination $appPath -Recurse
}
foreach ($entry in $lock.packages.GetEnumerator()) {
  if ($entry.Key -notmatch '^node_modules/(?:@[a-zA-Z0-9_.-]+/)?[a-zA-Z0-9_.-]+$' -or $entry.Value.dev) { continue }
  $target = Join-Path $appPath $entry.Key
  New-Item -ItemType Directory -Path (Split-Path -Parent $target) -Force | Out-Null
  Copy-Item -LiteralPath (Join-Path $root $entry.Key) -Destination $target -Recurse
}
Copy-Item -LiteralPath (Join-Path $root 'TESTER-GUIDE.txt') -Destination (Join-Path $bundle 'READ FIRST.txt')
$log = Join-Path $stage 'release-check.txt'
$err = Join-Path $stage 'release-check-errors.txt'
$check = Start-Process -FilePath (Join-Path $bundle $exeName) -ArgumentList @('--release-check',('--user-data-dir="' + (Join-Path $stage 'profile') + '"')) -RedirectStandardOutput $log -RedirectStandardError $err -WindowStyle Hidden -PassThru
if (!$check.WaitForExit(60000)) { throw "Release check did not finish: $stage" }
Get-Content -LiteralPath $log
if ($check.ExitCode -ne 0) { Get-Content -LiteralPath $err; throw 'Packaged app failed its release check.' }
Add-Type -AssemblyName System.IO.Compression.FileSystem
$draft = Join-Path $stage 'release.zip'
[IO.Compression.ZipFile]::CreateFromDirectory($bundle,$draft,[IO.Compression.CompressionLevel]::Fastest,$true)
Move-Item -LiteralPath $draft -Destination $zip
Get-FileHash -LiteralPath $zip
