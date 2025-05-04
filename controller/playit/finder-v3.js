// playit-manager.js
import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';
import fs from 'fs/promises';
import path from 'path';
import https from 'https';

const execAsync = promisify(exec);

/**
 * Find or install Playit binary for the current system
 * @param {Object} options - Configuration options
 * @param {boolean} [options.autoInstall=false] - Whether to install if not found
 * @param {string} [options.installDir] - Custom installation directory
 * @returns {Promise<{path: string|null, installed: boolean, error: string|null}>}
 */
export async function getPlayitBinary(options = {}) {
  const { autoInstall = false, installDir } = options;
  
  try {
    // Detect platform, architecture and check if we're on Termux
    const platformInfo = await detectPlatform();
    
    // Ensure required tools are installed
    if (platformInfo.isTermux && autoInstall) {
      await ensureTermuxDependencies();
    }
    
    // First try to find existing binary
    const binaryPath = await findPlayitBinary(platformInfo);
    
    if (binaryPath) {
      return {
        path: binaryPath,
        installed: true,
        error: null
      };
    }
    
    // If binary not found and autoInstall is enabled, try to install
    if (autoInstall) {
      const installResult = await installPlayitBinary(platformInfo, installDir);
      return installResult;
    }
    
    // Binary not found and auto-install not enabled
    return {
      path: null,
      installed: false,
      error: 'Playit binary not found. Set autoInstall to true to attempt installation.'
    };
    
  } catch (error) {
    return {
      path: null,
      installed: false,
      error: `Error finding Playit binary: ${error.message}`
    };
  }
}

/**
 * Ensure that all necessary dependencies are installed on Termux
 * @returns {Promise<void>}
 */
async function ensureTermuxDependencies() {
  const dependencies = ['which', 'curl', 'wget', "tur-repo"];
  
  try {
    // Check if pkg is available
    try {
      await execAsync('pkg --help');
    } catch (error) {
      console.error('pkg command not available. Trying apt...');
      try {
        await execAsync('apt update');
      } catch (aptError) {
        throw new Error('Neither pkg nor apt is available in this environment');
      }
    }
    
    // Install each dependency if missing
    for (const dep of dependencies) {
      try {
        // Try to check if the dependency is installed
        await execAsync(`command -v ${dep}`);
        console.log(`${dep} is already installed`);
      } catch (error) {
        // Not installed, attempt to install
        console.log(`Installing ${dep}...`);
        try {
          await execAsync(`pkg install -y ${dep}`);
        } catch (pkgError) {
          try {
            await execAsync(`apt install -y ${dep}`);
          } catch (aptError) {
            console.error(`Failed to install ${dep}`);
            // Continue anyway, as some dependencies might not be critical
          }
        }
      }
    }
  } catch (error) {
    console.error(`Error installing dependencies: ${error.message}`);
    // Continue execution, we'll handle missing dependencies later if needed
  }
}

/**
 * Detect the current platform, architecture and environment
 * @returns {Promise<{platform: string, arch: string, isTermux: boolean}>}
 */
async function detectPlatform() {
  const platform = os.platform();
  const arch = os.arch();
  let isTermux = false;
  
  // Try different methods to detect Termux
  try {
    // Method 1: Check for Termux-specific environment variable
    const termuxPrefix = process.env.PREFIX;
    if (termuxPrefix && termuxPrefix.includes('com.termux')) {
      isTermux = true;
    } else {
      // Method 2: Check for Termux-specific paths
      try {
        await fs.access('/data/data/com.termux', fs.constants.F_OK);
        isTermux = true;
      } catch {
        // Not accessible, try next method
        // Method 3: Check for Android platform
        try {
          const unamePath = await safeFindCommand('uname');
          if (unamePath) {
            const { stdout } = await execAsync(`${unamePath} -a`);
            if (stdout.toLowerCase().includes('android')) {
              isTermux = true;
            }
          }
        } catch {
          // Not Android/Termux
        }
      }
    }
  } catch (error) {
    // If any error occurs during detection, assume we're not in Termux
    console.error(`Error during Termux detection: ${error.message}`);
  }
  
  return { 
    platform, 
    arch, 
    isTermux 
  };
}

/**
 * Safely find a command in PATH
 * @param {string} command - Command to find
 * @returns {Promise<string|null>} - Path to command or null if not found
 */
async function safeFindCommand(command) {
  // Try multiple methods to locate a command
  const methods = [
    // Method 1: Use 'which' command
    async () => {
      try {
        const { stdout } = await execAsync(`which ${command}`);
        return stdout.trim() || null;
      } catch {
        return null;
      }
    },
    // Method 2: Use 'command -v' (more portable)
    async () => {
      try {
        const { stdout } = await execAsync(`command -v ${command}`);
        return stdout.trim() || null;
      } catch {
        return null;
      }
    },
    // Method 3: Check common binary directories manually
    async () => {
      const commonPaths = [
        '/bin', '/usr/bin', '/usr/local/bin', 
        '/data/data/com.termux/files/usr/bin'
      ];
      for (const basePath of commonPaths) {
        try {
          const fullPath = path.join(basePath, command);
          await fs.access(fullPath, fs.constants.X_OK);
          return fullPath;
        } catch {
          // Not found in this path, continue checking
        }
      }
      return null;
    }
  ];
  
  // Try each method until one succeeds
  for (const method of methods) {
    const result = await method();
    if (result) return result;
  }
  
  return null;
}

/**
 * Find the appropriate Playit binary for the current platform
 * @param {Object} platformInfo - Platform information
 * @returns {Promise<string|null>} - Path to the binary or null if not found
 */
async function findPlayitBinary(platformInfo) {
  const { platform, isTermux } = platformInfo;
  
  // If on Termux, check if playit-cli is available
  if (isTermux) {
    try {
      // Use our safe command finder instead of relying on which directly
      const playitPath = await safeFindCommand('playit-cli');
      if (playitPath) {
        return playitPath; // Return full path to command
      }
    } catch {
      // Not in PATH
    }
  }
  
  // For other platforms, find the appropriate binary
  const binaryName = platform === 'win32' ? 'playit.exe' : 'playit';
  const commonPaths = [
    path.join(process.cwd(), binaryName),                  // Current directory
    path.join(process.cwd(), 'bin', binaryName),           // ./bin/
    path.join(os.homedir(), '.local', 'bin', binaryName),  // ~/.local/bin/
    path.join('/usr', 'local', 'bin', binaryName),         // /usr/local/bin/
    path.join('/usr', 'bin', binaryName),                  // /usr/bin/
  ];
  
  // Windows-specific paths
  if (platform === 'win32') {
    commonPaths.push(
      path.join(process.env.APPDATA || '', 'playit', binaryName),
      path.join(process.env.PROGRAMFILES || '', 'playit', binaryName),
      path.join(process.env.LOCALAPPDATA || '', 'playit', binaryName)
    );
  }
  
  // Termux-specific paths
  if (isTermux) {
    commonPaths.push(
      path.join('/data/data/com.termux/files/usr/bin', 'playit-cli'),
      path.join('/data/data/com.termux/files/home', 'playit-cli')
    );
  }
  
  // Check each path
  for (const binPath of commonPaths) {
    try {
      await fs.access(binPath, fs.constants.X_OK);
      return binPath; // Found executable binary
    } catch {
      // Binary not found at this path, continue checking
    }
  }
  
  // If we get here, try to find in PATH using our safe method
  const regularBinary = await safeFindCommand(binaryName);
  if (regularBinary) {
    return regularBinary;
  }
  
  return null; // Binary not found
}

/**
 * Install Playit binary using GitHub API
 * @param {Object} platformInfo - Platform information
 * @param {string} [customInstallDir] - Custom installation directory
 * @returns {Promise<{path: string|null, installed: boolean, error: string|null}>}
 */
async function installPlayitBinary(platformInfo, customInstallDir) {
  const { platform, arch, isTermux } = platformInfo;
  
  try {
    // If on Termux, we'll use pkg or manually install playit-cli
    if (isTermux) {
      // Try multiple installation methods for Termux
      const termuxResult = await installOnTermux();
      return termuxResult;
    }
    
    // For other platforms, use GitHub API to get the latest release
    const releaseInfo = await getLatestReleaseInfo();
    if (!releaseInfo) {
      return {
        path: null,
        installed: false,
        error: 'Failed to fetch release information from GitHub API'
      };
    }
    
    // Map OS and architecture to GitHub release asset pattern
    const assetPattern = getAssetPattern(platform, arch);
    if (!assetPattern) {
      return {
        path: null,
        installed: false,
        error: `Unsupported platform/architecture: ${platform}/${arch}`
      };
    }
    
    // Find matching asset in release
    const asset = releaseInfo.assets.find(asset => 
      asset.name.toLowerCase().includes(assetPattern.toLowerCase())
    );
    
    if (!asset) {
      return {
        path: null,
        installed: false,
        error: `No matching binary found for ${platform}/${arch} in release ${releaseInfo.tag_name}`
      };
    }
    
    // Determine installation directory
    const installDir = customInstallDir || (platform === 'win32' 
      ? path.join(os.homedir(), 'AppData', 'Local', 'playit')
      : path.join(os.homedir(), '.local', 'bin'));
    
    // Create directory if it doesn't exist
    await fs.mkdir(installDir, { recursive: true });
    
    // Determine binary name and path
    const binaryName = platform === 'win32' ? 'playit.exe' : 'playit';
    const binaryPath = path.join(installDir, binaryName);
    
    // Download binary
    console.log(`Downloading PlayIt from ${asset.browser_download_url}...`);
    await downloadFile(asset.browser_download_url, binaryPath);
    
    // Make binary executable (not needed on Windows)
    if (platform !== 'win32') {
      await fs.chmod(binaryPath, 0o755);
    }
    
    console.log(`PlayIt binary installed to: ${binaryPath}`);
    return {
      path: binaryPath,
      installed: true,
      error: null
    };
    
  } catch (error) {
    return {
      path: null,
      installed: false,
      error: `Installation failed: ${error.message}`
    };
  }
}

/**
 * Install playit on Termux
 * @returns {Promise<{path: string|null, installed: boolean, error: string|null}>}
 */
async function installOnTermux() {
  // Try multiple methods to install on Termux
  
  // Method 1: Use pkg package manager
  try {
    console.log('Attempting to install playit-cli using pkg...');
    await execAsync('pkg install -y playit');
    
    // Verify installation
    const playitPath = await safeFindCommand('playit-cli');
    if (playitPath) {
      return {
        path: playitPath,
        installed: true,
        error: null
      };
    }
  } catch (pkgError) {
    console.log('pkg installation failed, trying alternative methods...');
  }
  
  // Method 2: Try downloading the binary directly for ARM architecture
  try {
    console.log('Attempting to download playit-cli binary directly...');
    
    // Determine architecture
    const { stdout: archOutput } = await execAsync('uname -m');
    const arch = archOutput.trim();
    
    let downloadUrl;
    if (arch.includes('aarch64') || arch.includes('arm64')) {
      downloadUrl = 'https://github.com/playit-cloud/playit-agent/releases/latest/download/playit-linux-arm64';
    } else if (arch.includes('arm')) {
      downloadUrl = 'https://github.com/playit-cloud/playit-agent/releases/latest/download/playit-linux-arm';
    } else {
      return {
        path: null,
        installed: false,
        error: `Unsupported Termux architecture: ${arch}`
      };
    }
    
    // Create bin directory if it doesn't exist
    const binDir = path.join(os.homedir(), 'bin');
    await fs.mkdir(binDir, { recursive: true });
    
    // Download the binary
    const binPath = path.join(binDir, 'playit-cli');
    
    // Use curl or wget to download
    const curlPath = await safeFindCommand('curl');
    const wgetPath = await safeFindCommand('wget');
    
    if (curlPath) {
      await execAsync(`${curlPath} -L ${downloadUrl} -o ${binPath}`);
    } else if (wgetPath) {
      await execAsync(`${wgetPath} ${downloadUrl} -O ${binPath}`);
    } else {
      return {
        path: null,
        installed: false,
        error: 'Neither curl nor wget is available for downloading'
      };
    }
    
    // Make it executable
    await fs.chmod(binPath, 0o755);
    
    // Create symlink in PATH if possible
    try {
      const usrBinPath = '/data/data/com.termux/files/usr/bin/playit-cli';
      await fs.symlink(binPath, usrBinPath);
    } catch (symlinkError) {
      // If symlink fails, we can still use the binary directly
      console.log('Could not create symlink, using direct path instead');
    }
    
    return {
      path: binPath,
      installed: true,
      error: null
    };
    
  } catch (directInstallError) {
    return {
      path: null,
      installed: false,
      error: `Failed to install playit-cli on Termux: ${directInstallError.message}`
    };
  }
}

/**
 * Get latest release information from GitHub API
 * @returns {Promise<Object|null>}
 */
function getLatestReleaseInfo() {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.github.com',
      path: '/repos/playit-cloud/playit-agent/releases/latest',
      headers: {
        'User-Agent': 'Node.js PlayIt Binary Manager',
        'Accept': 'application/vnd.github.v3+json'
      }
    };
    
    https.get(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          if (res.statusCode === 200) {
            resolve(JSON.parse(data));
          } else {
            console.error(`GitHub API returned status code ${res.statusCode}`);
            resolve(null);
          }
        } catch (e) {
          console.error('Error parsing GitHub API response:', e.message);
          resolve(null);
        }
      });
    }).on('error', (err) => {
      console.error('Error accessing GitHub API:', err.message);
      resolve(null);
    });
  });
}

/**
 * Map platform and architecture to GitHub release asset pattern
 * @param {string} platform - OS platform
 * @param {string} arch - CPU architecture
 * @returns {string|null} - Asset pattern to look for
 */
function getAssetPattern(platform, arch) {
  // Map Node.js platform/arch to GitHub release asset patterns
  const patterns = {
    win32: {
      x64: 'windows-amd64',
      ia32: 'windows-386',
      arm64: 'windows-arm64'
    },
    linux: {
      x64: 'linux-amd64',
      ia32: 'linux-386',
      arm: 'linux-arm',
      arm64: 'linux-arm64'
    },
    darwin: {
      x64: 'darwin-amd64',
      arm64: 'darwin-arm64'
    }
  };
  
  if (patterns[platform] && patterns[platform][arch]) {
    return patterns[platform][arch];
  }
  
  return null;
}

/**
 * Download a file from a URL
 * @param {string} url - URL to download from
 * @param {string} destination - Path to save the file
 * @returns {Promise<void>}
 */
async function downloadFile(url, destination) {
  // Try multiple download methods
  
  // First, try native Node.js https download
  try {
    await nativeDownload(url, destination);
    return;
  } catch (nativeError) {
    console.log('Native download failed, trying alternatives...');
  }
  
  // Try using curl if available
  const curlPath = await safeFindCommand('curl');
  if (curlPath) {
    try {
      await execAsync(`${curlPath} -L ${url} -o ${destination}`);
      return;
    } catch (curlError) {
      console.log('curl download failed, trying wget...');
    }
  }
  
  // Try using wget if available
  const wgetPath = await safeFindCommand('wget');
  if (wgetPath) {
    try {
      await execAsync(`${wgetPath} ${url} -O ${destination}`);
      return;
    } catch (wgetError) {
      throw new Error('All download methods failed');
    }
  }
  
  throw new Error('No download method available');
}

/**
 * Native Node.js download implementation
 * @param {string} url - URL to download from
 * @param {string} destination - Path to save the file
 * @returns {Promise<void>}
 */
function nativeDownload(url, destination) {
  return new Promise((resolve, reject) => {
    const fileStream = fs.createWriteStream(destination);
    
    https.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 302 || response.statusCode === 301) {
        fileStream.close();
        return nativeDownload(response.headers.location, destination)
          .then(resolve)
          .catch(reject);
      }
      
      // Check for successful response
      if (response.statusCode !== 200) {
        fileStream.close();
        return reject(new Error(`Failed to download: HTTP ${response.statusCode}`));
      }
      
      // Pipe the response to the file
      response.pipe(fileStream);
      
      // Handle errors
      fileStream.on('error', (err) => {
        fileStream.close();
        reject(err);
      });
      
      // Resolve promise when download completes
      fileStream.on('finish', () => {
        fileStream.close();
        resolve();
      });
    }).on('error', (err) => {
      fileStream.close();
      reject(err);
    });
  });
}

// Example usage
export async function example() {
  // Find binary and auto-install dependencies and binary if needed
  const result = await getPlayitBinary({ 
    autoInstall: true,
    installDir: path.join(process.cwd(), 'bin')
  });
  
  console.log('Result:', result);
  
  return result.path;
}

example()
