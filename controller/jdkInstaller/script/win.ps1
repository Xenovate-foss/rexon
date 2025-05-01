param (
    [Parameter(Mandatory=$true)]
    [string]$JavaVersion
)

function Install-Chocolatey {
    if (!(Get-Command choco -ErrorAction SilentlyContinue)) {
        Write-Host "Installing Chocolatey..."
        Set-ExecutionPolicy Bypass -Scope Process -Force
        [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12
        Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://chocolatey.org/install.ps1'))
    }
    else {
        Write-Host "Chocolatey already installed."
    }
}

function Install-Java {
    # Example: AdoptOpenJDK 17 is "adoptopenjdk17"
    $javaPackage = "temurin$JavaVersion"  # temurin = Eclipse Adoptium

    if (choco list --local-only | Select-String $javaPackage) {
        Write-Host "Java $JavaVersion is already installed."
    }
    else {
        Write-Host "Installing Java $JavaVersion..."
        choco install $javaPackage -y
    }

    # Set JAVA_HOME and update PATH
    $javaHome = "C:\Program Files\Eclipse Adoptium\jdk-$JavaVersion*"
    $javaPath = Get-ChildItem -Directory $javaHome -ErrorAction SilentlyContinue | Select-Object -First 1

    if ($javaPath) {
        $envPath = [System.Environment]::GetEnvironmentVariable("Path", "Machine")
        if ($envPath -notlike "*$($javaPath.FullName)*") {
            Write-Host "Setting JAVA_HOME and updating PATH..."
            [System.Environment]::SetEnvironmentVariable("JAVA_HOME", $javaPath.FullName, "Machine")
            [System.Environment]::SetEnvironmentVariable("Path", "$envPath;$($javaPath.FullName)\bin", "Machine")
        }
    }

    java -version
}

# Main
Write-Host "`n[+] Starting Java $JavaVersion installation..." -ForegroundColor Cyan
Install-Chocolatey
choco upgrade chocolatey -y
Install-Java
Write-Host "`n[+] Java installation completed." -ForegroundColor Green