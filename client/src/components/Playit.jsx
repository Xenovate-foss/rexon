import React, { useState, useEffect, useCallback } from "react";
import { io } from "socket.io-client";
import axios from "axios";
import {
  Play,
  List,
  RefreshCw,
  Info,
  AlertCircle,
  CheckCircle,
  Clipboard,
  ExternalLink,
  Loader,
  Server,
} from "lucide-react";

// Component styles
const styles = {
  container: "max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg",
  header: "text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2",
  section: "mb-6 p-4 border border-gray-200 rounded-lg",
  sectionTitle:
    "text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2",
  button: "px-4 py-2 rounded-md flex items-center gap-2 transition-colors",
  primaryButton: "bg-blue-500 text-white hover:bg-blue-600",
  secondaryButton: "bg-gray-200 text-gray-700 hover:bg-gray-300",
  dangerButton: "bg-red-500 text-white hover:bg-red-600",
  buttonGroup: "flex flex-wrap gap-3 mb-4",
  infoBox: "bg-blue-50 border border-blue-200 p-4 rounded-md mb-4",
  warningBox: "bg-yellow-50 border border-yellow-200 p-4 rounded-md mb-4",
  errorBox: "bg-red-50 border border-red-200 p-4 rounded-md mb-4",
  successBox: "bg-green-50 border border-green-200 p-4 rounded-md mb-4",
  status: "mt-4 p-3 rounded-md text-sm",
  tunnelGrid: "grid grid-cols-1 md:grid-cols-2 gap-4 mt-4",
  tunnelCard: "border border-gray-200 rounded-lg p-4 bg-gray-50",
  tunnelInfo: "flex justify-between items-center mb-2",
  tunnelLabel: "text-sm font-medium text-gray-500",
  tunnelValue: "text-sm text-gray-800",
  copyButton: "p-1 text-blue-500 hover:text-blue-700 cursor-pointer",
  secretBox:
    "p-4 bg-gray-50 border border-gray-200 rounded-md flex flex-col gap-2",
  loadingSpinner: "animate-spin text-blue-500",
  eventLog:
    "max-h-64 overflow-y-auto p-4 bg-gray-50 border border-gray-200 rounded-md font-mono text-sm",
  eventItem: "mb-1 pb-1 border-b border-gray-100",
  claimInfo: "flex flex-col gap-2",
  claimCode:
    "font-mono bg-gray-100 p-2 rounded flex justify-between items-center",
  claimUrl: "text-blue-500 hover:underline flex items-center gap-1",
  badgeContainer: "flex items-center gap-2 mb-4",
  badge: "px-2 py-1 rounded-full text-xs font-medium",
};

/**
 * PlayItClient Component
 *
 * A React component for managing PlayIt tunnels.
 */
const PlayItClient = () => {
  // Socket connection state
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  // PlayIt state
  const [version, setVersion] = useState(null);
  const [claim, setClaim] = useState(null);
  const [secret, setSecret] = useState(null);
  const [tunnels, setTunnels] = useState([]);
  const [status, setStatus] = useState("idle"); // idle, starting, running, stopped

  // UI state
  const [loading, setLoading] = useState({
    login: false,
    tunnels: false,
    reset: false,
    version: false,
  });
  const [error, setError] = useState(null);
  const [eventLog, setEventLog] = useState([]);

  // Initialize Socket.IO connection
  useEffect(() => {
    const newSocket = io("/playit", {
      path: "/api/socket.io", // Adjust if your Socket.IO path is different
    });

    // Connection events
    newSocket.on("connect", () => {
      setConnected(true);
      logEvent("info", "Connected to PlayIt service");
    });

    newSocket.on("disconnect", () => {
      setConnected(false);
      logEvent("info", "Disconnected from PlayIt service");
    });

    newSocket.on("connect_error", (err) => {
      setConnected(false);
      setError(`Connection error: ${err.message}`);
      logEvent("error", `Connection error: ${err.message}`);
    });

    // PlayIt events
    newSocket.on("claim", (data) => {
      setClaim(data);
      setLoading((prev) => ({ ...prev, login: false }));
      logEvent("info", `Claim code generated: ${data.claim}`);
    });

    newSocket.on("exchanging", (claimCode) => {
      logEvent("info", `Exchanging claim code: ${claimCode}`);
    });

    newSocket.on("secret", (data) => {
      setSecret(data);
      logEvent("success", `Secret key obtained at path: ${data.path}`);
    });

    newSocket.on("tunnels", (data) => {
      setTunnels(Array.isArray(data) ? data : []);
      setLoading((prev) => ({ ...prev, tunnels: false }));
      logEvent("info", `Received tunnels data: ${data.length} tunnels`);
    });

    newSocket.on("starting", () => {
      setStatus("starting");
      logEvent("info", "PlayIt agent is starting");
    });

    newSocket.on("stopped", (exitCode) => {
      setStatus("stopped");
      logEvent("info", `PlayIt agent stopped with exit code: ${exitCode}`);
    });

    newSocket.on("resetting", () => {
      logEvent("warning", "Resetting PlayIt configuration");
    });

    newSocket.on("reset-complete", (exitCode) => {
      setClaim(null);
      setSecret(null);
      setLoading((prev) => ({ ...prev, reset: false }));
      logEvent("success", `Reset completed with exit code: ${exitCode}`);
    });

    newSocket.on("secret-path", (path) => {
      logEvent("info", `Secret path: ${path}`);
    });

    newSocket.on("version", (versionString) => {
      setVersion(versionString);
      setLoading((prev) => ({ ...prev, version: false }));
      logEvent("info", `PlayIt version: ${versionString}`);
    });

    newSocket.on("help", (helpText) => {
      logEvent("info", "Help information received");
    });

    newSocket.on("error", (errorMessage) => {
      setError(errorMessage);
      setLoading({
        login: false,
        tunnels: false,
        reset: false,
        version: false,
      });
      logEvent("error", `Error: ${errorMessage}`);
    });

    newSocket.on("warning", (warningMessage) => {
      logEvent("warning", `Warning: ${warningMessage}`);
    });

    setSocket(newSocket);

    // Clean up on unmount
    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Helper functions
  const logEvent = (type, message) => {
    const timestamp = new Date().toLocaleTimeString();
    setEventLog((prev) => [...prev, { type, message, timestamp }].slice(-100));
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    logEvent("info", "Copied to clipboard");
  };

  // API calls
  const login = useCallback(async () => {
    setLoading((prev) => ({ ...prev, login: true }));
    setError(null);

    try {
      // Using REST API
      await axios.post("/api/playit/login");
      logEvent("info", "Login process started");
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      setLoading((prev) => ({ ...prev, login: false }));
      logEvent("error", `Login error: ${err.message}`);
    }
  }, []);

  const getTunnels = useCallback(async () => {
    setLoading((prev) => ({ ...prev, tunnels: true }));
    setError(null);

    try {
      await axios.get("/api/playit/tunnels");
      logEvent("info", "Requesting tunnels information");
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      setLoading((prev) => ({ ...prev, tunnels: false }));
      logEvent("error", `Tunnels error: ${err.message}`);
    }
  }, []);

  const reset = useCallback(async () => {
    if (
      !window.confirm(
        "Are you sure you want to reset PlayIt? This will remove all your current configuration."
      )
    ) {
      return;
    }

    setLoading((prev) => ({ ...prev, reset: true }));
    setError(null);

    try {
      await axios.post("/api/playit/reset");
      logEvent("warning", "Reset process started");
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      setLoading((prev) => ({ ...prev, reset: false }));
      logEvent("error", `Reset error: ${err.message}`);
    }
  }, []);

  const getVersion = useCallback(async () => {
    setLoading((prev) => ({ ...prev, version: true }));
    setError(null);

    try {
      await axios.get("/api/playit/version");
      logEvent("info", "Requesting version information");
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      setLoading((prev) => ({ ...prev, version: false }));
      logEvent("error", `Version error: ${err.message}`);
    }
  }, []);

  // Fetch tunnels & version on initial load
  useEffect(() => {
    if (connected) {
      getVersion();
      getTunnels();
    }
  }, [connected, getVersion, getTunnels]);

  // Render helper functions
  const renderStatusBadge = () => {
    const statusMap = {
      idle: { text: "Idle", color: "bg-gray-300 text-gray-800" },
      starting: { text: "Starting", color: "bg-yellow-300 text-yellow-800" },
      running: { text: "Running", color: "bg-green-300 text-green-800" },
      stopped: { text: "Stopped", color: "bg-red-300 text-red-800" },
    };

    const { text, color } = statusMap[status] || statusMap.idle;

    return <span className={`${styles.badge} ${color}`}>{text}</span>;
  };

  const renderConnectionBadge = () => {
    return connected ? (
      <span className={`${styles.badge} bg-green-300 text-green-800`}>
        Connected
      </span>
    ) : (
      <span className={`${styles.badge} bg-red-300 text-red-800`}>
        Disconnected
      </span>
    );
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.header}>
        <Server size={24} />
        PlayIt Client
      </h1>

      <div className={styles.badgeContainer}>
        {renderConnectionBadge()}
        {renderStatusBadge()}
        {version && (
          <span className={`${styles.badge} bg-blue-300 text-blue-800`}>
            v{version}
          </span>
        )}
      </div>

      {error && (
        <div className={styles.errorBox}>
          <div className="flex items-center gap-2">
            <AlertCircle size={18} className="text-red-600" />
            <strong>Error:</strong>
          </div>
          <p>{error}</p>
        </div>
      )}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <Play size={18} />
          PlayIt Actions
        </h2>

        <div className={styles.buttonGroup}>
          <button
            className={`${styles.button} ${styles.primaryButton}`}
            onClick={login}
            disabled={loading.login}
          >
            {loading.login ? (
              <Loader size={18} className={styles.loadingSpinner} />
            ) : (
              <Play size={18} />
            )}
            Login
          </button>

          <button
            className={`${styles.button} ${styles.secondaryButton}`}
            onClick={getTunnels}
            disabled={loading.tunnels}
          >
            {loading.tunnels ? (
              <Loader size={18} className={styles.loadingSpinner} />
            ) : (
              <List size={18} />
            )}
            Get Tunnels
          </button>

          <button
            className={`${styles.button} ${styles.secondaryButton}`}
            onClick={getVersion}
            disabled={loading.version}
          >
            {loading.version ? (
              <Loader size={18} className={styles.loadingSpinner} />
            ) : (
              <Info size={18} />
            )}
            Get Version
          </button>

          <button
            className={`${styles.button} ${styles.dangerButton}`}
            onClick={reset}
            disabled={loading.reset}
          >
            {loading.reset ? (
              <Loader size={18} className={styles.loadingSpinner} />
            ) : (
              <RefreshCw size={18} />
            )}
            Reset
          </button>
        </div>
      </section>

      {claim && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <Info size={18} />
            Claim Information
          </h2>

          <div className={styles.claimInfo}>
            <div>
              <span className={styles.tunnelLabel}>Claim Code:</span>
              <div className={styles.claimCode}>
                <code>{claim.claim}</code>
                <span
                  className={styles.copyButton}
                  onClick={() => copyToClipboard(claim.claim)}
                  title="Copy to clipboard"
                >
                  <Clipboard size={16} />
                </span>
              </div>
            </div>

            <div>
              <span className={styles.tunnelLabel}>Claim URL:</span>
              <a
                href={claim.url}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.claimUrl}
              >
                {claim.url} <ExternalLink size={14} />
              </a>
            </div>
          </div>
        </section>
      )}

      {secret && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <CheckCircle size={18} className="text-green-600" />
            Secret Information
          </h2>

          <div className={styles.secretBox}>
            <div>
              <span className={styles.tunnelLabel}>Secret Path:</span>
              <div className="flex justify-between items-center">
                <span className={styles.tunnelValue}>{secret.path}</span>
                <span
                  className={styles.copyButton}
                  onClick={() => copyToClipboard(secret.path)}
                  title="Copy to clipboard"
                >
                  <Clipboard size={16} />
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {tunnels?.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <List size={18} />
            Tunnels ({tunnels.length})
          </h2>

          <div className={styles.tunnelGrid}>
            {tunnels.map((tunnel, index) => (
              <div key={index} className={styles.tunnelCard}>
                <div className={styles.tunnelInfo}>
                  <span className={styles.tunnelLabel}>ID:</span>
                  <span className={styles.tunnelValue}>
                    {tunnel.id || "N/A"}
                  </span>
                </div>

                <div className={styles.tunnelInfo}>
                  <span className={styles.tunnelLabel}>Name:</span>
                  <span className={styles.tunnelValue}>
                    {tunnel.name || "Unnamed"}
                  </span>
                </div>

                {tunnel.proto && (
                  <div className={styles.tunnelInfo}>
                    <span className={styles.tunnelLabel}>Protocol:</span>
                    <span className={styles.tunnelValue}>{tunnel.proto}</span>
                  </div>
                )}

                {tunnel.domain && (
                  <div className={styles.tunnelInfo}>
                    <span className={styles.tunnelLabel}>Domain:</span>
                    <div className="flex items-center gap-1">
                      <a
                        href={`http${tunnel.proto === "https" ? "s" : ""}://${
                          tunnel.domain
                        }`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.claimUrl}
                      >
                        {tunnel.domain} <ExternalLink size={14} />
                      </a>
                      <span
                        className={styles.copyButton}
                        onClick={() => copyToClipboard(tunnel.domain)}
                        title="Copy to clipboard"
                      >
                        <Clipboard size={16} />
                      </span>
                    </div>
                  </div>
                )}

                {tunnel.local_port && (
                  <div className={styles.tunnelInfo}>
                    <span className={styles.tunnelLabel}>Local Port:</span>
                    <span className={styles.tunnelValue}>
                      {tunnel.local_port}
                    </span>
                  </div>
                )}

                {tunnel.status && (
                  <div className={styles.tunnelInfo}>
                    <span className={styles.tunnelLabel}>Status:</span>
                    <span
                      className={`${styles.badge} ${
                        tunnel.status === "online"
                          ? "bg-green-300 text-green-800"
                          : "bg-red-300 text-red-800"
                      }`}
                    >
                      {tunnel.status}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <Info size={18} />
          Event Log
        </h2>

        <div className={styles.eventLog}>
          {eventLog.length === 0 ? (
            <p className="text-gray-500 italic">No events yet</p>
          ) : (
            eventLog.map((event, index) => (
              <div
                key={index}
                className={`${styles.eventItem} ${
                  event.type === "error"
                    ? "text-red-600"
                    : event.type === "warning"
                    ? "text-yellow-600"
                    : event.type === "success"
                    ? "text-green-600"
                    : "text-gray-600"
                }`}
              >
                <span className="text-gray-400">[{event.timestamp}]</span>{" "}
                {event.message}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};

export default PlayItClient;
