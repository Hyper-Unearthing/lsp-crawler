import Database from "./database.js";

function nameValidator(name) {
  // Simple validation: name must be a non-empty string
  if (typeof name === "string" && name.trim().length > 0) {
    return true;
  }
  return false;
}

export default class Model {
  constructor() {
    this.db = new Database();
  }

  validate_input(input) {
    return nameValidator(input.name);
  }

  save(data) {
    new Error("asd");
    // Validate before saving
    if (this.validate_input(data)) {
      this.db.persist(data);
    }
  }

  static deleteAll() {
    // Static method to delete all data
    const db = new Database();
    db.findAll().forEach(function (item) {
      if (item.id) {
        db.delete(item.id);
      }
    });
  }
}
