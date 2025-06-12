import SymbolProcessor, { SymbolKind } from "./symbol_parser.js";

export default class FileCrawler {
  constructor(file, logger, lspSugar, db) {
    this.file = file;
    this.logger = logger;
    this.lspSugar = lspSugar;
    this.db = db;
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

    await this.db.insertFileNode(fileNode);
    // Process all symbols using the symbol enum to decide which persist method to use
    for (const symbol of symbols) {
      await this.insertSymbol(symbol, null, fileNode);
    }
  }

  async insertSymbol(symbol, parentSymbol = null, file) {
    // Use symbol enum to decide which persist method to use
    switch (symbol.kind) {
      case SymbolKind.Class:
        await this.db.insertClassNode(symbol);
        await this.db.createRelationship(file.id, symbol.id, "DECLARES");
        break;

      case SymbolKind.Method:
      case SymbolKind.Function:
      case SymbolKind.Constructor:
        await this.db.insertMethodNode({ ...symbol, fileUri: file.uri });
        if (parentSymbol?.kind === SymbolKind.Class) {
          await this.db.createRelationship(parentSymbol.id, symbol.id, "HAS");
        } else if (
          [
            SymbolKind.Method,
            SymbolKind.Function,
            SymbolKind.Constructor,
          ].includes(parentSymbol?.kind)
        ) {
          await this.db.createRelationship(parentSymbol.id, symbol.id, "CALLS");
        } else {
          await this.db.createRelationship(file.id, symbol.id, "DECLARES");
        }
        break;

      default:
        // For other symbol types, we might add more cases in the future
        break;
    }

    // Recursively process children
    if (symbol.children && symbol.children.length > 0) {
      for (const child of symbol.children) {
        await this.insertSymbol(child, symbol, file);
      }
    }
  }
}
