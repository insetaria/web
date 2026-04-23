# ============================================================================
# ZIP MANAGER & GIT PUBLISHER - FLUJO MODIFICADO
# ============================================================================

[Console]::TreatControlCAsInput = $true
$ErrorActionPreference = "Stop"

# --- Variables Globales ---
$selectedTab = 0
$selectedOption = 0
$checked = @{}
$exit = $false
$confirmed = $false
$width = 90

# ============================================================================
# FUNCIONES AUXILIARES ZIP
# ============================================================================

function Get-StreamHash {
    param($stream)
    $hasher = [System.Security.Cryptography.SHA256]::Create()
    $hashBytes = $hasher.ComputeHash($stream)
    return [System.BitConverter]::ToString($hashBytes) -replace "-"
}

function Get-FileHash {
    param($path)
    if (-not (Test-Path $path)) { return $null }
    $fileStream = [System.IO.File]::OpenRead($path)
    $hash = Get-StreamHash -stream $fileStream
    $fileStream.Close()
    $fileStream.Dispose()
    return $hash
}

function Find-ZipFiles {
    param($directory = (Get-Location).Path)
    $files = Get-ChildItem -Path $directory -Filter "*.zip" -File | Sort-Object LastWriteTime -Descending
    return ,@($files | ForEach-Object {
        [PSCustomObject]@{
            name = $_.Name
            path = $_.FullName
            date = $_.LastWriteTime
        }
    })
}

function Select-ZipFile {
    param($zips)
    if ($zips.Count -eq 0) {
        Write-Host "❌ No se encontraron archivos .zip" -ForegroundColor Red
        Read-Host "Pulsa Enter para continuar"; return $null
    }
    if ($zips.Count -eq 1) { return $zips[0] }
    
    $selectedIndex = 0
    while ($true) {
        Clear-Host
        Write-Host "════════════════════════════════════════" -ForegroundColor Yellow
        Write-Host "  SELECCIONAR ARCHIVO ZIP" -ForegroundColor Yellow
        Write-Host "════════════════════════════════════════`n" -ForegroundColor Yellow
        for ($i = 0; $i -lt $zips.Count; $i++) {
            $pref = if ($i -eq $selectedIndex) { "❯ " } else { "  " }
            if ($i -eq $selectedIndex) {
                Write-Host "$pref[$i] $($zips[$i].name)" -ForegroundColor Cyan
            } else {
                Write-Host "$pref[$i] $($zips[$i].name)"
            }
        }
        $key = [Console]::ReadKey($true)
        switch ($key.Key) {
            "UpArrow" { if ($selectedIndex -gt 0) { $selectedIndex-- } }
            "DownArrow" { if ($selectedIndex -lt ($zips.Count - 1)) { $selectedIndex++ } }
            "Enter" { return $zips[$selectedIndex] }
            "Escape" { return $null }
        }
    }
}

function Analyze-Zip {
    param($zipPath)
    try {
        Add-Type -AssemblyName System.IO.Compression
        Add-Type -AssemblyName System.IO.Compression.FileSystem
        
        $zip = [System.IO.Compression.ZipFile]::OpenRead($zipPath)
        $structure = @{}
        $database = @()
        $currentDir = (Get-Location).Path

        foreach ($entry in $zip.Entries) {
            if ([string]::IsNullOrEmpty($entry.FullName) -or $entry.FullName.EndsWith("/")) { continue }
            
            $parts = $entry.FullName.Split('/')
            $isRoot = $parts.Count -eq 1
            $folder = if ($isRoot) { "." } else { $parts[0] }
            
            $targetPath = Join-Path $currentDir $entry.FullName
            $statusType = "NUEVO" 

            if (Test-Path $targetPath) {
                $stream = $entry.Open()
                $zipHash = Get-StreamHash -stream $stream
                $stream.Close(); $stream.Dispose()
                
                $diskHash = Get-FileHash -path $targetPath
                if ($zipHash -eq $diskHash) { 
                    $statusType = "IGUAL" 
                } else {
                    $statusType = "MODIFICADO"
                }
            }

            $item = @{ 
                name = if ($isRoot) { $parts[0] } else { $entry.FullName.Substring($folder.Length + 1) }; 
                path = $entry.FullName; 
                status = $statusType;
                needsUpdate = ($statusType -ne "IGUAL")
            }

            if ($isRoot) { $database += $item }
            else {
                if (-not $structure.ContainsKey($folder)) { $structure[$folder] = @() }
                $structure[$folder] += $item
            }
        }
        $zip.Dispose()
        return @{ structure = $structure; database = $database; zipPath = $zipPath }
    } catch {
        Write-Host "❌ ERROR ANALIZANDO EL ZIP: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

function Build-Tabs {
    param($structure, $database)
    $tabs = [System.Collections.ArrayList]@()
    if ($database.Count -gt 0) { [void]$tabs.Add(@{ name = "Raíz"; folder = "."; files = $database }) }
    $structure.Keys | Sort-Object | ForEach-Object {
        [void]$tabs.Add(@{ name = $_; folder = $_; files = $structure[$_] })
    }
    return $tabs
}

function Draw-Window {
    param($tabs, $selectedTab, $selectedOption, $checked, $width)
    Clear-Host
    $innerW = $width - 2
    Write-Host "╔$($('═' * $innerW))╗" -ForegroundColor Cyan
    $title = " ZIP MANAGER - CONTROL DE CAMBIOS "
    Write-Host "║$($title.PadRight($innerW).PadLeft($innerW))║" -ForegroundColor Cyan
    Write-Host "╠$($('═' * $innerW))╣" -ForegroundColor Cyan
    
    $tabLine = ""
    for ($i = 0; $i -lt $tabs.Count; $i++) {
        $name = $tabs[$i]['name']
        $tabLine += if ($i -eq $selectedTab) { " [$($name.ToUpper())] " } else { "  $name  " }
    }
    Write-Host "║$($tabLine.PadRight($innerW))║" -ForegroundColor Cyan
    
    $currentFolder = $tabs[$selectedTab].folder
    $folderLabel = " CARPETA ACTUAL: $currentFolder "
    Write-Host "╟$($('─' * $innerW))╢" -ForegroundColor Cyan
    Write-Host "║" -NoNewline -ForegroundColor Cyan
    Write-Host " $folderLabel ".PadRight($innerW) -ForegroundColor Yellow -Back DarkGray
    Write-Host "║" -ForegroundColor Cyan
    Write-Host "╟$($('─' * $innerW))╢" -ForegroundColor Cyan

    $files = $tabs[$selectedTab]['files']
    for ($i = 0; $i -lt 12; $i++) {
        if ($i -lt $files.Count) {
            $f = $files[$i]
            $key = "$selectedTab-$i"
            $mark = if ($checked[$key]) { "[x]" } else { "[ ]" }
            $statusLabel = "($($f.status))"
            $line = " $mark $($f.name) $statusLabel"
            
            Write-Host "║" -NoNewline -ForegroundColor Cyan
            if ($i -eq $selectedOption) {
                Write-Host $line.PadRight($innerW) -Back Cyan -Fore Black -NoNewline
            } else {
                $color = switch ($f.status) {
                    "NUEVO"      { "Green" }
                    "MODIFICADO" { "Yellow" }
                    "IGUAL"      { "DarkGray" }
                    Default      { "White" }
                }
                Write-Host $line.PadRight($innerW) -Fore $color -NoNewline
            }
            Write-Host "║" -ForegroundColor Cyan
        } else {
            Write-Host "║$($(' ' * $innerW))║" -ForegroundColor Cyan
        }
    }
    Write-Host "╚$($('═' * $innerW))╝" -ForegroundColor Cyan
    Write-Host " [Enter] Extraer marcados | [Espacio] Marcar | [Esc] Cancelar | [← →] Carpetas" -ForegroundColor Gray
}

# ============================================================================
# FUNCIONES GIT
# ============================================================================

function Invoke-Git {
    param([string[]]$Arguments)
    $p = Start-Process -FilePath "git" -ArgumentList $Arguments -NoNewWindow -Wait -PassThru -RedirectStandardOutput "tmp_out.txt" -RedirectStandardError "tmp_err.txt"
    $stdout = if (Test-Path "tmp_out.txt") { Get-Content "tmp_out.txt" -Raw; Remove-Item "tmp_out.txt" } else { "" }
    $stderr = if (Test-Path "tmp_err.txt") { Get-Content "tmp_err.txt" -Raw; Remove-Item "tmp_err.txt" } else { "" }
    if ($p.ExitCode -ne 0) {
        if ($Arguments -contains "commit" -and ($stdout + $stderr -match "nothing to commit")) { return $stdout }
        throw ($stdout + $stderr)
    }
    return $stdout
}

function Publish-ToGit {
    Write-Host "`n════════════════════════════════════════" -ForegroundColor Magenta
    Write-Host "  PUBLICANDO CAMBIOS EN GIT" -ForegroundColor Magenta
    Write-Host "════════════════════════════════════════`n" -ForegroundColor Magenta

    try {
        $secureToken = Read-Host "Introduce la clave de acceso" -AsSecureString
        $logDir = "C:\web_logs"
        $logFile = "$logDir\git.log"
        if (!(Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }

        Write-Host "-> Ejecutando Pull..." -ForegroundColor Gray
        Invoke-Git -Arguments "pull"
        Write-Host "-> Agregando archivos..." -ForegroundColor Gray
        Invoke-Git -Arguments "add", "."
        $fecha = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        $mensajeCommit = "Actualización - $fecha"
        Write-Host "-> Creando Commit..." -ForegroundColor Gray
        Invoke-Git -Arguments "commit", "-m", "`"$mensajeCommit`""
        Write-Host "-> Ejecutando Push..." -ForegroundColor Gray
        Invoke-Git -Arguments "push"

        Write-Host "`n[ OK ] Todo se ha subido correctamente." -ForegroundColor Green
    }
    catch {
        $errMsg = $_.Exception.Message
        Write-Host "`n[ KO ] Ha ocurrido un error." -ForegroundColor Red
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        Add-Content -Path $logFile -Value "[$timestamp] ERROR: $errMsg"
    }
    Write-Host "`nPresione cualquier tecla para salir..."
    $null = [System.Console]::ReadKey($true)
}

# ============================================================================
# FLUJO PRINCIPAL
# ============================================================================

Clear-Host
Write-Host "¿Quieres extraer archivos de un ZIP? (S/N): " -NoNewline -ForegroundColor Yellow
$ansExt = Read-Host

if ($ansExt -eq "s" -or $ansExt -eq "S") {
    try {
        $zips = Find-ZipFiles
        $selectedZip = Select-ZipFile -zips $zips
        
        if ($selectedZip) {
            Write-Host "🔍 Analizando hashes y archivos existentes..." -ForegroundColor Yellow
            $zipData = Analyze-Zip -zipPath $selectedZip.path
            
            if ($zipData) {
                $tabs = Build-Tabs -structure $zipData['structure'] -database $zipData['database']

                # Auto-marcar modificados/nuevos
                for ($t = 0; $t -lt $tabs.Count; $t++) {
                    for ($f = 0; $f -lt $tabs[$t].files.Count; $f++) {
                        if ($tabs[$t].files[$f].needsUpdate) { $checked["$t-$f"] = $true }
                    }
                }

                $loop = $true
                while ($loop) {
                    Draw-Window -tabs $tabs -selectedTab $selectedTab -selectedOption $selectedOption -checked $checked -width $width
                    $key = [Console]::ReadKey($true)
                    switch ($key.Key) {
                        "RightArrow" { $selectedTab = ($selectedTab + 1) % $tabs.Count; $selectedOption = 0 }
                        "LeftArrow"  { $selectedTab = ($selectedTab - 1 + $tabs.Count) % $tabs.Count; $selectedOption = 0 }
                        "DownArrow"  { $selectedOption = ($selectedOption + 1) % $tabs[$selectedTab].files.Count }
                        "UpArrow"    { $selectedOption = ($selectedOption - 1 + $tabs[$selectedTab].files.Count) % $tabs[$selectedTab].files.Count }
                        "Spacebar"   { $checked["$selectedTab-$selectedOption"] = -not $checked["$selectedTab-$selectedOption"] }
                        "Enter"      { $loop = $false; $confirmed = $true }
                        "Escape"     { $loop = $false }
                    }
                }

                if ($confirmed) {
                    $zip = [System.IO.Compression.ZipFile]::OpenRead($zipData['zipPath'])
                    $currentDir = (Get-Location).Path
                    $extractedCount = 0

                    Write-Host "`nExtrayendo..." -ForegroundColor Yellow
                    for ($t = 0; $t -lt $tabs.Count; $t++) {
                        foreach ($i in 0..($tabs[$t].files.Count-1)) {
                            if ($checked["$t-$i"]) {
                                $file = $tabs[$t].files[$i]
                                $entry = $zip.GetEntry($file.path)
                                $target = Join-Path $currentDir $file.path
                                $parent = Split-Path $target
                                if (-not (Test-Path $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
                                
                                [System.IO.Compression.ZipFileExtensions]::ExtractToFile($entry, $target, $true)
                                Write-Host " ✓ $target" -ForegroundColor Green
                                $extractedCount++
                            }
                        }
                    }
                    $zip.Dispose()
                    Write-Host "`nProceso finalizado. $extractedCount archivos actualizados." -ForegroundColor Cyan
                }
            }
        }
    } catch {
        Write-Host "❌ Error durante la extracción: $($_.Exception.Message)" -ForegroundColor Red
        Read-Host
    }
}

# SALTO A GIT
Write-Host "`n¿Deseas publicar los cambios en Git ahora? (S/N): " -NoNewline -ForegroundColor Yellow
$ansGit = Read-Host
if ($ansGit -eq "s" -or $ansGit -eq "S") {
    Publish-ToGit
} else {
    Write-Host "`nSaliendo..." -ForegroundColor Gray
}