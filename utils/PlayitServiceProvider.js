// PlayItService.js - Express middleware for PlayIt.gg integration (Debian-focused)
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import { EventEmitter } from "events";
import axios from "axios";
import * as pty from "node-pty";
import { promisify } from "util";
import { setTimeout } from "timers/promises";

// Constants
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PLAYIT_PATH = "/usr/local/bin/playit";
const CONFIG_PATH = path.join(__dirname, "playit.toml");
const SECRET_PATH = path.join(__dirname, "playit.toml");
const DEFAULT_MINECRAFT_PORT = 25565;
const GITHUB_API_URL =
  "https://api.github.com/repos/playit-cloud/playit-agent/releases/latest";
const PLAYIT_VERSION_PATH = path.join(__dirname, "playit-version.json");
const SYSTEMD_SERVICE_PATH = "/etc/systemd/system/playit-agent.service";

/**
 * Execute command with PTY and return output
 * @param {string} command Command to execute
 * @param {Object} options Options for execution
 * @returns {Promise<{stdout: string, stderr: string}>}
 */
async function execWithPty(command, options = {}) {
  return new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";

    const term = pty.spawn("bash", ["-c", command], {
      name: "xterm-color",
      cols: 80,
      rows: 30,
      cwd: options.cwd || process.cwd(),
      env: options.env || process.env,
    });

    const timeout = options.timeout
      ? setTimeout(options.timeout).then(() => {
          term.kill();
          reject(
            new Error(
              `Command timed out after ${options.timeout}ms: ${command}`
            )
          );
        })
      : null;

    term.onData((data) => {
      // Handle password prompt for sudo
      if (data.includes("password") && options.sudoPassword) {
        term.write(`${options.sudoPassword}\n`);
        return;
      }
      stdout += data;
    });

    term.onExit(({ exitCode }) => {
      if (timeout) clearTimeout(timeout);

      if (exitCode !== 0 && !options.ignoreExitCode) {
        reject(
          new Error(
            `Command failed with exit code ${exitCode}: ${command}\n${stderr}`
          )
        );
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

/**
 * PlayIt.gg Service for Minecraft Server TCP Tunneling
 * Optimized for Debian-based Linux distributions
 */
class PlayItService extends EventEmitter {
  constructor(options = {}) {
    super();
    this.minecraftPort = options.minecraftPort || DEFAULT_MINECRAFT_PORT;
    this.playitProcess = null;
    this.tunnelUrl = null;
    this.tunnelStatus = "stopped";
    this.authUrl = null;
    this.logs = [];
    this.maxLogs = options.maxLogs || 100;
    this.autoRestart = options.autoRestart || false;
    this.restartAttempts = 0;
    this.maxRestartAttempts = options.maxRestartAttempts || 3;
    this.restartDelay = options.restartDelay || 5000; // 5 seconds
    this.currentVersion = null;
    this.latestVersion = null;
    this.startTime = null;
    this.checkIntervalId = null;
    this.useSystemd = options.useSystemd || false;
    this.sudoPassword = options.sudoPassword || null;
    this.journalPty = null;
    this.retryDelays = [5000, 10000, 30000]; // Progressive retry delays
    this.shutdownRequested = false;
  }

  /**
   * System log helper
   */
  logSystem(message) {
    const log = {
      timestamp: new Date().toISOString(),
      type: "system",
      message,
    };
    this.logs.push(log);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
    this.emit("log", log);
    console.log(`[PlayIt System] ${message}`);
  }

  /**
   * PlayIt log helper
   */
  logPlayIt(message) {
    const log = {
      timestamp: new Date().toISOString(),
      type: "playit",
      message,
    };
    this.logs.push(log);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
    this.emit("log", log);
    console.log(`[PlayIt Agent] ${message.trim()}`);
  }

  /**
   * Error log helper
   */
  logError(message) {
    const log = {
      timestamp: new Date().toISOString(),
      type: "error",
      message,
    };
    this.logs.push(log);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
    this.emit("log", log);
    console.error(`[PlayIt Error] ${message}`);
  }

  /**
   * Update service status with safety checks
   */
  setStatus(status) {
    const validStatuses = [
      "stopped",
      "starting",
      "running",
      "error",
      "restarting",
    ];
    if (!validStatuses.includes(status)) {
      this.logError(`Invalid status: ${status}`);
      return;
    }

    this.tunnelStatus = status;
    this.emit("status_change", { status });
  }

  /**
   * Get current PlayIt version from saved file
   */
  async getCurrentVersion() {
    try {
      const versionData = await fs.readFile(PLAYIT_VERSION_PATH, "utf8");
      const version = JSON.parse(versionData);
      this.currentVersion = version.version;
      return version.version;
    } catch (error) {
      this.logSystem("No version file found, will create one after download");
      return null;
    }
  }

  /**
   * Save current PlayIt version to file
   */
  async saveCurrentVersion(version) {
    try {
      await fs.writeFile(
        PLAYIT_VERSION_PATH,
        JSON.stringify({ version, updated: new Date() })
      );
      this.currentVersion = version;
      this.logSystem(`Version information saved: ${version}`);
    } catch (error) {
      this.logError(`Failed to save version information: ${error.message}`);
    }
  }

  /**
   * Fetch latest PlayIt version from GitHub with retries
   */
  async fetchLatestVersion(retries = 3) {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const response = await axios.get(GITHUB_API_URL, {
          headers: {
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "PlayItService",
          },
          timeout: 10000,
        });

        const latestVersion = response.data.tag_name;
        this.latestVersion = latestVersion;
        this.logSystem(`Latest PlayIt version: ${latestVersion}`);
        return latestVersion;
      } catch (error) {
        const isLastAttempt = attempt === retries - 1;
        this.logError(
          `Attempt ${attempt + 1}/${retries} to fetch latest version failed: ${
            error.message
          }`
        );

        if (!isLastAttempt) {
          // Wait before retry with exponential backoff
          const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
          this.logSystem(`Retrying in ${delay / 1000} seconds...`);
          await setTimeout(delay);
        } else {
          return null;
        }
      }
    }
    return null;
  }

  /**
   * Check if update is available
   */
  async checkForUpdates() {
    try {
      const currentVersion = await this.getCurrentVersion();
      const latestVersion = await this.fetchLatestVersion();

      if (!currentVersion || !latestVersion) {
        return {
          updateAvailable: false,
          currentVersion,
          latestVersion,
          error: !latestVersion
            ? "Could not fetch latest version"
            : "No current version found",
        };
      }

      // Remove the 'v' prefix if present for comparison
      const current = currentVersion.replace(/^v/, "");
      const latest = latestVersion.replace(/^v/, "");

      const updateAvailable = current !== latest;

      return {
        updateAvailable,
        currentVersion,
        latestVersion,
      };
    } catch (error) {
      this.logError(`Error checking for updates: ${error.message}`);
      return {
        updateAvailable: false,
        error: error.message,
      };
    }
  }

  /**
   * Check if system dependencies are installed
   */
  async checkDependencies() {
    try {
      await execWithPty("dpkg -l | grep curl");
      await execWithPty("dpkg -l | grep systemd");
      return true;
    } catch (error) {
      this.logError("Missing dependencies: curl or systemd not installed");
      return false;
    }
  }

  /**
   * Install system dependencies with better error handling
   */
  async installDependencies() {
    if (!this.sudoPassword) {
      this.logError("Sudo password required to install dependencies");
      return false;
    }

    try {
      this.logSystem("Installing dependencies...");

      // Update package lists
      await execWithPty("sudo apt-get update", {
        sudoPassword: this.sudoPassword,
        timeout: 60000, // 1 minute timeout for update
      });

      // Install required packages
      await execWithPty("sudo apt-get install -y curl systemd", {
        sudoPassword: this.sudoPassword,
        timeout: 120000, // 2 minute timeout for install
      });

      return true;
    } catch (error) {
      this.logError(`Failed to install dependencies: ${error.message}`);
      return false;
    }
  }

  /**
   * Download PlayIt CLI with robust error handling and retries
   */
  async ensurePlayItExists(forceUpdate = false) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        // Check if binary exists
        const binaryExists = await fs
          .access(PLAYIT_PATH)
          .then(() => true)
          .catch(() => false);

        if (binaryExists && !forceUpdate) {
          this.logSystem("PlayIt binary already exists");
          return true;
        }

        // Check dependencies first
        const dependenciesOk = await this.checkDependencies();
        if (!dependenciesOk) {
          const installed = await this.installDependencies();
          if (!installed) {
            return false;
          }
        }

        this.logSystem(
          forceUpdate
            ? "Forcing update of PlayIt binary..."
            : "Downloading PlayIt binary..."
        );

        // Get latest release info
        let latestVersion;
        try {
          latestVersion = await this.fetchLatestVersion();
          if (!latestVersion) throw new Error("Failed to get latest version");
        } catch (error) {
          this.logError(`Failed to fetch release info: ${error.message}`);

          if (attempt < 2) {
            const delay = this.retryDelays[attempt];
            this.logSystem(`Retrying in ${delay / 1000} seconds...`);
            await setTimeout(delay);
            continue;
          }
          return false;
        }

        // Download URL for Linux
        const downloadUrl =
          "https://github.com/playit-cloud/playit-agent/releases/latest/download/playit-linux";
        this.logSystem(`Downloading from: ${downloadUrl}`);

        try {
          // Use curl to download the file
          const tempPath = `/tmp/playit-download-${Date.now()}`;

          await execWithPty(`curl -L -o ${tempPath} ${downloadUrl}`, {
            timeout: 60000, // 1 minute timeout
          });

          // Make it executable and move to final location
          if (this.sudoPassword) {
            await execWithPty(`sudo chmod +x ${tempPath}`, {
              sudoPassword: this.sudoPassword,
            });
            await execWithPty(`sudo mv ${tempPath} ${PLAYIT_PATH}`, {
              sudoPassword: this.sudoPassword,
            });
          } else {
            await execWithPty(`chmod +x ${tempPath}`);
            await execWithPty(`mv ${tempPath} ${PLAYIT_PATH}`);
          }

          // Save version information
          if (latestVersion) {
            await this.saveCurrentVersion(latestVersion);
          }

          this.logSystem("PlayIt binary downloaded and installed successfully");
          return true;
        } catch (err) {
          this.logError(`Failed to download PlayIt: ${err.message}`);

          // Clean up temp file if it exists
          try {
            await fs
              .unlink(`/tmp/playit-download-${Date.now()}`)
              .catch(() => {});
          } catch (e) {
            // Ignore cleanup errors
          }

          if (attempt < 2) {
            const delay = this.retryDelays[attempt];
            this.logSystem(`Retrying in ${delay / 1000} seconds...`);
            await setTimeout(delay);
            continue;
          }
          return false;
        }
      } catch (error) {
        this.logError(`Failed to ensure PlayIt exists: ${error.message}`);

        if (attempt < 2) {
          const delay = this.retryDelays[attempt];
          this.logSystem(`Retrying in ${delay / 1000} seconds...`);
          await setTimeout(delay);
          continue;
        }
        return false;
      }
    }
    return false;
  }

  /**
   * Create or update the PlayIt config file with validation
   */
  async setupPlayItConfig() {
    try {
      const configExists = await fs
        .access(CONFIG_PATH)
        .then(() => true)
        .catch(() => false);

      if (!configExists) {
        // Create a basic config for Minecraft
        const config = `
[agent]
secret_path = "${SECRET_PATH.replace(/\\/g, "\\\\")}"

[[tunnels]]
name = "Minecraft Server"
proto = "tcp"
port = ${this.minecraftPort}
`;

        await fs.writeFile(CONFIG_PATH, config);
        this.logSystem("Created PlayIt configuration file");
      } else {
        // Validate existing config
        try {
          const configData = await fs.readFile(CONFIG_PATH, "utf8");
          if (
            !configData.includes("[agent]") ||
            !configData.includes("[[tunnels]]")
          ) {
            this.logError(
              "Config file exists but appears invalid, recreating..."
            );

            // Backup old config
            await fs.copyFile(CONFIG_PATH, `${CONFIG_PATH}.bak.${Date.now()}`);

            // Create new config
            const config = `
[agent]
secret_path = "${SECRET_PATH.replace(/\\/g, "\\\\")}"

[[tunnels]]
name = "Minecraft Server"
proto = "tcp"
port = ${this.minecraftPort}
`;
            await fs.writeFile(CONFIG_PATH, config);
            this.logSystem("Recreated PlayIt configuration file");
          }
        } catch (readError) {
          this.logError(`Failed to validate config: ${readError.message}`);
          return false;
        }
      }
      return true;
    } catch (error) {
      this.logError(`Failed to setup PlayIt config: ${error.message}`);
      return false;
    }
  }

  /**
   * Create systemd service file with better error handling
   */
  async setupSystemdService() {
    if (!this.useSystemd) return true;

    if (!this.sudoPassword) {
      this.logError("Sudo password required to setup systemd service");
      return false;
    }

    try {
      const serviceContent = `[Unit]
Description=PlayIt.gg Agent Service
After=network.target
StartLimitIntervalSec=300
StartLimitBurst=5

[Service]
ExecStart=${PLAYIT_PATH} --secret_path ${CONFIG_PATH}
Restart=on-failure
RestartSec=30
User=root
Group=root
Environment=PATH=/usr/bin:/usr/local/bin
WorkingDirectory=${__dirname}
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
`;

      // Write the service file to a temporary location
      const tempServicePath = `/tmp/playit-agent-${Date.now()}.service`;
      await fs.writeFile(tempServicePath, serviceContent);

      // Move to systemd directory
      await execWithPty(`sudo mv ${tempServicePath} ${SYSTEMD_SERVICE_PATH}`, {
        sudoPassword: this.sudoPassword,
      });

      // Reload systemd
      await execWithPty(`sudo systemctl daemon-reload`, {
        sudoPassword: this.sudoPassword,
      });

      // Enable service
      await execWithPty(`sudo systemctl enable playit-agent.service`, {
        sudoPassword: this.sudoPassword,
      });

      this.logSystem("Systemd service configured successfully");
      return true;
    } catch (error) {
      this.logError(`Failed to setup systemd service: ${error.message}`);
      return false;
    }
  }

  /**
   * Start the PlayIt agent with improved reliability
   */
  async start() {
    if (
      this.playitProcess ||
      this.tunnelStatus === "running" ||
      this.tunnelStatus === "starting"
    ) {
      return {
        success: false,
        message: "PlayIt is already running or starting",
      };
    }

    this.shutdownRequested = false;

    // Make sure PlayIt binary exists
    const binaryExists = await this.ensurePlayItExists();
    if (!binaryExists) {
      return { success: false, message: "Failed to download PlayIt binary" };
    }

    // Ensure config is set up
    const configSetup = await this.setupPlayItConfig();
    if (!configSetup) {
      return {
        success: false,
        message: "Failed to setup PlayIt configuration",
      };
    }

    this.logSystem("Starting PlayIt agent...");
    this.setStatus("starting");

    try {
      // Start with systemd if enabled
      if (this.useSystemd) {
        const systemdSetup = await this.setupSystemdService();
        if (!systemdSetup) {
          return {
            success: false,
            message: "Failed to setup systemd service",
          };
        }

        // Start the service
        await execWithPty(`sudo systemctl start playit-agent.service`, {
          sudoPassword: this.sudoPassword,
          timeout: 30000,
        });

        // Set up log monitoring for systemd service
        await this.monitorSystemdLogs();

        // Verify service is actually running
        try {
          const { stdout } = await execWithPty(
            `sudo systemctl is-active playit-agent.service`,
            {
              sudoPassword: this.sudoPassword,
            }
          );

          if (stdout.trim() !== "active") {
            throw new Error(
              `Service failed to start, status: ${stdout.trim()}`
            );
          }
        } catch (statusError) {
          this.setStatus("error");
          return {
            success: false,
            message: `Failed to verify service is running: ${statusError.message}`,
          };
        }

        this.setStatus("running");
        this.startTime = Date.now();
        this.startHealthCheck();

        return { success: true, message: "PlayIt started via systemd" };
      }

      // Otherwise start directly with node-pty
      this.playitProcess = pty.spawn(
        PLAYIT_PATH,
        ["--secret_path", CONFIG_PATH],
        {
          name: "xterm-color",
          cols: 80,
          rows: 30,
          cwd: __dirname,
          env: process.env,
        }
      );

      this.startTime = Date.now();

      // Handle process output
      let buffer = "";

      this.playitProcess.onData((data) => {
        buffer += data;

        // Process complete lines
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep the last incomplete line in the buffer

        for (const line of lines) {
          if (!line.trim()) continue;

          this.logPlayIt(line);

          // Look for the tunnel URL in the output
          const tunnelMatch = line.match(
            /https:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z0-9]+\.[a-zA-Z0-9]+(:\d+)?/
          );
          if (tunnelMatch) {
            this.tunnelUrl = tunnelMatch[0];
            this.setStatus("running");
            this.emit("tunnel_created", { url: this.tunnelUrl });
            this.logSystem(
              `✅ Minecraft server tunnel available at: ${this.tunnelUrl}`
            );

            // Reset restart attempts on successful tunnel creation
            this.restartAttempts = 0;
          }

          // Check for authentication requirement
          if (line.includes("visit the following URL to authenticate")) {
            const authUrlMatch = line.match(
              /(https:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z0-9]+\.[a-zA-Z0-9]+\/[a-zA-Z0-9-]+)/
            );
            if (authUrlMatch) {
              this.authUrl = authUrlMatch[0];
              this.emit("auth_required", { url: this.authUrl });
            }
          }

          // Check for common error patterns
          if (
            line.includes("error") ||
            line.includes("failed") ||
            line.includes("cannot")
          ) {
            // Handle specific errors
            if (line.includes("address already in use")) {
              this.logError(
                "Port conflict detected - another process is using the same port"
              );
            }
          }
        }
      });

      this.playitProcess.onExit(({ exitCode }) => {
        this.logSystem(`PlayIt process exited with code ${exitCode}`);

        // Don't restart if shutdown was requested
        if (!this.shutdownRequested) {
          this.handleProcessFailure(exitCode);
        } else {
          this.setStatus("stopped");
          this.playitProcess = null;
        }
      });

      // Start health check interval
      this.startHealthCheck();

      return { success: true, message: "PlayIt started successfully" };
    } catch (error) {
      this.logError(`Failed to start PlayIt: ${error.message}`);
      this.setStatus("error");
      return {
        success: false,
        message: `Failed to start PlayIt: ${error.message}`,
      };
    }
  }

  /**
   * Monitor systemd service logs with improved error handling
   */
  async monitorSystemdLogs() {
    if (!this.useSystemd) return;

    try {
      // Kill any existing journalctl process
      if (this.journalPty) {
        this.journalPty.kill();
        this.journalPty = null;
      }

      // Use journalctl to follow logs
      this.journalPty = pty.spawn(
        "journalctl",
        ["-u", "playit-agent.service", "-f", "-n", "100"],
        {
          name: "xterm-color",
          cols: 120,
          rows: 30,
        }
      );

      let buffer = "";

      this.journalPty.onData((data) => {
        buffer += data;

        // Process complete lines
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep the last incomplete line in the buffer

        for (const line of lines) {
          if (!line.trim()) continue;

          this.logPlayIt(line);

          // Look for the tunnel URL in the output
          const tunnelMatch = line.match(
            /https:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z0-9]+\.[a-zA-Z0-9]+(:\d+)?/
          );
          if (tunnelMatch) {
            this.tunnelUrl = tunnelMatch[0];
            this.setStatus("running");
            this.emit("tunnel_created", { url: this.tunnelUrl });
            this.logSystem(
              `✅ Minecraft server tunnel available at: ${this.tunnelUrl}`
            );
          }

          // Check for authentication requirement
          if (line.includes("visit the following URL to authenticate")) {
            const authUrlMatch = line.match(
              /(https:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z0-9]+\.[a-zA-Z0-9]+\/[a-zA-Z0-9-]+)/
            );
            if (authUrlMatch) {
              this.authUrl = authUrlMatch[0];
              this.emit("auth_required", { url: this.authUrl });
            }
          }
        }
      });

      this.journalPty.onExit(({ exitCode }) => {
        this.logError(`Journalctl process exited with code ${exitCode}`);

        // Restart the journalctl process if it exits unexpectedly and we're still running
        if (this.tunnelStatus === "running" && !this.shutdownRequested) {
          this.logSystem("Restarting journalctl monitoring...");
          setTimeout(() => this.monitorSystemdLogs(), 5000);
        }
      });
    } catch (error) {
      this.logError(`Failed to monitor systemd logs: ${error.message}`);

      // Try to restart monitoring after a delay
      if (this.tunnelStatus === "running") {
        setTimeout(() => this.monitorSystemdLogs(), 10000);
      }
    }
  }

  /**
   * Handle PlayIt process failure or exit with improved error handling
   */
  handleProcessFailure(codeOrError) {
    // Don't handle if shutdown was requested
    if (this.shutdownRequested) return;

    // Clear the process reference
    this.playitProcess = null;
    this.setStatus("stopped");

    // Only clear tunnel URL if we're not using systemd (which might still be running)
    if (!this.useSystemd) {
      this.tunnelUrl = null;
    }

    const uptime = this.startTime
      ? Math.floor((Date.now() - this.startTime) / 1000)
      : 0;
    this.emit("stopped", {
      code: typeof codeOrError === "number" ? codeOrError : null,
      uptime,
      error: typeof codeOrError !== "number" ? codeOrError.message : null,
    });

    // If auto-restart is enabled, try to restart the process with progressive delays
    if (
      this.autoRestart &&
      !this.useSystemd &&
      this.restartAttempts < this.maxRestartAttempts
    ) {
      this.restartAttempts++;
      const delay =
        this.retryDelays[
          Math.min(this.restartAttempts - 1, this.retryDelays.length - 1)
        ];

      this.logSystem(
        `Auto-restarting PlayIt (attempt ${this.restartAttempts}/${
          this.maxRestartAttempts
        }) in ${delay / 1000} seconds...`
      );
      this.setStatus("restarting");

      setTimeout(() => {
        if (!this.shutdownRequested) {
          this.start().then((result) => {
            if (!result.success) {
              this.logError(`Failed to auto-restart: ${result.message}`);
              this.setStatus("error");
            }
          });
        }
      }, delay);
    } else if (this.autoRestart && !this.useSystemd) {
      this.logError(
        `Maximum restart attempts (${this.maxRestartAttempts}) reached. Not restarting.`
      );
      this.setStatus("error");
    }

    // Clear health check interval
    this.stopHealthCheck();
  }

  /**
   * Start periodic health check with improved monitoring
   */
  startHealthCheck() {
    if (this.checkIntervalId) {
      clearInterval(this.checkIntervalId);
    }

    this.checkIntervalId = setInterval(async () => {
      try {
        if (this.useSystemd) {
          // Check systemd service status
          try {
            const { stdout } = await execWithPty(
              "systemctl is-active playit-agent.service",
              {
                sudoPassword: this.sudoPassword,
              }
            );

            if (stdout.trim() === "active") {
              // Double-check if tunnel URL exists after a while
              if (
                this.tunnelStatus === "running" &&
                !this.tunnelUrl &&
                this.startTime
              ) {
                const uptime = Date.now() - this.startTime;

                // After 60 seconds, if we still don't have a tunnel URL, restart
                if (uptime > 60000) {
                  this.logError(
                    "Service is running but no tunnel URL detected after 60s, restarting..."
                  );
                  await this.restart();
                }
              }
            } else {
              this.logError(
                `PlayIt health check: Systemd service not active (${stdout.trim()})`
              );
              if (this.tunnelStatus !== "restarting") {
                await this.restart();
              }
            }
          } catch (error) {
            this.logError(`Health check failed: ${error.message}`);
            if (this.tunnelStatus !== "restarting") {
              await this.restart();
            }
          }
        } else if (this.playitProcess && this.tunnelStatus === "running") {
          // Successfully running, reset restart attempts periodically
          if (
            this.restartAttempts > 0 &&
            this.startTime &&
            Date.now() - this.startTime > 300000
          ) {
            // 5 minutes of stable operation
            this.restartAttempts = 0;
            this.logSystem(
              "Stable operation for 5 minutes, resetting restart counter"
            );
          }

          // Check if we have a tunnel URL after 30 seconds
          if (!this.tunnelUrl && this.startTime) {
            const uptime = Date.now() - this.startTime;
            if (uptime > 30000) {
              this.logError(
                "Process is running but no tunnel URL detected after 30s, restarting..."
              );
              await this.stop();
              if (this.autoRestart) {
                await this.start();
              }
            }
          }
        }
      } catch (healthError) {
        this.logError(`Error during health check: ${healthError.message}`);
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Stop health check interval
   */
  stopHealthCheck() {
    if (this.checkIntervalId) {
      clearInterval(this.checkIntervalId);
      this.checkIntervalId = null;
    }
  }

  /**
   * Stop the PlayIt agent with graceful shutdown and cleanup
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async stop() {
    this.shutdownRequested = true;
    this.logSystem("Stopping PlayIt agent...");

    // Stop health check first
    this.stopHealthCheck();

    try {
      if (this.useSystemd) {
        // Stop systemd service
        if (!this.sudoPassword) {
          this.logError("Sudo password required to stop systemd service");
          return { success: false, message: "Sudo password required" };
        }

        // Stop the systemd service
        await execWithPty("sudo systemctl stop playit-agent.service", {
          sudoPassword: this.sudoPassword,
          timeout: 30000, // 30 second timeout
        });

        // Kill journalctl monitoring process if it exists
        if (this.journalPty) {
          this.journalPty.kill();
          this.journalPty = null;
        }
      } else if (this.playitProcess) {
        // Kill the process
        this.playitProcess.kill();

        // Wait for process to fully terminate
        for (let i = 0; i < 10; i++) {
          if (!this.playitProcess) break;
          await setTimeout(500);
        }
      }

      // Reset state
      this.playitProcess = null;
      this.tunnelUrl = null;
      this.startTime = null;
      this.setStatus("stopped");
      this.emit("stopped", { code: 0, uptime: 0, graceful: true });

      this.logSystem("PlayIt agent stopped successfully");
      return { success: true, message: "PlayIt stopped successfully" };
    } catch (error) {
      this.logError(`Failed to stop PlayIt: ${error.message}`);

      // Force kill as a last resort if still running
      if (this.playitProcess) {
        try {
          this.playitProcess.kill("SIGKILL");
          this.playitProcess = null;
        } catch (killError) {
          this.logError(`Force kill failed: ${killError.message}`);
        }
      }

      this.setStatus("error");
      return {
        success: false,
        message: `Failed to stop PlayIt: ${error.message}`,
      };
    }
  }
}
export { PlayItService };
