// src/auth/db2-auth.strategy.ts

import { Db2AuthOptions } from "../interfaces/db2.interface";

export abstract class Db2AuthStrategy {
  protected config: Db2AuthOptions;

  constructor(config: Db2AuthOptions) {
    this.config = config;
  }

  abstract authenticate(): Promise<void>;
}
