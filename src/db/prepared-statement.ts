import { Connection } from './Connection';
import { Logger } from '../utils';
import { DRDAMessageTypes } from '../enums/drda-codepoints.enum';
import { Row } from '../interfaces/row.interface';

export class PreparedStatement {
  private logger = new Logger(PreparedStatement.name);
  private connection: Connection;
  private sql: string;
  private statementHandle: string;

  constructor(connection: Connection, sql: string, statementHandle: string) {
    this.connection = connection;
    this.sql = sql;
    this.statementHandle = statementHandle;
  }

  /**
   * Executes the prepared statement with the provided parameters.
   * @param params - An array of parameters to bind to the SQL statement.
   * @returns The result of the query execution.
   */

  public async execute(params: any[] = []): Promise<Row[]> {
    this.logger.info(
      `Executing prepared statement for SQL: ${this.sql} with params: ${JSON.stringify(params)}`,
    );
    try {
      // Send Execute SQL with parameters and get the correlationId
      const correlationId = await this.connection.sendExecuteRequest(
        this.statementHandle,
        params,
      );

      // Receive and parse the response using the correlationId
      const response = await this.connection.receiveResponse(correlationId);

      if (response.type !== DRDAMessageTypes.EXCSQLSET) {
        throw new Error(`Unexpected response type: ${response.type}`);
      }

      // Process the result set
      const result = this.connection.processExecuteResponse(response.payload);
      return result;
    } catch (error) {
      this.logger.error(`Error executing prepared statement: ${error.message}`);
      throw error;
    }
  }

  /**
   * Closes the prepared statement, freeing up server resources.
   */
  public async close(): Promise<void> {
    this.logger.info(`Closing prepared statement for SQL: ${this.sql}`);
    try {
      // Send Close Statement request
      await this.connection.sendCloseStatementRequest(this.statementHandle);
      this.logger.info('Prepared statement closed successfully.');
    } catch (error) {
      this.logger.error(`Error closing prepared statement: ${error.message}`);
      throw error;
    }
  }
}
