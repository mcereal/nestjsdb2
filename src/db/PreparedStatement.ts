import { Connection } from './Connection'; // Adjust the import path accordingly

export class PreparedStatement {
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
  public async execute(params: any[] = []): Promise<any> {
    console.log(
      `Executing prepared statement for SQL: ${this.sql} with params: ${JSON.stringify(params)}`,
    );
    try {
      // Send Execute SQL with parameters
      await this.connection.sendExecuteRequest(this.statementHandle, params);

      // Receive and parse the response
      const response = await this.connection.receiveResponse();

      if (response.type !== 'EXCSQLEXPRM') {
        throw new Error(`Unexpected response type: ${response.type}`);
      }

      // Process the result set
      const result = this.connection.processExecuteResponse(response.payload);
      return result;
    } catch (error) {
      console.error(`Error executing prepared statement: ${error.message}`);
      throw error;
    }
  }

  /**
   * Closes the prepared statement, freeing up server resources.
   */
  public async close(): Promise<void> {
    console.log(`Closing prepared statement for SQL: ${this.sql}`);
    try {
      // Send Close Statement request
      await this.connection.sendCloseStatementRequest(this.statementHandle);
      console.log('Prepared statement closed successfully.');
    } catch (error) {
      console.error(`Error closing prepared statement: ${error.message}`);
      throw error;
    }
  }
}
