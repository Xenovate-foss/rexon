import { exec } from "child_process";
import os from "os";
import util from "util";
const execPromise = util.promisify(exec);

async function getSystemInfo() {
  try {
    // Get disk information based on OS
    let diskInfo;
    if (process.platform === "win32") {
      const { stdout } = await execPromise(
        "wmic logicaldisk get caption,freespace,size"
      );
      diskInfo = parseWindowsDiskInfo(stdout);
    } else {
      const { stdout } = await execPromise("df -h /");
      diskInfo = parseUnixDiskInfo(stdout);
    }

    // Get RAM information
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const ramUsagePercent = ((usedMem / totalMem) * 100).toFixed(2);

    // Create the complete system info object
    const systemInfo = {
      disk: {
        total: diskInfo.total,
        available: diskInfo.available,
        used: diskInfo.used,
        usagePercent: diskInfo.usagePercent,
      },
      ram: {
        total: formatBytes(totalMem),
        free: formatBytes(freeMem),
        used: formatBytes(usedMem),
        usagePercent: ramUsagePercent,
      },
    };

    return systemInfo;
  } catch (error) {
    console.error("Error getting system information:", error);
    throw error;
  }
}

function parseWindowsDiskInfo(stdout) {
  const lines = stdout.trim().split("\n");
  const headers = lines[0].trim().split(/\s+/);
  const values = lines[1].trim().split(/\s+/);

  const freeSpace = parseInt(values[1]);
  const size = parseInt(values[2]);
  const used = size - freeSpace;

  return {
    total: formatBytes(size),
    available: formatBytes(freeSpace),
    used: formatBytes(used),
    usagePercent: ((used / size) * 100).toFixed(2),
  };
}

function parseUnixDiskInfo(stdout) {
  const lines = stdout.trim().split("\n");
  const parts = lines[1].trim().split(/\s+/);

  return {
    total: parts[1],
    used: parts[2],
    available: parts[3],
    usagePercent: parts[4].replace("%", ""),
  };
}

function formatBytes(bytes) {
  if (bytes === 0) return "0 Bytes";

  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));

  return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + " " + sizes[i];
}

// Example usage
/*getSystemInfo()
  .then((info) => {
    console.log("System Information:");
    console.log(JSON.stringify(info, null, 2));
  })
  .catch((err) => {
    console.error("Failed to get system information:", err);
  });
*/
export default getSystemInfo;
