// src/auth/kerberos-client.ts

import { spawn } from 'child_process';
import { Logger } from '../utils/logger';
import { IKrbClient } from '../interfaces/kerberos-client.interface';
import { Db2AuthenticationError } from '../errors';
import { Db2Error } from '../errors/db2.error';
import { Db2KerberosAuthOptions } from '../interfaces';
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
      await this.kinitWithKeytab(username, krbKeytab, krbKdc);
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

    // Validate ticket acquisition (e.g., using `klist`)
    await this.validateTicket();
  }

  /**
   * Checks if `kinit` is available on the system by locating its absolute path.
   */
  private async checkKinitAvailability(): Promise<void> {
    const kinitPath = await this.which('kinit');
    if (!kinitPath) {
      this.logger.error('kinit is not available on the system.');
      throw new Db2Error('kinit is not available on the system.');
    }
    this.logger.info(`kinit is available at ${kinitPath}.`);
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
          this.logger.info('Keytab file is accessible.');
          resolve();
        });
      });
    }
    // If no keytab is provided, assume password-based authentication
    return Promise.resolve();
  }

  /**
   * Executes the `kinit` command with a keytab.
   */
  private async kinitWithKeytab(
    username: string,
    krbKeytab: string,
    krbKdc?: string,
  ): Promise<void> {
    // Validate username: only allow alphanumerics and certain special characters
    if (!this.isValidPrincipal(username)) {
      this.logger.error(`Invalid username format: ${username}`);
      throw new Db2Error(
        'Invalid username format for Kerberos authentication.',
      );
    }

    // Build the kinit command arguments
    const args = ['-kt', krbKeytab, username];
    if (krbKdc) {
      args.push('-kdc', krbKdc);
    }

    this.logger.info(`Executing kinit with keytab: kinit ${args.join(' ')}`);

    await this.executeCommand('kinit', args);
    this.logger.info('Kerberos ticket acquired successfully using keytab.');
  }

  /**
   * Executes the `kinit` command with a password.
   */
  private async kinitWithPassword(
    username: string,
    password: string,
  ): Promise<void> {
    // Validate username: only allow alphanumerics and certain special characters
    if (!this.isValidPrincipal(username)) {
      this.logger.error(`Invalid username format: ${username}`);
      throw new Db2Error(
        'Invalid username format for Kerberos authentication.',
      );
    }

    return new Promise((resolve, reject) => {
      const kinit = spawn('kinit', [username], {
        stdio: ['pipe', 'ignore', 'pipe'], // Pipe stdin for password, ignore stdout, pipe stderr
      });

      let stderrData = '';

      kinit.stderr.on('data', (data) => {
        stderrData += data.toString();
      });

      kinit.on('close', (code) => {
        if (code !== 0) {
          this.logger.error(
            `kinit process exited with code ${code}: ${stderrData}`,
          );
          return reject(
            new Db2AuthenticationError(
              `kinit process exited with code ${code}: ${stderrData}`,
            ),
          );
        }
        this.logger.info('Kerberos ticket acquired successfully via password.');
        resolve();
      });

      // Write the password to kinit's stdin securely
      kinit.stdin.write(password + '\n');
      kinit.stdin.end();
    });
  }

  /**
   * Validates that a Kerberos ticket has been successfully acquired using `klist -s`.
   */
  private async validateTicket(): Promise<void> {
    try {
      await this.executeCommand('klist', ['-s']);
      this.logger.info('Kerberos ticket is valid.');
    } catch (error: any) {
      this.logger.error('No valid Kerberos ticket found.');
      throw new Db2AuthenticationError('No valid Kerberos ticket found.');
    }
  }

  /**
   * Executes a shell command securely using `spawn`.
   * Avoids using shell interpreters to prevent shell injection.
   */
  private async executeCommand(
    command: string,
    args: string[] = [],
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      // Validate that the command is allowed and not manipulated
      const allowedCommands = ['kinit', 'klist', 'which'];
      if (!allowedCommands.includes(command)) {
        this.logger.error(
          `Attempted to execute disallowed command: ${command}`,
        );
        return reject(new Db2Error('Disallowed command attempted.'));
      }

      const cmdProcess = spawn(command, args, {
        shell: false, // Do not use shell to execute the command
        stdio: ['ignore', 'ignore', 'pipe'], // Ignore stdin and stdout, pipe stderr
      });

      let stderrData = '';

      cmdProcess.stderr.on('data', (data) => {
        stderrData += data.toString();
      });

      cmdProcess.on('close', (code) => {
        if (code !== 0) {
          this.logger.error(
            `${command} failed with code ${code}: ${stderrData}`,
          );
          return reject(
            new Db2AuthenticationError(`${command} failed: ${stderrData}`),
          );
        }
        resolve();
      });
    });
  }

  /**
   * Securely locates the absolute path of a command using `which`.
   */
  private async which(command: string): Promise<string | null> {
    return new Promise((resolve, reject) => {
      if (!this.isValidCommand(command)) {
        this.logger.error(`Invalid command name: ${command}`);
        return resolve(null);
      }

      const whichPath = spawn('which', [command], {
        shell: false,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stdoutData = '';
      let stderrData = '';

      whichPath.stdout.on('data', (data) => {
        stdoutData += data.toString();
      });

      whichPath.stderr.on('data', (data) => {
        stderrData += data.toString();
      });

      whichPath.on('close', (code) => {
        if (code !== 0) {
          this.logger.error(
            `which command failed for ${command}: ${stderrData}`,
          );
          return resolve(null);
        }
        const cmdPath = stdoutData.trim();
        resolve(cmdPath || null);
      });
    });
  }

  /**
   * Validates the command name to prevent execution of unintended commands.
   */
  private isValidCommand(command: string): boolean {
    const validCommands = ['kinit', 'klist', 'which'];
    return validCommands.includes(command);
  }

  /**
   * Validates the Kerberos principal (username) format.
   * Allows alphanumerics, dots, hyphens, and at-signs.
   */
  private isValidPrincipal(principal: string): boolean {
    const principalRegex = /^[a-zA-Z0-9.\-@]+$/;
    return principalRegex.test(principal);
  }
}
