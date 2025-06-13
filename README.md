# LSP Crawler

## Prerequisites

Install and run Memgraph database.

## Usage

Run the crawler on a project directory:

```bash
npm install
node index.js <path_to_your_project>
```

### Using Custom Configuration

You can provide a custom language configuration file:

```bash
node index.js <path_to_your_project> <path_to_config.json>
```

Visit memgraph url and view graph.

## Configuration

### Custom Language Configuration

You can override or add new language configurations by providing a JSON configuration file. The configuration maps file extensions to LSP server settings.

#### Example Custom Configuration

Create a `custom-config.json` file:

```json
{
  ".ts": {
    "serverCommand": "npx",
    "serverArgs": ["typescript-language-server", "--stdio", "--log-level", "2"],
    "languageId": "typescript"
  },
  ".py": {
    "serverCommand": "pylsp",
    "serverArgs": ["--verbose"],
    "languageId": "python"
  },
  ".kt": {
    "serverCommand": "kotlin-language-server",
    "serverArgs": [],
    "languageId": "kotlin"
  },
  ".swift": {
    "serverCommand": "sourcekit-lsp",
    "serverArgs": [],
    "languageId": "swift"
  }
}
```

#### Configuration Format

Each file extension maps to an object with:
- `serverCommand`: The LSP server executable command
- `serverArgs`: Array of arguments to pass to the server
- `languageId`: The language identifier for LSP protocol

Custom configurations are merged with defaults, with custom settings taking precedence.

### Default Supported Languages

The following languages are supported by default:

| Extension | Language | Server Command | Language ID |
|-----------|----------|----------------|-------------|
| `.ts`, `.js` | TypeScript/JavaScript | `npx typescript-language-server` | `typescript`/`javascript` |
| `.rb` | Ruby | `~/.asdf/shims/ruby-lsp` | `ruby` |
| `.rs` | Rust | `rust-analyzer` | `rust` |
| `.py` | Python | `python -m pylsp` | `python` |
| `.java` | Java | `java` | `java` |
| `.c` | C | `clangd` | `c` |
| `.cpp` | C++ | `clangd` | `cpp` |
| `.cs` | C# | `omnisharp` | `csharp` |
| `.go` | Go | `gopls` | `go` |
| `.php` | PHP | `intelephense --stdio` | `php` |

## Development

### Adding New Default Languages

To add a new language to the default configuration:

1. **Update `src/language-config.js`:**
   Add a new entry to the `defaultLanguageConfig` object:
   ```javascript
   '.newext': {
     serverCommand: 'language-server-command',
     serverArgs: ['--stdio', '--other-args'],
     languageId: 'newlanguage'
   }
   ```

2. **Update file detection (if needed):**
   Check `src/file_utils.js` to ensure the file extension is included in the supported extensions for file discovery.

3. **Install the Language Server:**
   Ensure the LSP server is installed and available in your system PATH.

### Requirements for LSP Servers

- Must support the Language Server Protocol (LSP)
- Should support `textDocument/documentSymbol` for finding symbols
- Should support `textDocument/references` for finding references
- Must accept stdin/stdout communication (usually via `--stdio` flag)
