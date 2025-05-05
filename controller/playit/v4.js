import { spawn, exec } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { EventEmitter } from "events";
import { fileURLToPath } from "url";
import { getPlayitBinary } from "./finder-v3.js";

// Configuration path remains the same
const configPath = `${os.homedir()}/.config/playit_gg/playit.toml`;
const play = await getPlayitBinary({ autoInstall: true });
if (play.installed) console.log("playit exist");
const plyPath = play.path;

// Keeps the same ANSI cleaning function - untouched
function cleanAnsi(input) {
  return input
    .toString()
    .replace(/\x1B[[@-_][0-?]*[ -/]*[@-~]/g, "") // ANSI escape codes
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, "") // Control characters
    .trim();
}

// Same extraction function - untouched
function extractSecretCode(output) {
  const match = output.match(/[a-f0-9]{64}(?![\s\S]*[a-f0-9]{64})/i);
  return match ? match[0] : null;
}

// Create PlayItClient class that extends EventEmitter
class PlayItClient extends EventEmitter {
  constructor() {
    super();
  }

  login() {
    const prs = spawn(plyPath, ["claim", "generate"]);

    prs.stdout.on("data", (data) => {
      const rawString = data.toString();
      const claimCode = rawString
        .replace(/\u001b\[\d+m/g, "") // Remove color codes
        .replace(/\u001b\[\d+;\d+[A-Za-z]/g, "") // Remove cursor movement
        .replace(/\u001b\[\??\d+[A-Za-z]/g, "") // Remove other escape sequences
        .replace(/\u001b8/g, "") // Remove specific escape you're seeing
        .replace(/\u001b\[0m/g, "") // Remove reset sequence
        .trim(); // Remove whitespace

      console.log("Raw claim code:", JSON.stringify(rawString)); // Debug original
      console.log("Clean claim code:", JSON.stringify(claimCode)); // Debug cleaned version

      if (!claimCode) {
        const error = "Failed to extract claim code!";
        console.error(error);
        this.emit("error", error);
        return;
      }

      const claimUrl = `https://playit.gg/claim/${claimCode}`;
      console.log("Visit to claim:", claimUrl);
      this.emit("claim", { code: claimCode, url: claimUrl });

      setTimeout(() => {
        console.log(`Exchanging code: "${claimCode}"`);
        this.emit("exchanging", claimCode);

        exec(
          `${plyPath} claim exchange "${claimCode}"`,
          (err, stdout, stderr) => {
            if (err) {
              console.error("Exchange error:", err.message);
              this.emit("error", err.message);
              return;
            }

            if (stderr) {
              console.error("stderr:", stderr);
              this.emit("warning", stderr);
            }

            const secret = extractSecretCode(JSON.stringify(stdout));
            if (!secret) {
              const error = "Secret not found!";
              console.error(error);
              this.emit("error", error);
              return;
            }

            try {
              fs.mkdirSync(path.dirname(configPath), { recursive: true });
              fs.writeFileSync(
                configPath,
                `secret_key = "${secret}"\n`,
                "utf-8"
              );
              console.log("Secret key written to config.");
              this.emit("secret", { path: configPath, key: secret });
            } catch (e) {
              console.error("Failed to write secret:", e.message);
              this.emit("error", e.message);
            }
          }
        );
      }, 3000);
    });

    prs.stderr.on("data", (err) => {
      const error = cleanAnsi(err);
      console.error("Claim generate error:", error);
      this.emit("error", error);
    });
  }

  start() {
    const p = spawn(plyPath, { stdio: "inherit" });
    this.emit("starting");

    p.on("error", (err) => {
      console.error("Start error:", err.message);
      this.emit("error", err.message);
    });

    p.on("close", (code) => {
      this.emit("stopped", code);
    });
  }

  getTunnels() {
    this.listTunnels();
  }

  listTunnels() {
    const p = spawn(plyPath, ["tunnels", "list"]);

    p.stdout.on("data", (d) => {
      const data = JSON.parse(cleanAnsi(d));
      console.log(data.tunnels);
      this.emit("tunnels", data.tunnels);
    return data.tunnels;});

    p.stderr.on("data", (d) => {
      const error = cleanAnsi(d);
      console.error("Error:", error);
      this.emit("error", error);
    });
  }

  reset() {
    const p = spawn(plyPath, ["reset"], { stdio: "inherit" });
    this.emit("resetting");

    p.on("error", (err) => {
      console.error("Reset error:", err.message);
      this.emit("error", err.message);
    });

    p.on("close", (code) => {
      this.emit("reset-complete", code);
    });
  }

  showSecretPath() {
    const p = spawn(plyPath, ["secret-path"]);

    p.stdout.on("data", (d) => {
      const path = cleanAnsi(d);
      console.log(path);
      this.emit("secret-path", path);
    });

    p.stderr.on("data", (d) => {
      const error = cleanAnsi(d);
      console.error("Error:", error);
      this.emit("error", error);
    });
  }

  showVersion() {
    const p = spawn(plyPath, ["version"]);

    p.stdout.on("data", (d) => {
      const version = cleanAnsi(d);
      console.log(version);
      this.emit("version", version);
    });

    p.stderr.on("data", (d) => {
      const error = cleanAnsi(d);
      console.error("Error:", error);
      this.emit("error", error);
    });
  }

  getVersion() {
    this.showVersion();
  }

  help() {
    const helpText = `
Usage: Import PlayItClient and use its methods

Methods:
  login()         Start login and write secret
  listTunnels()   List tunnels
  getTunnels()    Alias for listTunnels()
  start()         Start the playit agent
  reset()         Reset saved secret key
  showSecretPath() Show path of secret key
  showVersion()   Show playit-cli version
  getVersion()    Alias for showVersion()
  help()          Show this help message
  `;

    console.log(helpText);
    this.emit("help", helpText);
    return helpText;
  }
}

// Export the class for module usage
export default PlayItClient;

// Provide a CLI interface for backward compatibility
const fmm = fileURLToPath(import.meta.url)
  .toLowerCase()
  .replace(".js", "");

if (process.argv[1] === fmm) {
  const client = new PlayItClient();
  const arg = process.argv[2];

  // Main control
  switch (arg) {
    case "--login":
      client.login();
      break;
    case "--list":
      client.listTunnels();
      break;
    case "--start":
      client.start();
      break;
    case "--reset":
      client.reset();
      break;
    case "--secret-path":
      client.showSecretPath();
      break;
    case "--version":
      client.showVersion();
      break;
    case "--help":
    default:
      client.help();
      break;
  }
}
