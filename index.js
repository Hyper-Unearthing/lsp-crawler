import Logger from "./src/logger.js";
import Database from "./src/database.js";
import WorkspaceCrawler from "./src/workspace-crawler.js";

const logger = new Logger({ level: "info" });
const db = new Database({ logger });
await db.deleteNodes();
const rootPath = process.argv[2];
const workspaceCrawler = new WorkspaceCrawler({
  rootDir: rootPath,
  logger,
  db,
});

await workspaceCrawler.crawl();
