import { Router } from "express";
import axios from "axios";
import fs from "fs";
import path from "path";
import AdmZip from "adm-zip";

const router = Router();

/**
 * Downloads a specific version and build of Paper Minecraft server
 * @param {string} version - Minecraft version (e.g., "1.21.4")
 * @param {number} build - Paper build number (e.g., 226)
 * @param {string} [outputDir="./downloads"] - Directory to save the downloaded file
 * @returns {Promise<string>} - Path to the downloaded file
 */
async function downloadVersion(version, build, outputDir = "./../server") {
  // Create filename and URL
  const fileName = `paper-${version}-${build}.jar`;
  const url = `https://api.papermc.io/v2/projects/paper/versions/${version}/builds/${build}/downloads/${fileName}`;

  try {
    // Create directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, "server.jar");
    if (fs.existsSync(outputPath)) {
      if (fs.existsSync(outputPath + ".bak")) {
        fs.unlinkSync(outputPath + ".bak");
      }
      fs.renameSync(outputPath, outputPath + ".bak");
    }

    console.log(`Downloading ${fileName} from PaperMC...`);

    // Download the file with axios
    const response = await axios({
      url,
      method: "GET",
      responseType: "stream",
    });

    // Save the file to disk by piping the response to a write stream
    const writer = fs.createWriteStream(outputPath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on("finish", () => {
        console.log(`Successfully downloaded ${fileName} to ${outputPath}`);
        resolve(outputPath);
      });
      writer.on("error", (err) => {
        console.error(`Error writing file: ${err.message}`);
        reject(err);
      });
    });
  } catch (error) {
    console.error(`Failed to download file: ${error.message}`);
    throw error;
  }
}

/**
 * @route GET /api/version/latest/:mcVersion
 * @desc Get the latest build number for a specific Minecraft version
 */
router.get("/latest/:mcVersion", async (req, res) => {
  const { mcVersion } = req.params;

  try {
    const response = await axios.get(
      `https://api.papermc.io/v2/projects/paper/versions/${mcVersion}`
    );
    const builds = response.data.builds;
    const latestBuild = Math.max(...builds);

    res.json({ version: mcVersion, latestBuild });
  } catch (error) {
    console.error(`Failed to fetch latest build: ${error.message}`);
    res.status(500).json({ error: "Failed to fetch latest build information" });
  }
});

/**
 * @route GET /api/version/available
 * @desc Get all available Minecraft versions supported by Paper
 */
router.get("/available", async (req, res) => {
  try {
    const response = await axios.get(
      "https://api.papermc.io/v2/projects/paper"
    );
    res.json({ versions: response.data.versions });
  } catch (error) {
    console.error(`Failed to fetch available versions: ${error.message}`);
    res.status(500).json({ error: "Failed to fetch available versions" });
  }
});

/**
 * @route POST /api/version/download
 * @desc Download a specific version and build of Paper Minecraft server
 */
router.post("/download", async (req, res) => {
  const { version, build, outputDir } = req.body;

  if (!version || !build) {
    return res.status(400).json({ error: "Version and build are required" });
  }

  try {
    const filePath = await downloadVersion(version, build, outputDir);
    res.json({
      success: true,
      message: `Successfully downloaded Paper ${version} build ${build}`,
      filePath,
    });
  } catch (error) {
    console.error(`Download failed: ${error.message}`);
    res.status(500).json({
      success: false,
      error: "Failed to download server JAR",
      details: error.message,
    });
  }
});

/**
 * @route POST /api/version/download/latest/:mcVersion
 * @desc Download the latest build for a specific Minecraft version
 */
router.post("/download/latest/:mcVersion", async (req, res) => {
  const { mcVersion } = req.params;
  const { build } = req.body;

  try {
    // Download the latest build
    const filePath = await downloadVersion(mcVersion, build, "./server");

    res.json({
      success: true,
      message: `Successfully downloaded latest Paper ${mcVersion} (build ${build})`,
      version: mcVersion,
      build: build,
      filePath,
    });
  } catch (error) {
    console.error(`Download failed: ${error.message}`);
    res.status(500).json({
      success: false,
      error: "Failed to download latest server JAR",
      details: error.message,
    });
  }
});

/**
 * @route GET /api/version/current
 * @desc Get information about the currently installed server version (if any)
 */
router.get("/version/current", async (req, res) => {
  const serverDir = "./server";
  const jarPath = path.join(serverDir, "server.jar");

  try {
    if (fs.existsSync(jarPath)) {
      const zip = new AdmZip(jarPath);
      const jarJson = zip.getEntry("version.json");
      const jsonTextOfJar = zip.readAsText(jarJson);
      // Parse the JSON string into an object
      const versionData = JSON.parse(jsonTextOfJar);

      res.json({
        name: versionData.name,
        id: versionData.id,
        stable: versionData.stable,
      });
    } else {
      res.json({
        exists: false,
      });
    }
  } catch (error) {
    console.error(`Error checking current server: ${error.message}`);
    res
      .status(500)
      .json({ error: "Failed to check current server information" });
  }
});
export default router;
