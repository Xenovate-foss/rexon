import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { spawn } from "node-pty"; // FIXED: Proper import for node-pty
import os from "os";
import configRoute from "./controller/settings.js";
import config from "./config.json" assert { type: "json" };
import filesRoute from "./controller/files.js";
import { initFileWatcher } from "./utils/fileWatcher.js";
import expressFileUpload from "express-fileupload";
import pluginRoute from "./controller/plugin.js";
import worldRoute from "./controller/world.js";
import versionRoute from "./controller/version.js";
import systemUsage from "./utils/system-usage.js";
import { PlayItService } from "./utils/PlayitServiceProvider.js";
import MinecraftProperties from "./utils/mcPropertise.js";
import fs from "node:fs";
import {router as ngrokRouter} from "./controller/ngrok.js"

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

app.use(express.json());
app.use(expressFileUpload());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url} - ${req.ip}`);
  next();
});
app.use("/api", filesRoute);
app.use("/api", pluginRoute);
app.use("/api", worldRoute);
app.use("/api", versionRoute);
app.use("/api", ngrokRouter);
initFileWatcher(io);

const playItService = new PlayItService({
  minecraftPort:
    MinecraftProperties.parse(
      fs.readFileSync("./server/server.properties", "utf-8")
    ) || 25565,
  autoRestart: true,
  maxRestartAttempts: 3,
  useSystemd: config.useSystemd,
  sudoPassword: config.sudoPassword || null, // Be careful with storing sudo password in env
});

// Handle PlayIt events
playItService.on("log", (log) => {
  // You could store logs or broadcast to connected clients
  io.emit("playit:log", { log });
  console.log(`[${log.timestamp}] [${log.type}] ${log.message}`);
});

playItService.on("status_change", ({ status }) => {
  io.emit("playit:status", { status });
  console.log(`PlayIt status changed to: ${status}`);
});

playItService.on("tunnel_created", ({ url }) => {
  io.emit("playit:tunnel", { url });
  console.log(`🎮 Minecraft server accessible at: ${url}`);
});

playItService.on("auth_required", ({ url }) => {
  io.emit("playit:auth_required", { url });
  console.log(`⚠️ PlayIt authentication required: ${url}`);
  // You could send notification email/SMS here
});

// API endpoints for controlling PlayIt
app.post("/api/playit/start", async (req, res) => {
  const result = await playItService.start();
  res.json(result);
});

app.post("/api/playit/stop", async (req, res) => {
  const result = await playItService.stop();
  res.json(result);
});

app.post("/api/playit/restart", async (req, res) => {
  await playItService.stop();
  const result = await playItService.start();
  res.json(result);
});

app.get("/api/playit/status", (req, res) => {
  res.json({
    status: playItService.tunnelStatus,
    tunnelUrl: playItService.tunnelUrl,
    uptime: playItService.startTime
      ? Math.floor((Date.now() - playItService.startTime) / 1000)
      : 0,
    logs: playItService.logs.slice(-20), // Return last 20 logs
  });
});

app.get("/api/playit/check-updates", async (req, res) => {
  const updates = await playItService.checkForUpdates();
  res.json(updates);
});

// Update PlayIt if requested
app.post("/api/playit/update", async (req, res) => {
  // Stop service first
  await playItService.stop();

  // Force update of binary
  const downloadResult = await playItService.ensurePlayItExists(true);

  // Restart if it was running
  let startResult = { success: false, message: "Update only, not restarting" };
  if (req.body.restart) {
    startResult = await playItService.start();
  }

  res.json({
    updateSuccess: downloadResult,
    restartRequested: !!req.body.restart,
    restartResult: startResult,
  });
});
let commandHistory = [];
const MAX_HISTORY_LENGTH = 1000;
const serverFolder = "./server/";
const startUpCmd = config.startup;

let mcProcess = null;
const isServerOnline = () => mcProcess !== null;

// History utils
function addToHistory(command, output) {
  const entry = { output };
  commandHistory.unshift(entry);
  if (commandHistory.length > MAX_HISTORY_LENGTH) {
    commandHistory.pop();
  }
}

function formatHistoryForTerminal() {
  if (commandHistory.length === 0) return "";
  return commandHistory.map((e) => `\r ${e.output}`).join("");
}

// Start Minecraft server
function startServer() {
  if (mcProcess) return false;

  const shell = os.platform() === "win32" ? "powershell.exe" : "bash";
  console.log("Starting server with command:", startUpCmd);

  mcProcess = spawn(shell, ["-c", startUpCmd], {
    name: "xterm-color",
    cols: 80,
    rows: 30,
    cwd: serverFolder,
    env: process.env,
  });

  mcProcess.onData((data) => {
    io.emit("server:output", data);
    addToHistory("", data);
  });

  mcProcess.onExit(() => {
    mcProcess = null;
    io.emit("server:status", false);
    io.emit("server:output", "\r\n\x1b[31m[Server stopped]\x1b[0m\r\n");
  });

  mcProcess.on("error", (err) => {
    console.error("Minecraft server failed to start:", err);
  });

  return true;
}

// Execute command in server
function executeCommand(cmd) {
  if (mcProcess) {
    mcProcess.write(cmd + "\r");
    return `\r\n\x1b[97m[\x1b[36mCommand\x1b[97m]\x1b[0m: Sent \x1b[33m${cmd}\x1b[0m to server\r\n`;
  } else {
    return "\r\n\x1b[97m[\x1b[31mError\x1b[97m]\x1b[0m: Server is offline\r\n";
  }
}

// Routes
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Minecraft server management service is up and running",
    ip: req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress,
    serverStatus: isServerOnline() ? "online" : "offline",
  });
});

app.get("/api/health", async (req, res) => {
  systemUsage()
    .then((data) => {
      res.json({
        status: "ok",
        uptime: process.uptime(),
        connections: io.engine.clientsCount,
        serverStatus: isServerOnline() ? "online" : "offline",
        memoryUsage: process.memoryUsage(),
        systemUsage: data,
      });
    })
    .catch((err) => {
      console.log(err);
      res.json({ error: true, message: err });
    });
});

app.use(configRoute);

// Socket.IO
io.on("connection", (socket) => {
  console.log("Client connected: " + socket.id);

  socket.emit("server:status", isServerOnline());
  socket.emit("server:history", commandHistory);

  // Send initial health data
  systemUsage()
    .then((data) => {
      socket.emit("server:health", {
        status: "ok",
        uptime: process.uptime(),
        connections: io.engine.clientsCount,
        serverStatus: isServerOnline() ? "online" : "offline",
        memoryUsage: process.memoryUsage(),
        systemUsage: data,
      });
    })
    .catch((err) => {
      console.log("Error getting system usage:", err);
    });

  // Set up health update interval - 1000ms (1 second) is a more reasonable interval
  const healthInterval = setInterval(() => {
    systemUsage()
      .then((data) => {
        socket.emit("server:health", {
          status: "ok",
          uptime: process.uptime(),
          connections: io.engine.clientsCount,
          serverStatus: isServerOnline() ? "online" : "offline",
          memoryUsage: process.memoryUsage(),
          systemUsage: data,
        });
      })
      .catch((err) => {
        console.log("Error getting system usage:", err);
      });
    // send server status
    socket.emit("server:status", isServerOnline);
  }, 1000); // Update every second instead of every 10ms

  // Add event handler for client requesting health data
  socket.on("client:requestHealth", () => {
    systemUsage()
      .then((data) => {
        socket.emit("server:health", {
          status: "ok",
          uptime: process.uptime(),
          connections: io.engine.clientsCount,
          serverStatus: isServerOnline() ? "online" : "offline",
          memoryUsage: process.memoryUsage(),
          systemUsage: data,
        });
      })
      .catch((err) => {
        console.log("Error getting system usage:", err);
      });
  });
  socket.on("server:execute", (data) => {
    if (!data?.cmd) {
      socket.emit(
        "server:output",
        "\r\n\x1b[97m[\x1b[31mError\x1b[97m]\x1b[0m: Invalid command format\r\n\x1b[36m> \x1b[0m"
      );
      return;
    }

    const output = executeCommand(data.cmd);
    socket.emit("server:output", output);
  });

  socket.on("server:action", async ({ action }) => {
    let msg = "";

    switch (action) {
      case "start":
        if (!isServerOnline()) {
          startServer();
          msg = "Server is starting...";
        } else {
          msg = "Server is already running.";
        }
        break;

      case "stop":
        if (mcProcess) {
          mcProcess.write("stop\r");
          msg = "Sent 'stop' command to server.";
        } else {
          msg = "Server is already offline.";
        }
        break;

      case "kill":
        if (mcProcess) {
          mcProcess.kill();
          mcProcess = null;
          io.emit("server:status", false);
          msg = "Server process killed.";
        } else {
          msg = "Server is not running.";
        }
        break;

      case "restart":
        if (mcProcess) {
          mcProcess.write("stop\r");
          msg = "Restarting server...";
          setTimeout(() => {
            if (!mcProcess) startServer();
          }, 8000);
        } else {
          msg = "Server is offline. Starting...";
          startServer();
        }
        break;

      default:
        msg = "Unknown action.";
        break;
    }

    socket.emit("server:output", `\r\n${msg}\r\n\x1b[36m> \x1b[0m`);
    socket.emit("server:status", isServerOnline());
  });

  socket.on("disconnect", (reason) => {
    console.log(`Client disconnected (${socket.id}): ${reason}`);
  });

  socket.on("error", (err) => {
    console.error(`Socket error from ${socket.id}:`, err);
  });
});

// Start HTTP server
const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Minecraft Manager running at http://0.0.0.0:${PORT}`);
  console.log(`Socket.IO server with CORS enabled`);
});

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("Shutting down...");
  if (playItService.tunnelStatus !== "stopped") {
    console.log("Stopping PlayIt service...");
    try {
      await playItService.stop();
    } catch (err) {
      console.error("Error stopping PlayIt:", err);
    }
  }
  if (mcProcess) {
    console.log("Stopping Minecraft server...");
    mcProcess.write("stop\r");

    setTimeout(() => {
      if (mcProcess) {
        console.log("Force killing server...");
        mcProcess.kill();
      }
      process.exit(0);
    }, 10000);
  } else {
    process.exit(0);
  }
});
