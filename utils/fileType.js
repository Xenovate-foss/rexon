import fs from "fs/promises";
import path from "path";

/**
 * Checks if a file is an archive based on file extension and magic numbers
 * @param {string} filePath - Path to the file to check
 * @returns {Promise<boolean>} - True if the file is an archive
 */
export async function isArchiveFile(filePath) {
  try {
    // Common archive file extensions
    const archiveExtensions = [
      ".zip",
      ".rar",
      ".tar",
      ".gz",
      ".7z",
      ".iso",
      ".bz2",
      ".xz",
      ".tgz",
      ".tbz2",
      ".txz",
      ".jar",
      ".war",
      ".ear",
      ".apk",
      ".cab",
      ".lzh",
      ".arj",
    ];

    // Check file extension (quick check)
    const ext = path.extname(filePath).toLowerCase();
    const fullName = path.basename(filePath).toLowerCase();

    // Check compound extensions
    const compoundExtensions = [".tar.gz", ".tar.bz2", ".tar.xz"];
    for (const compoundExt of compoundExtensions) {
      if (fullName.endsWith(compoundExt)) {
        return true;
      }
    }

    // Quick check for common extensions
    if (archiveExtensions.includes(ext)) {
      return true;
    }

    // Read magic numbers (more reliable but slower)
    try {
      const fileHandle = await fs.open(filePath, "r");
      const buffer = Buffer.alloc(16); // Read first 16 bytes for signatures

      const { bytesRead } = await fileHandle.read(buffer, 0, 16, 0);
      await fileHandle.close();

      // If file is too small, not an archive
      if (bytesRead < 2) {
        return false;
      }

      // Check magic numbers for various archive formats

      // ZIP (also JAR, WAR, EPUB, APK, etc.)
      if (buffer[0] === 0x50 && buffer[1] === 0x4b) {
        return true;
      }

      // RAR
      if (
        buffer[0] === 0x52 &&
        buffer[1] === 0x61 &&
        buffer[2] === 0x72 &&
        buffer[3] === 0x21 &&
        buffer[4] === 0x1a &&
        buffer[5] === 0x07
      ) {
        return true;
      }

      // GZIP
      if (buffer[0] === 0x1f && buffer[1] === 0x8b) {
        return true;
      }

      // 7Z
      if (
        buffer[0] === 0x37 &&
        buffer[1] === 0x7a &&
        buffer[2] === 0xbc &&
        buffer[3] === 0xaf &&
        buffer[4] === 0x27 &&
        buffer[5] === 0x1c
      ) {
        return true;
      }

      // BZIP2
      if (buffer[0] === 0x42 && buffer[1] === 0x5a && buffer[2] === 0x68) {
        return true;
      }

      // XZ
      if (
        buffer[0] === 0xfd &&
        buffer[1] === 0x37 &&
        buffer[2] === 0x7a &&
        buffer[3] === 0x58 &&
        buffer[4] === 0x5a &&
        buffer[5] === 0x00
      ) {
        return true;
      }

      // Check for TAR (USTAR format) - signature at offset 257
      if (ext === ".tar" || fullName.includes(".tar.")) {
        try {
          const tarFileHandle = await fs.open(filePath, "r");
          const tarBuffer = Buffer.alloc(8);

          // Try to read at offset 257 where "ustar" signature should be
          const { bytesRead: tarBytesRead } = await tarFileHandle.read(
            tarBuffer,
            0,
            8,
            257
          );
          await tarFileHandle.close();

          if (
            tarBytesRead >= 5 &&
            tarBuffer[0] === 0x75 && // u
            tarBuffer[1] === 0x73 && // s
            tarBuffer[2] === 0x74 && // t
            tarBuffer[3] === 0x61 && // a
            tarBuffer[4] === 0x72
          ) {
            // r
            return true;
          }
        } catch (tarErr) {
          // If we can't read at offset 257, file is too small to be a valid tar
        }
      }

      // ISO 9660 - Check for "CD001" at offset 32769
      if (ext === ".iso") {
        try {
          const isoFileHandle = await fs.open(filePath, "r");
          const isoBuffer = Buffer.alloc(5);

          // Try to read at offset 32769 where "CD001" signature should be
          const { bytesRead: isoBytesRead } = await isoFileHandle.read(
            isoBuffer,
            0,
            5,
            32769
          );
          await isoFileHandle.close();

          if (
            isoBytesRead === 5 &&
            isoBuffer[0] === 0x43 && // C
            isoBuffer[1] === 0x44 && // D
            isoBuffer[2] === 0x30 && // 0
            isoBuffer[3] === 0x30 && // 0
            isoBuffer[4] === 0x31
          ) {
            // 1
            return true;
          }
        } catch (isoErr) {
          // If we can't read at offset 32769, file is too small to be a valid ISO
        }
      }

      return false;
    } catch (fileReadError) {
      // If there's an error reading the file, fall back to extension check
      console.error(
        `Error reading file ${filePath} for archive detection:`,
        fileReadError
      );
      return (
        archiveExtensions.includes(ext) ||
        compoundExtensions.some((cext) => fullName.endsWith(cext))
      );
    }
  } catch (error) {
    console.error(`Error checking if file ${filePath} is an archive:`, error);
    return false; // Return false on any error
  }
}

/**
 * Synchronous version for use in contexts where async isn't possible
 * @param {string} filePath - Path to the file to check
 * @returns {boolean} - True if the file is an archive
 */
export function isArchiveFileSync(filePath) {
  try {
    // Common archive file extensions
    const archiveExtensions = [
      ".zip",
      ".rar",
      ".tar",
      ".gz",
      ".7z",
      ".iso",
      ".bz2",
      ".xz",
      ".tgz",
      ".tbz2",
      ".txz",
      ".jar",
      ".war",
      ".ear",
      ".apk",
      ".cab",
      ".lzh",
      ".arj",
    ];

    // Check file extension (quick check)
    const ext = path.extname(filePath).toLowerCase();
    const fullName = path.basename(filePath).toLowerCase();

    // Quick check for compound extensions
    const compoundExtensions = [".tar.gz", ".tar.bz2", ".tar.xz"];
    for (const compoundExt of compoundExtensions) {
      if (fullName.endsWith(compoundExt)) {
        return true;
      }
    }

    // Check for common extensions
    if (archiveExtensions.includes(ext)) {
      return true;
    }

    // Read magic numbers (more reliable but slower)
    try {
      const fd = fs.openSync(filePath, "r");
      const buffer = Buffer.alloc(16);

      const bytesRead = fs.readSync(fd, buffer, 0, 16, 0);
      fs.closeSync(fd);

      // If file is too small, not an archive
      if (bytesRead < 2) {
        return false;
      }

      // Check signatures (same as in async version)
      // ZIP
      if (buffer[0] === 0x50 && buffer[1] === 0x4b) {
        return true;
      }

      // RAR
      if (
        buffer[0] === 0x52 &&
        buffer[1] === 0x61 &&
        buffer[2] === 0x72 &&
        buffer[3] === 0x21 &&
        buffer[4] === 0x1a &&
        buffer[5] === 0x07
      ) {
        return true;
      }

      // GZIP
      if (buffer[0] === 0x1f && buffer[1] === 0x8b) {
        return true;
      }

      // 7Z
      if (
        buffer[0] === 0x37 &&
        buffer[1] === 0x7a &&
        buffer[2] === 0xbc &&
        buffer[3] === 0xaf &&
        buffer[4] === 0x27 &&
        buffer[5] === 0x1c
      ) {
        return true;
      }

      // BZIP2
      if (buffer[0] === 0x42 && buffer[1] === 0x5a && buffer[2] === 0x68) {
        return true;
      }

      // XZ
      if (
        buffer[0] === 0xfd &&
        buffer[1] === 0x37 &&
        buffer[2] === 0x7a &&
        buffer[3] === 0x58 &&
        buffer[4] === 0x5a &&
        buffer[5] === 0x00
      ) {
        return true;
      }

      return false;
    } catch (fileReadError) {
      // Fall back to extension check
      return (
        archiveExtensions.includes(ext) ||
        compoundExtensions.some((cext) => fullName.endsWith(cext))
      );
    }
  } catch (error) {
    console.error(`Error checking if file ${filePath} is an archive:`, error);
    return false;
  }
}
