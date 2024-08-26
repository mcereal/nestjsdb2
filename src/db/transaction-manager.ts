import { Logger } from "@nestjs/common";
import { Db2ClientInterface, TransactionManagerInterface } from "../interfaces";
import { Db2Error } from "../errors/db2.error";
import { Db2IsolationLevel } from "../enums";

export class TransactionManager implements TransactionManagerInterface {
  private readonly logger = new Logger(TransactionManager.name);
  private transactionActive: boolean = false;
  private isolationLevel: Db2IsolationLevel | null = null;

  public constructor(
    private client: Db2ClientInterface,
    private defaultIsolationLevel?: Db2IsolationLevel
  ) {}

  /**
   * Begin a transaction with an optional isolation level.
   * @param isolationLevel The isolation level for the transaction (optional).
   */
  public async beginTransaction(
    isolationLevel?: Db2IsolationLevel
  ): Promise<void> {
    if (this.transactionActive) {
      this.logger.warn(
        "A transaction is already active. Nested transactions are not supported."
      );
      return;
    }

    try {
      // Use provided isolation level or default if not specified
      this.isolationLevel =
        isolationLevel ||
        this.defaultIsolationLevel ||
        Db2IsolationLevel.READ_COMMITTED;

      const startTime = Date.now();
      if (this.isolationLevel) {
        await this.client.query(
          `SET TRANSACTION ISOLATION LEVEL ${this.isolationLevel}`
        );
        this.logger.log(
          `Transaction isolation level set to ${this.isolationLevel}.`
        );
      }

      await this.client.query("BEGIN TRANSACTION");
      this.transactionActive = true;
      const duration = Date.now() - startTime;
      this.logger.log(`Transaction started in ${duration}ms.`);
    } catch (error) {
      this.logger.error("Failed to start transaction.", error);
      throw new Db2Error("Transaction start error");
    }
  }

  /**
   * Commit the current transaction.
   * Throws an error if no transaction is active.
   */
  public async commitTransaction(): Promise<void> {
    if (!this.transactionActive) {
      this.logger.warn("No active transaction to commit.");
      throw new Db2Error("No active transaction to commit.");
    }

    try {
      const startTime = Date.now();
      await this.client.query("COMMIT");
      this.transactionActive = false;
      const duration = Date.now() - startTime;
      this.logger.log(`Transaction committed in ${duration}ms.`);
    } catch (error) {
      this.logger.error("Failed to commit transaction.", error);
      throw new Db2Error("Transaction commit error");
    }
  }

  /**
   * Rollback the current transaction.
   * Throws an error if no transaction is active.
   */
  public async rollbackTransaction(): Promise<void> {
    if (!this.transactionActive) {
      this.logger.warn("No active transaction to rollback.");
      throw new Db2Error("No active transaction to rollback.");
    }

    try {
      const startTime = Date.now();
      await this.client.query("ROLLBACK");
      this.transactionActive = false;
      const duration = Date.now() - startTime;
      this.logger.log(`Transaction rolled back in ${duration}ms.`);
    } catch (error) {
      this.logger.error("Failed to rollback transaction.", error);
      throw new Db2Error("Transaction rollback error");
    }
  }

  /**
   * Dynamically set the isolation level for future transactions.
   * Throws an error if a transaction is currently active.
   * @param level The desired isolation level.
   */
  public setIsolationLevel(level: Db2IsolationLevel): void {
    if (this.transactionActive) {
      this.logger.warn(
        "Cannot change isolation level during an active transaction."
      );
      throw new Db2Error(
        "Cannot change isolation level during an active transaction."
      );
    }

    this.isolationLevel = level;
    this.logger.log(`Transaction isolation level set to ${level}.`);
  }

  /**
   * Returns whether a transaction is currently active.
   * @returns A boolean indicating if a transaction is active.
   */
  public isTransactionActive(): boolean {
    return this.transactionActive;
  }

  /**
   * Retry a transaction operation with a specified retry policy.
   * @param operation The operation to retry.
   * @param attempts Number of retry attempts.
   * @param delay Delay between retries.
   */
  public async retryOperation<T>(
    operation: () => Promise<T>,
    attempts: number = 3,
    delay: number = 1000
  ): Promise<T> {
    for (let attempt = 0; attempt < attempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        this.logger.error(
          `Attempt ${attempt + 1} failed. Retrying in ${delay}ms...`,
          error
        );
        if (attempt < attempts - 1) {
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          this.logger.error("All retry attempts failed.", error);
          throw new Db2Error("Operation failed after multiple retries.");
        }
      }
    }
  }

  /**
   * Handle transaction timeouts by implementing a timeout wrapper.
   * @param operation The operation to timeout.
   * @param timeout The timeout duration in milliseconds.
   */
  public async withTimeout<T>(
    operation: () => Promise<T>,
    timeout: number
  ): Promise<T> {
    let timeoutHandle: NodeJS.Timeout;

    const timeoutPromise = new Promise<never>(
      (_, reject) =>
        (timeoutHandle = setTimeout(
          () => reject(new Db2Error("Transaction operation timed out")),
          timeout
        ))
    );

    try {
      return await Promise.race([operation(), timeoutPromise]);
    } finally {
      clearTimeout(timeoutHandle);
    }
  }
}
