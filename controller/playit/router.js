import PlayItClient from "./v4.js";
import { Router } from "express";

// Create a router function that takes a Socket.IO instance
export function createPlayItRouter(io) {
  const router = Router();

  // Create a single shared PlayItClient instance
  const playit = new PlayItClient();

  // Set up Socket.IO namespace for PlayIt
  const playitSocket = io.of("/playit");

  // Forward all PlayIt events to the connected client
  const events = [
    "claim",
    "exchanging",
    "secret",
    "tunnels",
    "starting",
    "stopped",
    "resetting",
    "reset-complete",
    "secret-path",
    "version",
    "help",
    "error",
    "warning",
  ];

  events.forEach((eventName) => {
    playit.on(eventName, (data) => {
      console.log(`PlayIt ${eventName}:`, data);
      playitSocket.emit(eventName, data);
    });
  });

  // Handle Socket.IO connections
  playitSocket.on("connection", (socket) => {
    console.log("Client connected to PlayIt");

    // Client can request actions through socket
    socket.on("login", () => {
      console.log("Login requested via socket");
      playit.login();
    });

    socket.on("getTunnels", () => {
      console.log("Tunnels requested via socket");
      playit.getTunnels();
    });

    socket.on("reset", () => {
      console.log("Reset requested via socket");
      playit.reset();
    });

    socket.on("getVersion", () => {
      console.log("Version requested via socket");
      playit.getVersion();
    });

    socket.on("start", () => {
      console.log("Start requested via socket");
      playit.start();
    });
  });

  // REST API endpoints for direct HTTP access

  // Login endpoint
  router.post("/playit/login", (req, res) => {
    console.log("Login requested via HTTP");

    // For HTTP requests, we'll respond with a success message
    // The actual claim data will be sent via Socket.IO
    playit.login();
    res.json({
      success: true,
      message: "Login process started. Watch for claim event via Socket.IO.",
    });
  });

  // Get tunnels endpoint
  router.get("/playit/tunnels", async (req, res) => {
    console.log("Tunnels requested via HTTP");
    let data = await playit.listTunnels();
    console.clear()
    console.log(data);
    res.json({
      success: true,
      message: "Tunnel request started. Watch for tunnels event via Socket.IO.",
      data,
    });
  });

  // Reset endpoint
  router.post("/playit/reset", (req, res) => {
    console.log("Reset requested via HTTP");
    playit.reset();
    res.json({
      success: true,
      message:
        "Reset process started. Watch for reset-complete event via Socket.IO.",
    });
  });

  // Version endpoint
  router.get("/playit/version", (req, res) => {
    console.log("Version requested via HTTP");
    playit.getVersion();
    res.json({
      success: true,
      message:
        "Version request started. Watch for version event via Socket.IO.",
    });
  });

  // Start endpoint
  router.post("/playit/start", (req, res) => {
    console.log("Start requested via HTTP");
    playit.start();
    res.json({
      success: true,
      message:
        "Playit start requested. Watch for starting event via Socket.IO.",
    });
  });

  return router;
}
