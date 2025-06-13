import SomeDataLib from "some-data-lib";

export default class Database {
  persist(data: any): void {
    SomeDataLib.save(data);
  }

  delete(id: string): void {
    SomeDataLib.delete(id);
  }

  persistMany(dataArray: any[]): void {
    dataArray.forEach((data) => {
      this.persist(data);
    });
  }

  findAll(): any[] {
    return SomeDataLib.findAll();
  }
}