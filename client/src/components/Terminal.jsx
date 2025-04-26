import React, { useEffect, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import "@xterm/xterm/css/xterm.css";
import { io } from "socket.io-client";

const XTerminal = () => {
  const terminalRef = useRef(null);
  const terminal = useRef(null);
  const fitAddonRef = useRef(null);
  const socketRef = useRef(null);
  const [inputValue, setInputValue] = useState("");
  const [commandHistory, setCommandHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [isServerOnline, setIsServerOnline] = useState(false);

  // Initialize terminal
  useEffect(() => {
    if (terminal.current) return;

    console.log("Initializing terminal...");

    try {
      // Create terminal instance
      terminal.current = new Terminal({
        cursorBlink: false,
        disableStdin: true,
        fontFamily: "monospace",
        fontSize: 14,
        theme: {
          background: "#000000",
          foreground: "#FFFFFF",
          cursor: "#000000",
          selection: "#0000FF88",
        },
        rendererType: "canvas",
        convertEol: true,
        scrollback: 1000,
      });

      console.log("Terminal created");

      fitAddonRef.current = new FitAddon();
      const webLinksAddon = new WebLinksAddon();

      terminal.current.loadAddon(fitAddonRef.current);
      terminal.current.loadAddon(webLinksAddon);

      // Mount terminal to DOM with proper timing
      if (terminalRef.current) {
        console.log("Opening terminal on DOM element");

        terminal.current.open(terminalRef.current);
        console.log("Terminal opened");

        // Show initial message
        terminal.current.writeln(
          "\x1b[97m[\x1b[31mDemon\x1b[97m]\x1b[0m: Terminal initialized."
        );

        // Use a slightly longer timeout for better reliability
        setTimeout(() => {
          if (fitAddonRef.current && terminal.current) {
            try {
              fitAddonRef.current.fit();
              console.log("Terminal fitted");
              terminal.current.focus();
              terminal.current.write("\r\n\x1b[36m> \x1b[0m");
            } catch (err) {
              console.error("Error fitting terminal:", err);
            }
          }
        }, 300);

        // Set up event listeners
        const enableFocus = () => {
          if (terminal.current) {
            terminal.current.focus();
          }
        };

        terminalRef.current.addEventListener("touchstart", enableFocus);
        terminalRef.current.addEventListener("click", enableFocus);

        // Handle resizing
        const handleResize = () => {
          if (fitAddonRef.current && terminal.current) {
            try {
              fitAddonRef.current.fit();
            } catch (err) {
              console.error("Error on resize:", err);
            }
          }
        };

        window.addEventListener("resize", handleResize);

        // Use ResizeObserver with debouncing
        let resizeTimer;
        const resizeObserver = new ResizeObserver(() => {
          clearTimeout(resizeTimer);
          resizeTimer = setTimeout(handleResize, 100);
        });

        if (terminalRef.current) {
          resizeObserver.observe(terminalRef.current);
        }

        return () => {
          console.log("Cleaning up terminal...");
          clearTimeout(resizeTimer);
          resizeObserver.disconnect();
          window.removeEventListener("resize", handleResize);

          if (terminalRef.current) {
            terminalRef.current.removeEventListener("touchstart", enableFocus);
            terminalRef.current.removeEventListener("click", enableFocus);
          }

          if (terminal.current) {
            terminal.current.dispose();
            terminal.current = null;
          }
        };
      } else {
        console.error("Terminal reference element not found");
      }
    } catch (err) {
      console.error("Error initializing terminal:", err);
    }
  }, []);

  // Separate socket connection logic for better control
  useEffect(() => {
    // Don't proceed if terminal isn't initialized
    if (!terminal.current) return;

    terminal.current.writeln(
      "\r\n\x1b[97m[\x1b[31mDemon\x1b[97m]\x1b[0m: Attempting to connect to server..."
    );

    // Try multiple transport methods
    socketRef.current = io("/", {
      reconnectionDelayMax: 10000,
      reconnectionAttempts: 5,
      timeout: 10000,
      transports: ["polling", "websocket"], // Try polling first, then upgrade to websocket
      // For debugging purposes
      extraHeaders: {
        "Custom-Client-Id": "XTerminal-Client",
      },
    });

    // Set up socket event handlers
    socketRef.current.on("connect", () => {
      setIsConnected(true);
      setIsServerOnline(true); // Update server online status
      setConnectionAttempts(0);
      if (terminal.current) {
        terminal.current.writeln(
          "\r\n\x1b[97m[\x1b[32mSuccess\x1b[97m]\x1b[0m: Connected to server."
        );
        terminal.current.write("\r\n\x1b[36m> \x1b[0m");
      }
    });

    socketRef.current.on("connect_error", (error) => {
      const attempts = connectionAttempts + 1;
      setConnectionAttempts(attempts);
      setIsServerOnline(false); // Update server online status

      if (terminal.current) {
        terminal.current.writeln(
          `\r\n\x1b[97m[\x1b[31mError\x1b[97m]\x1b[0m: Connection failed (attempt ${attempts}): ${error.message}`
        );

        // Provide more helpful information
        if (
          error.message.includes("xhr poll error") ||
          error.message.includes("CORS")
        ) {
          terminal.current.writeln(
            "\r\n\x1b[97m[\x1b[33mInfo\x1b[97m]\x1b[0m: This may be a CORS issue. The server might not allow connections from this origin."
          );
        }

        if (attempts >= 3) {
          terminal.current.writeln(
            "\r\n\x1b[97m[\x1b[33mInfo\x1b[97m]\x1b[0m: Multiple connection failures. The server might be offline or the URL may be incorrect."
          );
        }

        terminal.current.write("\r\n\x1b[36m> \x1b[0m");
      }
    });

    socketRef.current.on("server:history", (history) => {
      if (terminal.current && Array.isArray(history)) {
        // Format history entries properly
        history.forEach((entry) => {
          if (entry.output) {
            terminal.current.write(entry.output);
          }
        });
        terminal.current.write("\r\n\x1b[36m> \x1b[0m");
      }
    });

    socketRef.current.on("server:output", (data) => {
      if (terminal.current) {
        terminal.current.write(data);
      }
    });

    socketRef.current.on("server:status", (status) => {
      console.log("Server status update:", status); // Add logging
      setIsServerOnline(!!status); // Convert to boolean explicitly
    });

    socketRef.current.on("disconnect", (reason) => {
      setIsConnected(false);
      setIsServerOnline(false); // Update server online status
      if (terminal.current) {
        terminal.current.writeln(
          `\r\n\x1b[97m[\x1b[31mDisconnect\x1b[97m]\x1b[0m: ${reason}. Attempting to reconnect...`
        );
        terminal.current.write("\r\n\x1b[36m> \x1b[0m");
      }
    });

    socketRef.current.on("reconnect_attempt", (attemptNumber) => {
      if (terminal.current) {
        terminal.current.writeln(
          `\r\n\x1b[97m[\x1b[33mReconnect\x1b[97m]\x1b[0m: Attempt ${attemptNumber}...`
        );
      }
    });

    socketRef.current.on("reconnect_failed", () => {
      if (terminal.current) {
        terminal.current.writeln(
          "\r\n\x1b[97m[\x1b[31mFailed\x1b[97m]\x1b[0m: Reconnection failed after multiple attempts."
        );
        terminal.current.writeln(
          "\r\n\x1b[97m[\x1b[33mTip\x1b[97m]\x1b[0m: Try the 'reconnect' command or check server status."
        );
        terminal.current.write("\r\n\x1b[36m> \x1b[0m");
      }
    });

    // Clean up socket connection
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [connectionAttempts]);

  // Handle input submission
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    // Add command to history
    const newHistory = [inputValue, ...commandHistory].slice(0, 50); // Keep last 50 commands
    setCommandHistory(newHistory);
    setHistoryIndex(-1);

    if (terminal.current) {
      terminal.current.writeln(`\r\n${inputValue}`);
    }

    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit("server:execute", { cmd: inputValue });
    } else if (terminal.current) {
      terminal.current.writeln(
        "\r\n\x1b[97m[\x1b[31mError\x1b[97m]\x1b[0m: Not connected to server"
      );
      terminal.current.write("\r\n\x1b[36m> \x1b[0m");
    }

    setInputValue("");
  };

  // Handle input changes
  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  // Handle keyboard navigation through history
  const handleKeyDown = (e) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = Math.min(historyIndex + 1, commandHistory.length - 1);
        setHistoryIndex(newIndex);
        setInputValue(commandHistory[newIndex]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInputValue(commandHistory[newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInputValue("");
      }
    }
  };

  // Handle server control actions
  const handleServerAction = (action) => {
    if (!socketRef.current) return;

    // Emitting control commands to the server
    socketRef.current.emit("server:action", { action });

    if (terminal.current) {
      terminal.current.writeln(
        `\r\n\x1b[97m[\x1b[33mControl\x1b[97m]\x1b[0m: Sending ${action} command to server...`
      );
    }
  };

  // Handle manual reconnection
  const handleReconnect = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current.connect();

      if (terminal.current) {
        terminal.current.writeln(
          "\r\n\x1b[97m[\x1b[33mReconnect\x1b[97m]\x1b[0m: Manually reconnecting..."
        );
      }
    }
  };

  return (
    <div className="w-full h-full p-2 flex flex-col">
      <div className="flex flex-wrap">
        <button
          className="text-white px-4 py-2 m-2 bg-blue-800 shadow-sm rounded-md hover:bg-blue-600 disabled:opacity-50"
          disabled={isServerOnline}
          onClick={() => handleServerAction("start")}
        >
          Start
        </button>
        <button
          className="text-white px-4 py-2 m-2 bg-red-800 shadow-sm rounded-md hover:bg-red-600 disabled:opacity-50"
          disabled={!isServerOnline}
          onClick={() => handleServerAction("stop")}
        >
          Stop
        </button>
        <button
          className="text-white px-4 py-2 m-2 bg-yellow-800 shadow-sm rounded-md hover:bg-yellow-600 disabled:opacity-50"
          disabled={!isServerOnline}
          onClick={() => handleServerAction("restart")}
        >
          Restart
        </button>
        <button
          className="text-white px-4 py-2 m-2 bg-red-800 shadow-sm rounded-md hover:bg-red-600 disabled:opacity-50"
          disabled={!isServerOnline}
          onClick={() => handleServerAction("kill")}
        >
          Kill
        </button>
        <button
          className="text-white px-4 py-2 m-2 bg-green-800 shadow-sm rounded-md hover:bg-green-600"
          onClick={handleReconnect}
        >
          Reconnect
        </button>
        <div className="flex items-center ml-2">
          <div
            className={`w-3 h-3 rounded-full outline-2 outline-offset-2 mr-2 ${
              isConnected ? "bg-green-500" : "bg-red-500"
            }`}
          ></div>
          <span className="text-white text-sm">
            {isConnected ? "Connected" : "Disconnected"}
          </span>
        </div>
      </div>
      <div
        ref={terminalRef}
        style={{
          width: "100%",
          height: "48vh",
          minHeight: "300px",
          borderRadius: "0.5rem",
          position: "relative",
        }}
        className="bg-black text-white border-2 border-blue-500 overflow-hidden flex-grow"
      />
      <form onSubmit={handleSubmit} className="mt-2 flex">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Enter your command"
          className="flex-grow p-2 border-2 border-blue-500 rounded-l bg-black text-white focus:outline-none"
          autoComplete="off"
        />
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 rounded-r hover:bg-blue-600 focus:outline-none"
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default XTerminal;
