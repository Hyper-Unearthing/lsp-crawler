import assert from "node:assert";

export async function assertAllRelationshipsFound(db, relationshipsJsonPath) {
  const fs = await import("fs/promises");
  const relationshipsData = await fs.readFile(relationshipsJsonPath, "utf8");
  const expectedRelationships = relationshipsData
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));

  for (const expectedRel of expectedRelationships) {
    const fromId = expectedRel["n.id"];
    const fromName = expectedRel["n.name"];
    const relationshipType = expectedRel.relationship_type;
    const toId = expectedRel["m.id"];
    const toName = expectedRel["m.name"];

    const fromNodes = db
      .findNodes({})
      .filter((node) => node.properties.id === fromId);
    const toNodes = db
      .findNodes({})
      .filter((node) => node.properties.id === toId);

    assert(
      fromNodes.length > 0,
      `Source node with id ${fromId} (name: ${fromName}) should exist in database`
    );
    assert(
      toNodes.length > 0,
      `Target node with id ${toId} (name: ${toName}) should exist in database`
    );

    const fromNode = fromNodes[0];
    const toNode = toNodes[0];

    const relationships = db.findRelationships({
      type: relationshipType,
      fromNodeId: fromNode.id,
      toNodeId: toNode.id,
    });

    assert(
      relationships.length > 0,
      `Relationship ${relationshipType} from ${fromName} (${fromId}) to ${toName} (${toId}) should exist in database`
    );
  }
}

export async function assertAllNodesFound(db, nodesJsonPath) {
  // Load expected nodes from the JSON file
  const fs = await import("fs/promises");
  const nodesData = await fs.readFile(nodesJsonPath, "utf8");
  const expectedNodes = nodesData
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));

  // Verify all expected nodes are persisted in the database
  for (const expectedNode of expectedNodes) {
    const nodeId = expectedNode.n.properties.id;
    const expectedLabels = expectedNode.n.labels;
    const expectedProperties = expectedNode.n.properties;

    // Find the node in the database by matching id and labels (with deserialized properties)
    const persistedNodes = db
      .findNodes({
        labels: expectedLabels,
      })
      .filter((node) => node.properties.id === nodeId);
    const persistedNode = persistedNodes[0];

    assert(
      persistedNode,
      `Node with id ${nodeId} and labels [${expectedLabels.join(
        ", "
      )}] should be persisted in database`
    );

    // Verify properties match (allowing for additional properties in persisted node)
    for (const [key, value] of Object.entries(expectedProperties)) {
      const actualValue = persistedNode.properties[key];

      // For range and selectionRange, compare the deserialized object with parsed expected value
      if (
        (key === "range" || key === "selectionRange") &&
        typeof value === "string"
      ) {
        const expectedParsed = JSON.parse(value);
        assert.deepStrictEqual(
          actualValue,
          expectedParsed,
          `Node ${nodeId} property '${key}' should match expected value`
        );
      } else {
        assert.strictEqual(
          actualValue,
          value,
          `Node ${nodeId} property '${key}' should match expected value`
        );
      }
    }
  }
}
