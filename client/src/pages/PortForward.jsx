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
  TriangleAlert,
} from "lucide-react";
import PlayItManager from "@/components/Playit";

// Socket URL for PlayIt.gg
const SOCKET_URL = "/";

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
              Share this address with players to connect to your Minecraft
              server
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
        <h1 className="text-3xl font-bold text-center mb-6 text-blue-800">
          Minecraft Server Tunnel Manager
        </h1>

        <div className="mb-6 mx-auto w-full max-w-md">
          <label
            htmlFor="provider-select"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
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
