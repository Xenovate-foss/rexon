// Import dependencies
import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { spawn } from "node-pty";
import os from "os";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";
import expressFileUpload from "express-fileupload";

// Import routes and utilities
import { initializeServerDirectory } from "./utils/initServer.js";
import configRoute from "./controller/settings.js";
import config from "./config.json" assert { type: "json" };
import filesRoute from "./controller/files.js";
import { initFileWatcher } from "./utils/fileWatcher.js";
import pluginRoute from "./controller/plugin.js";
import worldRoute from "./controller/world.js";
import versionRoute from "./controller/version.js";
import systemUsage from "./utils/system-usage.js";
import { PlayItService } from "./utils/PlayitServiceProvider.js";
import MinecraftProperties from "./utils/mcPropertise.js";
import { router as ngrokRouter } from "./controller/ngrok.js";
import jdkRoute from "./controller/jdkInstaller/router.js";

// Constants
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SERVER_FOLDER = "./server/";
const MAX_HISTORY_LENGTH = 1000;
const PORT = process.env.PORT || 3000;

// Global variables
let mcProcess = null;
let commandHistory = [];
let isSetup = existsSync(".setup");
let playItService = null;

/**
 * Initialize the application
 */
async function initialize() {
  // Create server directory if needed
  try {
    await initializeServerDirectory();
    
    // Check if server directory exists, create if it doesn't
    try {
      await fs.access("./server");
      console.log("Server directory already exists");
    } catch (err) {
      await fs.mkdir("./server");
      console.log("Server directory created successfully");
    }
    
    // Initialize PlayIt service if needed
    if (config.enablePlayIt) {
      initializePlayItService();
    }
  } catch (err) {
    console.error("Initialization error:", err);
  }
}

/**
 * Initialize PlayIt service for external connections
 */
function initializePlayItService() {
  try {
    const serverPropertiesPath = path.join(SERVER_FOLDER, "server.properties");
    
    if (existsSync(serverPropertiesPath)) {
      const serverProperties = fs.readFileSync(serverPropertiesPath, "utf-8");
      const parsedProperties = MinecraftProperties.parse(serverProperties);
      const minecraftPort = parsedProperties["server-port"] || 25565;
      
      playItService = new PlayItService({
        minecraftPort,
        autoRestart: true,
        maxRestartAttempts: 3,
        useSystemd: config.useSystemd,
        sudoPassword: config.sudoPassword || null,
      });
      
      setupPlayItEventHandlers();
    } else {
      console.log("Server properties file not found, PlayIt service will be initialized later");
    }
  } catch (err) {
    console.error("Error initializing PlayIt service:", err);
  }
}

/**
 * Set up event handlers for PlayIt service
 */
function setupPlayItEventHandlers() {
  if (!playItService) return;
  
  playItService.on("log", (log) => {
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
  });
}

// Setup Express app and HTTP server
const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: false,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Middleware setup
app.use(express.json());
app.use(expressFileUpload());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url} - ${req.ip} - ${req.body}`);
  next();
});

// Static file handling based on setup status
if (isSetup) {
  console.log("Server starting in setup mode");
  app.use(express.static("./setup"));
} else {
  app.use(express.static("./app"));
}

// Route handler for all paths to serve SPA
app.get("*all", (req, res, next) => {
  if (req.path.startsWith("/api")) {
    return next();
  }
  
  const filePath = isSetup 
    ? path.resolve(__dirname, "setup/index.html") 
    : path.resolve(__dirname, "app/index.html");
  
  res.sendFile(filePath);
});

// Default route for index
if (!isSetup) {
  app.get("/", (req, res) => {
    res.sendFile(path.resolve(__dirname, "app/index.html"));
  });
}

// API routes
app.use("/api", filesRoute);
app.use("/api", pluginRoute);
app.use("/api", worldRoute);
app.use("/api", versionRoute);
app.use("/api", ngrokRouter);
app.use("/api", jdkRoute);
app.use(configRoute);

// Health check endpoint
app.get("/api/health", async (req, res) => {
  try {
    const data = await systemUsage();
    res.json({
      status: "ok",
      uptime: process.uptime(),
      connections: io.engine.clientsCount,
      serverStatus: isServerOnline() ? "online" : "offline",
      memoryUsage: process.memoryUsage(),
      systemUsage: data,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: true, message: err.message });
  }
});

// Setup completion endpoint
app.post("/api/setup/complete", (req, res) => {
  if (isSetup && existsSync(".setup")) {
    try {
      fs.unlink(".setup");
      isSetup = false;
      console.log("Setup completed, switching to app mode");
      app.use(express.static("./app"));
      res.json({ success: true, message: "Setup completed" });
    } catch (err) {
      console.error("Error completing setup:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  } else {
    res.status(400).json({ success: false, message: "Not in setup mode" });
  }
});

// PlayIt service API endpoints
if (config.enablePlayIt) {
  app.post("/api/playit/start", async (req, res) => {
    if (!playItService) {
      return res.status(400).json({ success: false, message: "PlayIt service not initialized" });
    }
    const result = await playItService.start();
    res.json(result);
  });

  app.post("/api/playit/stop", async (req, res) => {
    if (!playItService) {
      return res.status(400).json({ success: false, message: "PlayIt service not initialized" });
    }
    const result = await playItService.stop();
    res.json(result);
  });

  app.post("/api/playit/restart", async (req, res) => {
    if (!playItService) {
      return res.status(400).json({ success: false, message: "PlayIt service not initialized" });
    }
    await playItService.stop();
    const result = await playItService.start();
    res.json(result);
  });

  app.get("/api/playit/status", (req, res) => {
    if (!playItService) {
      return res.status(400).json({ success: false, message: "PlayIt service not initialized" });
    }
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
    if (!playItService) {
      return res.status(400).json({ success: false, message: "PlayIt service not initialized" });
    }
    const updates = await playItService.checkForUpdates();
    res.json(updates);
  });

  app.post("/api/playit/update", async (req, res) => {
    if (!playItService) {
      return res.status(400).json({ success: false, message: "PlayIt service not initialized" });
    }
    
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
}

// View routes
app.get("*view", (req, res) => {
  res.sendFile(path.resolve(__dirname, "app/index.html"));
});

// Server state functions
/**
 * Check if the Minecraft server is online
 */
function isServerOnline() {
  return mcProcess !== null;
}

/**
 * Add a command and its output to the history
 */
function addToHistory(command, output) {
  const entry = { command, output };
  commandHistory.unshift(entry);
  if (commandHistory.length > MAX_HISTORY_LENGTH) {
    commandHistory.pop();
  }
}

/**
 * Format command history for terminal display
 */
function formatHistoryForTerminal() {
  if (commandHistory.length === 0) return "";
  return commandHistory.map((e) => `\r ${e.output}`).join("");
}

/**
 * Start the Minecraft server
 */
function startServer() {
  if (mcProcess) return false;

  const shell = os.platform() === "win32" ? "powershell.exe" : "bash";
  console.log("Starting server with command:", config.startup);

  mcProcess = spawn(shell, ["-c", config.startup], {
    name: "xterm-color",
    cols: 80,
    rows: 30,
    cwd: SERVER_FOLDER,
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

/**
 * Execute a command on the Minecraft server
 */
function executeCommand(cmd) {
  if (mcProcess) {
    mcProcess.write(cmd + "\r");
    return `\r\n\x1b[97m[\x1b[36mCommand\x1b[97m]\x1b[0m: Sent \x1b[33m${cmd}\x1b[0m to server\r\n`;
  } else {
    return "\r\n\x1b[97m[\x1b[31mError\x1b[97m]\x1b[0m: Server is offline\r\n";
  }
}

// Socket.IO event handlers
io.on("connection", (socket) => {
  console.log("Client connected: " + socket.id);

  // Send initial state
  socket.emit("server:status", isServerOnline());
  socket.emit("server:history", commandHistory);

  // Send initial health data
  sendHealthData(socket);

  // Set up health update interval - every second
  const healthInterval = setInterval(() => {
    sendHealthData(socket);
    socket.emit("server:status", isServerOnline());
  }, 1000);

  // Command execution handler
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

  // Server actions handler
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

  // Health data request handler
  socket.on("client:requestHealth", () => {
    sendHealthData(socket);
  });

  // Clean up on disconnect
  socket.on("disconnect", (reason) => {
    clearInterval(healthInterval);
    console.log(`Client disconnected (${socket.id}): ${reason}`);
  });

  socket.on("error", (err) => {
    console.error(`Socket error from ${socket.id}:`, err);
  });
});

/**
 * Send health data to a socket
 */
async function sendHealthData(socket) {
  try {
    const data = await systemUsage();
    socket.emit("server:health", {
      status: "ok",
      uptime: process.uptime(),
      connections: io.engine.clientsCount,
      serverStatus: isServerOnline() ? "online" : "offline",
      memoryUsage: process.memoryUsage(),
      systemUsage: data,
    });
  } catch (err) {
    console.log("Error getting system usage:", err);
  }
}

// Graceful shutdown handler
process.on("SIGINT", async () => {
  console.log("Shutting down...");
  
  // Stop PlayIt service if running
  if (playItService && playItService.tunnelStatus !== "stopped") {
    console.log("Stopping PlayIt service...");
    try {
      await playItService.stop();
    } catch (err) {
      console.error("Error stopping PlayIt:", err);
    }
  }
  
  // Stop Minecraft server if running
  if (mcProcess) {
    console.log("Stopping Minecraft server...");
    mcProcess.write("stop\r");

    // Force exit after 10 seconds
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

// Initialize file watcher
initFileWatcher(io);

// Start the application
initialize().then(() => {
  // Start HTTP server
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Minecraft Manager running at http://0.0.0.0:${PORT}`);
    console.log(`Socket.IO server with CORS enabled`);
  });
}).catch(err => {
  console.error("Failed to initialize application:", err);
  process.exit(1);
});