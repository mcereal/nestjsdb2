// src/errors/db2.error.ts

export class Db2Error extends Error {
  constructor(message: string) {
    super(message);
    this.name = "Db2Error";
  }
}
