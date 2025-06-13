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

  async findAllNodes() {
    const session = this.getSession();
    try {
      const result = await session.run(
        `MATCH (n) RETURN n, labels(n) as labels`
      );
      return result.records.map((record) => ({
        properties: record.get("n").properties,
        labels: record.get("labels"),
      }));
    } finally {
      await session.close();
    }
  }

  async findAllRelationships() {
    const session = this.getSession();
    try {
      const result = await session.run(
        `MATCH (n)-[r]->(m)
         RETURN n.id, n.name, type(r) AS relationship_type, m.id, m.name
        `
      );
      return result.records.map((record) => ({
        from: {
          id: record.get("n.id"),
          name: record.get("n.name"),
        },
        relationship: {
          type: record.get("relationship_type"),
        },
        to: {
          id: record.get("m.id"),
          name: record.get("m.name"),
        },
      }));
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
