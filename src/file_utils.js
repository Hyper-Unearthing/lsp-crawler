import fs from "fs";
import path from "path";
import { URI } from "vscode-uri";

/**
 * Recursively searches for JavaScript files in a directory and its subdirectories
 * @param {string} rootPath - The root directory to search in
 * @returns {Array} - Array of file objects with uri, relativePath, and source
 */
export function findJsFiles(rootPath) {
  const result = [];

  function searchDirectory(currentPath) {
    const files = fs.readdirSync(currentPath);

    for (const file of files) {
      const filePath = path.join(currentPath, file);
      const stats = fs.statSync(filePath);

      if (stats.isDirectory()) {
        // Recursively search subdirectories
        searchDirectory(filePath);
      } else if (file.endsWith(".js")) {
        // Create hash object for JS files
        const fileObj = {
          uri: URI.file(filePath).toString(),
          relativePath: filePath,
          source: fs.readFileSync(filePath, "utf8"),
        };
        result.push(fileObj);
      }
    }
  }

  searchDirectory(rootPath);
  return result;
}

/**
 * Recursively searches for JavaScript files in a directory and creates relative paths
 * @param {string} rootPath - The root directory to search in
 * @returns {Array} - Array of file objects with uri, relativePath, and source
 */
export function findJsFilesWithRelativePath(rootPath) {
  const result = [];
  const normalizedRootPath = path.normalize(rootPath);

  function searchDirectory(currentPath) {
    const files = fs.readdirSync(currentPath);

    for (const file of files) {
      const filePath = path.join(currentPath, file);
      const stats = fs.statSync(filePath);

      if (stats.isDirectory()) {
        // Recursively search subdirectories
        searchDirectory(filePath);
      } else if (file.endsWith(".js")) {
        // Create hash object for JS files with relative path
        const absolutePath = path.resolve(filePath);
        const fileObj = {
          uri: URI.file(absolutePath).toString(),
          relativePath: path.relative(normalizedRootPath, absolutePath),
          source: fs.readFileSync(absolutePath, "utf8"),
        };
        result.push(fileObj);
      }
    }
  }

  searchDirectory(normalizedRootPath);
  return result;
}
