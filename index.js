import Logger from "./src/logger.js";
import LspClient from "./src/lsp-client.js";
import {
  deleteNodes,
  findAllMethods,
  createRelationship,
} from "./src/database.js";
import { findJsFilesWithRelativePath } from "./src/file_utils.js";
import TypeScriptServer from "./src/servers/typescript.js";
import FileCrawler from "./src/file-crawler.js";

console.log();
await deleteNodes();
const logger = new Logger({ level: "debug" });
const server = new TypeScriptServer(logger);
server.start();
await server.initialize();

const lspClient = new LspClient({
  server,
  logger,
});

const rootPath = process.argv[2];

const jsFiles = findJsFilesWithRelativePath(rootPath);

for (const file of jsFiles) {
  await lspClient.notifyFileOpen(file.uri, file.source);
}

for (const file of jsFiles) {
  await new FileCrawler(file, logger, lspClient).crawl();
}

const methods = await findAllMethods();

const methodsAndReferences = await Promise.all(
  methods.map(async (method) => {
    const result = await lspClient.findAllReferences(method, method.file);
    const mappedReferences = result.map((reference) => {
      return methods.find((method) => {
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

for (let i = 0; i < methodsAndReferences.length; i++) {
  const methodAndReference = methodsAndReferences[i];
  for (const reference of methodAndReference.mappedReferences) {
    if (reference) {
      await createRelationship(
        reference.id,
        methodAndReference.method.id,
        "CALLS"
      );
    }
  }
}

let result = await lspClient.findAllReferences(methods[2], methods[2].file);
console.log("done");
server.shutdown();
