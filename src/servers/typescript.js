import { spawn } from "child_process";
import BaseServer from "./base.js";

export default class TypeScriptServer extends BaseServer {
  spawnLspProcess(logLevel = 1) {
    const serverCommand = "npx";
    const serverArgs = [
      "typescript-language-server",
      "--stdio",
      "--log-level",
      logLevel.toString(),
    ];

    this.lspProcess = spawn(serverCommand, serverArgs, {
      stdio: ["pipe", "pipe", "pipe"],
    });
  }
}
