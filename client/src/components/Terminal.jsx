import React, { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import "@xterm/xterm/css/xterm.css";

const XTerminal = () => {
  const terminalRef = useRef(null);
  const terminal = useRef(null);
  const fitAddonRef = useRef(null);

  useEffect(() => {
    // Only initialize if not already initialized
    if (terminal.current) return;

    console.log("Initializing terminal...");

    try {
      terminal.current = new Terminal({
        cursorBlink: true,
        fontFamily: "monospace",
        fontSize: 14,
        theme: {
          background: "#000000",
          foreground: "#FFFFFF",
          cursor: "#0000FF",
          selection: "#0000FF88",
        },
        rendererType: "canvas", // Try explicitly setting renderer
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
        }, 100);  // Increased from 10ms to 100ms

        terminal.current.writeln("\x1b[97m[\x1b[31mDemon\x1b[97m]\x1b[0m: Connecting...");
        terminal.current.writeln("\x1b[97m[\x1b[31mDemon\x1b[97m]\x1b[0m: Connected.");

        terminal.current.onData((data) => {
          if (terminal.current) {
            terminal.current.write(data);
          }
        });

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

  return (
    <div className="w-full h-full p-2" style={{ display: "flex", flexDirection: "column" }}>
      <div className="mb-2">
      </div>
      <div
        ref={terminalRef}
        style={{
          width: "100%",
          height: "100%",
          minHeight: "300px",
          borderRadius: "0.5rem",
          position: "relative",
        }}
        className="bg-black text-white border-2 border-blue-500 overflow-hidden flex-grow"
      />
    </div>
  );
};

export default XTerminal;