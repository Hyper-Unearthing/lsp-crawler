import fs from "fs";
import path from "path";
import { URI } from "vscode-uri";

/**
 * Parse .gitignore file and return array of patterns
 * @param {string} gitignorePath - Path to .gitignore file
 * @returns {Array} - Array of ignore patterns
 */
function parseGitignore(gitignorePath) {
  if (!fs.existsSync(gitignorePath)) {
    return [];
  }

  const content = fs.readFileSync(gitignorePath, "utf8");
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((pattern) => {
      // Convert gitignore patterns to regex-like patterns
      return pattern
        .replace(/\*\*/g, ".*")
        .replace(/\*/g, "[^/]*")
        .replace(/\?/g, "[^/]");
    });
}

/**
 * Check if a path should be ignored based on gitignore patterns
 * @param {string} filePath - The file path to check
 * @param {string} rootPath - The root directory path
 * @param {Array} ignorePatterns - Array of ignore patterns
 * @returns {boolean} - True if the file should be ignored
 */
function shouldIgnore(filePath, rootPath, ignorePatterns) {
  const relativePath = path.relative(rootPath, filePath);
  const normalizedPath = relativePath.replace(/\\/g, "/");

  return ignorePatterns.some((pattern) => {
    const regex = new RegExp(`${pattern}`);
    return (
      regex.test(normalizedPath) || regex.test(path.basename(normalizedPath))
    );
  });
}

/**
 * Recursively searches for JavaScript files in a directory and creates relative paths
 * @param {string} rootPath - The root directory to search in
 * @returns {Array} - Array of file objects with uri, relativePath, and source
 */
export function findSupportedFiles(
  rootPath,
  supportedExtensions = {
    ".js": "typescript",
    ".ts": "typescript",
  }
) {
  const result = {};
  const normalizedRootPath = path.normalize(rootPath);
  const gitignorePath = path.join(normalizedRootPath, ".gitignore");
  const ignorePatterns = parseGitignore(gitignorePath);

  function searchDirectory(currentPath) {
    if (currentPath.includes(".git")) {
      return [];
    }
    const files = fs.readdirSync(currentPath);

    for (const file of files) {
      const filePath = path.join(currentPath, file);
      // Skip if file/directory should be ignored
      if (shouldIgnore(filePath, rootPath, ignorePatterns)) {
        continue;
      }
      const stats = fs.statSync(filePath);

      if (stats.isDirectory()) {
        // Recursively search subdirectories
        searchDirectory(filePath);
      } else {
        // Check if file extension is supported
        const fileExtension = path.extname(file);
        const language = supportedExtensions[fileExtension];

        if (language) {
          // Initialize language array if it doesn't exist
          if (!result[language]) {
            result[language] = [];
          }

          // Create file object and add to appropriate language array
          const absolutePath = path.resolve(filePath);
          const fileObj = {
            uri: URI.file(absolutePath).toString(),
            relativePath: path.relative(normalizedRootPath, absolutePath),
            source: fs.readFileSync(absolutePath, "utf8"),
          };
          result[language].push(fileObj);
        }
      }
    }
  }

  searchDirectory(normalizedRootPath);
  return result;
}
