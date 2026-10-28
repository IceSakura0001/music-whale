# Publish Music Whale to GitHub (source + MCP tools) and upload the installer
# as a release asset. Run from the project root:
#
#   powershell -ExecutionPolicy Bypass -File scripts/publish-github.ps1 `
#       -Repo "yourname/music-whale" -Token $env:GITHUB_TOKEN
#
# The token needs "repo" scope (classic) or Contents + Administration: write
# (fine-grained). Nothing is written to disk; the token is only used for the
# push URL and API calls of this run.
param(
  [Parameter(Mandatory = $true)][string]$Repo,
  [Parameter(Mandatory = $true)][string]$Token,
  [switch]$Private,
  [switch]$SkipRelease,
  [string]$Description = "Music Whale 鲸歌：带 FluidR3 采样音源、自定义音色与 MCP 接口的桌面音乐工作台"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
$api = "https://api.github.com"
$headers = @{ Authorization = "Bearer $Token"; "User-Agent" = "music-whale-publish"; Accept = "application/vnd.github+json" }
$version = (Get-Content package.json -Raw | ConvertFrom-Json).version

function Invoke-GitHub([string]$Method, [string]$Url, $Body) {
  $args = @{ Method = $Method; Uri = $Url; Headers = $headers; UseBasicParsing = $true }
  if ($null -ne $Body) {
    $args.ContentType = "application/json"
    $args.Body = ($Body | ConvertTo-Json -Depth 8)
  }
  return Invoke-RestMethod @args
}

# 1. repository
$exists = $true
try { Invoke-GitHub "GET" "$api/repos/$Repo" $null | Out-Null } catch { $exists = $false }
if (-not $exists) {
  $owner = $Repo.Split("/")[0]
  $name = $Repo.Split("/")[1]
  $me = Invoke-GitHub "GET" "$api/user" $null
  if ($me.login -ne $owner) { throw "仓库 $Repo 不存在，且 token 属于 $($me.login)，无法在 $owner 下创建仓库。" }
  $body = @{ name = $name; private = [bool]$Private; description = $Description }
  Invoke-GitHub "POST" "$api/user/repos" $body | Out-Null
  Write-Host "Created repository $Repo"
} else {
  Write-Host "Repository $Repo exists"
}

# 2. commit and push source
if (-not (Test-Path .git)) { git init | Out-Null }
git config user.name "Music Whale"
git config user.email "music-whale@users.noreply.github.com"
git add -A
$status = git status --porcelain
if ($status) { git commit -m "Music Whale 鲸歌 v$version" } else { Write-Host "No changes to commit" }
git branch -M main 2>$null
git remote remove origin 2>$null
$authUrl = "https://x-access-token:$Token@github.com/$Repo.git"
git remote add origin $authUrl
git push -u origin main --force
git remote set-url origin "https://github.com/$Repo.git"
Write-Host "Pushed source to https://github.com/$Repo"

if ($SkipRelease) { exit 0 }

# 3. release with the installer and update manifest
$tag = "v$version"
$installer = Join-Path $root "release-installer/Music Whale Setup $version.exe"
if (-not (Test-Path $installer)) { throw "未找到安装包：$installer（先运行 npm run app:build）" }

$release = $null
try { $release = Invoke-GitHub "GET" "$api/repos/$Repo/releases/tags/$tag" $null } catch {}
if ($null -eq $release) {
  $release = Invoke-GitHub "POST" "$api/repos/$Repo/releases" @{
    tag_name = $tag
    name = "Music Whale 鲸歌 $version"
    body = "Music Whale 鲸歌 $version 桌面应用（含 FluidR3 采样音源与 MCP 工具）。Windows x64 安装包，未代码签名。"
    draft = $false
    prerelease = $false
  }
  Write-Host "Created release $tag"
}

$uploadBase = "https://uploads.github.com/repos/$Repo/releases/$($release.id)/assets"
$installerName = [uri]::EscapeDataString("Music Whale Setup $version.exe")
$installerUrl = "$uploadBase`?name=$installerName"
$upload = Invoke-WebRequest -Method POST -Uri $installerUrl -Headers $headers -InFile $installer -ContentType "application/octet-stream" -UseBasicParsing
$assetUrl = ($upload.Content | ConvertFrom-Json).browser_download_url
Write-Host "Uploaded installer: $assetUrl"

$manifest = @{ version = $version; url = $assetUrl; notes = "Music Whale 鲸歌 $version" }
$manifestPath = Join-Path $root "release-installer/update.json"
$manifest | ConvertTo-Json | Set-Content -Path $manifestPath -Encoding UTF8
$manifestJson = Get-Content $manifestPath -Raw
$manifestUpload = Invoke-WebRequest -Method POST -Uri "$uploadBase`?name=update.json" -Headers $headers -Body $manifestJson -ContentType "application/json" -UseBasicParsing
Write-Host "Uploaded update manifest: $(( $manifestUpload.Content | ConvertFrom-Json).browser_download_url)"
Write-Host "Done. 发布后把 update.json 的下载地址配置为 MUSIC_WHALE_UPDATE_URL，或在应用目录放置 update.json。"
