import { Db2ConfigOptions } from "../interfaces/db2.interface";
import { PasswordAuthStrategy } from "./password-auth.strategy";
import { KerberosAuthStrategy } from "./kerberos-auth.strategy";
import { JwtAuthStrategy } from "./jwt-auth.strategy";
import { LdapAuthStrategy } from "./ldap-auth.strategy";
import { Db2AuthType } from "../enums/db2.enums";
import { IConnectionManager } from "../interfaces/connection-mannager.interface";
import { Db2Client } from "../";

export function createAuthStrategy(
  config: Db2ConfigOptions,
  connectionManager: IConnectionManager,
  dbClient: Db2Client
) {
  switch (config.auth?.authType) {
    case Db2AuthType.PASSWORD:
      return new PasswordAuthStrategy(config, connectionManager);
    case Db2AuthType.KERBEROS:
      return new KerberosAuthStrategy(config, dbClient, connectionManager);
    case Db2AuthType.JWT:
      return new JwtAuthStrategy(config, dbClient, connectionManager);
    case Db2AuthType.LDAP:
      return new LdapAuthStrategy(config, dbClient, connectionManager);
    default:
      throw new Error(
        `Unsupported authentication type: ${config.auth?.authType}`
      );
  }
}
