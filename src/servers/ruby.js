import { spawn } from "child_process";
import BaseServer from "./base.js";
import path from "path";
import os from "os";

export default class RubyServer extends BaseServer {
  spawnLspProcess(logLevel = 1) {
    const serverCommand = "~/.asdf/shims/ruby-lsp";
    const absolutePath = serverCommand.startsWith("~")
      ? path.join(os.homedir(), serverCommand.slice(1))
      : path.resolve(serverCommand);

    console.log(absolutePath);
    this.lspProcess = spawn(absolutePath, {
      stdio: ["pipe", "pipe", "pipe"],
    });
  }
}
