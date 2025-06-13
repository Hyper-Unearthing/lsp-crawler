import path from "path";
import { findSupportedFiles } from "./file_utils.js";
import LspClient from "./lsp-client.js";
import FileCrawler from "./file-crawler.js";
import { loadCustomConfig } from "./language-config.js";

export default class WorkspaceCrawler {
  constructor({ rootDir, logger, db, configPath }) {
    this.rootDir = path.resolve(rootDir);
    this.logger = logger;
    this.db = db;
    this.configPath = configPath;
    this.languageConfig = null;
  }

  async crawl(files) {
    // Load language configuration
    try {
      this.languageConfig = loadCustomConfig(this.configPath);
      if (this.configPath) {
        this.logger.info(`Loaded custom language config from: ${this.configPath}`);
      }
    } catch (error) {
      this.logger.error(`Failed to load custom config: ${error.message}`);
      throw error;
    }

    const filesByLanguageHash = findSupportedFiles(this.rootDir);

    for (const language in filesByLanguageHash) {
      await this.processLanguage(
        language,
        filesByLanguageHash[language],
        this.logger,
        this.db
      );
    }
  }

  async processLanguage(language, files, logger, db) {
    const lspClient = new LspClient({
      language,
      logger,
      rootPath: this.rootDir,
      languageConfig: this.languageConfig,
    });

    await lspClient.connect();
    for (const file of files) {
      await lspClient.notifyFileOpen(file.uri, file.source);
    }

    for (const file of files) {
      await new FileCrawler(file, this.logger, lspClient, this.db).crawl();
    }

    this.logger.info("Finding all inserted methods");
    const { methodByFileMap, methods } = await this.db.findAllMethods(language);

    this.logger.info("Finding all method references");
    const methodsAndReferences = await Promise.all(
      methods.map(async (method) => {
        const result = await lspClient.findAllReferences(method, method.file);
        const mappedReferences = result
          .filter((reference) => reference && reference.uri) // Filter out undefined references
          .map((reference) => {
            const candidateMethods = (
              methodByFileMap[reference.uri] || []
            ).filter((method) => {
              return (
                reference.uri == method.file &&
                reference.range.start.line >= method.range.start.line &&
                reference.range.start.line <= method.range.end.line
              );
            });

            // Find the nearest match (method with the closest start line to the reference)
            return candidateMethods.reduce((nearest, current) => {
              if (!nearest) return current;
              const nearestDistance =
                reference.range.start.line - nearest.range.start.line;
              const currentDistance =
                reference.range.start.line - current.range.start.line;
              return currentDistance < nearestDistance ? current : nearest;
            }, null);
          });

        return {
          method,
          references: result,
          mappedReferences,
        };
      })
    );

    this.logger.info("Linking all method references in database");
    for (let i = 0; i < methodsAndReferences.length; i++) {
      const methodAndReference = methodsAndReferences[i];
      for (const reference of methodAndReference.mappedReferences) {
        if (reference) {
          await this.db.createRelationship(
            reference.id,
            methodAndReference.method.id,
            "CALLS"
          );
        }
      }
    }
    await lspClient.shutdown();
  }
}
