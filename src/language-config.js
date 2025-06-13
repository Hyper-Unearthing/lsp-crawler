import path from "path";
import os from "os";
import fs from "fs";

export const defaultLanguageConfig = {
  '.ts': {
    serverCommand: 'npx',
    serverArgs: ['typescript-language-server', '--stdio', '--log-level', '1'],
    languageId: 'typescript'
  },
  '.js': {
    serverCommand: 'npx',
    serverArgs: ['typescript-language-server', '--stdio', '--log-level', '1'],
    languageId: 'javascript'
  },
  '.rb': {
    serverCommand: path.join(os.homedir(), '.asdf/shims/ruby-lsp'),
    serverArgs: [],
    languageId: 'ruby'
  },
  '.rs': {
    serverCommand: 'rust-analyzer',
    serverArgs: [],
    languageId: 'rust'
  },
  '.py': {
    serverCommand: 'python',
    serverArgs: ['-m', 'pylsp'],
    languageId: 'python'
  },
  '.java': {
    serverCommand: 'java',
    serverArgs: [],
    languageId: 'java'
  },
  '.c': {
    serverCommand: 'clangd',
    serverArgs: [],
    languageId: 'c'
  },
  '.cpp': {
    serverCommand: 'clangd',
    serverArgs: [],
    languageId: 'cpp'
  },
  '.cs': {
    serverCommand: 'omnisharp',
    serverArgs: [],
    languageId: 'csharp'
  },
  '.go': {
    serverCommand: 'gopls',
    serverArgs: [],
    languageId: 'go'
  },
  '.php': {
    serverCommand: 'intelephense',
    serverArgs: ['--stdio'],
    languageId: 'php'
  }
};

export function loadCustomConfig(configPath) {
  if (!configPath) {
    return defaultLanguageConfig;
  }

  try {
    if (!fs.existsSync(configPath)) {
      throw new Error(`Config file not found: ${configPath}`);
    }

    const configContent = fs.readFileSync(configPath, 'utf8');
    const customConfig = JSON.parse(configContent);
    
    // Merge custom config with default config (custom config takes precedence)
    return { ...defaultLanguageConfig, ...customConfig };
  } catch (error) {
    throw new Error(`Failed to load custom config from ${configPath}: ${error.message}`);
  }
}

export function getLanguageConfigByExtension(filePath, config = defaultLanguageConfig) {
  const ext = path.extname(filePath).toLowerCase();
  return config[ext] || null;
}

export function getLanguageConfigByLanguage(language, config = defaultLanguageConfig) {
  for (const [ext, langConfig] of Object.entries(config)) {
    if (langConfig.languageId === language) {
      return langConfig;
    }
  }
  return null;
}

export default defaultLanguageConfig;