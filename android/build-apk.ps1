param(
    [string]$SdkPath = 'D:\Android\sdk',
    [string]$BuildToolsVersion = '36.0.0'
)
$ErrorActionPreference = 'Stop'
$projectDir = Split-Path -Parent $PSScriptRoot
$assetsDir = Join-Path $PSScriptRoot ('app\build\web-assets-' + [guid]::NewGuid().ToString('N'))
& node (Join-Path $projectDir 'scripts\build-catalog.mjs')
if ($LASTEXITCODE -ne 0) { throw 'Catalog build failed' }
New-Item -ItemType Directory -Path $assetsDir -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $projectDir 'index.html'),(Join-Path $projectDir 'app.js') -Destination $assetsDir
$assetData = Join-Path $assetsDir 'data'
New-Item -ItemType Directory -Path $assetData -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $projectDir 'data\app-catalog.js') -Destination $assetData
$catalogIndex = Get-Content -Raw -Encoding utf8 -LiteralPath (Join-Path $projectDir 'data\index.json') | ConvertFrom-Json
foreach ($category in $catalogIndex.categories) {
    $imageDir = Join-Path $projectDir ('data\' + $category.category + '\images')
    if (Test-Path -LiteralPath $imageDir) {
        $targetDir = Join-Path $assetData ($category.category + '\images')
        New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
        Get-ChildItem -LiteralPath $imageDir -File | ForEach-Object { Copy-Item -LiteralPath $_.FullName -Destination $targetDir }
    }
}
$toolsDir = Join-Path $SdkPath "build-tools\$BuildToolsVersion"
$platformJar = Join-Path $SdkPath 'platforms\android-35\android.jar'
$buildDir = Join-Path $PSScriptRoot 'app\build\manual'
$classesDir = Join-Path $buildDir 'classes'
$dexDir = Join-Path $buildDir 'dex'
New-Item -ItemType Directory -Path $classesDir,$dexDir -Force | Out-Null
function Invoke-BuildTool {
    param([string]$Tool, [string[]]$Arguments)
    & $Tool @Arguments
    if ($LASTEXITCODE -ne 0) { throw "Build tool failed: $Tool" }
}
Invoke-BuildTool (Join-Path $toolsDir 'aapt2.exe') @('compile','--dir',(Join-Path $PSScriptRoot 'app\src\main\res'),'-o',(Join-Path $buildDir 'resources.zip'))
$unsigned = Join-Path $buildDir 'unsigned.apk'
$appConfig = Get-Content -Raw -LiteralPath (Join-Path $PSScriptRoot 'app\build.gradle')
$versionCode = [regex]::Match($appConfig, 'versionCode\s+(\d+)').Groups[1].Value
$versionName = [regex]::Match($appConfig, "versionName\s+'([^']+)'").Groups[1].Value
if (-not $versionCode -or -not $versionName) { throw 'Missing app version' }
Invoke-BuildTool (Join-Path $toolsDir 'aapt2.exe') @('link','-o',$unsigned,'--manifest',(Join-Path $PSScriptRoot 'app\src\main\AndroidManifest.xml'),'-I',$platformJar,'-A',$assetsDir,'--min-sdk-version','23','--target-sdk-version','35','--version-code',$versionCode,'--version-name',$versionName,(Join-Path $buildDir 'resources.zip'))
$javaFiles = @(Get-ChildItem -LiteralPath (Join-Path $PSScriptRoot 'app\src\main\java') -Recurse -Filter '*.java' | ForEach-Object FullName)
Invoke-BuildTool 'javac' (@('-encoding','UTF-8','-source','8','-target','8','-bootclasspath',$platformJar,'-d',$classesDir) + $javaFiles)
$classFiles = @(Get-ChildItem -LiteralPath $classesDir -Recurse -Filter '*.class' | ForEach-Object FullName)
Invoke-BuildTool (Join-Path $toolsDir 'd8.bat') (@('--lib',$platformJar,'--min-api','23','--output',$dexDir) + $classFiles)
Invoke-BuildTool 'jar' @('uf',$unsigned,'-C',$dexDir,'classes.dex')
$aligned = Join-Path $buildDir 'aligned.apk'
Invoke-BuildTool (Join-Path $toolsDir 'zipalign.exe') @('-f','-p','4',$unsigned,$aligned)
$signingDir = Join-Path $PSScriptRoot '.signing'
New-Item -ItemType Directory -Path $signingDir -Force | Out-Null
$keystore = Join-Path $signingDir 'debug.keystore'
if (-not (Test-Path -LiteralPath $keystore)) {
    Invoke-BuildTool 'keytool' @('-genkeypair','-keystore',$keystore,'-storepass','android','-keypass','android','-alias','androiddebugkey','-dname','CN=Android Debug,O=Android,C=US','-keyalg','RSA','-keysize','2048','-validity','10000')
}
$downloadDir = Join-Path $projectDir 'downloads'
New-Item -ItemType Directory -Path $downloadDir -Force | Out-Null
$outputApk = Join-Path $downloadDir 'RealLifeEnglish.apk'
Invoke-BuildTool (Join-Path $toolsDir 'apksigner.bat') @('sign','--ks',$keystore,'--ks-pass','pass:android','--key-pass','pass:android','--out',$outputApk,$aligned)
Invoke-BuildTool (Join-Path $toolsDir 'apksigner.bat') @('verify','--verbose',$outputApk)
