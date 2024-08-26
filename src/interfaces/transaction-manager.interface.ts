import { Db2IsolationLevel } from "../";

export interface TransactionManagerInterface {
  /**
   * Begin a transaction with an optional isolation level.
   * @param isolationLevel The isolation level for the transaction (optional).
   */
  beginTransaction(isolationLevel?: Db2IsolationLevel): Promise<void>;

  /**
   * Commit the current transaction.
   * Throws an error if no transaction is active.
   */
  commitTransaction(): Promise<void>;

  /**
   * Rollback the current transaction.
   * Throws an error if no transaction is active.
   */
  rollbackTransaction(): Promise<void>;

  /**
   * Dynamically set the isolation level for future transactions.
   * Throws an error if a transaction is currently active.
   * @param level The desired isolation level.
   */
  setIsolationLevel(level: Db2IsolationLevel): void;

  /**
   * Returns whether a transaction is currently active.
   * @returns A boolean indicating if a transaction is active.
   */
  isTransactionActive(): boolean;

  /**
   * Retry a transaction operation with a specified retry policy.
   * @param operation The operation to retry.
   * @param attempts Number of retry attempts.
   * @param delay Delay between retries.
   */
  retryOperation<T>(
    operation: () => Promise<T>,
    attempts?: number,
    delay?: number
  ): Promise<T>;

  /**
   * Handle transaction timeouts by implementing a timeout wrapper.
   * @param operation The operation to timeout.
   * @param timeout The timeout duration in milliseconds.
   */
  withTimeout<T>(operation: () => Promise<T>, timeout: number): Promise<T>;
}
