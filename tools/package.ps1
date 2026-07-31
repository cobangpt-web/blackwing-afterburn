param(
  [string]$Output = "blackwing-afterburn.zip"
)

$ErrorActionPreference = "Stop"
$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
$publicRoot = Join-Path $projectRoot "public"
$designRoot = Join-Path $projectRoot "design"
$outputPath = [IO.Path]::GetFullPath((Join-Path $projectRoot $Output))

if (-not $outputPath.StartsWith($projectRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
  throw "Output archive must stay inside the project root: $outputPath"
}

if (Test-Path -LiteralPath $outputPath) {
  Remove-Item -LiteralPath $outputPath -Force
}

$entries = @(
  "assets",
  "design",
  "game.js",
  "index.html",
  "logic.js",
  "site.webmanifest",
  "strings.js"
)

$stageRoot = Join-Path $projectRoot ".release-stage"
if (Test-Path -LiteralPath $stageRoot) {
  $resolvedStage = (Resolve-Path -LiteralPath $stageRoot).Path
  if (-not $resolvedStage.StartsWith($projectRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
    throw "Release stage escaped project root: $resolvedStage"
  }
  Remove-Item -LiteralPath $resolvedStage -Recurse -Force
}

New-Item -ItemType Directory -Path $stageRoot | Out-Null
$stageAssets = Join-Path $stageRoot "assets"
New-Item -ItemType Directory -Path $stageAssets | Out-Null
Get-ChildItem -LiteralPath (Join-Path $publicRoot "assets") |
  Where-Object { $_.Name -ne "raw" } |
  Copy-Item -Destination $stageAssets -Recurse
Copy-Item -LiteralPath $designRoot -Destination $stageRoot -Recurse
Copy-Item -LiteralPath (Join-Path $publicRoot "game.js"), (Join-Path $publicRoot "index.html"), (Join-Path $publicRoot "logic.js"), (Join-Path $publicRoot "site.webmanifest"), (Join-Path $publicRoot "strings.js") -Destination $stageRoot

try {
  & tar.exe -a -c -f $outputPath -C $stageRoot @entries
  if ($LASTEXITCODE -ne 0) {
    throw "tar failed with exit code $LASTEXITCODE"
  }

  $archiveEntries = @(& tar.exe -tf $outputPath)
  if ($LASTEXITCODE -ne 0) {
    throw "Could not inspect release archive"
  }
  foreach ($required in @("index.html", "logic.js", "game.js", "strings.js", "design/assets.csv")) {
    if ($archiveEntries -notcontains $required) {
      throw "Release archive is missing $required"
    }
  }
  if ($archiveEntries | Where-Object { $_ -match '\\' -or $_ -like "raw/*" -or $_ -like "*/raw/*" }) {
    throw "Release archive contains an invalid path or raw source asset"
  }
} finally {
  if (Test-Path -LiteralPath $stageRoot) {
    Remove-Item -LiteralPath $stageRoot -Recurse -Force
  }
}

Get-Item -LiteralPath $outputPath
