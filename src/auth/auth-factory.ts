import { IDb2ConfigOptions } from "../interfaces";
import { PasswordAuthStrategy } from "./password-auth.strategy";
import { KerberosAuthStrategy } from "./kerberos-auth.strategy";
import { JwtAuthStrategy } from "./jwt-auth.strategy";
import { LdapAuthStrategy } from "./ldap-auth.strategy";
import { Db2AuthType } from "../enums/db2.enums";
import { IConnectionManager } from "../interfaces/connection-mannager.interface";
import { Db2AuthStrategy } from "../";
import { Logger } from "@nestjs/common";
const logger = new Logger("AuthFactory");

export function createAuthStrategy(
  config: IDb2ConfigOptions,
  connectionManager: IConnectionManager
): Db2AuthStrategy {
  switch (config.auth?.authType) {
    case Db2AuthType.PASSWORD:
      logger.log("Auth Factory: Creating PasswordAuthStrategy.");
      return new PasswordAuthStrategy(config, connectionManager);
    case Db2AuthType.KERBEROS:
      logger.log("Auth Factory: Creating KerberosAuthStrategy.");
      return new KerberosAuthStrategy(config, connectionManager);
    case Db2AuthType.JWT:
      logger.log("Auth Factory: Creating JwtAuthStrategy.");
      return new JwtAuthStrategy(config, connectionManager);
    case Db2AuthType.LDAP:
      logger.log("Auth Factory: Creating LdapAuthStrategy.");
      return new LdapAuthStrategy(config, connectionManager);
    default:
      logger.error(`Unsupported authentication type: ${config.auth}`);
      throw new Error(`Unsupported authentication type: ${config.auth}`);
  }
}
