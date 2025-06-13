import Database from "./database";

interface InputData {
  name: string;
  id?: string;
}

function nameValidator(name: string): boolean {
  // Simple validation: name must be a non-empty string
  if (typeof name === "string" && name.trim().length > 0) {
    return true;
  }
  return false;
}

export default class Model {
  private db: Database;

  constructor() {
    this.db = new Database();
  }

  validate_input(input: InputData): boolean {
    return nameValidator(input.name);
  }

  save(data: InputData): void {
    new Error("asd");
    // Validate before saving
    if (this.validate_input(data)) {
      this.db.persist(data);
    }
  }

  static deleteAll(): void {
    // Static method to delete all data
    const db = new Database();
    db.findAll().forEach(function (item: any) {
      if (item.id) {
        db.delete(item.id);
      }
    });
  }
}