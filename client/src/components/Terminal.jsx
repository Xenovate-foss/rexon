import React, { useEffect, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import "@xterm/xterm/css/xterm.css";

const XTerminal = () => {
  const terminalRef = useRef(null);
  const terminal = useRef(null);
  const fitAddonRef = useRef(null);
  const [inputValue, setInputValue] = useState("");
  const [commandHistory, setCommandHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  useEffect(() => {
    // Only initialize if not already initialized
    if (terminal.current) return;

    console.log("Initializing terminal...");

    try {
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

      if (terminalRef.current) {
        console.log("Opening terminal on DOM element");
        terminal.current.open(terminalRef.current);
        console.log("Terminal opened");

        // Increase timeout to ensure DOM is fully ready
        setTimeout(() => {
          console.log("Fitting terminal...");
          if (fitAddonRef.current) {
            try {
              fitAddonRef.current.fit();
              console.log("Terminal fitted");
            } catch (err) {
              console.error("Error fitting terminal:", err);
            }
          }
          if (terminal.current) {
            terminal.current.focus();
            console.log("Terminal focused");
          }
        }, 100);

        // Initial welcome message
        terminal.current.writeln(
          "\x1b[97m[\x1b[31mDemon\x1b[97m]\x1b[0m: Connecting..."
        );
        terminal.current.writeln(
          "\x1b[97m[\x1b[31mDemon\x1b[97m]\x1b[0m: Connected."
        );
        terminal.current.writeln(
          "\x1b[97m[\x1b[31mDemon\x1b[97m]\x1b[0m: Type 'help' for available commands."
        );
        terminal.current.write("\r\n\x1b[36m> \x1b[0m");

        const enableFocus = () => {
          if (terminal.current) {
            terminal.current.focus();
          }
        };

        terminalRef.current.addEventListener("touchstart", enableFocus);
        terminalRef.current.addEventListener("click", enableFocus);

        // Use window resize event as well as ResizeObserver
        const handleResize = () => {
          console.log("Resize detected");
          if (fitAddonRef.current && terminal.current) {
            try {
              fitAddonRef.current.fit();
            } catch (err) {
              console.error("Error on resize:", err);
            }
          }
        };

        window.addEventListener("resize", handleResize);

        const resizeObserver = new ResizeObserver(() => {
          handleResize();
        });

        if (terminalRef.current) {
          resizeObserver.observe(terminalRef.current);
        }

        return () => {
          console.log("Cleaning up terminal...");
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

  // Handle command execution
  const executeCommand = (command) => {
    if (!terminal.current) return;

    // Add to history only if it's not empty and not the same as the last command
    if (
      command.trim() &&
      (commandHistory.length === 0 || commandHistory[0] !== command)
    ) {
      setCommandHistory([command, ...commandHistory]);
    }
    setHistoryIndex(-1);

    terminal.current.writeln(`\r\x1b[36m> \x1b[0m${command}`);

    // Process the command
    switch (command.trim().toLowerCase()) {
      case "help":
        terminal.current.writeln("\r\nAvailable commands:");
        terminal.current.writeln("  help     - Show this help message");
        terminal.current.writeln("  clear    - Clear the terminal");
        terminal.current.writeln("  echo     - Echo a message back");
        terminal.current.writeln("  version  - Show terminal version");
        terminal.current.writeln("  history  - Show command history");
        break;
      case "clear":
        terminal.current.clear();
        break;
      case "version":
        terminal.current.writeln("\r\nTerminal v1.0.0");
        break;
      case "history":
        terminal.current.writeln("\r\nCommand history:");
        commandHistory.forEach((cmd, i) => {
          terminal.current.writeln(`  ${i + 1}: ${cmd}`);
        });
        break;
      case "":
        // Just show a new prompt for empty commands
        break;
      default:
        if (command.trim().toLowerCase().startsWith("echo ")) {
          const message = command.trim().substring(5);
          terminal.current.writeln(`\r\n${message}`);
        } else {
          terminal.current.writeln(`\r\nCommand not found: ${command}`);
          terminal.current.writeln("Type 'help' for available commands.");
        }
    }

    terminal.current.write("\r\n\x1b[36m> \x1b[0m");
  };

  // Handle input submission
  const handleSubmit = (e) => {
    e.preventDefault();
    executeCommand(inputValue);
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

  return (
    <div className="w-full h-full p-2 flex flex-col">
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
