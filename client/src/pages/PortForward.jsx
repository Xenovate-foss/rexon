import React, { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import {
  Loader2,
  Copy,
  Trash2,
  Play,
  Square,
  ExternalLink,
  RefreshCw,
  Download,
} from "lucide-react";

// Adjust the API URL as needed for your environment
const API_URL = "/api/playit";
const SOCKET_URL = "/";

const PlayItManager = () => {
  // State
  const [status, setStatus] = useState("unknown");
  const [tunnelUrl, setTunnelUrl] = useState("");
  const [logs, setLogs] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authUrl, setAuthUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [uptime, setUptime] = useState(0);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);

  // Refs
  const socketRef = useRef(null);
  const logsEndRef = useRef(null);

  // Connect to Socket.IO and fetch initial status
  useEffect(() => {
    // Fetch initial status
    fetchStatus();
    fetchLogs();
    checkForUpdates();

    // Connect to Socket.IO
    socketRef.current = io(SOCKET_URL);

    // Socket event handlers
    socketRef.current.on("playit:status", (data) => {
      setStatus(data.status);
    });

    socketRef.current.on("playit:tunnel", (data) => {
      setTunnelUrl(data.url);
    });

    socketRef.current.on("playit:log", (logEntry) => {
      setLogs((prevLogs) => [...prevLogs, logEntry]);
    });

    socketRef.current.on("playit:logs", (data) => {
      setLogs(data.logs || []);
    });

    socketRef.current.on("playit:error", (data) => {
      setError(data.message);
    });

    socketRef.current.on("playit:auth_required", (data) => {
      setAuthUrl(data.url);
    });

    // Cleanup
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // Uptime timer
  useEffect(() => {
    let timer;
    if (status === "running" && uptime > 0) {
      timer = setInterval(() => {
        setUptime((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [status, uptime]);

  // Scroll logs to bottom when they update
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  // API calls
  const fetchStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/status`);
      const data = await response.json();
      setStatus(data.status);
      setTunnelUrl(data.tunnelUrl || "");
      setIsAuthenticated(data.authenticated || false);
      setUptime(data.uptime || 0);
      if (data.authUrl) {
        setAuthUrl(data.authUrl);
      }
    } catch (err) {
      console.error("Error fetching status:", err);
      setError("Failed to fetch status");
    }
  };

  const fetchLogs = async () => {
    try {
      const response = await fetch(`${API_URL}/status`);
      const data = await response.json();
      if (data.logs) {
        setLogs(data.logs);
      }
    } catch (err) {
      console.error("Error fetching logs:", err);
    }
  };

  const checkForUpdates = async () => {
    try {
      const response = await fetch(`${API_URL}/check-updates`);
      const data = await response.json();
      setUpdateAvailable(data.updateAvailable || false);
    } catch (err) {
      console.error("Error checking for updates:", err);
    }
  };

  const startTunnel = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/start`, {
        method: "POST",
      });
      const data = await response.json();
      if (!data.success) {
        setError(data.message);
      }
    } catch (err) {
      console.error("Error starting tunnel:", err);
      setError("Failed to start tunnel");
    } finally {
      setLoading(false);
    }
  };

  const stopTunnel = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/stop`, {
        method: "POST",
      });
      const data = await response.json();
      if (!data.success) {
        setError(data.message);
      }
    } catch (err) {
      console.error("Error stopping tunnel:", err);
      setError("Failed to stop tunnel");
    } finally {
      setLoading(false);
    }
  };

  const restartTunnel = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/restart`, {
        method: "POST",
      });
      const data = await response.json();
      if (!data.success) {
        setError(data.message);
      }
    } catch (err) {
      console.error("Error restarting tunnel:", err);
      setError("Failed to restart tunnel");
    } finally {
      setLoading(false);
    }
  };

  const updatePlayIt = async (restart = true) => {
    setUpdateLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/update`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ restart }),
      });
      const data = await response.json();
      if (data.updateSuccess) {
        setUpdateAvailable(false);
      } else {
        setError("Failed to update PlayIt");
      }
    } catch (err) {
      console.error("Error updating PlayIt:", err);
      setError("Failed to update PlayIt");
    } finally {
      setUpdateLoading(false);
    }
  };

  const clearLogs = async () => {
    setLogs([]);
  };

  // Format log timestamp
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  // Format uptime
  const formatUptime = (seconds) => {
    if (!seconds) return "0s";

    const days = Math.floor(seconds / 86400);
    seconds %= 86400;
    const hours = Math.floor(seconds / 3600);
    seconds %= 3600;
    const minutes = Math.floor(seconds / 60);
    seconds %= 60;

    let result = [];
    if (days > 0) result.push(`${days}d`);
    if (hours > 0) result.push(`${hours}h`);
    if (minutes > 0) result.push(`${minutes}m`);
    if (seconds > 0 || result.length === 0) result.push(`${seconds}s`);

    return result.join(" ");
  };

  // Render status badge
  const renderStatusBadge = () => {
    switch (status) {
      case "running":
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
            Running
          </span>
        );
      case "starting":
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
            Starting
          </span>
        );
      case "stopped":
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
            Stopped
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
            Unknown
          </span>
        );
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 bg-white rounded-lg shadow-md">
      <div className="flex justify-between items-center border-b pb-4 mb-4">
        <h2 className="text-xl font-bold text-gray-800">
          PlayIt.gg Tunnel Manager
        </h2>
        <div className="flex items-center">
          <span className="mr-2 text-gray-600">Status:</span>
          {renderStatusBadge()}
        </div>
      </div>

      <div className="mb-6">
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            className={`flex items-center px-4 py-2 rounded-md text-white font-medium ${
              status === "running" || status === "starting"
                ? "bg-blue-300 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
            onClick={startTunnel}
            disabled={loading || status === "running" || status === "starting"}
          >
            {loading && status !== "running" ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            Start Tunnel
          </button>
          <button
            className={`flex items-center px-4 py-2 rounded-md text-white font-medium ${
              status === "stopped"
                ? "bg-red-300 cursor-not-allowed"
                : "bg-red-600 hover:bg-red-700"
            }`}
            onClick={stopTunnel}
            disabled={loading || status === "stopped"}
          >
            {loading && status === "running" ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Square className="w-4 h-4 mr-2" />
            )}
            Stop Tunnel
          </button>
          <button
            className="flex items-center px-4 py-2 rounded-md text-white font-medium bg-yellow-600 hover:bg-yellow-700"
            onClick={restartTunnel}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Restart Tunnel
          </button>

          {updateAvailable && (
            <button
              className="flex items-center px-4 py-2 rounded-md text-white font-medium bg-purple-600 hover:bg-purple-700 ml-auto"
              onClick={() => updatePlayIt(true)}
              disabled={updateLoading}
            >
              {updateLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Update PlayIt
            </button>
          )}
        </div>

        {status === "running" && (
          <div className="flex items-center mb-4 text-sm text-gray-600">
            <span className="font-medium mr-2">Uptime:</span>
            <span>{formatUptime(uptime)}</span>
          </div>
        )}

        {tunnelUrl && (
          <div className="p-4 bg-gray-50 rounded-md">
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Tunnel URL:
            </h3>
            <div className="flex items-center bg-white border rounded-md p-2 mb-2">
              <span className="flex-grow font-mono text-sm text-gray-800">
                {tunnelUrl}
              </span>
              <button
                className="ml-2 p-1 text-gray-500 hover:text-gray-700 rounded-md hover:bg-gray-100"
                onClick={() => navigator.clipboard.writeText(tunnelUrl)}
                title="Copy to clipboard"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-600">
              Share this address with players to connect to your Minecraft
              server
            </p>
          </div>
        )}

        {authUrl && !isAuthenticated && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h3 className="text-sm font-medium text-blue-800 mb-2">
              Authentication Required
            </h3>
            <p className="text-sm text-blue-700 mb-2">
              Click the link below to authenticate with PlayIt.gg:
            </p>
            <a
              href={authUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
            >
              Authenticate with PlayIt.gg
              <ExternalLink className="w-4 h-4 ml-2" />
            </a>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md">
            {error}
          </div>
        )}
      </div>

      <div className="border rounded-md">
        <div className="flex justify-between items-center p-3 bg-gray-50 border-b">
          <h3 className="text-sm font-medium text-gray-700">Logs</h3>
          <div className="flex gap-2">
            <button
              className="flex items-center px-2 py-1 text-xs text-gray-600 hover:text-gray-800 bg-white border rounded-md hover:bg-gray-50"
              onClick={fetchLogs}
              title="Refresh logs"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
            <button
              className="flex items-center px-2 py-1 text-xs text-gray-600 hover:text-gray-800 bg-white border rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={clearLogs}
              disabled={logs.length === 0}
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Clear Logs
            </button>
          </div>
        </div>
        <div className="h-64 overflow-y-auto p-2 bg-gray-800 font-mono text-xs">
          {logs.length === 0 ? (
            <p className="text-gray-400 p-2">No logs available</p>
          ) : (
            logs.map((log, index) => (
              <div
                key={index}
                className={`mb-1 ${
                  log.isError ? "text-red-400" : "text-gray-300"
                }`}
              >
                <span className="text-gray-500">
                  [{formatTimestamp(log.time)}]
                </span>
                <span className="text-blue-400 ml-1">[{log.source}]</span>
                <span className="ml-1">{log.message}</span>
              </div>
            ))
          )}
          <div ref={logsEndRef} />
        </div>
      </div>
    </div>
  );
};

export default PlayItManager;
