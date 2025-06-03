import path from "path";
import fs from "fs";

export default class LspClient {
  constructor({ server, logger }) {
    this.server = server;
    this.logger = logger;
  }

  async getDocumentSymbols(filePath) {
    const params = {
      textDocument: {
        uri: filePath,
      },
    };

    try {
      const response = await this.server.sendRequest(
        "textDocument/documentSymbol",
        params
      );

      if (response && response.result) {
        this.logger.info(
          `Found ${response.result.length} symbols in ${filePath}`
        );
        return response.result;
      }

      this.logger.warn(`No symbols found in ${filePath}`);
      return [];
    } catch (err) {
      this.logger.errorWithStack(
        `Error getting document symbols: ${err.message}`,
        err
      );

      return [];
    }
  }

  async findAllReferences(targetMethod, fileUri) {
    const targetPosition = targetMethod.range.start;

    const params = {
      textDocument: {
        uri: fileUri,
      },
      position: targetPosition,
      context: {
        includeDeclaration: false, // We only want references, not the declaration
      },
    };

    try {
      const response = await this.server.sendRequest(
        "textDocument/references",
        params
      );

      if (response && response.result) {
        return response.result;
      }

      return [];
    } catch (err) {
      this.logger.errorWithStack(
        `Error finding references for method ${targetMethod.name}: ${err.message}`,
        err
      );
      return [];
    }
  }

  async getSemanticTokens(filePath) {
    const params = {
      textDocument: {
        uri: filePath,
      },
    };

    try {
      const response = await this.server.sendRequest(
        "textDocument/semanticTokens/full",
        params
      );

      if (response && response.result && response.result.data) {
        this.logger.info(
          `Found semantic tokens data in ${filePath} with ${response.result.data.length} elements`
        );
        return this.processSemanticTokens(response.result.data);
      }

      this.logger.warn(`No semantic tokens found in ${filePath}`);
      return [];
    } catch (err) {
      this.logger.errorWithStack(
        `Error getting semantic tokens: ${err.message}`,
        err
      );
      return [];
    }
  }

  async getSemanticTokensRange(range, filePath) {
    const params = {
      textDocument: {
        uri: filePath,
      },
      range,
    };

    try {
      const response = await this.server.sendRequest(
        "textDocument/semanticTokens/range",
        params
      );
      if (response && response.result && response.result.data) {
        this.logger.info(
          `Found semantic tokens data for range in ${filePath} with ${response.result.data.length} elements`
        );

        // Process the tokens
        const tokens = this.processSemanticTokens(response.result.data);

        // Read the source file content
        const fileContent = fs.readFileSync(this.absolutePath, "utf8");
        const lines = fileContent.split("\n");

        // Enhance tokens with actual source text
        return this.enhanceTokensWithSourceText(tokens, lines);
      }

      this.logger.warn(`No semantic tokens found in range for ${filePath}`);
      return [];
    } catch (err) {
      this.logger.errorWithStack(
        `Error getting semantic tokens for range: ${err.message}`,
        err
      );
      return [];
    }
  }

  getLanguageId(filePath) {
    const ext = path.extname(filePath).toLowerCase();

    switch (ext) {
      case ".js":
        return "javascript";
      case ".ts":
        return "typescript";
      case ".py":
        return "python";
      case ".rb":
        return "ruby";
      case ".java":
        return "java";
      case ".c":
        return "c";
      case ".cpp":
        return "cpp";
      case ".cs":
        return "csharp";
      case ".go":
        return "go";
      case ".php":
        return "php";
      default:
        return "plaintext";
    }
  }

  /**
   * Notify the LSP server that a file has been opened
   */
  async notifyFileOpen(filePath, fileContent) {
    const didOpenParams = {
      textDocument: {
        uri: filePath,
        languageId: this.getLanguageId(filePath),
        version: 1,
        text: fileContent,
      },
    };

    this.server.sendNotification("textDocument/didOpen", didOpenParams);
    // Give the server a moment to process the file
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}
