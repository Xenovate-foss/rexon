import os from 'os';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

/**
 * Installs Java on the current system using platform-specific installer scripts.
 *
 * This function auto-detects the operating system and executes the corresponding
 * script to install the specified Java version:
 * - On Linux, macOS, or Termux: uses a Bash script (`install_java.sh`)
 * - On Windows: uses a PowerShell script (`install-java.ps1`)
 *
 * @param {string} javaVersion - The Java version to install (e.g., '17', '21')
 * @param {string} [scriptDir=defaultScriptDir] - Optional path to the script directory
 * @throws Will throw an error if the OS is unsupported or script execution fails
 */
export function installJava(javaVersion, scriptDir = defaultScriptDir) {
  if (!javaVersion) {
    throw new Error('Java version is required (e.g., "17").');
  }

  const platform = os.platform();
  console.log(`Detected OS: ${platform}`);
  console.log(`Installing Java version: ${javaVersion}`);

  try {
    if (platform === 'linux' || platform === 'android' || platform === 'darwin') {
      const bashScript = path.join(scriptDir, 'Unix.sh');
      execSync(`chmod +x "${bashScript}"`);
      execSync(`${bashScript} ${javaVersion}`, { stdio: 'inherit' });
    } else if (platform === 'win32') {
      const powershellScript = path.join(scriptDir, 'win.ps1');
      const psCommand = `powershell -ExecutionPolicy Bypass -File "${powershellScript}" -JavaVersion ${javaVersion}`;
      execSync(psCommand, { stdio: 'inherit' });
    } else {
      throw new Error('Unsupported operating system.');
    }
  } catch (err) {
    throw new Error(`Failed to install Java: ${err.message}`);
  }
}

// Get script directory for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultScriptDir = path.join(__dirname, "script");