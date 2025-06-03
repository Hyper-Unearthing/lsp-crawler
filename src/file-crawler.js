import {
  insertFileNode,
  insertMethodNode,
  createRelationship,
  insertClassNode,
} from "./database.js";
import SymbolProcessor, { SymbolKind } from "./symbol_parser.js";

async function insertClass(symbol, file) {
  await insertClassNode(symbol);
  await createRelationship(file.id, symbol.identifier, "DECLARES");
  for (const method of symbol.methods) {
    await insertMethodNode(method);
    await createRelationship(symbol.identifier, method.identifier, "HAS");
  }
}

export default class FileCrawler {
  constructor(file, logger, lspSugar) {
    this.file = file;
    this.logger = logger;
    this.lspSugar = lspSugar;
  }

  async crawl() {
    const { source, uri, relativePath } = this.file;
    const logger = this.logger;
    const symbolProcessor = new SymbolProcessor(source, logger);
    let rawSymbols = await this.lspSugar.getDocumentSymbols(uri);
    let symbols = await Promise.all(symbolProcessor.processSymbols(rawSymbols));

    const fileNode = {
      uri: uri,
      name: relativePath,
      id: relativePath,
    };

    await insertFileNode(fileNode);

    for (const symbol of symbols) {
      if (symbol.kind === SymbolKind.Class) {
        await insertClass(symbol, fileNode);
        for (const method of symbol.methods) {
          // await this.lspSugar.findAllReferences(method, uri);
        }
      } else if (
        symbol.kind === SymbolKind.Method ||
        symbol.kind === SymbolKind.Function
      ) {
        // await this.lspSugar.findAllReferences(symbol, uri);
        await insertMethodNode(symbol);
        await createRelationship(fileNode.id, symbol.identifier, "DECLARES");
      }
    }
  }
}
