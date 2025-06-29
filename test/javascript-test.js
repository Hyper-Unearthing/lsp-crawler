import { test, describe } from "node:test";
import {
  assertAllRelationshipsFound,
  assertAllNodesFound,
} from "./utils/graph-assertions.js";
import WorkspaceCrawler from "../src/workspace-crawler.js";
import TestDatabase from "./utils/database.js";
import Logger from "./utils/logger.js";

function buildCrawler(rootDir) {
  const logger = new Logger({ level: "info" });
  const db = new TestDatabase();
  return new WorkspaceCrawler({
    rootDir: rootDir,
    logger: logger,
    db: db,
  });
}

describe("Graph tests", () => {
  test("Javascript", async () => {
    const rootDir = "examples/javascript";
    const workspaceCrawler = buildCrawler(rootDir);
    await workspaceCrawler.crawl();
    await assertAllNodesFound(
      workspaceCrawler.db,
      "examples/javascript/nodes.json"
    );
    await assertAllRelationshipsFound(
      workspaceCrawler.db,
      "examples/javascript/relationships.json"
    );
  });
  test("Typescript", async () => {
    const rootDir = "examples/typescript";
    const workspaceCrawler = buildCrawler(rootDir);
    await workspaceCrawler.crawl();
    await assertAllNodesFound(
      workspaceCrawler.db,
      "examples/typescript/nodes.json"
    );
    await assertAllRelationshipsFound(
      workspaceCrawler.db,
      "examples/typescript/relationships.json"
    );
  });
});
