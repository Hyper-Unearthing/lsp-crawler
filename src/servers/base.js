import { spawn } from "child_process";
import path from "path";
import os from "os";

export default class BaseServer {
  constructor(logger, rootPath, serverCommand, serverArgs) {
    this.lspProcess = null;
    this.buffer = "";
    this.requestId = 0;
    this.pendingRequests = new Map();
    this.activeTimeouts = new Set();
    this.logger = logger;
    this.rootPath = `file://${rootPath}`;
    this.serverCommand = serverCommand;
    this.serverArgs = serverArgs || [];
  }

  start(logLevel = 1) {
    this.spawnLspProcess();
    this.lspProcess.on("error", (err) => {
      console.log(err);
      console.error(`LSP process error: ${err.message}`);
    });

    this.lspProcess.on("exit", (code, signal) => {
      console.log(`LSP process exited with code ${code} and signal ${signal}`);
    });

    this.lspProcess.stderr.on("data", (data) => {
      console.error(`LSP stderr: ${data.toString()}`);
    });

    this.lspProcess.stdout.on("data", (data) => {
      this.buffer += data.toString();
      this.processBuffer();
    });
  }

  spawnLspProcess() {
    const resolvedCommand = this.resolveServerCommand(this.serverCommand);
    this.lspProcess = spawn(resolvedCommand, this.serverArgs, {
      stdio: ["pipe", "pipe", "pipe"],
    });
  }

  resolveServerCommand(serverCommand) {
    // If it's a path (contains / or \ or starts with ~ or .), resolve it to absolute path
    if (serverCommand.includes('/') || serverCommand.includes('\\') || 
        serverCommand.startsWith('~') || serverCommand.startsWith('.')) {
      if (serverCommand.startsWith('~')) {
        return path.join(os.homedir(), serverCommand.slice(1));
      }
      return path.resolve(serverCommand);
    }
    // If it's just a command name, return as-is to be found in PATH
    return serverCommand;
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
        const { resolve, reject, timeout } =
          this.pendingRequests.get(requestId);

        if (timeout) {
          clearTimeout(timeout);
          this.activeTimeouts.delete(timeout);
        }

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

  async shutdown() {
    // Clear all pending timeouts
    this.activeTimeouts.forEach((timeout) => clearTimeout(timeout));
    this.activeTimeouts.clear();

    // Reject all pending requests
    this.pendingRequests.forEach(({ reject }) => {
      reject(new Error("LSP server is shutting down"));
    });
    this.pendingRequests.clear();

    try {
      await this.sendRequest("shutdown", {});
      this.sendNotification("exit", {});

      // Wait for process to exit gracefully
      await new Promise((resolve) => {
        if (this.lspProcess.killed || this.lspProcess.exitCode !== null) {
          resolve();
          return;
        }

        const timeout = setTimeout(() => {
          if (this.lspProcess && !this.lspProcess.killed) {
            this.lspProcess.kill("SIGTERM");
          }
          resolve();
        }, 2000);

        this.lspProcess.once("exit", () => {
          clearTimeout(timeout);
          resolve();
        });
      });
    } catch (error) {
      if (this.lspProcess && !this.lspProcess.killed) {
        this.lspProcess.kill("SIGTERM");
      }
    }
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
      // Set a timeout for the request
      const timeout = setTimeout(() => {
        this.activeTimeouts.delete(timeout);
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`Request timeout: ${method}`));
        }
      }, 30000); // 30 seconds timeout

      this.activeTimeouts.add(timeout);
      this.pendingRequests.set(id, { resolve, reject, timeout });

      this.lspProcess.stdin.write(message);
    });
  }
}
