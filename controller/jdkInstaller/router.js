import { Router } from 'express';
import { installJava } from './main.js';
import fs from "node:fs";

const router = Router();

router.post('/jdk/:version', (req, res) => {
  try {
    // Send response immediately
    res.status(200).json({ message: `Java ${req.params.version} installation started in background.` });
    if(fs.existsSync(".setup")) fs.unlink(".setup");

    // Run installation process asynchronously after response is sent
    process.nextTick(() => {
      try {
        installJava(req.params.version);
        if(fs.existsSync(".setup")) fs.unlinkSync(".setup");
        console.log(`Java ${req.params.version} installation completed successfully.`);
      } catch (err) {
        console.error(`Java installation error: ${err.message}`);
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router