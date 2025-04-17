import { Router } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const router = Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, "..", "server"); // points to ./server

function getFileTree(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  return entries.map((entry, index) => {
    const fullPath = path.join(dirPath, entry.name);
    const stats = fs.statSync(fullPath);
    const ext = path.extname(entry.name).toLowerCase();
    const isBinary =
      !entry.isDirectory() &&
      ![".txt", ".js", ".json", ".md", ".html", ".css"].includes(ext);

    if (entry.isDirectory()) {
      return {
        id: Date.now() + index,
        name: entry.name,
        fileType: "folder",
        children: getFileTree(fullPath),
      };
    }

    return {
      id: Date.now() + index,
      name: entry.name,
      fileType: "file",
      extension: ext.replace(".", ""),
      size: (stats.size / 1024 / 1024).toFixed(1) + " MB",
      modifiedAt: new Date(stats.mtime).toISOString().split("T")[0],
      binary: isBinary,
    };
  });
}

// Helper function to find a file/folder by ID in the file tree
function findItemById(tree, id) {
  for (const item of tree) {
    if (item.id.toString() === id.toString()) {
      return item;
    }

    if (item.children) {
      const found = findItemById(item.children, id);
      if (found) return found;
    }
  }
  return null;
}

// Helper function to get the absolute path from item
function getItemPath(item, tree) {
  if (!item) return null;

  // For files, we can directly construct the path
  if (item.fileType === "file") {
    // Need to find the parent folder structure
    // This is a simplified approach - in a real app you might need a more robust solution
    const parts = [];
    let currentItem = item;

    // Start with the item's name
    parts.unshift(currentItem.name);

    // Find parent folders by traversing the tree
    const findParents = (tree, targetItem, currentPath = []) => {
      for (const node of tree) {
        if (node.children) {
          for (const child of node.children) {
            if (child.id === targetItem.id) {
              return [...currentPath, node.name];
            }
          }

          const result = findParents(node.children, targetItem, [
            ...currentPath,
            node.name,
          ]);
          if (result) return result;
        }
      }
      return null;
    };

    const parentPath = findParents(tree, item) || [];
    return path.join(rootDir, ...parentPath, item.name);
  }

  // For folders
  if (item.fileType === "folder") {
    // Similar logic as above
    const parts = [item.name];
    // Find parent folders...
    return path.join(rootDir, ...parts);
  }

  return null;
}

router.get("/files", (req, res) => {
  try {
    const tree = getFileTree(rootDir);
    res.json(tree);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get a single file by ID
router.get("/files/:id", (req, res) => {
  try {
    const tree = getFileTree(rootDir);
    const item = findItemById(tree, req.params.id);

    if (!item) {
      return res.status(404).json({ error: "File or folder not found" });
    }

    if (item.fileType === "folder") {
      return res.json(item);
    }

    const filePath = getItemPath(item, tree);
    if (!filePath) {
      return res
        .status(404)
        .json({ error: "File path could not be determined" });
    }

    // For text files, return the content
    if (!item.binary) {
      const content = fs.readFileSync(filePath, "utf8");
      return res.json({ ...item, content });
    }

    // For binary files, just return the metadata
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update file content
router.post("/files/:id", (req, res) => {
  try {
    const { content } = req.body;
    if (content === undefined) {
      return res.status(400).json({ error: "No content provided" });
    }

    const tree = getFileTree(rootDir);
    const item = findItemById(tree, req.params.id);

    if (!item || item.fileType !== "file") {
      return res.status(404).json({ error: "File not found" });
    }

    const filePath = getItemPath(item, tree);
    if (!filePath) {
      return res
        .status(404)
        .json({ error: "File path could not be determined" });
    }

    // Don't allow updating binary files through this endpoint
    if (item.binary) {
      return res
        .status(400)
        .json({ error: "Cannot update binary files through this endpoint" });
    }

    fs.writeFileSync(filePath, content, "utf8");
    res.json({ success: true, message: "File updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a file or folder
router.delete("/files/:id", (req, res) => {
  try {
    const tree = getFileTree(rootDir);
    const item = findItemById(tree, req.params.id);

    if (!item) {
      return res.status(404).json({ error: "File or folder not found" });
    }

    const itemPath = getItemPath(item, tree);
    if (!itemPath) {
      return res
        .status(404)
        .json({ error: "File path could not be determined" });
    }

    if (item.fileType === "folder") {
      fs.rmdirSync(itemPath, { recursive: true });
    } else {
      fs.unlinkSync(itemPath);
    }

    res.json({
      success: true,
      message: `${
        item.fileType === "folder" ? "Folder" : "File"
      } deleted successfully`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Download a file
router.get("/files/:id/download", (req, res) => {
  try {
    const tree = getFileTree(rootDir);
    const item = findItemById(tree, req.params.id);

    if (!item || item.fileType !== "file") {
      return res.status(404).json({ error: "File not found" });
    }

    const filePath = getItemPath(item, tree);
    if (!filePath) {
      return res
        .status(404)
        .json({ error: "File path could not be determined" });
    }

    // Set appropriate headers for download
    res.setHeader("Content-Disposition", `attachment; filename="${item.name}"`);
    res.setHeader("Content-Type", "application/octet-stream");

    // Create read stream and pipe to response
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
