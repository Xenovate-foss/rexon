import axios from "axios";
import { Router } from "express";
import path from "node:path";
import fs from "node:fs";
import admZip from "adm-zip";
import yaml from "yaml";

const pluginFolder = path.resolve("server", "plugins");

const router = Router();

if (!fs.existsSync(pluginFolder)) {
  fs.mkdirSync("server");
  fs.mkdirSync(pluginFolder);
}

function getPluginInfo(jarFilePath) {
  try {
    // Check if file exists
    if (!fs.existsSync(jarFilePath)) {
      throw new Error(`File not found: ${jarFilePath}`);
    }

    // Create a new instance of AdmZip
    const zip = new admZip(jarFilePath);

    // Try to find the plugin.yml file
    const pluginYmlEntry =
      zip.getEntry("plugin.yml") ||
      zip.getEntry("paper-plugin.yml") ||
      zip.getEntry("spigot-plugin.yml") ||
      zip.getEntry("bukkit-plugin.yml");

    if (!pluginYmlEntry) {
      throw new Error(
        "plugin.yml not found in JAR file. This may not be a valid Minecraft plugin."
      );
    }

    // Extract the content of plugin.yml
    const pluginYmlContent = zip.readAsText(pluginYmlEntry);

    // Parse the YAML content
    const pluginData = yaml.parse(pluginYmlContent);

    return {
      name: pluginData.name || "Unknown",
      version: pluginData.version || "Unknown",
    };
  } catch (error) {
    throw new Error(`Error extracting plugin info: ${error.message}`);
  }
}

// read plugin folder for plugins jar and get it in a array
function getInstalledPlugins() {
  try {
    // Read the plugin directory
    const files = fs.readdirSync(pluginFolder);

    // Filter for .jar files and map them to plugin info
    const plugins = files
      .filter((file) => file.endsWith(".jar"))
      .map((file) => {
        const jarPath = path.join(pluginFolder, file);
        try {
          const pluginInfo = getPluginInfo(jarPath);
          return {
            filename: file,
            path: jarPath,
            ...pluginInfo,
          };
        } catch (error) {
          console.warn(`Failed to get info for ${file}: ${error.message}`);
          return {
            filename: file,
            path: jarPath,
            name: "Unknown",
            version: "Unknown",
            error: error.message,
          };
        }
      });

    return plugins;
  } catch (error) {
    console.error(`Error reading plugin directory: ${error.message}`);
    return [];
  }
}

router.get("/plugins", (req, res) => {
  res.json(getInstalledPlugins());
});

// Delete a plugin by jar file name
router.delete("/plugin/:jar", (req, res) => {
  const jarFileName = req.params.jar;

  if (!jarFileName) {
    return res
      .status(400)
      .json({ error: true, message: "No jar file name provided" });
  }

  try {
    const jarPath = path.join(pluginFolder, jarFileName);

    // Check if the jar file exists
    if (!fs.existsSync(jarPath)) {
      return res.status(404).json({ error: true, message: "Plugin not found" });
    }

    // Delete the jar file
    fs.unlinkSync(jarPath);

    return res
      .status(200)
      .json({ success: true, message: "Plugin deleted successfully" });
  } catch (error) {
    console.error(`Error deleting plugin: ${error.message}`);
    return res.status(500).json({
      error: true,
      message: `Failed to delete plugin: ${error.message}`,
    });
  }
});

// Upload a new plugin
router.post("/plugin", (req, res) => {
  try {
    // Check if a file was uploaded
    if (!req.files || !req.files.plugin) {
      return res
        .status(400)
        .json({ error: true, message: "No plugin file uploaded" });
    }

    const uploadedFile = req.files.plugin;

    // Validate that it's a jar file
    if (!uploadedFile.name.endsWith(".jar")) {
      return res
        .status(400)
        .json({ error: true, message: "File must be a JAR file" });
    }

    // Move the file to the plugins directory
    const targetPath = path.join(pluginFolder, uploadedFile.name);

    // Check if plugin with same name already exists
    if (fs.existsSync(targetPath)) {
      return res.status(409).json({
        error: true,
        message: "A plugin with this name already exists",
      });
    }

    // Save the file
    uploadedFile.mv(targetPath, (err) => {
      if (err) {
        return res.status(500).json({
          error: true,
          message: `Failed to save plugin: ${err.message}`,
        });
      }

      // Try to get plugin info
      try {
        const pluginInfo = getPluginInfo(targetPath);
        return res.status(201).json({
          success: true,
          message: "Plugin uploaded successfully",
          plugin: {
            filename: uploadedFile.name,
            path: targetPath,
            ...pluginInfo,
          },
        });
      } catch (error) {
        // If we can't get plugin info, return success but with a warning
        return res.status(201).json({
          success: true,
          warning: error.message,
          message: "Plugin uploaded, but may not be a valid Minecraft plugin",
          plugin: {
            filename: uploadedFile.name,
            path: targetPath,
          },
        });
      }
    });
  } catch (error) {
    console.error(`Error uploading plugin: ${error.message}`);
    return res.status(500).json({
      error: true,
      message: `Failed to upload plugin: ${error.message}`,
    });
  }
});

router.post("/addplugin/:slug", async (req, res) => {
  const { slug } = req.params;
  const version = req.body?.version; // Optional specific version ID

  try {
    // Fetch plugin information from Modrinth API
    const projectResponse = await axios.get(
      `https://api.modrinth.com/v2/project/${slug}`
    );
    const projectData = projectResponse.data;

    // Get project versions
    const versionsResponse = await axios.get(
      `https://api.modrinth.com/v2/project/${slug}/version`
    );
    const versions = versionsResponse.data;

    if (versions.length === 0) {
      return res.status(404).json({
        error: true,
        message: "No versions available for this plugin",
      });
    }

    // Determine which version to download
    let targetVersion;
    if (version) {
      // Use specified version if provided
      targetVersion = versions.find((v) => v.id === version);
      if (!targetVersion) {
        return res.status(404).json({
          error: true,
          message: "Specified version not found",
        });
      }
    } else {
      // Otherwise use the latest version
      // Sort by date and find the first one that supports Paper/Spigot/Bukkit
      targetVersion = versions
        .sort((a, b) => new Date(b.date_published) - new Date(a.date_published))
        .find(
          (v) =>
            v.loaders &&
            (v.loaders.includes("paper") ||
              v.loaders.includes("spigot") ||
              v.loaders.includes("bukkit"))
        );

      if (!targetVersion) {
        return res.status(400).json({
          error: true,
          message: "No compatible versions found for this plugin",
        });
      }
    }

    // Find the primary JAR file to download
    const fileToDownload = targetVersion.files.find(
      (file) => file.primary && file.filename.endsWith(".jar")
    );

    if (!fileToDownload) {
      return res.status(404).json({
        error: true,
        message: "No JAR file found in the version files",
      });
    }

    // Determine filename - use the original if possible
    const filename = fileToDownload.filename;
    const targetPath = path.join(pluginFolder, filename);

    // Check if plugin with same name already exists
    if (fs.existsSync(targetPath)) {
      return res.status(409).json({
        error: true,
        message: "A plugin with this name already exists",
      });
    }

    // Download the file
    const response = await axios({
      method: "get",
      url: fileToDownload.url,
      responseType: "stream",
    });

    // Save the downloaded file
    const writer = fs.createWriteStream(targetPath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on("finish", async () => {
        try {
          // Try to get plugin info
          const pluginInfo = getPluginInfo(targetPath);
          resolve(
            res.status(201).json({
              success: true,
              message: `Plugin ${projectData.title} downloaded and installed successfully`,
              plugin: {
                filename,
                path: targetPath,
                modrinthId: projectData.id,
                modrinthSlug: projectData.slug,
                versionId: targetVersion.id,
                ...pluginInfo,
              },
            })
          );
        } catch (error) {
          resolve(
            res.status(201).json({
              success: true,
              warning: error.message,
              message:
                "Plugin downloaded, but may not be a valid Minecraft plugin",
              plugin: {
                filename,
                path: targetPath,
                modrinthId: projectData.id,
                modrinthSlug: projectData.slug,
                versionId: targetVersion.id,
              },
            })
          );
        }
      });

      writer.on("error", (err) => {
        fs.unlinkSync(targetPath); // Clean up the partial file
        reject(
          res.status(500).json({
            error: true,
            message: `Failed to download plugin: ${err.message}`,
          })
        );
      });
    });
  } catch (error) {
    console.error(`Error adding plugin from Modrinth: ${error.message}`);
    return res.status(error.response?.status || 500).json({
      error: true,
      message: `Failed to add plugin from Modrinth: ${error.message}`,
    });
  }
});

export default router;
