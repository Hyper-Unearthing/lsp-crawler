import neo4j from "neo4j-driver";
export function getSession(
  uri = "bolt://localhost:7687",
  username = "",
  password = ""
) {
  const driver = neo4j.driver(uri, neo4j.auth.basic(username, password));
  const session = driver.session();
  return session;
}

export async function deleteNodes() {
  const session = getSession();
  await session.run("MATCH (n) DETACH DELETE n");
  await session.close();
}

export async function insertFileNode(file) {
  const session = getSession();
  await session.run(
    "MERGE (f:File {id: $id}) ON CREATE SET f.uri = $uri, f.name = $name, f.language = $language",
    {
      id: file.id,
      uri: file.uri,
      name: file.name,
      language: file.language,
    }
  );
  await session.close();
}

export async function insertMethodNode(method) {
  const session = getSession();
  await session.run(
    "MERGE (m:Method {id: $id}) ON CREATE SET m.name = $name, m.range = $range, m.source = $source, m.language = $language",
    {
      id: method.id,
      name: method.name,
      range: JSON.stringify(method.range) || "",
      source: method.source || "",
      language: method.language,
    }
  );
  await session.close();
}

export async function insertClassNode(klass) {
  const session = getSession();
  await session.run(
    "MERGE (c:Class {id: $id}) ON CREATE SET c.name = $name, c.range = $range, c.source = $source, c.language = $language",
    {
      id: klass.id,
      name: klass.name,
      range: JSON.stringify(klass.range) || "",
      source: klass.source || "",
      language: klass.language,
    }
  );
  await session.close();
}

export async function createRelationship(fromId, toId, type) {
  const session = getSession();
  await session.run(
    `MATCH (a {id: $fromId}), (b {id: $toId}) MERGE (a)-[:${type}]->(b)`,
    {
      fromId,
      toId,
    }
  );
  await session.close();
}

export async function findAllMethods() {
  const session = getSession();
  const result = await session.run(`
    MATCH (f:File)
    MATCH (m:Method)
    MATCH path = (f)-[*]-(m)
    RETURN f.uri as file, m.name as method, m.range as range, m.id as id, m.language as language
    ORDER BY file, method
`);
  await session.close();
  return result.records.map((record) => {
    const hash = record.toObject();
    return {
      ...hash,
      range: JSON.parse(hash.range),
    };
  });
}
