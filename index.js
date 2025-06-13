import Logger from "./src/logger.js";
import Database from "./src/database.js";
import WorkspaceCrawler from "./src/workspace-crawler.js";

const logger = new Logger({ level: "info" });
const db = new Database({ logger });
await db.deleteNodes();

const rootPath = process.argv[2];
const configPath = process.argv[3]; // Optional config file path

const workspaceCrawler = new WorkspaceCrawler({
  rootDir: rootPath,
  logger,
  db,
  configPath,
});

await workspaceCrawler.crawl();
await db.close();
