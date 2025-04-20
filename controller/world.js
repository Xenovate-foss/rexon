import { existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { Router } from "express";
import AdmZip from 'adm-zip';
import fs from 'fs';
import path from 'path';
import * as rimraf from 'rimraf';

const router = Router();

function findMinecraftWorlds(baseDir) {
  const results = [];
  
  // Simple function to check if directory exists
  function directoryExists(dirPath) {
    try {
      return existsSync(dirPath) && statSync(dirPath).isDirectory();
    } catch (err) {
      return false;
    }
  }
  
  // Function to check if a directory is a server directory
  function isServerDirectory(dirPath) {
    return existsSync(join(dirPath, 'server.properties'));
  }
  
  // Recursive function to scan directories
  function scanDirectory(dirPath) {
    try {
      if (isServerDirectory(dirPath)) {
        console.log(`Found server directory: ${dirPath}`);
        
        // Check for the three standard world folders
        const worldDir = join(dirPath, 'world');
        const netherDir = join(dirPath, 'world_nether');
        const endDir = join(dirPath, 'world_the_end');
        
        // Alternative nether/end folder names
        const altNetherDir = join(dirPath, 'world_the_nether');
        const altEndDir = join(dirPath, 'world_the_end');
        
        if (directoryExists(worldDir)) {
          results.push({ name: "world", overworld: true, nether: false, end: false });
          console.log("Found overworld: world");
        }
        
        // Check both possible nether folder names
        if (directoryExists(netherDir)) {
          results.push({ name: "world_nether", overworld: false, nether: true, end: false });
          console.log("Found nether: world_nether");
        } else if (directoryExists(altNetherDir)) {
          results.push({ name: "world_the_nether", overworld: false, nether: true, end: false });
          console.log("Found nether: world_the_nether");
        }
        
        // Check both possible end folder names
        if (directoryExists(endDir)) {
          results.push({ name: "world_the_end", overworld: false, nether: false, end: true });
          console.log("Found end: world_the_end");
        } else if (directoryExists(altEndDir) && altEndDir !== endDir) {
          results.push({ name: "world_the_end", overworld: false, nether: false, end: true });
          console.log("Found end: world_the_end");
        }
      }
      
      // Continue scanning subdirectories
      const entries = readdirSync(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const fullPath = join(dirPath, entry.name);
          scanDirectory(fullPath);
        }
      }
    } catch (error) {
      console.error(`Error scanning directory ${dirPath}:`, error);
    }
  }
  
  scanDirectory(baseDir);
  return results;
}

router.get("/worlds", (req, res) => {
    const worlds = findMinecraftWorlds("server");
    res.json(worlds);
});

// Delete a world folder
router.delete("/world/:worldFolder", (req, res) => {
    const worldFolder = req.params.worldFolder;
    const serverDir = "server";
    const worldPath = join(serverDir, worldFolder);
    
    // Validate the world folder name for security
    if (!worldFolder || worldFolder.includes('..') || !worldFolder.match(/^[a-zA-Z0-9_]+$/)) {
        return res.status(400).json({ error: "Invalid world folder name" });
    }
    
    // Check if the world folder exists
    if (!existsSync(worldPath) || !statSync(worldPath).isDirectory()) {
        return res.status(404).json({ error: "World folder not found" });
    }
    
    try {
        // Delete the world folder recursively
        rimraf.sync(worldPath);
        return res.json({ success: true, message: `World ${worldFolder} deleted successfully` });
    } catch (error) {
        console.error(`Error deleting world folder ${worldPath}:`, error);
        return res.status(500).json({ error: "Failed to delete world folder", details: error.message });
    }
});

// Upload a world zip and extract it
router.post("/world/:worldFolder", (req, res) => {
    if (!req.files || !req.files.worldZip) {
        return res.status(400).json({ error: "No world zip file uploaded" });
    }
    
    const worldFolder = req.params.worldFolder;
    const serverDir = "server";
    const worldPath = join(serverDir, worldFolder);
    
    // Validate the world folder name for security
    if (!worldFolder || worldFolder.includes('..') || !worldFolder.match(/^[a-zA-Z0-9_]+$/)) {
        return res.status(400).json({ error: "Invalid world folder name" });
    }
    
    try {
        const worldZip = req.files.worldZip;
        
        // Create temp directory for zip extraction
        const tempDir = path.join(process.cwd(), 'temp_extract');
        if (!existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        
        // Save the uploaded zip file to a temporary location
        const zipPath = path.join(tempDir, `${worldFolder}.zip`);
        worldZip.mv(zipPath, async (err) => {
            if (err) {
                console.error("Error saving zip file:", err);
                return res.status(500).json({ error: "Failed to save zip file", details: err.message });
            }
            
            try {
                // Extract the zip file
                const zip = new AdmZip(zipPath);
                
                // Check if the world folder already exists and remove it if it does
                if (existsSync(worldPath)) {
                    rimraf.sync(worldPath);
                }
                
                // Create the world folder
                fs.mkdirSync(worldPath, { recursive: true });
                
                // Extract to the world folder
                zip.extractAllTo(worldPath, true);
                
                // Clean up temporary files
                fs.unlinkSync(zipPath);
                
                // Scan for worlds after extraction to update the list
                const updatedWorlds = findMinecraftWorlds("server");
                
                return res.json({ 
                    success: true, 
                    message: `World ${worldFolder} uploaded and extracted successfully`,
                    worlds: updatedWorlds
                });
            } catch (extractError) {
                console.error("Error extracting zip file:", extractError);
                return res.status(500).json({ error: "Failed to extract zip file", details: extractError.message });
            }
        });
    } catch (error) {
        console.error(`Error handling world upload for ${worldPath}:`, error);
        return res.status(500).json({ error: "Failed to process world upload", details: error.message });
    }
});
router.get("/world/:worldFolder/download", (req, res) => {
    const worldFolder = req.params.worldFolder;
    const serverDir = "server";
    const worldPath = join(serverDir, worldFolder);
    
    // Validate the world folder name for security
    if (!worldFolder || worldFolder.includes('..') || !worldFolder.match(/^[a-zA-Z0-9_]+$/)) {
        return res.status(400).json({ error: "Invalid world folder name" });
    }
    
    // Check if the world folder exists
    if (!existsSync(worldPath) || !statSync(worldPath).isDirectory()) {
        return res.status(404).json({ error: "World folder not found" });
    }
    
    try {
        // Create a temporary zip file
        const tempDir = path.join(process.cwd(), 'temp_downloads');
        if (!existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        
        const zipFilePath = path.join(tempDir, `${worldFolder}.zip`);
        
        // Create a new zip file containing the world folder
        const zip = new AdmZip();
        
        // Add the entire world directory to the zip
        zip.addLocalFolder(worldPath, worldFolder);
        
        // Write the zip file
        zip.writeZip(zipFilePath);
        
        // Set headers for file download
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename=${worldFolder}.zip`);
        
        // Stream the file to the response
        const fileStream = fs.createReadStream(zipFilePath);
        fileStream.pipe(res);
        
        // Clean up the temporary file after sending
        fileStream.on('close', () => {
            try {
                fs.unlinkSync(zipFilePath);
            } catch (cleanupError) {
                console.error(`Error cleaning up temp file ${zipFilePath}:`, cleanupError);
            }
        });
    } catch (error) {
        console.error(`Error creating zip for world ${worldPath}:`, error);
        return res.status(500).json({ error: "Failed to create world download", details: error.message });
    }
});

export default router;