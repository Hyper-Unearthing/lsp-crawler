/**
 * Simple logger utility
 */
export default class Logger {
  constructor(options = {}) {
    this.level = options.level || "info";
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3,
    };
  }

  /**
   * Check if the given level is enabled
   */
  isLevelEnabled(level) {
    return this.levels[level] <= this.levels[this.level];
  }

  /**
   * Format a log message
   */
  formatMessage(level, message) {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  }

  /**
   * Log an error message
   */
  error(message, error) {
    this.writeLog("error", message);
    if (error) {
      this.writeLog("error", error.stack);
    }
  }

  /**
   * Log a warning message
   */
  warn(message) {
    this.writeLog("warn", message);
  }

  /**
   * Log an info message
   */
  info(message) {
    this.writeLog("info", message);
  }

  /**
   * Log a debug message
   */
  debug(message) {
    this.writeLog("debug", message);
  }

  writeLog(level, message) {
    if (this.isLevelEnabled(level)) {
      const consoleMethod = console[level];
      consoleMethod(this.formatMessage(level, message));
    }
  }
}
