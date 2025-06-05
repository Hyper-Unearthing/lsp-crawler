import {
  insertFileNode,
  insertMethodNode,
  createRelationship,
  insertClassNode,
} from "./database.js";
import SymbolProcessor, { SymbolKind } from "./symbol_parser.js";

async function insertSymbol(symbol, parentSymbol = null, file) {
  // Use symbol enum to decide which persist method to use
  switch (symbol.kind) {
    case SymbolKind.Class:
      await insertClassNode(symbol);
      await createRelationship(file.id, symbol.id, "DECLARES");
      break;

    case SymbolKind.Method:
    case SymbolKind.Function:
    case SymbolKind.Constructor:
      await insertMethodNode(symbol);
      if (parentSymbol?.kind === SymbolKind.Class) {
        await createRelationship(parentSymbol.id, symbol.id, "HAS");
      } else {
        await createRelationship(file.id, symbol.id, "DECLARES");
      }
      break;

    default:
      // For other symbol types, we might add more cases in the future
      break;
  }

  // Recursively process children
  if (symbol.children && symbol.children.length > 0) {
    for (const child of symbol.children) {
      await insertSymbol(child, symbol, file);
    }
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
    const language = this.lspSugar.language;
    const symbolProcessor = new SymbolProcessor(source, logger, language);
    let rawSymbols = await this.lspSugar.getDocumentSymbols(uri);
    let symbols = await symbolProcessor.processSymbols(rawSymbols);
    symbols = symbols.filter(Boolean);

    const fileNode = {
      uri: uri,
      name: relativePath,
      id: relativePath,
      language: language,
    };

    await insertFileNode(fileNode);

    // Process all symbols using the symbol enum to decide which persist method to use
    for (const symbol of symbols) {
      await insertSymbol(symbol, null, fileNode);
    }
  }
}
