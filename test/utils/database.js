export default class TestDatabase {
  constructor() {
    this.nodes = [];
    this.relationships = [];
  }

  async insertFileNode(file) {
    const properties = { ...file };
    if (properties.range && typeof properties.range === "object") {
      properties.range = JSON.stringify(properties.range);
    }
    if (
      properties.selectionRange &&
      typeof properties.selectionRange === "object"
    ) {
      properties.selectionRange = JSON.stringify(properties.selectionRange);
    }

    this.nodes.push({
      labels: ["File"],
      properties,
    });
  }

  async insertMethodNode(method) {
    const properties = { ...method };
    if (properties.range && typeof properties.range === "object") {
      properties.range = JSON.stringify(properties.range);
    }
    if (
      properties.selectionRange &&
      typeof properties.selectionRange === "object"
    ) {
      properties.selectionRange = JSON.stringify(properties.selectionRange);
    }

    this.nodes.push({
      labels: ["Method"],
      properties,
    });
  }

  async insertClassNode(klass) {
    const properties = { ...klass };
    if (properties.range && typeof properties.range === "object") {
      properties.range = JSON.stringify(properties.range);
    }
    if (
      properties.selectionRange &&
      typeof properties.selectionRange === "object"
    ) {
      properties.selectionRange = JSON.stringify(properties.selectionRange);
    }

    this.nodes.push({
      labels: ["Class"],
      properties,
    });
  }

  async createRelationship(fromId, toId, type) {
    const fromNode = this.nodes.find((node) => node.properties.id === fromId);
    const toNode = this.nodes.find((node) => node.properties.id === toId);

    const fromName = fromNode ? fromNode.properties.name : null;
    const toName = toNode ? toNode.properties.name : null;

    this.relationships.push({ fromId, toId, type, fromName, toName });
  }

  _deserializeNodeProperties(node) {
    const properties = { ...node.properties };

    if (properties.range && typeof properties.range === "string") {
      properties.range = JSON.parse(properties.range);
    }

    if (
      properties.selectionRange &&
      typeof properties.selectionRange === "string"
    ) {
      properties.selectionRange = JSON.parse(properties.selectionRange);
    }

    return { ...node, properties };
  }

  async findAllMethods() {
    const methods = this.nodes
      .filter((node) => node.labels.includes("Method"))
      .map((node) => {
        const deserializedNode = this._deserializeNodeProperties(node);
        const method = { ...deserializedNode.properties };
        if (method.fileUri) {
          method.file = method.fileUri;
        }
        return method;
      });

    const methodByFileMap = {};
    methods.forEach((method) => {
      if (!methodByFileMap[method.file]) {
        methodByFileMap[method.file] = [];
      }
      methodByFileMap[method.file].push(method);
    });

    return { methodByFileMap, methods };
  }

  findNodes(filter = {}) {
    return this.nodes
      .filter((node) => {
        // Apply any filters if provided
        for (const [key, value] of Object.entries(filter)) {
          if (key === "labels") {
            if (!value.every((label) => node.labels.includes(label))) {
              return false;
            }
          } else if (node.properties[key] !== value) {
            return false;
          }
        }
        return true;
      })
      .map((node, index) => ({
        ...this._deserializeNodeProperties(node),
        id: index,
      }));
  }

  findRelationships(filter = {}) {
    return this.relationships.filter((relationship) => {
      for (const [key, value] of Object.entries(filter)) {
        if (key === "fromNodeId") {
          const fromNode = this.nodes[value];
          if (!fromNode || fromNode.properties.id !== relationship.fromId) {
            return false;
          }
        } else if (key === "toNodeId") {
          const toNode = this.nodes[value];
          if (!toNode || toNode.properties.id !== relationship.toId) {
            return false;
          }
        } else if (relationship[key] !== value) {
          return false;
        }
      }
      return true;
    });
  }
}
