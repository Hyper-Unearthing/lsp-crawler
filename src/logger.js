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
  error(message) {
    if (this.isLevelEnabled("error")) {
      console.error(this.formatMessage("error", message));
      console.trace();
    }
  }

  /**
   * Log a warning message
   */
  warn(message) {
    if (this.isLevelEnabled("warn")) {
      console.warn(this.formatMessage("warn", message));
    }
  }

  /**
   * Log an info message
   */
  info(message) {
    if (this.isLevelEnabled("info")) {
      console.info(this.formatMessage("info", message));
    }
  }

  /**
   * Log a debug message
   */
  debug(message) {
    if (this.isLevelEnabled("debug")) {
      console.debug(this.formatMessage("debug", message));
    }
  }

  /**
   * Log an error message with stack trace
   */
  errorWithStack(message, error) {
    if (this.isLevelEnabled("error")) {
      const stackTrace = error && error.stack ? `\n${error.stack}` : "";
      console.error(this.formatMessage("error", `${message}${stackTrace}`));
    }
  }
}
