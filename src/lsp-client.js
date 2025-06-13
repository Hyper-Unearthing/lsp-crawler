import path from "path";
import fs from "fs";
import BaseServer from "./servers/base.js";
import { getLanguageConfigByExtension, getLanguageConfigByLanguage, defaultLanguageConfig } from "./language-config.js";


export default class LspClient {
  constructor({ language, logger, rootPath, languageConfig = defaultLanguageConfig }) {
    this.language = language;
    this.logger = logger;
    this.rootPath = rootPath;
    this.languageConfig = languageConfig;
  }

  async connect() {
    const config = getLanguageConfigByLanguage(this.language, this.languageConfig);
    if (!config) {
      throw new Error(`Unsupported language: ${this.language}`);
    }
    
    this.server = new BaseServer(
      this.logger,
      this.rootPath,
      config.serverCommand,
      config.serverArgs
    );
    this.server.start();
    await this.server.initialize();
  }

  async shutdown() {
    await this.server.shutdown();
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
      this.logger.error(`Error getting document symbols: ${err.message}`, err);

      return [];
    }
  }

  async findAllReferences(targetMethod, fileUri) {
    const targetPosition = targetMethod.selectionRange.start;

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
      this.logger.error(
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
      this.logger.error(`Error getting semantic tokens: ${err.message}`, err);
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
      this.logger.error(
        `Error getting semantic tokens for range: ${err.message}`,
        err
      );
      return [];
    }
  }

  getLanguageId(filePath) {
    const config = getLanguageConfigByExtension(filePath, this.languageConfig);
    return config ? config.languageId : "plaintext";
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
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}
