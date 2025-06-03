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
  constructor(source, logger) {
    this.source = source;
    this.logger = logger;
    this.lines = source.split("\n");
  }

  /**
   * Process symbols to build code structure
   */
  processSymbols(symbols) {
    // Process each symbol
    return symbols.map((symbol) => {
      return this.processSymbol(symbol);
    });
  }

  /**
   * Process a single symbol
   */
  async processSymbol(symbol, parentSymbol = null) {
    const symbolKind = symbol.kind;

    switch (symbolKind) {
      case SymbolKind.Class:
        return await this.processClass(symbol);

      case SymbolKind.Method:
      case SymbolKind.Function:
      case SymbolKind.Constructor:
        return await this.processMethod(symbol, parentSymbol);
    }
  }

  /**
   * Process a class symbol
   */
  async processClass(symbol) {
    const className = symbol.name;
    const sourceText = this.extractSourceTextFromRange(symbol.range);
    const methodPromises = (symbol.children || []).map((child) => {
      if (
        child.kind === SymbolKind.Method ||
        child.kind === SymbolKind.Constructor
      ) {
        return this.processMethod(child, symbol);
      }
    });
    return {
      name: className,
      kind: symbol.kind,
      range: symbol.range,
      source: sourceText,
      identifier: await this.buildIdentifier(sourceText),
      methods: await Promise.all(methodPromises),
    };
  }

  /**
   * Process a method or function symbol
   */
  async processMethod(symbol, parentSymbol) {
    const methodName = symbol.name;
    const sourceText = this.extractSourceTextFromRange(symbol.range);
    // Create method info
    return {
      name: methodName,
      range: symbol.range,
      kind: symbol.kind,
      source: sourceText,
      identifier: await this.buildIdentifier(sourceText),
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
