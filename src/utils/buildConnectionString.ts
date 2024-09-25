// src/utils/db2-connection-string.util.ts
import { Db2AuthType } from '../enums';
import {
  Db2JwtAuthOptions,
  Db2KerberosAuthOptions,
  Db2LdapAuthOptions,
  Db2PasswordAuthOptions,
  IDb2ConfigOptions,
} from '../interfaces';

export function buildConnectionString(config: IDb2ConfigOptions): string {
  const {
    host,
    port,
    database,
    characterEncoding,
    securityMechanism,
    currentSchema,
    applicationName,
    useTls,
    sslCertificatePath,
  } = config;

  const { authType, ...authConfig } = config.auth || {};

  let connStr = `DATABASE=${database};HOSTNAME=${host};PORT=${port};`;

  // Handle the authentication section based on authType
  connStr += buildAuthSection(authType, authConfig);

  // Optional configurations
  if (characterEncoding) {
    connStr += `CHARACTERENCODING=${characterEncoding};`;
  }

  if (securityMechanism) {
    connStr += `SECURITY=${securityMechanism};`;
  }

  if (currentSchema) {
    connStr += `CURRENTSCHEMA=${currentSchema};`;
  }

  if (applicationName) {
    connStr += `APPLICATIONNAME=${applicationName};`;
  }

  if (useTls) {
    connStr += 'SECURITY=SSL;';
    if (sslCertificatePath) {
      connStr += `SSLServerCertificate=${sslCertificatePath};`;
    }
  }

  return connStr;
}

const buildAuthSection = (authType: string, authConfig: any): string => {
  switch (authType) {
    case Db2AuthType.PASSWORD:
      return buildPasswordAuth(authConfig);
    case Db2AuthType.KERBEROS:
      return buildKerberosAuth(authConfig);
    case Db2AuthType.JWT:
      return buildJwtAuth(authConfig);
    case Db2AuthType.LDAP:
      return buildLdapAuth(authConfig);
    default:
      throw new Error(`Unsupported authentication type: ${authType}`);
  }
};

const buildPasswordAuth = ({
  username,
  password,
}: Db2PasswordAuthOptions): string => {
  if (!username || !password) {
    throw new Error(
      'Username and password are required for password authentication.',
    );
  }
  return `UID=${username};PWD=${password};`;
};

const buildKerberosAuth = ({
  krbServiceName,
}: Db2KerberosAuthOptions): string => {
  if (!krbServiceName) {
    throw new Error(
      'Kerberos service name (krbServiceName) is required for Kerberos authentication.',
    );
  }
  return `SecurityMechanism=11;ServiceName=${krbServiceName};`;
};

/**
 * Handles JWT-based authentication string construction.
 */
const buildJwtAuth = ({ jwtToken }: Db2JwtAuthOptions): string => {
  if (!jwtToken) {
    throw new Error('JWT token is required for JWT authentication.');
  }
  return `AUTHENTICATION=jwt;Token=${jwtToken};`;
};

/**
 * Handles LDAP-based authentication string construction.
 */
const buildLdapAuth = ({ username, password }: Db2LdapAuthOptions): string => {
  if (!username || !password) {
    throw new Error(
      'Username and password are required for LDAP authentication.',
    );
  }
  return `UID=${username};PWD=${password};AUTHENTICATION=ldap;`;
};
