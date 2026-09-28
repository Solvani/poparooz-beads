param(
    [string]$Rustup = 'C:\Users\COL\.cargo\bin\rustup.exe',
    [string]$WasmBindgen = 'C:\Users\COL\.cargo\bin\wasm-bindgen.exe'
)

$ErrorActionPreference = 'Stop'
$repository = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$manifest = Join-Path $PSScriptRoot 'Cargo.toml'
$target = Join-Path $PSScriptRoot 'target\wasm32-unknown-unknown\release\poparooz_controlled_image_decoder_wasm.wasm'
$artifactDirectory = Join-Path $repository 'src\operator\controlled-generation\decoder\artifacts\1.0.0'
$artifactBase = 'poparooz-controlled-image-decoder-1_0_0'

if (-not (Test-Path -LiteralPath $WasmBindgen)) {
    throw 'wasm-bindgen CLI 0.2.129 is required'
}

$env:RUSTFLAGS = '-C target-feature=-simd128'
& $Rustup run 1.88.0-x86_64-pc-windows-gnu cargo build --manifest-path $manifest --release --target wasm32-unknown-unknown --locked
if ($LASTEXITCODE -ne 0) { throw 'controlled decoder release build failed' }

New-Item -ItemType Directory -Path $artifactDirectory -Force | Out-Null
& $WasmBindgen $target --target web --out-dir $artifactDirectory --out-name $artifactBase
if ($LASTEXITCODE -ne 0) { throw 'wasm-bindgen glue generation failed' }

$wasmPath = Join-Path $artifactDirectory "${artifactBase}_bg.wasm"
$jsPath = Join-Path $artifactDirectory "${artifactBase}.js"
$cargoLockPath = Join-Path $PSScriptRoot 'Cargo.lock'

function Get-Sha256([string]$Path) {
    (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}

function Write-DeterministicJson([string]$Path, [object]$Value) {
    $json = $Value | ConvertTo-Json -Depth 16
    [System.IO.File]::WriteAllText($Path, $json + "`n", [System.Text.UTF8Encoding]::new($false))
}

function Get-GzipSize([string]$Path) {
    $output = [System.IO.MemoryStream]::new()
    $gzip = [System.IO.Compression.GZipStream]::new($output, [System.IO.Compression.CompressionLevel]::SmallestSize, $true)
    $bytes = [System.IO.File]::ReadAllBytes($Path)
    $gzip.Write($bytes, 0, $bytes.Length)
    $gzip.Dispose()
    $size = $output.Length
    $output.Dispose()
    $size
}

function Get-ResizeDigest {
    $paths = @(
        'src/domain/image/contain-fit.ts',
        'src/domain/image/normalize-rgba.ts',
        'src/domain/image/rgba-resize.ts'
    )
    $stream = [System.IO.MemoryStream]::new()
    foreach ($path in $paths) {
        $prefix = [System.Text.Encoding]::UTF8.GetBytes($path + "`n")
        $bytes = [System.IO.File]::ReadAllBytes((Join-Path $repository ($path -replace '/', '\')))
        $stream.Write($prefix, 0, $prefix.Length)
        $stream.Write($bytes, 0, $bytes.Length)
        $stream.WriteByte(10)
    }
    $stream.Position = 0
    $hasher = [System.Security.Cryptography.SHA256]::Create()
    try { ([Convert]::ToHexString($hasher.ComputeHash($stream))).ToLowerInvariant() }
    finally { $hasher.Dispose(); $stream.Dispose() }
}

$rustc = (& $Rustup run 1.88.0-x86_64-pc-windows-gnu rustc --version).Trim()
$cargo = (& $Rustup run 1.88.0-x86_64-pc-windows-gnu cargo --version).Trim()
$wasmBindgenVersion = (& $WasmBindgen --version).Trim()
$provenancePath = Join-Path $artifactDirectory 'build-provenance.json'
$provenance = [ordered]@{
    schema = 'PoparoozControlledDecoderBuildProvenance/1.0.0'
    rustc = $rustc
    cargo = $cargo
    wasmBindgen = $wasmBindgenVersion
    target = 'wasm32-unknown-unknown'
    rustFlags = '-C target-feature=-simd128'
    threading = 'single-thread'
    simd = 'disabled'
    cargoLocked = $true
    releaseProfile = $true
}
Write-DeterministicJson $provenancePath $provenance

$metadataJson = & $Rustup run 1.88.0-x86_64-pc-windows-gnu cargo metadata --manifest-path $manifest --format-version 1 --locked --offline
if ($LASTEXITCODE -ne 0) { throw 'Cargo metadata failed' }
$metadata = $metadataJson | ConvertFrom-Json
$resolvedIds = @($metadata.resolve.nodes | ForEach-Object id)
$packages = @($metadata.packages | Where-Object { $resolvedIds -contains $_.id } | Sort-Object name, version)
$licensesDirectory = Join-Path $artifactDirectory 'LICENSES'
New-Item -ItemType Directory -Path $licensesDirectory -Force | Out-Null
$inventory = @()
foreach ($package in $packages) {
    if ($package.name -eq 'poparooz-controlled-image-decoder-wasm') { continue }
    if ([string]::IsNullOrWhiteSpace($package.license)) { throw "Missing license expression: $($package.name) $($package.version)" }
    $packageDirectory = Split-Path -Parent $package.manifest_path
    $licenseFiles = @(Get-ChildItem -LiteralPath $packageDirectory -File | Where-Object { $_.Name -match '^(LICENSE|COPYING|NOTICE)' } | Sort-Object Name)
    if ($licenseFiles.Count -eq 0) { throw "Missing license text: $($package.name) $($package.version)" }
    $destination = Join-Path $licensesDirectory "$($package.name)-$($package.version)"
    New-Item -ItemType Directory -Path $destination -Force | Out-Null
    foreach ($licenseFile in $licenseFiles) { Copy-Item -LiteralPath $licenseFile.FullName -Destination (Join-Path $destination $licenseFile.Name) -Force }
    $inventory += [ordered]@{
        name = $package.name
        version = $package.version
        license = $package.license
        source = $package.source
        licenseFiles = @($licenseFiles | ForEach-Object Name)
    }
}
$sbomPath = Join-Path $artifactDirectory 'sbom.json'
Write-DeterministicJson $sbomPath ([ordered]@{
    schema = 'PoparoozControlledDecoderDependencyInventory/1.0.0'
    legalAdvice = $false
    packages = $inventory
})

$resizeDigest = Get-ResizeDigest
$artifactManifestPath = Join-Path $artifactDirectory 'artifact-manifest.json'
$artifactManifest = [ordered]@{
    schema = 'PoparoozControlledDecoderArtifactManifest/1.0.0'
    decoderImplementationId = 'poparooz-controlled-image-decoder-wasm'
    decoderImplementationVersion = '1.0.0'
    decoderArtifactSha256 = Get-Sha256 $wasmPath
    runtimeAbiVersion = 'PoparoozControlledDecoderABI/1.0.0'
    rustToolchain = $rustc
    cargoLockSha256 = Get-Sha256 $cargoLockPath
    codecAuthorities = [ordered]@{
        image = '0.25.10'
        zuneJpeg = '0.5.15'
        png = '0.18.1'
        imageWebp = '0.2.4'
        moxcms = '0.8.1'
        wasmBindgen = '0.2.129'
    }
    pixelFormat = 'RGBA8_UNPREMULTIPLIED'
    colorManagementPolicy = 'EXPLICIT_SRGB_V1'
    exifPolicy = 'APPLY_1_TO_8_THEN_ORIENTATION_1'
    buildTarget = 'wasm32-unknown-unknown'
    threadingMode = 'single-thread'
    simdState = 'disabled'
    supportedCodecs = @('JPEG', 'PNG', 'WEBP')
    resizeAuthority = [ordered]@{
        implementationId = 'poparooz-controlled-rgba-resize'
        version = '1.0.0'
        digestAlgorithm = 'sha256(path-lf-bytes-lf;lexical-path-order)'
        digest = $resizeDigest
    }
    artifacts = @(
        [ordered]@{ file = (Split-Path -Leaf $wasmPath); sha256 = Get-Sha256 $wasmPath; bytes = (Get-Item $wasmPath).Length; gzipBytes = Get-GzipSize $wasmPath },
        [ordered]@{ file = (Split-Path -Leaf $jsPath); sha256 = Get-Sha256 $jsPath; bytes = (Get-Item $jsPath).Length },
        [ordered]@{ file = 'build-provenance.json'; sha256 = Get-Sha256 $provenancePath; bytes = (Get-Item $provenancePath).Length },
        [ordered]@{ file = 'sbom.json'; sha256 = Get-Sha256 $sbomPath; bytes = (Get-Item $sbomPath).Length }
    )
    buildProvenance = 'build-provenance.json'
    dependencyInventory = 'sbom.json'
}
Write-DeterministicJson $artifactManifestPath $artifactManifest

[ordered]@{
    wasmSha256 = Get-Sha256 $wasmPath
    jsSha256 = Get-Sha256 $jsPath
    artifactManifestSha256 = Get-Sha256 $artifactManifestPath
    resizeImplementationDigest = $resizeDigest
} | ConvertTo-Json
