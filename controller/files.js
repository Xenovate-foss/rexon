import { Router } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "node:url";
import crypto from "crypto"; // For generating unique IDs
import { isArchiveFileSync } from "../utils/fileType.js";
import { extractArchive } from "../utils/unarchiver.js";

const router = Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, "..", "server"); // Points to ./server

// Helper to generate a unique ID for files/folders
const generateId = (filePath) => {
  return crypto.createHash("md5").update(filePath).digest("hex");
};

// Helper to get file tree
function getFileTree(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  return entries.map((entry) => {
    const fullPath = path.join(dirPath, entry.name);
    const stats = fs.statSync(fullPath);
    const ext = path.extname(entry.name).toLowerCase();
    const relativePath = fullPath.slice(rootDir.length).replace(/\\/g, "/");

    const textExtensions = [
      ".txt",
      ".js",
      ".json",
      ".md",
      ".html",
      ".css",
      ".properties",
      ".yml",
      ".yaml",
      ".php",
      ".jsonld",
    ];
    const isBinary = !entry.isDirectory() && !textExtensions.includes(ext);

    const baseInfo = {
      id: generateId(fullPath), // Add unique ID
      name: entry.name,
      path: relativePath,
      fileType: entry.isDirectory() ? "folder" : "file",
    };

    if (entry.isDirectory()) {
      return baseInfo;
    }

    return {
      ...baseInfo,
      extension: ext.replace(".", ""),
      size: (stats.size / 1024 / 1024).toFixed(1) + " MB",
      modifiedAt: new Date(stats.mtime).toISOString().split("T")[0],
      binary: isBinary,
      isArchive: isArchiveFileSync(fullPath),
    };
  });
}

// Helper to get absolute path
function getAbsolutePath(relativePath) {
  const normalizedPath = path
    .normalize(relativePath)
    .replace(/^(\.\.(\/|\\|$))+/, "");
  const absolutePath = path.join(rootDir, normalizedPath);

  if (!absolutePath.startsWith(rootDir)) {
    return null;
  }

  return absolutePath;
}

// List files in a directory
router.get("/files", (req, res) => {
  try {
    const requestedPath = req.query.path || "/";
    const targetPath = getAbsolutePath(requestedPath);

    if (!targetPath) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (!fs.existsSync(targetPath)) {
      return res.status(404).json({ error: "Path not found" });
    }

    const stats = fs.statSync(targetPath);
    if (!stats.isDirectory()) {
      return res.status(400).json({ error: "Not a directory" });
    }

    const files = getFileTree(targetPath);
    res.json(files);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get a single file or folder by path
router.get("/fileinfo", (req, res) => {
  try {
    const filePath = req.query.path;
    const absolutePath = getAbsolutePath(filePath);

    if (!absolutePath) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ error: "Path not found" });
    }

    const stats = fs.statSync(absolutePath);
    const ext = path.extname(absolutePath).toLowerCase();

    const textExtensions = [
      ".txt",
      ".js",
      ".json",
      ".md",
      ".html",
      ".css",
      ".properties",
      ".yml",
      ".yaml",
      ".php",
      ".jsonld",
    ];
    const isBinary = !stats.isDirectory() && !textExtensions.includes(ext);

    const fileInfo = {
      id: generateId(absolutePath),
      name: path.basename(absolutePath),
      path: filePath,
      fileType: stats.isDirectory() ? "folder" : "file",
    };

    if (!stats.isDirectory()) {
      fileInfo.extension = ext.replace(".", "");
      fileInfo.size = (stats.size / 1024 / 1024).toFixed(1) + " MB";
      fileInfo.modifiedAt = new Date(stats.mtime).toISOString().split("T")[0];
      fileInfo.binary = isBinary;

      if (!isBinary) {
        fileInfo.content = fs.readFileSync(absolutePath, "utf8");
      }
    }

    res.json(fileInfo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update file content
router.post("/updatefile", (req, res) => {
  try {
    const { content } = req.body;
    if (content === undefined) {
      return res.status(400).json({ error: "No content provided" });
    }

    const filePath = req.query.path;
    const absolutePath = getAbsolutePath(filePath);

    if (!absolutePath) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ error: "File not found" });
    }

    const stats = fs.statSync(absolutePath);
    if (stats.isDirectory()) {
      return res.status(400).json({ error: "Cannot update a directory" });
    }

    const ext = path.extname(absolutePath).toLowerCase();
    const textExtensions = [
      ".txt",
      ".js",
      ".json",
      ".md",
      ".html",
      ".css",
      ".properties",
      ".yml",
      ".yaml",
      ".php",
      ".jsonld",
    ];
    const isBinary = !textExtensions.includes(ext);

    if (isBinary) {
      return res
        .status(400)
        .json({ error: "Cannot update binary files through this endpoint" });
    }

    fs.writeFileSync(absolutePath, content, "utf8");
    res.json({ success: true, message: "File updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a file or folder
router.delete("/file", (req, res) => {
  try {
    const filePath = req.query.path;
    const absolutePath = getAbsolutePath(filePath);

    if (!absolutePath) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ error: "Path not found" });
    }

    const stats = fs.statSync(absolutePath);

    if (stats.isDirectory()) {
      fs.rmSync(absolutePath, { recursive: true, force: true });
    } else {
      fs.unlinkSync(absolutePath);
    }

    res.json({
      success: true,
      message: `${
        stats.isDirectory() ? "Folder" : "File"
      } deleted successfully`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Download a file
router.get("/file/download", (req, res) => {
  try {
    const filePath = req.query.path;
    const absolutePath = getAbsolutePath(filePath);

    if (!absolutePath) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ error: "File not found" });
    }

    const stats = fs.statSync(absolutePath);
    if (stats.isDirectory()) {
      return res.status(400).json({ error: "Cannot download a directory" });
    }

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${path.basename(absolutePath)}"`
    );
    res.setHeader("Content-Type", "application/octet-stream");

    const fileStream = fs.createReadStream(absolutePath);
    fileStream.pipe(res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upload a file
router.post("/file/upload", (req, res) => {
  try {
    if (!req.files || !req.files.files) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const file = req.files.files;
    const targetPath = req.body.path || "/";
    const absolutePath = getAbsolutePath(path.join(targetPath, file.name));

    if (!absolutePath) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Ensure the directory exists
    const dir = path.dirname(absolutePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Save the file
    fs.writeFileSync(absolutePath, file.data);
    res.json({ success: true, message: "File uploaded successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new folder
router.post("/folder/create", (req, res) => {
  try {
    const { name, path: targetPath } = req.body;
    if (!name || !targetPath) {
      return res.status(400).json({ error: "Name and path are required" });
    }

    const absolutePath = getAbsolutePath(path.join(targetPath, name));

    if (!absolutePath) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (fs.existsSync(absolutePath)) {
      return res.status(400).json({ error: "Folder already exists" });
    }

    fs.mkdirSync(absolutePath, { recursive: true });
    res.json({ success: true, message: "Folder created successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new file
router.post("/file/create", (req, res) => {
  try {
    const { name, path: targetPath, content = "" } = req.body;
    if (!name || !targetPath) {
      return res.status(400).json({ error: "Name and path are required" });
    }

    const absolutePath = getAbsolutePath(path.join(targetPath, name));

    if (!absolutePath) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (fs.existsSync(absolutePath)) {
      return res.status(400).json({ error: "File already exists" });
    }

    // Ensure the directory exists
    const dir = path.dirname(absolutePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(absolutePath, content, "utf8");
    res.json({ success: true, message: "File created successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Move a file or folder
router.post("/file/move", (req, res) => {
  try {
    const { sourcePath, destinationPath } = req.body;
    if (!sourcePath || !destinationPath) {
      return res
        .status(400)
        .json({ error: "Source and destination paths are required" });
    }

    const sourceAbsolutePath = getAbsolutePath(sourcePath);
    const destinationAbsolutePath = getAbsolutePath(destinationPath);

    if (!sourceAbsolutePath || !destinationAbsolutePath) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (!fs.existsSync(sourceAbsolutePath)) {
      return res.status(404).json({ error: "Source path not found" });
    }

    if (fs.existsSync(destinationAbsolutePath)) {
      return res.status(400).json({ error: "Destination path already exists" });
    }

    // Ensure the destination directory exists
    const destDir = path.dirname(destinationAbsolutePath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    fs.renameSync(sourceAbsolutePath, destinationAbsolutePath);
    res.json({ success: true, message: "Item moved successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/file/unarchive", (req, res) => {
  const { path } = req.query;
  let fullPath = `./server/${path}`;
  if (!path) {
    return res.status(400).json({ error: true, message: "No path specified" });
  }

  try {
    const isArchive = isArchiveFileSync(fullPath);
    if (!isArchive) {
      return res
        .status(400)
        .json({ error: true, message: "Not an archive file" });
    }

    // Get the directory where the archive is located
    const archiveDir = fullPath.substring(0, fullPath.lastIndexOf("/"));
    // Get just the filename without extension
    const archiveName = fullPath.split("/").pop().split(".")[0];
    // Create the full extraction path
    const extractionPath = `${archiveDir}/${archiveName}`;

    extractArchive(fullPath, extractionPath)
      .then((data) => {
        console.log(data);
        res.json({ success: true, message: "File extracted successfully" });
      })
      .catch((err) => {
        console.error("Extraction error:", err);
        res.status(500).json({
          error: true,
          message: `Extraction failed: ${err.message || err}`,
        });
      });
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({
      error: true,
      message: `Server error: ${error.message || error}`,
    });
  }
});

export default router;
