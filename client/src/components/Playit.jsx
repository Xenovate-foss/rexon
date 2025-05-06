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
  StopCircle,
  MessageSquare,
  X,
  Check,
  Wifi,
  WifiOff,
  ArrowUpRight,
  Globe,
  Monitor,
  Filter,
  Trash2,
  Clock,
} from "lucide-react";

// Improved component styles with better visual hierarchy and animations
const styles = {
  container: "max-w-5xl mx-auto p-6 bg-white rounded-lg shadow-lg",
  header: "text-3xl font-bold text-gray-800 mb-6 flex items-center gap-3 border-b pb-4",
  section: "mb-8 p-5 border border-gray-200 rounded-lg hover:shadow-md transition-shadow",
  sectionTitle: "text-xl font-semibold text-gray-700 mb-4 flex items-center gap-2",
  button: "px-4 py-2 rounded-md flex items-center gap-2 transition-all shadow-sm font-medium",
  primaryButton: "bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700 active:scale-95",
  secondaryButton: "bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300 active:scale-95",
  dangerButton: "bg-red-500 text-white hover:bg-red-600 active:bg-red-700 active:scale-95",
  stopButton: "bg-orange-500 text-white hover:bg-orange-600 active:bg-orange-700 active:scale-95",
  buttonGroup: "flex flex-wrap gap-3 mb-5",
  infoBox: "bg-blue-50 border-l-4 border-blue-400 p-4 rounded-md mb-4",
  warningBox: "bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md mb-4",
  errorBox: "bg-red-50 border-l-4 border-red-400 p-4 rounded-md mb-4 animate-pulse",
  successBox: "bg-green-50 border-l-4 border-green-400 p-4 rounded-md mb-4",
  status: "mt-4 p-3 rounded-md text-sm",
  tunnelGrid: "grid grid-cols-1 md:grid-cols-2 gap-5 mt-5",
  tunnelCard: "border border-gray-200 rounded-lg p-5 bg-gray-50 hover:shadow-md transition-all",
  tunnelInfo: "flex justify-between items-center mb-3 w-full",
  tunnelLabel: "text-sm font-medium text-gray-500",
  tunnelValue: "text-sm text-gray-800",
  copyButton: "p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-full cursor-pointer transition-colors",
  secretBox: "p-5 bg-gray-50 border border-gray-200 rounded-md flex flex-col gap-3",
  loadingSpinner: "animate-spin text-blue-500",
  eventLog: "max-h-72 overflow-y-auto p-4 bg-gray-50 border border-gray-200 rounded-md font-mono text-sm",
  eventItem: "mb-1.5 pb-1.5 border-b border-gray-100 flex items-start gap-2",
  claimInfo: "flex flex-col gap-3 bg-blue-50 p-4 rounded-lg",
  claimCode: "font-mono bg-white p-3 rounded-md flex justify-between items-center border border-blue-200",
  claimUrl: "text-blue-600 hover:underline flex items-center gap-1 font-medium",
  badgeContainer: "flex flex-wrap items-center gap-2 mb-5",
  badge: "px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1",
  notification: "fixed bottom-4 right-4 p-4 rounded-md shadow-lg transition-all flex items-center gap-2 max-w-xs z-50 animate-fadeIn",
  statsSummary: "grid grid-cols-2 sm:grid-cols-5 gap-4 mb-5 p-4 bg-gray-50 rounded-lg border border-gray-200",
  statItem: "flex flex-col items-center p-2 bg-white rounded-md shadow-sm",
  statValue: "text-2xl font-semibold",
  statLabel: "text-xs text-gray-500 mt-1",
  filterSection: "mb-5 flex items-center gap-2 p-2 bg-gray-50 rounded-lg",
  searchInput: "px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 flex-grow",
  tabsContainer: "flex border-b mb-5",
  tab: "px-4 py-2 cursor-pointer transition-colors",
  activeTab: "border-b-2 border-blue-500 font-medium text-blue-600",
  inactiveTab: "text-gray-500 hover:text-gray-700",
  eventTimestamp: "text-xs text-gray-400 font-normal",
  eventContent: "flex-1",
  emptyState: "text-center p-8 text-gray-500 flex flex-col items-center gap-3",
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
  const [version, setVersion] = useState(null);
  const [claim, setClaim] = useState(null);
  const [secret, setSecret] = useState(null);
  const [tunnels, setTunnels] = useState([]);
  const [status, setStatus] = useState("idle");
  const [loading, setLoading] = useState({
    login: false,
    tunnels: false,
    reset: false,
    version: false,
    start: false,
    stop: false,
  });
  const [error, setError] = useState(null);
  const [eventLog, setEventLog] = useState([]);
  const [notification, setNotification] = useState(null);
  const [filterText, setFilterText] = useState("");
  
  // New state for UI improvements
  const [activeTab, setActiveTab] = useState("tunnels");
  const [clearingLog, setClearingLog] = useState(false);

  // Helper functions
  const logEvent = (type, message) => {
    const timestamp = new Date().toLocaleTimeString();
    setEventLog((prev) => [...prev, { type, message, timestamp }].slice(-100));
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    logEvent("info", "Copied to clipboard");
    showNotification("success", "Copied to clipboard", 2000);
  };

  const showNotification = (type, message, duration = 5000) => {
    setNotification({ type, message });

    // Clear notification after duration
    if (duration) {
      setTimeout(() => {
        setNotification(null);
      }, duration);
    }
  };
  
  const getEventIcon = (type) => {
    switch (type) {
      case "error":
        return <AlertCircle size={16} className="text-red-500 mt-1 flex-shrink-0" />;
      case "warning":
        return <AlertCircle size={16} className="text-yellow-500 mt-1 flex-shrink-0" />;
      case "success":
        return <CheckCircle size={16} className="text-green-500 mt-1 flex-shrink-0" />;
      case "info":
      default:
        return <Info size={16} className="text-blue-500 mt-1 flex-shrink-0" />;
    }
  };
  
  const clearEventLog = () => {
    setClearingLog(true);
    setTimeout(() => {
      setEventLog([]);
      setClearingLog(false);
      showNotification("success", "Event log cleared", 2000);
    }, 300);
  };

  // Initialize Socket.IO connection
  useEffect(() => {
    const newSocket = io("/playit", {
      path: "/socket.io", // Adjust if your Socket.IO path is different
    });

    // Connection events
    newSocket.on("connect", () => {
      setConnected(true);
      logEvent("info", "Connected to PlayIt service");
      showNotification("success", "Connected to PlayIt service");
    });

    newSocket.on("disconnect", () => {
      setConnected(false);
      logEvent("info", "Disconnected from PlayIt service");
      showNotification("error", "Disconnected from PlayIt service");
    });

    newSocket.on("connect_error", (err) => {
      setConnected(false);
      setError(`Connection error: ${err.message}`);
      logEvent("error", `Connection error: ${err.message}`);
      showNotification("error", `Connection error: ${err.message}`);
    });

    // PlayIt events
    newSocket.on("claim", (data) => {
      setClaim(data);
      setLoading((prev) => ({ ...prev, login: false }));
      logEvent("info", `Claim code generated: ${data.claim}`);
      showNotification("info", "Claim code generated");
    });

    newSocket.on("exchanging", (claimCode) => {
      logEvent("info", `Exchanging claim code: ${claimCode}`);
    });

    newSocket.on("secret", (data) => {
      setSecret(data);
      logEvent("success", `Secret key obtained at path: ${data.path}`);
      showNotification("success", "Secret key obtained");
    });

    newSocket.on("tunnels", (data) => {
      setTunnels(Array.isArray(data) ? data : []);
      setLoading((prev) => ({ ...prev, tunnels: false }));
      logEvent("info", `Received tunnels data: ${data.length} tunnels`);
      showNotification("info", `Received ${data.length} tunnels`);
    });

    newSocket.on("starting", () => {
      setStatus("starting");
      logEvent("info", "PlayIt agent is starting");
      showNotification("info", "PlayIt agent is starting");
    });

    newSocket.on("running", () => {
      setStatus("running");
      setLoading((prev) => ({ ...prev, start: false }));
      logEvent("success", "PlayIt agent is running");
      showNotification("success", "PlayIt agent is running");
    });

    newSocket.on("stopped", (exitCode) => {
      setStatus("stopped");
      setLoading((prev) => ({ ...prev, stop: false }));
      logEvent("info", `PlayIt agent stopped with exit code: ${exitCode}`);
      showNotification("info", `PlayIt agent stopped`);
    });

    newSocket.on("resetting", () => {
      logEvent("warning", "Resetting PlayIt configuration");
      showNotification("warning", "Resetting PlayIt configuration");
    });

    newSocket.on("reset-complete", (exitCode) => {
      setClaim(null);
      setSecret(null);
      setLoading((prev) => ({ ...prev, reset: false }));
      logEvent("success", `Reset completed with exit code: ${exitCode}`);
      showNotification("success", "Reset completed");
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
        start: false,
        stop: false,
      });
      logEvent("error", `Error: ${errorMessage}`);
      showNotification("error", errorMessage);
    });

    newSocket.on("warning", (warningMessage) => {
      logEvent("warning", `Warning: ${warningMessage}`);
      showNotification("warning", warningMessage);
    });

    setSocket(newSocket);

    // Clean up on unmount
    return () => {
      newSocket.disconnect();
    };
  }, []);

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
      showNotification("error", `Login error: ${err.message}`);
    }
  }, []);

  const getTunnels = useCallback(async () => {
    setLoading((prev) => ({ ...prev, tunnels: true }));
    setError(null);

    try {
      const data = await axios.get("/api/playit/tunnels");

      logEvent("info", JSON.stringify(data.data));
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      setLoading((prev) => ({ ...prev, tunnels: false }));
      logEvent("error", `Tunnels error: ${err.message}`);
      showNotification("error", `Tunnels error: ${err.message}`);
    }
  }, []);

  const startPlayit = useCallback(async () => {
    setLoading((prev) => ({ ...prev, start: true }));
    setError(null);

    try {
      await axios.post("/api/playit/start");
      logEvent("info", "Requesting to start PlayIt agent");
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      setLoading((prev) => ({ ...prev, start: false }));
      logEvent("error", `Starting error: ${err.message}`);
      showNotification("error", `Starting error: ${err.message}`);
    }
  }, []);

  const stopPlayit = useCallback(async () => {
    setLoading((prev) => ({ ...prev, stop: true }));
    setError(null);

    try {
      await axios.post("/api/playit/stop");
      logEvent("info", "Requesting to stop PlayIt agent");
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      setLoading((prev) => ({ ...prev, stop: false }));
      logEvent("error", `Stopping error: ${err.message}`);
      showNotification("error", `Stopping error: ${err.message}`);
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
      showNotification("error", `Reset error: ${err.message}`);
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
      showNotification("error", `Version error: ${err.message}`);
    }
  }, []);

  // Fetch tunnels & version on initial load
  useEffect(() => {
    if (connected) {
      getVersion();
      getTunnels();
    }
  }, [connected, getVersion, getTunnels]);

  // Filter tunnels based on search text
  const filteredTunnels = tunnels.filter((tunnel) => {
    const searchText = filterText.toLowerCase();
    return (
      (tunnel.name && tunnel.name.toLowerCase().includes(searchText)) ||
      (tunnel.domain && tunnel.domain.toLowerCase().includes(searchText)) ||
      (tunnel.proto && tunnel.proto.toLowerCase().includes(searchText)) ||
      (tunnel.status && tunnel.status.toLowerCase().includes(searchText))
    );
  });

  // Statistics
  const stats = {
    total: tunnels.length,
    online: tunnels.filter((t) => t.status === "online").length,
    offline: tunnels.filter((t) => t.status !== "online").length,
    http: tunnels.filter((t) => t.proto === "http").length,
    https: tunnels.filter((t) => t.proto === "https").length,
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.header}>
        <Server size={28} className="text-blue-600" />
        PlayIt Client Dashboard
      </h1>

      <div className={styles.badgeContainer}>
        {connected ? (
          <span className={`${styles.badge} bg-green-100 text-green-800 border border-green-200`}>
            <Wifi size={14} /> Connected
          </span>
        ) : (
          <span className={`${styles.badge} bg-red-100 text-red-800 border border-red-200`}>
            <WifiOff size={14} /> Disconnected
          </span>
        )}
        
        {status === "running" && (
          <span className={`${styles.badge} bg-green-100 text-green-800 border border-green-200`}>
            <Play size={14} /> Running
          </span>
        )}
        
        {status === "starting" && (
          <span className={`${styles.badge} bg-yellow-100 text-yellow-800 border border-yellow-200`}>
            <Loader size={14} className="animate-spin" /> Starting
          </span>
        )}
        
        {status === "stopped" && (
          <span className={`${styles.badge} bg-red-100 text-red-800 border border-red-200`}>
            <StopCircle size={14} /> Stopped
          </span>
        )}
        
        {status === "idle" && (
          <span className={`${styles.badge} bg-gray-100 text-gray-800 border border-gray-200`}>
            <Clock size={14} /> Idle
          </span>
        )}
        
        {version && (
          <span className={`${styles.badge} bg-blue-100 text-blue-800 border border-blue-200`}>
            <Info size={14} /> v{version}
          </span>
        )}
      </div>

      {error && (
        <div className={styles.errorBox}>
          <div className="flex items-center gap-2">
            <AlertCircle size={18} className="text-red-600" />
            <strong>Error</strong>
          </div>
          <p className="mt-1">{error}</p>
          <button 
            className="mt-2 text-red-600 hover:text-red-800 text-sm flex items-center gap-1"
            onClick={() => setError(null)}
          >
            <X size={14} /> Dismiss
          </button>
        </div>
      )}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <Play size={20} className="text-blue-600" />
          PlayIt Controls
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
              <ArrowUpRight size={18} />
            )}
            Login
          </button>

          <button
            className={`${styles.button} ${styles.primaryButton}`}
            onClick={startPlayit}
            disabled={loading.start || status === "running"}
          >
            {loading.start ? (
              <Loader size={18} className={styles.loadingSpinner} />
            ) : (
              <Play size={18} />
            )}
            Start
          </button>

          <button
            className={`${styles.button} ${styles.stopButton}`}
            onClick={stopPlayit}
            disabled={loading.stop || status !== "running"}
          >
            {loading.stop ? (
              <Loader size={18} className={styles.loadingSpinner} />
            ) : (
              <StopCircle size={18} />
            )}
            Stop
          </button>

          <button
            className={`${styles.button} ${styles.secondaryButton}`}
            onClick={getTunnels}
            disabled={loading.tunnels}
          >
            {loading.tunnels ? (
              <Loader size={18} className={styles.loadingSpinner} />
            ) : (
              <RefreshCw size={18} />
            )}
            Refresh Tunnels
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
            Check Version
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
            <ArrowUpRight size={20} className="text-blue-600" />
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
            <CheckCircle size={20} className="text-green-600" />
            Secret Information
          </h2>

          <div className={styles.secretBox}>
            <div>
              <span className={styles.tunnelLabel}>Secret Path:</span>
              <div className="flex justify-between items-center bg-white p-3 rounded-md border border-gray-200">
                <span className="font-mono">{secret.path}</span>
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

      {/* Tabbed interface for Tunnels and Event Log */}
      <section className={styles.section}>
        <div className={styles.tabsContainer}>
          <div 
            className={`${styles.tab} ${activeTab === "tunnels" ? styles.activeTab : styles.inactiveTab}`}
            onClick={() => setActiveTab("tunnels")}
          >
            <div className="flex items-center gap-1">
              <Globe size={16} />
              Tunnels ({tunnels.length})
            </div>
          </div>
          <div 
            className={`${styles.tab} ${activeTab === "log" ? styles.activeTab : styles.inactiveTab}`}
            onClick={() => setActiveTab("log")}
          >
            <div className="flex items-center gap-1">
              <MessageSquare size={16} />
              Event Log ({eventLog.length})
            </div>
          </div>
        </div>

        {activeTab === "tunnels" && (
          <>
            {tunnels?.length > 0 && (
              <>
                <div className={styles.statsSummary}>
                  <div className={styles.statItem}>
                    <span className={styles.statValue}>{stats.total}</span>
                    <span className={styles.statLabel}>Total</span>
                  </div>
                  <div className={styles.statItem}>
                    <span className={`${styles.statValue} text-green-600`}>{stats.online}</span>
                    <span className={styles.statLabel}>Online</span>
                  </div>
                  <div className={styles.statItem}>
                    <span className={`${styles.statValue} text-red-600`}>{stats.offline}</span>
                    <span className={styles.statLabel}>Offline</span>
                  </div>
                  <div className={styles.statItem}>
                    <span className={`${styles.statValue} text-blue-600`}>{stats.http}</span>
                    <span className={styles.statLabel}>HTTP</span>
                  </div>
                  <div className={styles.statItem}>
                    <span className={`${styles.statValue} text-purple-600`}>{stats.https}</span>
                    <span className={styles.statLabel}>HTTPS</span>
                  </div>
                </div>

                <div className={styles.filterSection}>
                  <Filter size={18} className="text-gray-500" />
                  <input
                    type="text"
                    className={styles.searchInput}
                    placeholder="Filter tunnels by name, domain, protocol..."
                    value={filterText}
                    onChange={(e) => setFilterText(e.target.value)}
                  />
                </div>

                <div className={styles.tunnelGrid}>
                  {filteredTunnels.length > 0 ? (
                    filteredTunnels.map((tunnel, index) => (
                      <div key={index} className={styles.tunnelCard}>
                        <div className="flex justify-between items-center mb-3">
                          <h3 className="font-medium text-lg">{tunnel.name || "Unnamed Tunnel"}</h3>
                          <span
                            className={`${styles.badge} ${
                              tunnel.status === "online"
                                ? "bg-green-100 text-green-800 border border-green-200"
                                : "bg-red-100 text-red-800 border border-red-200"
                            }`}
                          >
                            {tunnel.status === "online" ? (
                              <><Wifi size={12} /> Online</>
                            ) : (
                              <><WifiOff size={12} /> Offline</>
                            )}
                          </span>
                        </div>
                      
                        <div className="bg-white p-3 rounded-md border border-gray-200 mb-3">
                          <div className={styles.tunnelInfo}>
                            <span className={styles.tunnelLabel}>ID:</span>
                            <span className="font-mono text-xs">{tunnel.id || "N/A"}</span>
                          </div>

                          {tunnel.alloc?.ip_type && (
                            <div className={styles.tunnelInfo}>
                              <span className={styles.tunnelLabel}>Protocol:</span>
                              <span className="font-medium">
                                {tunnel.alloc.ip_type}
                              </span>
                            </div>
                          )}

                          {tunnel.local_port && (
                            <div className={styles.tunnelInfo}>
                              <span className={styles.tunnelLabel}>Local Port:</span>
                              <span className="font-medium">{tunnel.local_port}</span>
                            </div>
                          )}
                        </div>

                        {tunnel.alloc?.data?.assigned_domain && (
                          <div className="bg-blue-50 p-3 rounded-md border border-blue-100">
                            <div className="flex justify-between items-center">
                              <span className={styles.tunnelLabel}>Domain:</span>
                              <span
                                className={styles.copyButton}
                                onClick={() => copyToClipboard(tunnel.alloc.data.assigned_domain)}
                                title="Copy to clipboard"
                              >
                                <Clipboard size={16} />
                              </span>
                            </div>
                            <div className="font-medium text-blue-800 break-all">
                              {tunnel.alloc.data.assigned_domain}
                            </div>
                            <div className="text-sm mt-1 text-blue-600">
                              Ports: {tunnel.alloc.data.port_start}:{tunnel.alloc.data.port_end}
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className={styles.emptyState}>
                      <Filter size={32} className="text-gray-400" />
                      No tunnels match your filter criteria
                    </div>
                  )}
                </div>
              </>
            )}

            {tunnels.length === 0 && (
              <div className={styles.emptyState}>
                <Globe size={48} className="text-gray-400" />
                <p>No tunnels available</p>
                <p className="text-sm">Login and start PlayIt to create tunnels</p>
              </div>
            )}
          </>
        )}

        {activeTab === "log" && (
          <>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-medium">Event History</h3>
              <button
                className={`${styles.button} ${styles.secondaryButton} py-1 px-2`}
                onClick={clearEventLog}
                disabled={eventLog.length === 0 || clearingLog}
              >
                <Trash2 size={16} /> Clear Log
              </button>
            </div>
            
            <div className={`${styles.eventLog} ${clearingLog ? 'opacity-50' : ''}`}>
              {eventLog.length > 0 ? (
                eventLog.map((event, index) => (
                  <div key={index} className={styles.eventItem}>
                    {getEventIcon(event.type)}
                    <div className={styles.eventContent}>
                      {event.message}
                      <span className={styles.eventTimestamp}> at {event.timestamp}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className={styles.emptyState}>
                  <MessageSquare size={32} className="text-gray-400" />
                  <p>No events logged yet</p>
                </div>
              )}
            </div>
          </>
        )}
      </section>

      {notification && (
        <div className={`${styles.notification} ${
          notification.type === "success" ? "bg-green-100 border-l-4 border-green-500" :
          notification.type === "error" ? "bg-red-100 border-l-4 border-red-500" :
          notification.type === "warning" ? "bg-yellow-100 border-l-4 border-yellow-500" :
          "bg-blue-100 border-l-4 border-blue-500"
        }`}>
          {notification.type === "success" && <CheckCircle size={20} className="text-green-600" />}
          {notification.type === "error" && <AlertCircle size={20} className="text-red-600" />}
          {notification.type === "warning" && <AlertCircle size={20} className="text-yellow-600" />}
          {notification.type === "info" && <Info size={20} className="text-blue-600" />}
          <span>{notification.message}</span>
          <button 
            className="ml-auto text-gray-500 hover:text-gray-700"
            onClick={() => setNotification(null)}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default PlayItClient;