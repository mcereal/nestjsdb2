// src/interfaces/kerberos-client.interface.ts

export interface IKrbClient {
  initializeClient(): Promise<void>;
  acquireKerberosTicket(): Promise<void>;
}
