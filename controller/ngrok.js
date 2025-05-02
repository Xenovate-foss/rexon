import ngrok from '@ngrok/ngrok';
import config from "../config.json" with {type: "json"};
import mcProperties from "../utils/mcPropertise.js";
import express from 'express';
import fs from 'fs';

const router = express.Router();
let tunnelUrl;
let listener;

/**
 * Starts an ngrok tunnel to the Minecraft server
 * @returns {Promise<string>} The URL of the established tunnel
 */
async function startTunnel() {
  try {
    // Parse the server properties file to get the port
    const properties = await mcProperties.parse(
      fs.readFileSync("./server/server.properties", "utf-8")
    );
    const port = properties["server-port"] || 25565;
    
    // Establish connectivity
    listener = await ngrok.forward({ 
      addr: port, 
      authtoken: config.ngrokToken,
      proto: 'tcp' 
    });

    // Output ngrok url to console & save on variable
    tunnelUrl = listener.url();
    console.log(`Ingress established at: ${tunnelUrl}`);
    
    return tunnelUrl;
  } catch (error) {
    console.error("Failed to start ngrok tunnel:", error);
    throw error;
  }
}

/**
 * Stops the active ngrok tunnel
 * @returns {Promise<void>}
 */
async function stopTunnel() {
  try {
    if (listener) {
      await listener.close();
    }
    await ngrok.disconnect();
    listener = null
    tunnelUrl = null;
    console.log("Tunnel closed successfully");
  } catch (error) {
    tunnelUrl = null
    console.error("Error closing the tunnel:", error);
    throw error;
  }
}

// API Endpoints
router.get('/tunnel/status', (req, res) => {
  res.json({
    active: !!listener,
    url: tunnelUrl || null
  });
});

router.post('/tunnel/start', async (req, res) => {
  try {
    if (listener) {
      return res.status(400).json({ 
        success: false, 
        message: 'Tunnel is already active' 
      });
    }
    
    const url = await startTunnel();
    res.json({ 
      success: true, 
      url: url 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

router.post('/tunnel/stop', async (req, res) => {
  try {
    if (!listener) {
      return res.status(400).json({ 
        success: false, 
        message: 'No active tunnel to stop' 
      });
    }
    
    await stopTunnel();
    res.json({ 
      success: true, 
      message: 'Tunnel closed successfully' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

export { router, startTunnel, stopTunnel };