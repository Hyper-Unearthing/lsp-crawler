import Database from "./database.js";
import SomeDataLib from "some-data-lib";

export default class Database {
  persist(data) {
    SomeDataLib.save(data);
  }

  delete(id) {
    SomeDataLib.delete(id);
  }

  persistMany(dataArray) {
    dataArray.forEach((data) => {
      this.persist(data);
    });
  }

  findAll() {
    return SomeDataLib.findAll();
  }
}
