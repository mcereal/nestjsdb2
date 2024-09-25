// src/auth/kerberos-client.ts

import { exec, spawn } from 'child_process';
import { Logger } from '@nestjs/common';
import { IKrbClient } from '../interfaces/kerberos-client.interface';
import { Db2AuthenticationError } from '../errors';
import { Db2Error } from '../errors/db2.error';
import { Db2KerberosAuthOptions } from '../interfaces';
import { resolve } from 'path';
import * as fs from 'fs';

export class KerberosClient implements IKrbClient {
  private readonly logger = new Logger(KerberosClient.name);

  constructor(private readonly authOptions: Db2KerberosAuthOptions) {}

  /**
   * Initialize the Kerberos client by ensuring that Kerberos is configured correctly.
   * This includes checking the availability of `kinit` and the existence of the keytab file if provided.
   */
  async initializeClient(): Promise<void> {
    await this.checkKinitAvailability();
    await this.checkKeytab();
  }

  /**
   * Acquires a Kerberos ticket using `kinit`.
   * Supports both keytab-based and password-based authentication.
   */
  async acquireKerberosTicket(): Promise<void> {
    const { username, krbKeytab, krbKdc, password } = this.authOptions;

    if (krbKeytab) {
      // Keytab-based kinit (non-interactive)
      const command = `kinit ${username} -kt ${krbKeytab}`;
      this.logger.log(`Executing command: ${command}`);

      await this.executeCommand(command);
    } else if (password) {
      // Password-based kinit (interactive)
      await this.kinitWithPassword(username, password);
    } else {
      this.logger.error(
        'Either krbKeytab or password must be provided for kinit.',
      );
      throw new Db2Error(
        'Kerberos authentication requires a keytab or password.',
      );
    }

    // Optional: Validate ticket acquisition (e.g., using `klist`)
    await this.validateTicket();
  }

  /**
   * Checks if `kinit` is available on the system.
   */
  private async checkKinitAvailability(): Promise<void> {
    return new Promise((resolve, reject) => {
      exec('which kinit', (error, stdout) => {
        if (error || !stdout.trim()) {
          this.logger.error('kinit is not available on the system.');
          return reject(new Db2Error('kinit is not available on the system.'));
        }
        this.logger.log('kinit is available.');
        resolve();
      });
    });
  }

  /**
   * Checks if the keytab file exists and is readable.
   */
  private async checkKeytab(): Promise<void> {
    const { krbKeytab } = this.authOptions;
    if (krbKeytab) {
      return new Promise((resolve, reject) => {
        fs.access(krbKeytab, fs.constants.R_OK, (err) => {
          if (err) {
            this.logger.error(`Keytab file not accessible: ${krbKeytab}`);
            return reject(
              new Db2Error(`Keytab file not accessible: ${krbKeytab}`),
            );
          }
          this.logger.log('Keytab file is accessible.');
          resolve();
        });
      });
    }
    // If no keytab is provided, assume password-based authentication
    resolve();
  }

  /**
   * Executes a shell command and handles errors.
   */
  private async executeCommand(command: string): Promise<void> {
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          this.logger.error(`kinit failed: ${stderr}`);
          return reject(new Db2AuthenticationError(`kinit failed: ${stderr}`));
        }
        this.logger.log('Kerberos ticket acquired successfully.');
        resolve();
      });
    });
  }

  /**
   * Acquires a Kerberos ticket using password-based kinit.
   */
  private async kinitWithPassword(
    username: string,
    password: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const kinit = spawn('kinit', [username]);

      let stderrData = '';

      kinit.stderr.on('data', (data) => {
        stderrData += data.toString();
      });

      kinit.on('close', (code) => {
        if (code !== 0) {
          this.logger.error(`kinit process exited with code ${code}`);
          return reject(
            new Db2AuthenticationError(
              `kinit process exited with code ${code}: ${stderrData}`,
            ),
          );
        }
        this.logger.log('Kerberos ticket acquired successfully via password.');
        resolve();
      });

      // Write the password to kinit's stdin
      kinit.stdin.write(password + '\n');
      kinit.stdin.end();
    });
  }

  /**
   * Validates that a Kerberos ticket has been successfully acquired.
   */
  private async validateTicket(): Promise<void> {
    return new Promise((resolve, reject) => {
      exec('klist -s', (error) => {
        if (error) {
          this.logger.error('No valid Kerberos ticket found.');
          return reject(
            new Db2AuthenticationError('No valid Kerberos ticket found.'),
          );
        }
        this.logger.log('Kerberos ticket is valid.');
        resolve();
      });
    });
  }
}
