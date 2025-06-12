import Logger from "./src/logger.js";
import LspClient from "./src/lsp-client.js";
import Database from "./src/database.js";
import { findSupportedFiles } from "./src/file_utils.js";
import FileCrawler from "./src/file-crawler.js";

async function crawl() {
  const logger = new Logger({ level: "info" });
  const db = new Database({ logger });
  await db.deleteNodes();

  const rootPath = process.argv[2];

  const filesByLanguageHash = findSupportedFiles(rootPath);

  for (const language in filesByLanguageHash) {
    await processLanguage(language, filesByLanguageHash[language], logger, db);
  }

  console.log("done");
}

async function processLanguage(language, files, logger, db) {
  const lspClient = new LspClient({
    language,
    logger,
    rootPath: process.argv[2],
  });

  await lspClient.connect();
  for (const file of files) {
    await lspClient.notifyFileOpen(file.uri, file.source);
  }

  for (const file of files) {
    await new FileCrawler(file, logger, lspClient, db).crawl();
  }

  logger.info("Finding all inserted methods");
  const { methodByFileMap, methods } = await db.findAllMethods(language);

  logger.info("Finding all method references");
  const methodsAndReferences = await Promise.all(
    methods.map(async (method) => {
      const result = await lspClient.findAllReferences(method, method.file);
      const mappedReferences = result.map((reference) => {
        /**
         * this will break for child methods potentially
         * function myFunc(arr) {
         *  return arr.map(YourFunc)
         * }
         *  yourFunc reference call will match to both myFunc and YourFunc since we are
         *  just comparing if it is within the range of the method, and we are not managing child
         *  references
         */
        return (methodByFileMap[reference.uri] || []).find((method) => {
          return (
            reference.uri == method.file &&
            reference.range.start.line > method.range.start.line &&
            reference.range.start.line < method.range.end.line
          );
        });
      });
      return {
        method,
        references: result,
        mappedReferences,
      };
    })
  ).catch((err) => logger.error(err));

  logger.info("Linking all method references in database");
  for (let i = 0; i < methodsAndReferences.length; i++) {
    const methodAndReference = methodsAndReferences[i];
    for (const reference of methodAndReference.mappedReferences) {
      if (reference) {
        await db.createRelationship(
          reference.id,
          methodAndReference.method.id,
          "CALLS"
        );
      }
    }
  }
  lspClient.shutdown();
}
await crawl();
