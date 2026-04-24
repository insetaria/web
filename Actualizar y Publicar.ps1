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

function Ask-YesNo {
    param(
        [string]$Question,
        [bool]$DefaultYes = $true
    )
    $selected = if ($DefaultYes) { 0 } else { 1 }  # 0 = Sí, 1 = No
    $firstDraw = $true
    
    while ($true) {
        if ($firstDraw) {
            Write-Host ""
            Write-Host $Question -ForegroundColor Yellow
            $firstDraw = $false
        } else {
            # Subir una línea y limpiar para redibujar las opciones
            $cursorTop = [Console]::CursorTop - 1
            [Console]::SetCursorPosition(0, $cursorTop)
            Write-Host (" " * [Console]::WindowWidth) -NoNewline
            [Console]::SetCursorPosition(0, $cursorTop)
        }
        
        # Dibujar opciones
        Write-Host "  " -NoNewline
        if ($selected -eq 0) {
            Write-Host " Sí " -ForegroundColor Black -BackgroundColor Green -NoNewline
        } else {
            Write-Host " Sí " -ForegroundColor Gray -NoNewline
        }
        Write-Host "   " -NoNewline
        if ($selected -eq 1) {
            Write-Host " No " -ForegroundColor Black -BackgroundColor Red -NoNewline
        } else {
            Write-Host " No " -ForegroundColor Gray -NoNewline
        }
        Write-Host "     " -NoNewline
        Write-Host "(← → para cambiar, Enter para confirmar)" -ForegroundColor DarkGray
        
        $key = [Console]::ReadKey($true)
        switch ($key.Key) {
            "LeftArrow"  { $selected = 0 }
            "RightArrow" { $selected = 1 }
            "UpArrow"    { $selected = 0 }
            "DownArrow"  { $selected = 1 }
            "Tab"        { $selected = 1 - $selected }
            "Enter"      {
                Write-Host ""
                return ($selected -eq 0)
            }
            "Escape"     {
                Write-Host ""
                return $false
            }
            # Atajos de teclado
            "S" { Write-Host ""; return $true }
            "Y" { Write-Host ""; return $true }
            "N" { Write-Host ""; return $false }
        }
    }
}

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
        $database = New-Object System.Collections.Generic.List[object]
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

            $item = [PSCustomObject]@{ 
                name = if ($isRoot) { $parts[0] } else { $entry.FullName.Substring($folder.Length + 1) }
                path = $entry.FullName
                status = $statusType
                needsUpdate = ($statusType -ne "IGUAL")
            }

            if ($isRoot) { 
                $database.Add($item) 
            }
            else {
                if (-not $structure.ContainsKey($folder)) { 
                    $structure[$folder] = New-Object System.Collections.Generic.List[object]
                }
                $structure[$folder].Add($item)
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
    $tabs = New-Object System.Collections.Generic.List[object]
    
    if ($null -ne $database -and $database.Count -gt 0) { 
        $rootFiles = New-Object System.Collections.Generic.List[object]
        foreach ($f in $database) { $rootFiles.Add($f) }
        $tabs.Add(@{ name = "Raíz"; folder = "."; files = $rootFiles })
    }
    
    if ($null -ne $structure -and $structure.Keys.Count -gt 0) {
        foreach ($key in ($structure.Keys | Sort-Object)) {
            $folderFiles = New-Object System.Collections.Generic.List[object]
            foreach ($f in $structure[$key]) { $folderFiles.Add($f) }
            $tabs.Add(@{ name = $key; folder = $key; files = $folderFiles })
        }
    }
    return ,$tabs
}

function Draw-Window {
    param($tabs, $selectedTab, $selectedOption, $checked, $width, $title = " ZIP MANAGER - CONTROL DE CAMBIOS ")
    Clear-Host
    $innerW = $width - 2
    Write-Host "╔$($('═' * $innerW))╗" -ForegroundColor Cyan
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
    $fileCount = if ($null -eq $files) { 0 } else { $files.Count }
    
    for ($i = 0; $i -lt 12; $i++) {
        if ($i -lt $fileCount) {
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
                    "ELIMINADO"  { "Red" }
                    "RENOMBRADO" { "Magenta" }
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
    Write-Host " [Enter] Confirmar marcados | [Espacio] Marcar | [Esc] Cancelar | [← →] Carpetas" -ForegroundColor Gray
}

# ============================================================================
# FUNCIONES GIT
# ============================================================================

function Invoke-Git {
    param([string[]]$Arguments)
    # Escapar cada argumento con comillas si contiene espacios o caracteres especiales
    # para que Start-Process los pase correctamente a git.exe
    $escaped = $Arguments | ForEach-Object {
        $a = $_
        # Si contiene espacios, comillas o caracteres problemáticos, envolver en comillas
        # y escapar las comillas internas duplicándolas (convención de Windows)
        if ($a -match '[\s"]') {
            $a = $a -replace '"', '""'
            "`"$a`""
        } else {
            $a
        }
    }
    $p = Start-Process -FilePath "git" -ArgumentList $escaped -NoNewWindow -Wait -PassThru -RedirectStandardOutput "tmp_out.txt" -RedirectStandardError "tmp_err.txt"
    $stdout = if (Test-Path "tmp_out.txt") { Get-Content "tmp_out.txt" -Raw; Remove-Item "tmp_out.txt" } else { "" }
    $stderr = if (Test-Path "tmp_err.txt") { Get-Content "tmp_err.txt" -Raw; Remove-Item "tmp_err.txt" } else { "" }
    if ($p.ExitCode -ne 0) {
        if ($Arguments -contains "commit" -and ($stdout + $stderr -match "nothing to commit")) { return $stdout }
        throw ($stdout + $stderr)
    }
    return $stdout
}

function Get-GitChanges {
    # Ejecuta git status --porcelain con -u para listar untracked files individualmente
    # (sin -u, Git agrupa archivos nuevos en su carpeta contenedora si toda la carpeta es nueva)
    $p = Start-Process -FilePath "git" -ArgumentList "status", "--porcelain", "-u" -NoNewWindow -Wait -PassThru -RedirectStandardOutput "tmp_git_out.txt" -RedirectStandardError "tmp_git_err.txt"
    $output = if (Test-Path "tmp_git_out.txt") { Get-Content "tmp_git_out.txt"; Remove-Item "tmp_git_out.txt" } else { @() }
    if (Test-Path "tmp_git_err.txt") { Remove-Item "tmp_git_err.txt" }
    
    if ($p.ExitCode -ne 0) {
        throw "Error al ejecutar 'git status'. ¿Estás en un repositorio git?"
    }
    
    $changes = New-Object System.Collections.Generic.List[object]
    
    foreach ($line in $output) {
        if ([string]::IsNullOrWhiteSpace($line)) { continue }
        # Formato porcelain: XY<espacio>ruta  (X = index, Y = working tree)
        if ($line.Length -lt 4) { continue }
        
        $statusCode = $line.Substring(0, 2)
        $filePath = $line.Substring(3).Trim()
        
        # Quitar comillas si las hay (ficheros con espacios)
        if ($filePath.StartsWith('"') -and $filePath.EndsWith('"')) {
            $filePath = $filePath.Substring(1, $filePath.Length - 2)
        }
        
        # Manejar renames: "viejo -> nuevo"
        if ($filePath -match " -> ") {
            $filePath = ($filePath -split " -> ")[1]
        }
        
        # Traducir códigos a etiquetas amigables
        $statusType = switch -Regex ($statusCode.Trim()) {
            "^\?\?$" { "NUEVO" }
            "^A"     { "NUEVO" }
            "^M"     { "MODIFICADO" }
            "^.M"    { "MODIFICADO" }
            "^D"     { "ELIMINADO" }
            "^.D"    { "ELIMINADO" }
            "^R"     { "RENOMBRADO" }
            "^C"     { "COPIADO" }
            "^U"     { "CONFLICTO" }
            Default  { "MODIFICADO" }
        }
        
        # Normalizar separadores a / para partir carpetas
        $normalized = $filePath -replace "\\", "/"
        # Si la ruta termina en '/' es una carpeta (no debería pasar con -u, pero por defensa)
        $isFolder = $normalized.EndsWith("/")
        if ($isFolder) { $normalized = $normalized.TrimEnd('/') }
        
        $parts = $normalized.Split('/')
        $isRoot = $parts.Count -eq 1
        $folder = if ($isRoot) { "." } else { $parts[0] }
        $name = if ($isRoot) { $parts[0] } else { $normalized.Substring($folder.Length + 1) }
        if ($isFolder) { $name = "$name/ (carpeta)" }
        if ([string]::IsNullOrWhiteSpace($name)) { $name = "(sin nombre)" }
        
        $changes.Add([PSCustomObject]@{
            name = $name
            path = $filePath
            folder = $folder
            isRoot = $isRoot
            status = $statusType
            needsUpdate = $true
        })
    }
    
    return ,$changes
}

function Build-GitTabs {
    param($changes)
    $tabs = New-Object System.Collections.Generic.List[object]
    $structure = @{}
    $rootFiles = New-Object System.Collections.Generic.List[object]
    
    foreach ($c in $changes) {
        if ($c.isRoot) {
            $rootFiles.Add($c)
        } else {
            if (-not $structure.ContainsKey($c.folder)) {
                $structure[$c.folder] = New-Object System.Collections.Generic.List[object]
            }
            $structure[$c.folder].Add($c)
        }
    }
    
    # Pestaña TODOS (vista global)
    if ($changes.Count -gt 0) {
        $allFiles = New-Object System.Collections.Generic.List[object]
        foreach ($c in $changes) {
            # Mostrar ruta completa en la pestaña "Todos"
            $allFiles.Add([PSCustomObject]@{
                name = $c.path
                path = $c.path
                folder = $c.folder
                isRoot = $c.isRoot
                status = $c.status
                needsUpdate = $c.needsUpdate
            })
        }
        $tabs.Add(@{ name = "Todos"; folder = "(global)"; files = $allFiles })
    }
    
    if ($rootFiles.Count -gt 0) {
        $tabs.Add(@{ name = "Raíz"; folder = "."; files = $rootFiles })
    }
    
    foreach ($key in ($structure.Keys | Sort-Object)) {
        $folderFiles = New-Object System.Collections.Generic.List[object]
        foreach ($f in $structure[$key]) { $folderFiles.Add($f) }
        $tabs.Add(@{ name = $key; folder = $key; files = $folderFiles })
    }
    
    return ,$tabs
}

function Select-GitFiles {
    # Devuelve una lista de rutas (relativas) a hacer git add, o $null si se cancela
    try {
        Write-Host "🔍 Obteniendo cambios pendientes en Git..." -ForegroundColor Yellow
        $changes = Get-GitChanges
    } catch {
        Write-Host "❌ $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
    
    if ($changes.Count -eq 0) {
        return ,@()
    }
    
    $gitTabs = Build-GitTabs -changes $changes
    $gitChecked = @{}
    
    # Auto-marcar todos los cambios por defecto
    for ($t = 0; $t -lt $gitTabs.Count; $t++) {
        $filesArr = $gitTabs[$t].files
        if ($null -eq $filesArr) { continue }
        for ($f = 0; $f -lt $filesArr.Count; $f++) {
            $gitChecked["$t-$f"] = $true
        }
    }
    
    $gitSelectedTab = 0
    $gitSelectedOption = 0
    $gitConfirmed = $false
    $loop = $true
    
    # Dibujar inicialmente
    Draw-Window -tabs $gitTabs -selectedTab $gitSelectedTab -selectedOption $gitSelectedOption -checked $gitChecked -width $width -title " GIT - SELECCIONAR ARCHIVOS A SUBIR "
    
    while ($loop) {
        $currentFiles = $gitTabs[$gitSelectedTab].files
        $currentCount = if ($null -eq $currentFiles) { 0 } else { $currentFiles.Count }
        $key = [Console]::ReadKey($true)
        $needsRedraw = $false
        
        switch ($key.Key) {
            "RightArrow" { 
                $gitSelectedTab = ($gitSelectedTab + 1) % $gitTabs.Count
                $gitSelectedOption = 0
                $needsRedraw = $true
            }
            "LeftArrow"  { 
                $gitSelectedTab = ($gitSelectedTab - 1 + $gitTabs.Count) % $gitTabs.Count
                $gitSelectedOption = 0
                $needsRedraw = $true
            }
            "DownArrow"  { 
                if ($currentCount -gt 0) {
                    $gitSelectedOption = ($gitSelectedOption + 1) % $currentCount
                    $needsRedraw = $true
                }
            }
            "UpArrow"    { 
                if ($currentCount -gt 0) {
                    $gitSelectedOption = ($gitSelectedOption - 1 + $currentCount) % $currentCount
                    $needsRedraw = $true
                }
            }
            "Spacebar"   { 
                $k = "$gitSelectedTab-$gitSelectedOption"
                $gitChecked[$k] = -not $gitChecked[$k]
                
                # Si estamos en la pestaña "Todos", propagar a la pestaña de carpeta correspondiente
                # Si estamos en una pestaña de carpeta, propagar a "Todos"
                $currentFile = $currentFiles[$gitSelectedOption]
                $newValue = $gitChecked[$k]
                for ($t = 0; $t -lt $gitTabs.Count; $t++) {
                    if ($t -eq $gitSelectedTab) { continue }
                    $tFiles = $gitTabs[$t].files
                    if ($null -eq $tFiles) { continue }
                    for ($i = 0; $i -lt $tFiles.Count; $i++) {
                        if ($tFiles[$i].path -eq $currentFile.path) {
                            $gitChecked["$t-$i"] = $newValue
                        }
                    }
                }
                $needsRedraw = $true
            }
            "Enter"      { $loop = $false; $gitConfirmed = $true }
            "Escape"     { $loop = $false }
            "A"          {
                # Marcar/desmarcar todos en la pestaña actual
                $anyUnchecked = $false
                for ($i = 0; $i -lt $currentCount; $i++) {
                    if (-not $gitChecked["$gitSelectedTab-$i"]) { $anyUnchecked = $true; break }
                }
                $target = $anyUnchecked
                for ($i = 0; $i -lt $currentCount; $i++) {
                    $gitChecked["$gitSelectedTab-$i"] = $target
                    # Propagar a las demás pestañas
                    $cFile = $currentFiles[$i]
                    for ($t = 0; $t -lt $gitTabs.Count; $t++) {
                        if ($t -eq $gitSelectedTab) { continue }
                        $tFiles = $gitTabs[$t].files
                        if ($null -eq $tFiles) { continue }
                        for ($j = 0; $j -lt $tFiles.Count; $j++) {
                            if ($tFiles[$j].path -eq $cFile.path) {
                                $gitChecked["$t-$j"] = $target
                            }
                        }
                    }
                }
                $needsRedraw = $true
            }
        }
        
        if ($needsRedraw -and $loop) {
            Draw-Window -tabs $gitTabs -selectedTab $gitSelectedTab -selectedOption $gitSelectedOption -checked $gitChecked -width $width -title " GIT - SELECCIONAR ARCHIVOS A SUBIR "
        }
    }
    
    if (-not $gitConfirmed) {
        Write-Host "`nSelección cancelada." -ForegroundColor DarkYellow
        return $null
    }
    
    # Recoger rutas únicas marcadas (usando un set para evitar duplicados entre "Todos" y carpetas)
    $selectedSet = New-Object System.Collections.Generic.HashSet[string]
    for ($t = 0; $t -lt $gitTabs.Count; $t++) {
        $filesArr = $gitTabs[$t].files
        if ($null -eq $filesArr) { continue }
        for ($i = 0; $i -lt $filesArr.Count; $i++) {
            if ($gitChecked["$t-$i"]) {
                $null = $selectedSet.Add($filesArr[$i].path)
            }
        }
    }
    
    return ,@($selectedSet)
}

function Publish-ToGit {
    Write-Host "`n════════════════════════════════════════" -ForegroundColor Magenta
    Write-Host "  PUBLICANDO CAMBIOS EN GIT" -ForegroundColor Magenta
    Write-Host "════════════════════════════════════════`n" -ForegroundColor Magenta

    $logDir = "C:\web_logs"
    $logFile = "$logDir\git.log"
    if (!(Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }

    try {
        Write-Host "-> Ejecutando Pull..." -ForegroundColor Gray
        Invoke-Git -Arguments "pull"
        
        # Selector interactivo de ficheros
        $selectedFiles = Select-GitFiles
        
        if ($null -eq $selectedFiles) {
            Write-Host "`n[ -- ] Publicación cancelada por el usuario." -ForegroundColor DarkYellow
            Write-Host "`nPresione cualquier tecla para salir..."
            $null = [System.Console]::ReadKey($true)
            return
        }
        
        if ($selectedFiles.Count -eq 0) {
            Write-Host "`n[ ?? ] No se ha seleccionado ningún archivo. Nada que subir." -ForegroundColor DarkYellow
            Write-Host "`nPresione cualquier tecla para salir..."
            $null = [System.Console]::ReadKey($true)
            return
        }
        
        Write-Host "`n-> Agregando $($selectedFiles.Count) archivo(s) seleccionado(s)..." -ForegroundColor Gray
        foreach ($filePath in $selectedFiles) {
            if ([string]::IsNullOrWhiteSpace($filePath)) { continue }
            Write-Host "   + $filePath" -ForegroundColor DarkGray
            Invoke-Git -Arguments "add", "--", $filePath
        }
        
        $fecha = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        $mensajeCommit = "Actualización - $fecha"
        Write-Host "-> Creando Commit..." -ForegroundColor Gray
        Invoke-Git -Arguments "commit", "-m", $mensajeCommit
        Write-Host "-> Ejecutando Push..." -ForegroundColor Gray
        Invoke-Git -Arguments "push"

        Write-Host "`n[ OK ] Todo se ha subido correctamente." -ForegroundColor Green
    }
    catch {
        $errMsg = $_.Exception.Message
        Write-Host "`n[ KO ] Ha ocurrido un error." -ForegroundColor Red
        Write-Host $errMsg -ForegroundColor DarkRed
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

# Comprobar si hay ZIPs ANTES de preguntar
$zipsDisponibles = Find-ZipFiles

if ($zipsDisponibles.Count -eq 0) {
    Write-Host "ℹ  No se han encontrado archivos .zip en el directorio actual." -ForegroundColor DarkYellow
    Write-Host "   Saltando directamente a la publicación en Git...`n" -ForegroundColor Gray
    $quiereExtraer = $false
} else {
    $quiereExtraer = Ask-YesNo -Question "¿Quieres extraer archivos de un ZIP?" -DefaultYes $true
}

if ($quiereExtraer) {
    try {
        $selectedZip = Select-ZipFile -zips $zipsDisponibles
        
        if ($selectedZip) {
            Write-Host "🔍 Analizando hashes y archivos existentes..." -ForegroundColor Yellow
            $zipData = Analyze-Zip -zipPath $selectedZip.path
            
            if ($zipData) {
                $tabs = Build-Tabs -structure $zipData['structure'] -database $zipData['database']

                if ($null -eq $tabs -or $tabs.Count -eq 0) {
                    Write-Host "❌ El ZIP no contiene archivos procesables." -ForegroundColor Red
                    Read-Host "Pulsa Enter para continuar"
                } else {
                    # Auto-marcar modificados/nuevos
                    for ($t = 0; $t -lt $tabs.Count; $t++) {
                        $filesArr = $tabs[$t].files
                        if ($null -eq $filesArr) { continue }
                        for ($f = 0; $f -lt $filesArr.Count; $f++) {
                            if ($filesArr[$f].needsUpdate) { $checked["$t-$f"] = $true }
                        }
                    }

                    # Dibujar inicialmente
                    Draw-Window -tabs $tabs -selectedTab $selectedTab -selectedOption $selectedOption -checked $checked -width $width
                    
                    $loop = $true
                    while ($loop) {
                        $currentFiles = $tabs[$selectedTab].files
                        $currentCount = if ($null -eq $currentFiles) { 0 } else { $currentFiles.Count }
                        $key = [Console]::ReadKey($true)
                        $needsRedraw = $false
                        
                        switch ($key.Key) {
                            "RightArrow" { $selectedTab = ($selectedTab + 1) % $tabs.Count; $selectedOption = 0; $needsRedraw = $true }
                            "LeftArrow"  { $selectedTab = ($selectedTab - 1 + $tabs.Count) % $tabs.Count; $selectedOption = 0; $needsRedraw = $true }
                            "DownArrow"  { if ($currentCount -gt 0) { $selectedOption = ($selectedOption + 1) % $currentCount; $needsRedraw = $true } }
                            "UpArrow"    { if ($currentCount -gt 0) { $selectedOption = ($selectedOption - 1 + $currentCount) % $currentCount; $needsRedraw = $true } }
                            "Spacebar"   { $checked["$selectedTab-$selectedOption"] = -not $checked["$selectedTab-$selectedOption"]; $needsRedraw = $true }
                            "Enter"      { $loop = $false; $confirmed = $true }
                            "Escape"     { $loop = $false }
                        }
                        
                        if ($needsRedraw -and $loop) {
                            Draw-Window -tabs $tabs -selectedTab $selectedTab -selectedOption $selectedOption -checked $checked -width $width
                        }
                    }

                    if ($confirmed) {
                        $zip = [System.IO.Compression.ZipFile]::OpenRead($zipData['zipPath'])
                        $currentDir = (Get-Location).Path
                        $extractedCount = 0

                        Write-Host "`nExtrayendo..." -ForegroundColor Yellow
                        for ($t = 0; $t -lt $tabs.Count; $t++) {
                            $filesArr = $tabs[$t].files
                            if ($null -eq $filesArr) { continue }
                            for ($i = 0; $i -lt $filesArr.Count; $i++) {
                                if ($checked["$t-$i"]) {
                                    $file = $filesArr[$i]
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
        }
    } catch {
        Write-Host "❌ Error durante la extracción: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "   Línea: $($_.InvocationInfo.ScriptLineNumber)" -ForegroundColor DarkGray
        Write-Host "   Comando: $($_.InvocationInfo.Line.Trim())" -ForegroundColor DarkGray
        Read-Host
    }
}

# SALTO A GIT
# Comprobar si hay cambios pendientes antes de preguntar
Write-Host "`n🔍 Comprobando estado de Git..." -ForegroundColor Yellow

$hayCambios = $false
try {
    $gitChanges = Get-GitChanges
    $hayCambios = ($gitChanges.Count -gt 0)
} catch {
    Write-Host "❌ No se pudo comprobar el estado de Git: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   ¿Estás en un repositorio git?" -ForegroundColor DarkGray
    Write-Host "`nSaliendo..." -ForegroundColor Gray
    return
}

if (-not $hayCambios) {
    Write-Host "ℹ  No hay cambios pendientes en Git. Nada que publicar." -ForegroundColor DarkYellow
    Write-Host "`nPresione cualquier tecla para salir..."
    $null = [System.Console]::ReadKey($true)
    return
}

Write-Host "   $($gitChanges.Count) archivo(s) con cambios detectado(s)." -ForegroundColor Gray
$quierePublicar = Ask-YesNo -Question "¿Deseas publicar los cambios en Git ahora?" -DefaultYes $true
if ($quierePublicar) {
    Publish-ToGit
} else {
    Write-Host "`nSaliendo..." -ForegroundColor Gray
}