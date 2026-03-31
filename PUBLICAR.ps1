# =====================
# Script Git Auto Push 
# =====================

$ErrorActionPreference = "Stop"

$secureToken = Read-Host "Introduce la clave" -AsSecureString
$Token = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureToken)
)

$logDir = "C:\web_logs"
$logFile = "$logDir\git.log"
if (!(Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }

function Write-Log($msg) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Add-Content -Path $logFile -Value "[$timestamp] $msg"
}

function Invoke-Git {
    param([string[]]$Arguments)
    
    $p = Start-Process -FilePath "git" -ArgumentList $Arguments -NoNewWindow -Wait -PassThru -RedirectStandardOutput "tmp_out.txt" -RedirectStandardError "tmp_err.txt"
    
    $stdout = if (Test-Path "tmp_out.txt") { Get-Content "tmp_out.txt" -Raw; Remove-Item "tmp_out.txt" } else { "" }
    $stderr = if (Test-Path "tmp_err.txt") { Get-Content "tmp_err.txt" -Raw; Remove-Item "tmp_err.txt" } else { "" }

    if ($p.ExitCode -ne 0) {
        if ($Arguments -contains "commit" -and ($stdout + $stderr -match "nothing to commit")) {
            return $stdout
        }
        throw ($stdout + $stderr)
    }
    return $stdout
}

try {
    Invoke-Git -Arguments "pull"
    Invoke-Git -Arguments "add", "."
    $fecha = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $mensajeCommit = "Actualización - $fecha"
    Invoke-Git -Arguments "commit", "-m", "`"$mensajeCommit`""
    Invoke-Git -Arguments "push"

    Write-Host "`n[ OK ] Todo se ha subido correctamente." -ForegroundColor Green
}
catch {
    $errMsg = $_.Exception.Message

    Write-Host "`n[ KO ] Ha ocurrido un error." -ForegroundColor Red
    Write-Log "ERROR: $errMsg"
}
finally {
    Write-Host "`n----------------------------------------"
    Write-Host "Presione una tecla para cerrar..."
    $null = [System.Console]::ReadKey($true)
}