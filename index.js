import { Server } from "socket.io";
import express from "express";
import { createServer } from "node:http";
import configRoute from "./controller/settings.js";

const app = express();
const server = createServer(app);

let isServerOnline = false;
let commandHistory = [];
const MAX_HISTORY_LENGTH = 100000000;

// Add CORS configuration
const io = new Server(server, {
  cors: {
    origin: "*", // In production, you should specify exact origins
    methods: ["GET", "POST"],
    credentials: true,
  },
  // Improve connection reliability
  pingTimeout: 60000,
  pingInterval: 25000,
});

app.use(express.json());

// Add basic middleware for logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url} - ${req.ip}`);
  next();
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "service up and running",
    ip: req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress,
    serverStatus: isServerOnline ? "online" : "offline",
  });
});
app.use(configRoute);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    connections: io.engine.clientsCount,
    serverStatus: isServerOnline ? "online" : "offline",
  });
});

// Helper function to add command to history
function addToHistory(command, output) {
  const entry = {
    output,
  };

  commandHistory.unshift(entry);
  if (commandHistory.length > MAX_HISTORY_LENGTH) {
    commandHistory.pop();
  }
}

// Helper function to format history for terminal output
function formatHistoryForTerminal() {
  if (commandHistory.length === 0) return "";

  let output; // = "\r\n\x1b[97m[\x1b[33mHistory\x1b[97m]\x1b[0m: Last commands:";

  // Show last 10 commands or fewer if less history exists
  const recentCommands = commandHistory;

  recentCommands.forEach((entry, index) => {
    output += `\r ${entry.output}`;
  });

  return output;
}

// Execute a command and return output
function executeCommand(cmd) {
  // Simple command processing
  let output = "";

  switch (cmd.toLowerCase()) {
    case "help":
      output =
        "\r\n\x1b[97m[\x1b[33mHelp\x1b[97m]\x1b[0m: Available commands:\r\n" +
        "- help: Show this help message\r\n" +
        "- status: Show server status\r\n" +
        "- history: Show command history\r\n" +
        "- clear: Clear terminal\r\n" +
        "- echo [text]: Echo back text\r\n" +
        "- uptime: Show server uptime";
      break;
    case "status":
      output = `\r\n\x1b[97m[\x1b[33mStatus\x1b[97m]\x1b[0m: Server is ${
        isServerOnline ? "\x1b[32mONLINE" : "\x1b[31mOFFLINE"
      }\x1b[0m`;
      break;
    case "history":
      output = formatHistoryForTerminal();
      break;
    case "clear":
      output = "\x1b[2J\x1b[H"; // ANSI escape sequence to clear screen and move cursor to home position
      break;
    case "uptime":
      const uptime = process.uptime();
      const hours = Math.floor(uptime / 3600);
      const minutes = Math.floor((uptime % 3600) / 60);
      const seconds = Math.floor(uptime % 60);
      output = `\r\n\x1b[97m[\x1b[33mUptime\x1b[97m]\x1b[0m: ${hours}h ${minutes}m ${seconds}s`;
      break;
    default:
      if (cmd.toLowerCase().startsWith("echo ")) {
        const text = cmd.substring(5);
        output = `\r\n${text}`;
      } else {
        output = `\r\n\x1b[97m[\x1b[31mError\x1b[97m]\x1b[0m: Unknown command '${cmd}'. Type 'help' for available commands.`;
      }
  }

  addToHistory(cmd, output);
  return output + "\r\n\x1b[36m> \x1b[0m";
}

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log("Client connected: " + socket.id);

  // Send welcome message and server status to client
  socket.emit(
    "server:output",
    "\r\n\x1b[97m[\x1b[32mServer\x1b[97m]\x1b[0m: Connected successfully!"
  );
  socket.emit("server:status", isServerOnline);

  // Send recent command history
  const history = formatHistoryForTerminal();
  if (history) {
    socket.emit("server:history", history);
  }

  // Handle command execution
  socket.on("server:execute", (data) => {
    console.log(`Command from ${socket.id}:`, data);

    if (!data || !data.cmd) {
      socket.emit(
        "server:output",
        "\r\n\x1b[97m[\x1b[31mError\x1b[97m]\x1b[0m: Invalid command format"
      );
      return;
    }

    const output = executeCommand(data.cmd);
    socket.emit("server:output", output);
  });

  // Handle server control actions
  socket.on("server:action", (data) => {
    console.log(`Server action from ${socket.id}:`, data);

    if (!data || !data.action) {
      socket.emit(
        "server:output",
        "\r\n\x1b[97m[\x1b[31mError\x1b[97m]\x1b[0m: Invalid action format"
      );
      return;
    }

    const { action } = data;
    let response = "";

    switch (action) {
      case "start":
        if (isServerOnline) {
          response =
            "\r\n\x1b[97m[\x1b[33mInfo\x1b[97m]\x1b[0m: Server is already running";
        } else {
          isServerOnline = true;
          response =
            "\r\n\x1b[97m[\x1b[32mSuccess\x1b[97m]\x1b[0m: Server started successfully";
        }
        break;
      case "stop":
        if (!isServerOnline) {
          response =
            "\r\n\x1b[97m[\x1b[33mInfo\x1b[97m]\x1b[0m: Server is already stopped";
        } else {
          isServerOnline = false;
          response =
            "\r\n\x1b[97m[\x1b[32mSuccess\x1b[97m]\x1b[0m: Server stopped successfully";
        }
        break;
      case "restart":
        isServerOnline = false;
        socket.emit("server:status", isServerOnline);
        response =
          "\r\n\x1b[97m[\x1b[33mInfo\x1b[97m]\x1b[0m: Server restarting...";

        // Simulate restart delay
        setTimeout(() => {
          isServerOnline = true;
          socket.emit("server:status", isServerOnline);
          socket.emit(
            "server:output",
            "\r\n\x1b[97m[\x1b[32mSuccess\x1b[97m]\x1b[0m: Server restarted successfully\r\n\x1b[36m> \x1b[0m"
          );
        }, 2000);
        break;
      case "kill":
        isServerOnline = false;
        response =
          "\r\n\x1b[97m[\x1b[31mWarning\x1b[97m]\x1b[0m: Server process killed";
        break;
      default:
        response = `\r\n\x1b[97m[\x1b[31mError\x1b[97m]\x1b[0m: Unknown action '${action}'`;
    }

    // Broadcast server status change to all clients
    io.emit("server:status", isServerOnline);
    socket.emit("server:output", response + "\r\n\x1b[36m> \x1b[0m");
  });

  // Handle disconnection
  socket.on("disconnect", (reason) => {
    console.log(`Client disconnected (${socket.id}): ${reason}`);
  });

  // Handle errors
  socket.on("error", (error) => {
    console.error(`Socket error from ${socket.id}:`, error);
  });
});

// Listen on all interfaces (important for cloud/container deployments)
const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running at http://0.0.0.0:${PORT}`);
  console.log(`Socket.IO server running with CORS enabled`);
});
