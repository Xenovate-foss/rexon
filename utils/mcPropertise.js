/**
 * Minecraft Server Properties Parser
 *
 * A utility for converting between server.properties format and JavaScript objects
 */

import { promises as fs } from "fs";

export const MinecraftProperties = {
  /**
   * Converts a server.properties string to a JavaScript object
   * @param {string} propertiesString - Content of the server.properties file
   * @returns {object} - Parsed properties as a JavaScript object
   */
  parse(propertiesString) {
    const result = {};
    const lines = propertiesString.split("\n");

    for (const line of lines) {
      // Skip empty lines and comments
      if (!line.trim() || line.trim().startsWith("#")) continue;

      // Split at the first equals sign
      const separatorIndex = line.indexOf("=");
      if (separatorIndex !== -1) {
        const key = line.substring(0, separatorIndex).trim();
        const value = line.substring(separatorIndex + 1).trim();

        // Convert values to appropriate types
        if (value === "true" || value === "false") {
          result[key] = value === "true";
        } else if (!isNaN(value) && value !== "") {
          // Convert to number if possible
          if (value.includes(".")) {
            result[key] = parseFloat(value);
          } else {
            result[key] = parseInt(value, 10);
          }
        } else {
          result[key] = value;
        }
      }
    }

    return result;
  },

  /**
   * Converts a JavaScript object to server.properties format
   * @param {object} obj - JavaScript object with server properties
   * @param {string} [comment] - Optional comment to add at the top of the file
   * @returns {string} - Formatted server.properties content
   */
  stringify(obj, comment = "# Minecraft server properties") {
    let result = comment + "\n";
    const timestamp = new Date().toISOString();
    result += `#${timestamp}\n`;

    // Sort keys alphabetically (common in server.properties files)
    const keys = Object.keys(obj).sort();

    for (const key of keys) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        result += `${key}=${obj[key]}\n`;
      }
    }

    return result;
  },

  /**
   * Reads a server.properties file and returns a JavaScript object
   * @param {string} filePath - Path to the server.properties file
   * @returns {Promise<object>} - Promise resolving to the parsed properties
   */
  async readFromFile(filePath) {
    try {
      const data = await fs.readFile(filePath, "utf8");
      return this.parse(data);
    } catch (error) {
      throw new Error(`Failed to read server.properties: ${error.message}`);
    }
  },

  /**
   * Writes a JavaScript object to a server.properties file
   * @param {string} filePath - Path to write the server.properties file
   * @param {object} obj - JavaScript object with server properties
   * @returns {Promise<void>} - Promise resolving when file is written
   */
  async writeToFile(filePath, obj) {
    try {
      const data = this.stringify(obj);
      await fs.writeFile(filePath, data, "utf8");
    } catch (error) {
      throw new Error(`Failed to write server.properties: ${error.message}`);
    }
  },
};

export default MinecraftProperties;
