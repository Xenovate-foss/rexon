import decompress from "decompress";
import fs from "fs";

/**
 * Extracts an archive file to a specified directory
 * @param {string} archivePath - Path to the archive file
 * @param {string} extractPath - Path where files should be extracted
 * @param {Object} options - Additional options
 * @returns {Promise<Array>} - Promise resolving to array of extracted files
 */
export async function extractArchive(archivePath, extractPath, options = {}) {
  try {
    // Validate inputs
    if (!fs.existsSync(archivePath)) {
      throw new Error(`Archive file not found: ${archivePath}`);
    }

    // Create extraction directory if it doesn't exist
    fs.mkdirSync(extractPath, { recursive: true });

    // Default options
    const defaultOptions = {
      filter: (file) =>
        !file.path.startsWith("__MACOSX") && !file.path.startsWith("."),
      map: (file) => file,
    };

    // Merge options
    const mergedOptions = { ...defaultOptions, ...options };

    // Extract the archive
    const files = await decompress(archivePath, extractPath, mergedOptions);

    console.log(
      `Successfully extracted ${files.length} files to ${extractPath}`
    );
    return files;
  } catch (error) {
    console.error(`Extraction failed: ${error.message}`);
    throw error;
  }
}
