import path from "path";
import { findSupportedFiles } from "./file_utils.js";
import LspClient from "./lsp-client.js";
import FileCrawler from "./file-crawler.js";

export default class WorkspaceCrawler {
  constructor({ rootDir, logger, db }) {
    this.rootDir = path.resolve(rootDir);
    console.log(this.rootDir);
    this.logger = logger;
    this.db = db;
  }

  async crawl(files) {
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
            const containingMethods = (
              methodByFileMap[reference.uri] || []
            ).filter((method) => {
              return (
                reference.uri == method.file &&
                reference.range.start.line >= method.range.start.line &&
                reference.range.start.line <= method.range.end.line
              );
            });

            // If multiple methods contain the reference, choose the most specific (smallest range)
            const containingMethod = containingMethods.reduce(
              (mostSpecific, current) => {
                if (!mostSpecific) return current;

                const currentSize =
                  current.range.end.line - current.range.start.line;
                const mostSpecificSize =
                  mostSpecific.range.end.line - mostSpecific.range.start.line;

                return currentSize < mostSpecificSize ? current : mostSpecific;
              },
              null
            );

            return containingMethod;
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
