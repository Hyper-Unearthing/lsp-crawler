#!/usr/bin/env node

import fs from "fs";
import path from "path";
import Database from "./src/database.js";
import Logger from "./src/logger.js";
import WorkspaceCrawler from "./src/workspace-crawler.js";

async function generateNodeJson() {
  const outputPath = path.resolve(process.argv[2]);
  const logger = new Logger({ level: "info" });
  const db = new Database({ logger });
  if (!outputPath) {
    logger.error("Usage: node generate-nodes.js <output-path>");
    process.exit(1);
  }

  try {
    await db.deleteNodes();

    const workspaceCrawler = new WorkspaceCrawler({
      rootDir: outputPath,
      logger,
      db,
    });

    await workspaceCrawler.crawl();

    logger.info("Fetching all relationships from database...");
    const relationships = await db.findAllRelationships();

    logger.info(`Found ${relationships.length} relationships`);

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(
      `${outputPath}/relationships.json`,
      JSON.stringify(relationships, null, 2)
    );

    logger.info(`Relationships exported to ${outputPath}`);
  } catch (error) {
    // console.log(error);
    logger.error("Error generating node.json:", error);
    process.exit(1);
  } finally {
    await db.close();
  }
}

generateNodeJson();
