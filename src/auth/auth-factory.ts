// src/auth/auth-factory.ts

import { Db2AuthOptions } from "../interfaces/db2.interface";
import { PasswordAuthStrategy } from "./password-auth.strategy";
import { KerberosAuthStrategy } from "./kerberos-auth.strategy";
import { JwtAuthStrategy } from "./jwt-auth.strategy";
import { Db2Client } from "../db/db2-client";

export function createAuthStrategy(
  authConfig: Db2AuthOptions,
  dbClient: Db2Client
) {
  switch (authConfig.authType) {
    case "password":
      return new PasswordAuthStrategy(authConfig, dbClient);
    case "kerberos":
      return new KerberosAuthStrategy(authConfig, dbClient);
    case "jwt":
      return new JwtAuthStrategy(authConfig, dbClient);
    default:
      throw new Error(
        `Unsupported authentication type: ${authConfig.authType}`
      );
  }
}
