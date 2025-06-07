import { spawn } from 'child_process';
import BaseServer from './base.js';

export default class RustServer extends BaseServer {
  spawnLspProcess(_logLevel = 1) {
    const serverCommand = 'rust-analyzer';
    const serverArgs = [];

    this.lspProcess = spawn(serverCommand, serverArgs, {
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  }
}
