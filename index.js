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
initFileWatcher(io);

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

app.get("/health", async (req, res) => {
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

  socket.emit(
    "server:output",
    "\r\n\x1b[97m[\x1b[32mServer\x1b[97m]\x1b[0m: Connected to Minecraft server console!\r\n" +
      `\x1b[97m[\x1b[33mStatus\x1b[97m]\x1b[0m: Server is ${
        isServerOnline() ? "\x1b[32mONLINE" : "\x1b[31mOFFLINE"
      }\x1b[0m\r\n` +
      "Type 'help' for available commands.\r\n\x1b[36m> \x1b[0m"
  );
  socket.emit("server:status", isServerOnline());

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
process.on("SIGINT", () => {
  console.log("Shutting down...");

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
