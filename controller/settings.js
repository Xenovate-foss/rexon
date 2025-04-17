import express from "express";
import fs from "node:fs";
import config from "../config.json" assert { type: "json" };

const router = express.Router();

router.get("/api/config", (req, res) => {
  res.json(config);
});

router.post("/api/config", (req, res) => {
  const newConfig = req.body;

  // Validate the new configuration if needed
  if (!newConfig) {
    return res.status(400).json({ error: "Invalid configuration data" });
  }

  try {
    // Write the new configuration to the file
    fs.writeFileSync("../config.json", JSON.stringify(newConfig, null, 2));

    // Update the in-memory config
    Object.assign(config, newConfig);

    // Return success response
    res.status(200).json({
      message: "Configuration updated successfully",
      config: newConfig,
    });
  } catch (error) {
    console.error("Error updating configuration:", error);
    res.status(500).json({ error: "Failed to update configuration" });
  }
});

export default router;
