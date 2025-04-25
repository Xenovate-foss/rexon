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
  ArrowDown,
  TriangleAlert
} from "lucide-react";

// Socket URL for PlayIt.gg
const SOCKET_URL = "/";

// PlayIt Manager Component
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
      const response = await fetch(`/api/playit/status`);
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
      const response = await fetch(`/api/playit/logs`);
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
      const response = await fetch(`/api/playit/check-updates`);
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
      const response = await fetch(`/api/playit/start`, {
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
      const response = await fetch(`/api/playit/stop`, {
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
      const response = await fetch(`/api/playit/restart`, {
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
      const response = await fetch(`/api/playit/update`, {
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
          <span className="px-3 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
            Running
          </span>
        );
      case "starting":
        return (
          <span className="px-3 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
            Starting
          </span>
        );
      case "stopped":
        return (
          <span className="px-3 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
            Stopped
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
            Unknown
          </span>
        );
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg border border-blue-100">
      <div className="flex justify-between items-center border-b border-blue-100 pb-4 mb-6">
        <h2 className="text-2xl font-bold text-blue-800">
          PlayIt.gg Tunnel Manager
        </h2>
        <div className="flex items-center">
          <span className="mr-2 text-gray-600">Status:</span>
          {renderStatusBadge()}
        </div>
      </div>
      
      <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded mb-6 flex items-center"> 
        <TriangleAlert size={70} className="mr-2" />
        <span>This feature is under development - we don't recommend using it yet</span>
      </div>

      <div className="mb-6">
        <div className="flex flex-wrap gap-3 mb-6">
          <button
            className={`flex items-center px-5 py-2 rounded-md text-white font-medium ${
              status === "running" || status === "starting"
                ? "bg-blue-300 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 shadow-md"
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
            className={`flex items-center px-5 py-2 rounded-md text-white font-medium ${
              status === "stopped"
                ? "bg-red-300 cursor-not-allowed"
                : "bg-red-600 hover:bg-red-700 shadow-md"
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
            className="flex items-center px-5 py-2 rounded-md text-white font-medium bg-blue-500 hover:bg-blue-600 shadow-md"
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
              className="flex items-center px-5 py-2 rounded-md text-white font-medium bg-blue-600 hover:bg-blue-700 shadow-md ml-auto"
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
          <div className="flex items-center mb-4 text-sm text-gray-600 bg-blue-50 px-4 py-2 rounded-md">
            <span className="font-medium mr-2">Uptime:</span>
            <span>{formatUptime(uptime)}</span>
          </div>
        )}

        {tunnelUrl && (
          <div className="p-5 bg-blue-50 rounded-lg border border-blue-100 shadow-sm">
            <h3 className="text-sm font-medium text-blue-800 mb-2">
              Tunnel URL:
            </h3>
            <div className="flex items-center bg-white border rounded-md p-3 mb-2 shadow-sm">
              <span className="flex-grow font-mono text-sm text-gray-800">
                {tunnelUrl}
              </span>
              <button
                className="ml-2 p-1 text-blue-600 hover:text-blue-800 rounded-md hover:bg-blue-50"
                onClick={() => navigator.clipboard.writeText(tunnelUrl)}
                title="Copy to clipboard"
              >
                <Copy className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-blue-700">
              Share this address with players to connect to your Minecraft server
            </p>
          </div>
        )}

        {authUrl && !isAuthenticated && (
          <div className="mt-4 p-5 bg-blue-50 border border-blue-200 rounded-lg shadow-sm">
            <h3 className="text-sm font-medium text-blue-800 mb-2">
              Authentication Required
            </h3>
            <p className="text-sm text-blue-700 mb-3">
              Click the link below to authenticate with PlayIt.gg:
            </p>
            <a
              href={authUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-5 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition shadow-md"
            >
              Authenticate with PlayIt.gg
              <ExternalLink className="w-4 h-4 ml-2" />
            </a>
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-md">
            {error}
          </div>
        )}
      </div>

      <div className="border rounded-lg shadow-sm overflow-hidden">
        <div className="flex justify-between items-center p-4 bg-blue-50 border-b border-blue-100">
          <h3 className="text-sm font-medium text-blue-800">Logs</h3>
          <div className="flex gap-2">
            <button
              className="flex items-center px-3 py-1 text-xs text-blue-600 hover:text-blue-800 bg-white border border-blue-200 rounded-md hover:bg-blue-50 shadow-sm"
              onClick={fetchLogs}
              title="Refresh logs"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Refresh
            </button>
            <button
              className="flex items-center px-3 py-1 text-xs text-blue-600 hover:text-blue-800 bg-white border border-blue-200 rounded-md hover:bg-blue-50 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={clearLogs}
              disabled={logs.length === 0}
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Clear
            </button>
          </div>
        </div>
        <div className="h-64 overflow-y-auto p-3 bg-gray-900 font-mono text-xs">
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

// Ngrok Manager Component - Simplified without Socket.IO
const NgrokManager = () => {
  // State
  const [status, setStatus] = useState("unknown");
  const [tunnelUrl, setTunnelUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [uptime, setUptime] = useState(0);

  // Connect and fetch initial status
  useEffect(() => {
    // Fetch initial status
    fetchStatus();
    
    // Set up timer to refresh status
    const statusInterval = setInterval(fetchStatus, 10000);
    
    // Cleanup
    return () => clearInterval(statusInterval);
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

  // API calls
  const fetchStatus = async () => {
    try {
      const response = await fetch(`/api/tunnel/status`);
      const data = await response.json();
      setStatus(data.active ? "running" : "stopped");
      setTunnelUrl(data.url || "");
      setUptime(data.uptime || 0);
    } catch (err) {
      console.error("Error fetching status:", err);
      setError("Failed to fetch status");
    }
  };

  const startTunnel = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/tunnel/start`, {
        method: "POST",
      });
      const data = await response.json();
      if (!data.success) {
        setError(data.message);
      } else {
        setTunnelUrl(data.url || "");
        setStatus("running");
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
      const response = await fetch(`/api/tunnel/stop`, {
        method: "POST",
      });
      const data = await response.json();
      if (!data.success) {
        setError(data.message);
      } else {
        setStatus("stopped");
        setTunnelUrl("");
      }
    } catch (err) {
      console.error("Error stopping tunnel:", err);
      setError("Failed to stop tunnel");
    } finally {
      setLoading(false);
    }
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
          <span className="px-3 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
            Running
          </span>
        );
      case "starting":
        return (
          <span className="px-3 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
            Starting
          </span>
        );
      case "stopped":
        return (
          <span className="px-3 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
            Stopped
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
            Unknown
          </span>
        );
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg border border-blue-100">
      <div className="flex justify-between items-center border-b border-blue-100 pb-4 mb-6">
        <h2 className="text-2xl font-bold text-blue-800">
          Ngrok Tunnel Manager
        </h2>
        <div className="flex items-center">
          <span className="mr-2 text-gray-600">Status:</span>
          {renderStatusBadge()}
        </div>
      </div>

      <div className="mb-6">
        <div className="flex flex-wrap gap-3 mb-6">
          <button
            className={`flex items-center px-5 py-2 rounded-md text-white font-medium ${
              status === "running" || status === "starting"
                ? "bg-blue-300 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 shadow-md"
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
            className={`flex items-center px-5 py-2 rounded-md text-white font-medium ${
              status === "stopped"
                ? "bg-red-300 cursor-not-allowed"
                : "bg-red-600 hover:bg-red-700 shadow-md"
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
            className="flex items-center px-5 py-2 rounded-md text-white font-medium bg-blue-500 hover:bg-blue-600 shadow-md"
            onClick={fetchStatus}
            disabled={loading}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Status
          </button>
        </div>

        {status === "running" && (
          <div className="flex items-center mb-4 text-sm text-gray-600 bg-blue-50 px-4 py-2 rounded-md">
            <span className="font-medium mr-2">Uptime:</span>
            <span>{formatUptime(uptime)}</span>
          </div>
        )}

        {tunnelUrl && (
          <div className="p-5 bg-blue-50 rounded-lg border border-blue-100 shadow-sm">
            <h3 className="text-sm font-medium text-blue-800 mb-2">
              Tunnel URL:
            </h3>
            <div className="flex items-center bg-white border rounded-md p-3 mb-2 shadow-sm">
              <span className="flex-grow font-mono text-sm text-gray-800">
                {tunnelUrl}
              </span>
              <button
                className="ml-2 p-1 text-blue-600 hover:text-blue-800 rounded-md hover:bg-blue-50"
                onClick={() => navigator.clipboard.writeText(tunnelUrl)}
                title="Copy to clipboard"
              >
                <Copy className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-blue-700">
              Share this address with players to connect to your Minecraft server
            </p>
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-md">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

// Main Tunnel Manager Component with provider selection
const TunnelManager = () => {
  const [provider, setProvider] = useState("ngrok");
  
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col mb-8">
        <h1 className="text-3xl font-bold text-center mb-6 text-blue-800">Minecraft Server Tunnel Manager</h1>
        
        <div className="mb-6 mx-auto w-full max-w-md">
          <label htmlFor="provider-select" className="block text-sm font-medium text-gray-700 mb-2">
            Select Port Forwarding Provider:
          </label>
          <div className="relative">
            <select
              id="provider-select"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="block appearance-none w-full rounded-md border-blue-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white py-2 pl-4 pr-10 text-base"
            >
              <option value="ngrok">Ngrok</option>
              <option value="playit">PlayIt.gg</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
              <ArrowDown className="h-4 w-4" />
            </div>
          </div>
        </div>
      </div>

      {provider === "playit" ? <PlayItManager /> : <NgrokManager />}
    </div>
  );
};

export default TunnelManager;