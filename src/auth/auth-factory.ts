// src/auth/auth-factory.ts

import { IConfigOptions } from '../interfaces';
import { PasswordAuthStrategy } from './password-auth.strategy';
import { Db2AuthType } from '../enums/db2.enums';
import { IConnectionManager } from '../interfaces/connection-mannager.interface';
import { AuthStrategy } from '../';
import { Logger } from '../utils/logger';
const logger = new Logger('AuthFactory');

export const createAuthStrategy = (
  config: IConfigOptions,
  connectionManager: IConnectionManager,
): AuthStrategy => {
  switch (config.auth?.authType) {
    case Db2AuthType.PASSWORD:
      logger.info('Auth Factory: Creating PasswordAuthStrategy.');
      return new PasswordAuthStrategy(config, connectionManager);
    case Db2AuthType.KERBEROS:
      logger.info('Auth Factory: Creating KerberosAuthStrategy.');
      // return new KerberosAuthStrategy(config, connectionManager);
      throw new Error('Kerberos authentication is not yet supported.');
    case Db2AuthType.JWT:
      logger.info('Auth Factory: Creating JwtAuthStrategy.');
      // return new JwtAuthStrategy(config, connectionManager);
      throw new Error('JWT authentication is not yet supported.');
    case Db2AuthType.LDAP:
      logger.info('Auth Factory: Creating LdapAuthStrategy.');
      // return new LdapAuthStrategy(config, connectionManager);
      throw new Error('LDAP authentication is not yet supported.');
    default:
      throw new Error(`Unsupported authentication type: ${config.auth}`);
  }
};
