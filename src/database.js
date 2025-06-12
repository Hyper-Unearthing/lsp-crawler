import neo4j from "neo4j-driver";

export default class Database {
  constructor({
    uri = "bolt://localhost:7687",
    username = "",
    password = "",
    logger,
  }) {
    this.uri = uri;
    this.username = username;
    this.password = password;
    this.driver = neo4j.driver(
      this.uri,
      neo4j.auth.basic(this.username, this.password)
    );
  }

  getSession() {
    return this.driver.session();
  }

  async close() {
    await this.driver.close();
  }

  async deleteNodes() {
    const session = this.getSession();
    try {
      await session.run("MATCH (n) DETACH DELETE n");
    } finally {
      await session.close();
    }
  }

  async insertFileNode(file) {
    const session = this.getSession();
    try {
      await session.run(
        "MERGE (f:File {id: $id}) ON CREATE SET f.uri = $uri, f.name = $name, f.language = $language",
        {
          id: file.id,
          uri: file.uri,
          name: file.name,
          language: file.language,
        }
      );
    } finally {
      await session.close();
    }
  }

  async insertMethodNode(method) {
    const session = this.getSession();
    try {
      await session.run(
        "MERGE (m:Method {id: $id}) ON CREATE SET m.name = $name, m.range = $range, m.selectionRange = $selectionRange, m.source = $source, m.language = $language, m.fileUri = $fileUri",
        {
          id: method.id,
          name: method.name,
          range: JSON.stringify(method.range) || "",
          selectionRange: JSON.stringify(method.selectionRange) || "",
          source: method.source || "",
          language: method.language,
          fileUri: method.fileUri,
        }
      );
    } finally {
      await session.close();
    }
  }

  async insertClassNode(klass) {
    const session = this.getSession();
    try {
      await session.run(
        "MERGE (c:Class {id: $id}) ON CREATE SET c.name = $name, c.range = $range, c.source = $source, c.language = $language",
        {
          id: klass.id,
          name: klass.name,
          range: JSON.stringify(klass.range) || "",
          selectionRange: JSON.stringify(klass.selectionRange) || "",
          source: klass.source || "",
          language: klass.language,
        }
      );
    } finally {
      await session.close();
    }
  }

  async createRelationship(fromId, toId, type) {
    const session = this.getSession();
    try {
      await session.run(
        `MATCH (a {id: $fromId}), (b {id: $toId}) MERGE (a)-[:${type}]->(b)`,
        {
          fromId,
          toId,
        }
      );
    } finally {
      await session.close();
    }
  }

  async findAllMethods() {
    const session = this.getSession();
    try {
      const result = await session.run(`
        MATCH (m:Method)
        RETURN DISTINCT m.fileUri as file, m.name as name, m.range as range, m.selectionRange as selectionRange, m.id as id, m.language as language
        ORDER BY m.fileUri, m.name
      `);

      const files = {};
      const methods = [];
      result.records.forEach((record) => {
        const hash = record.toObject();
        const method = {
          ...hash,
          range: JSON.parse(hash.range),
          selectionRange: JSON.parse(hash.selectionRange),
        };

        if (!files[hash.file]) {
          files[hash.file] = [];
        }
        files[hash.file].push(method);
        methods.push(method);
      });

      return {
        methodByFileMap: files,
        methods,
      };
    } finally {
      await session.close();
    }
  }
}

// Export legacy functions for backward compatibility
export function getSession(
  uri = "bolt://localhost:7687",
  username = "",
  password = ""
) {
  const db = new Database(uri, username, password);
  return db.getSession();
}

export async function deleteNodes() {
  const db = new Database();
  return await db.deleteNodes();
}

export async function insertFileNode(file) {
  const db = new Database();
  return await db.insertFileNode(file);
}

export async function insertMethodNode(method) {
  const db = new Database();
  return await db.insertMethodNode(method);
}

export async function insertClassNode(klass) {
  const db = new Database();
  return await db.insertClassNode(klass);
}

export async function createRelationship(fromId, toId, type) {
  const db = new Database();
  return await db.createRelationship(fromId, toId, type);
}

export async function findAllMethods() {
  const db = new Database();
  return await db.findAllMethods();
}
