// Symbol kinds as defined in the LSP specification
export const SymbolKind = {
  File: 1,
  Module: 2,
  Namespace: 3,
  Package: 4,
  Class: 5,
  Method: 6,
  Property: 7,
  Field: 8,
  Constructor: 9,
  Enum: 10,
  Interface: 11,
  Function: 12,
  Variable: 13,
  Constant: 14,
  String: 15,
  Number: 16,
  Boolean: 17,
  Array: 18,
  Object: 19,
  Key: 20,
  Null: 21,
  EnumMember: 22,
  Struct: 23,
  Event: 24,
  Operator: 25,
  TypeParameter: 26,
};

export default class SymbolProcessor {
  constructor(source, logger, language) {
    this.source = source;
    this.logger = logger;
    this.language = language;
    this.lines = source.split("\n");
  }

  /**
   * Process symbols to build code structure
   */
  async processSymbols(symbols) {
    // Process each symbol and track parent relationships
    const results = [];
    for (const symbol of symbols) {
      const processed = await this.processSymbolWithParent(symbol, null);
      if (processed) {
        results.push(processed);
      }
    }
    return results;
  }

  /**
   * Process symbol while maintaining parent relationship
   */
  async processSymbolWithParent(symbol, parent) {
    // Set parent reference for qualified name building
    symbol.parent = parent;

    const processedSymbol = await this.processSymbol(symbol, parent);

    // If this symbol has children, process them with this symbol as parent
    if (symbol.children && symbol.children.length > 0) {
      for (const child of symbol.children) {
        const processedChild = await this.processSymbolWithParent(
          child,
          symbol
        );
        if (processedChild) {
          processedSymbol.children.push(processedChild);
        }
      }
    }

    return processedSymbol;
  }

  /**
   * Process a single symbol
   */
  async processSymbol(symbol, parentSymbol = null) {
    const symbolKind = symbol.kind;
    let parsedSymbol = null;

    switch (symbolKind) {
      case SymbolKind.Class:
        parsedSymbol = await this.processClass(symbol, parentSymbol);
        break;

      case SymbolKind.Method:
      case SymbolKind.Function:
      case SymbolKind.Constructor:
        parsedSymbol = await this.processMethod(symbol, parentSymbol);
        break;

      case SymbolKind.Module:
      case SymbolKind.Namespace:
        parsedSymbol = await this.processModule(symbol, parentSymbol);
        break;

      default:
        // For other symbol types, create a basic processed symbol
        parsedSymbol = {
          name: symbol.name,
          kind: symbol.kind,
          range: symbol.range,
          language: this.language,
        };
        break;
    }

    if (!parsedSymbol) {
      return null;
    }

    const sourceText = this.extractSourceTextFromRange(symbol.range);
    return {
      ...parsedSymbol,
      id: await this.buildIdentifier(sourceText),
      source: sourceText,
      language: this.language,
      children: [],
    };
  }

  /**
   * Process a class symbol
   */
  async processClass(symbol, parentSymbol = null) {
    const className = symbol.name;

    return {
      name: this.buildQualifiedName(className, parentSymbol),
      kind: symbol.kind,
      range: symbol.range,
      children: [],
      language: this.language,
    };
  }

  /**
   * Process a module or namespace symbol
   */
  async processModule(symbol, parentSymbol = null) {
    const moduleName = symbol.name;

    return {
      name: this.buildQualifiedName(moduleName, parentSymbol),
      kind: symbol.kind,
      range: symbol.range,
      language: this.language,
    };
  }

  /**
   * Build qualified class name (e.g., "Clients#ClaudeClient#OverloadError")
   */
  buildQualifiedName(symbolName, parentSymbol) {
    if (!parentSymbol) {
      return symbolName;
    }

    // Build parent chain
    const parentChain = [];
    let current = parentSymbol;

    while (current) {
      if (
        [SymbolKind.Class, SymbolKind.Module, SymbolKind.Namespace].includes(
          current.kind
        )
      ) {
        parentChain.unshift(current.name);
      }
      current = current.parent;
    }

    return parentChain.length > 0
      ? `${parentChain.join("#")}#${symbolName}`
      : symbolName;
  }

  /**
   * Process a method or function symbol
   */
  async processMethod(symbol, parentSymbol) {
    const methodName = symbol.name;
    return {
      name: methodName,
      range: symbol.range,
      kind: symbol.kind,
    };
  }

  async buildIdentifier(symbolContent) {
    const msgBuffer = new TextEncoder("utf-8").encode(symbolContent);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return hashHex;
  }

  extractSourceTextFromRange(range) {
    const startLine = range.start.line;
    const endLine = range.end.line;

    // Extract the relevant lines
    const relevantLines = this.lines.slice(startLine, endLine + 1);

    // If the range is a single line, extract the exact text
    if (startLine === endLine) {
      const startChar = range.start.character;
      const endChar = range.end.character;
      return relevantLines[0].substring(startChar, endChar);
    }

    // Otherwise, return the full lines with leading/trailing whitespace removed
    return relevantLines.map((line) => line.trim()).join("\n");
  }
}
