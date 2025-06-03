export default class BaseServer {
  constructor(logger) {
    this.lspProcess = null;
    this.buffer = "";
    this.requestId = 0;
    this.pendingRequests = new Map();
    this.logger = logger;
  }

  start(logLevel = 1) {
    this.spawnLspProcess(logLevel);
    this.lspProcess.on("error", (err) => {
      console.log(err);
      console.error(`LSP process error: ${err.message}`);
      console.error("You may need to install the language server with:");
      console.error(`  ${installCmd}`);
      socket.end();
    });

    this.lspProcess.on("exit", (code, signal) => {
      console.log(`LSP process exited with code ${code} and signal ${signal}`);
      this.shutdown();
    });

    this.lspProcess.stderr.on("data", (data) => {
      console.error(`LSP stderr: ${data.toString()}`);
    });

    this.lspProcess.stdout.on("data", (data) => {
      this.buffer += data.toString();
      this.processBuffer();
    });
  }
  async initialize() {
    const params = {
      processId: process.pid,
      rootUri: this.rootPath,
      capabilities: {
        textDocument: {
          documentSymbol: {
            symbolKind: {
              valueSet: Array.from({ length: 26 }, (_, i) => i + 1), // All symbol kinds
            },
            hierarchicalDocumentSymbolSupport: true,
          },
          references: {
            dynamicRegistration: true,
          },
          definition: {
            dynamicRegistration: true,
          },
          callHierarchy: {
            dynamicRegistration: true,
          },
          prepareCallHierarchy: {
            dynamicRegistration: true,
          },
        },
      },
    };

    const response = await this.sendRequest("initialize", params);
    this.logger.info("LSP server initialized successfully");

    // Log server capabilities
    if (response.result && response.result.capabilities) {
      this.logger.info("Server capabilities:");

      // Check specifically for call hierarchy capabilities
      const capabilities = response.result.capabilities;
      if (capabilities.callHierarchyProvider) {
        this.logger.info("Call hierarchy supported");
      } else {
        this.logger.warn("Call hierarchy not supported by the server");
      }
    }

    this.sendNotification("initialized");

    return response;
  }

  processBuffer() {
    while (true) {
      const headerMatch = this.buffer.match(/Content-Length: (\d+)\r\n\r\n/);
      if (!headerMatch) break;

      const contentLength = parseInt(headerMatch[1], 10);
      const headerEnd = headerMatch.index + headerMatch[0].length;

      if (this.buffer.length < headerEnd + contentLength) break;

      const content = this.buffer.substring(
        headerEnd,
        headerEnd + contentLength
      );
      this.buffer = this.buffer.substring(headerEnd + contentLength);

      try {
        const message = JSON.parse(content);

        this.handleMessage(message);
      } catch (err) {
        this.logger.error(`Error parsing message: ${err.message}`);
      }
    }
  }

  handleMessage(message) {
    this.logger.debug(`Received message: ${JSON.stringify(message)}`);

    if ("id" in message) {
      // This is a response to a request
      const requestId = message.id;
      if (this.pendingRequests.has(requestId)) {
        const { resolve, reject } = this.pendingRequests.get(requestId);

        if ("error" in message) {
          reject(new Error(message.error.message || "Unknown LSP error"));
        } else {
          resolve(message);
        }

        this.pendingRequests.delete(requestId);
      } else {
        this.logger.warn(
          `Received response for unknown request ID: ${requestId}`
        );
      }
    } else if ("method" in message) {
      // This is a notification from server
      this.logger.debug(`Received notification: ${message.method}`);
      this.handleNotification(message);
    }
  }

  handleNotification(notification) {
    const method = notification.method;

    switch (method) {
      case "window/logMessage":
        const level = notification.params?.type || 1;
        const logMessage = notification.params?.message || "Unknown message";

        const logLevel = ["ERROR", "WARN", "INFO", "DEBUG"][level - 1] || "LOG";
        this.logger.info(`[LSP ${logLevel}] ${logMessage}`);
        break;

      case "window/showMessage":
        const message = notification.params?.message || "Unknown message";
        this.logger.info(`[LSP MESSAGE] ${message}`);
        break;

      // Add more notification handlers as needed
    }
  }

  shutdown() {
    this.lspProcess.kill();
  }

  sendNotification(method, params) {
    const request = {
      jsonrpc: "2.0",
      method,
      params,
    };
    const requestText = JSON.stringify(request);
    const message = `Content-Length: ${Buffer.byteLength(
      requestText,
      "utf8"
    )}\r\n\r\n${requestText}`;
    this.lspProcess.stdin.write(message);
  }

  sendRequest(method, params) {
    const id = this.requestId++;
    const request = {
      jsonrpc: "2.0",
      id: id,
      method,
      params,
    };
    const requestText = JSON.stringify(request);
    const message = `Content-Length: ${Buffer.byteLength(
      requestText,
      "utf8"
    )}\r\n\r\n${requestText}`;
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });

      this.lspProcess.stdin.write(message);

      // Set a timeout for the request
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`Request timeout: ${method}`));
        }
      }, 30000); // 30 seconds timeout
    });
  }
}
