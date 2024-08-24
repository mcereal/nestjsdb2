// src/errors/db2.error.ts

export class Db2Error extends Error {
  constructor(message: string) {
    super(message);
    this.name = "Db2Error";
  }
}

export class Db2TimeoutError extends Db2Error {
  constructor(message: string) {
    super(message);
    this.name = "Db2TimeoutError";
  }
}

export class Db2AuthenticationError extends Db2Error {
  constructor(message: string) {
    super(message);
    this.name = "Db2AuthenticationError";
  }
}

export class Db2ConnectionError extends Db2Error {
  constructor(message: string) {
    super(message);
    this.name = "Db2ConnectionError";
  }
}
