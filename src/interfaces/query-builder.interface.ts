// src/interfaces/query-builder.interface.ts

export interface IQueryBuilder {
  /**
   * Resets the query builder to its initial state.
   */
  reset(): IQueryBuilder;

  /**
   * Specifies the columns to select in a query.
   * @param columns The columns to select, can be a string, an array of strings, or a record of column-alias pairs.
   */
  select(columns: string | string[] | Record<string, string>): IQueryBuilder;

  /**
   * Adds a DISTINCT clause to the query.
   */
  distinct(): IQueryBuilder;

  /**
   * Specifies the schema to use in the query.
   * @param schemaName The name of the schema.
   */
  useSchema(schemaName: string): IQueryBuilder;

  /**
   * Specifies the table to query from.
   * @param table The table name.
   * @param alias An optional alias for the table.
   */
  from(table: string, alias?: string): IQueryBuilder;

  /**
   * Adds a WHERE clause to the query.
   * @param condition The condition to apply in the WHERE clause.
   * @param params Optional parameters for the condition.
   */
  where(condition: string, params?: any[]): IQueryBuilder;

  /**
   * Adds an AND condition to the existing WHERE clause.
   * @param condition The condition to add.
   * @param params Optional parameters for the condition.
   */
  and(condition: string, params?: any[]): IQueryBuilder;

  /**
   * Adds an OR condition to the existing WHERE clause.
   * @param condition The condition to add.
   * @param params Optional parameters for the condition.
   */
  or(condition: string, params?: any[]): IQueryBuilder;

  /**
   * Adds an ORDER BY clause to the query.
   * @param column The column to order by.
   * @param direction The direction of the ordering, ASC or DESC.
   */
  orderBy(column: string, direction?: 'ASC' | 'DESC'): IQueryBuilder;

  /**
   * Adds a LIMIT clause to the query.
   * @param limit The number of rows to limit the results to.
   */
  limit(limit: number): IQueryBuilder;

  /**
   * Adds an OFFSET clause to the query.
   * @param offset The number of rows to skip before starting to return rows.
   */
  offset(offset: number): IQueryBuilder;

  /**
   * Adds a JOIN clause to the query.
   * @param table The table to join.
   * @param condition The join condition.
   * @param type The type of join (INNER, LEFT, RIGHT, FULL, NATURAL, CROSS).
   */
  join(
    table: string,
    condition: string,
    type?: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL' | 'NATURAL' | 'CROSS',
  ): IQueryBuilder;

  /**
   * Adds a GROUP BY clause to the query.
   * @param columns The columns to group by.
   */
  groupBy(columns: string | string[]): IQueryBuilder;

  /**
   * Adds a HAVING clause to the query.
   * @param condition The condition to apply in the HAVING clause.
   * @param params Optional parameters for the condition.
   */
  having(condition: string, params?: any[]): IQueryBuilder;

  /**
   * Adds a COUNT function to the query.
   * @param column The column to count.
   * @param alias An optional alias for the result.
   */
  count(column?: string, alias?: string): IQueryBuilder;

  /**
   * Adds an INSERT INTO statement to the query.
   * @param table The table to insert into.
   * @param columns The columns to insert values into.
   * @param values The values to insert.
   */
  insertInto(table: string, columns: string[], values: any[][]): IQueryBuilder;

  /**
   * Adds an UPDATE statement to the query.
   * @param table The table to update.
   * @param updates The columns and values to update.
   * @param where The WHERE clause for the update.
   * @param whereParams The parameters for the WHERE clause.
   */
  update(
    table: string,
    updates: Record<string, any>,
    where: string,
    whereParams: any[],
  ): IQueryBuilder;

  /**
   * Adds a DELETE FROM statement to the query.
   * @param table The table to delete from.
   */
  deleteFrom(table: string): IQueryBuilder;

  /**
   * Adds an UPSERT (merge) statement to the query.
   * @param table The table to upsert into.
   * @param insertColumns The columns to insert.
   * @param insertValues The values to insert.
   * @param conflictTarget The target column(s) for conflict detection.
   * @param updateColumns The columns to update if a conflict is detected.
   * @param updateValues The values to update.
   */
  upsert(
    table: string,
    insertColumns: string[],
    insertValues: any[][],
    conflictTarget: string,
    updateColumns: string[],
    updateValues: any[],
  ): IQueryBuilder;

  /**
   * Adds a subquery to the main query.
   * @param subquery The subquery to add.
   * @param alias The alias for the subquery.
   */
  subquery(subquery: IQueryBuilder, alias: string): IQueryBuilder;

  /**
   * Uses a database function in the query.
   * @param func The function to use.
   * @param alias An optional alias for the result.
   */
  useFunction(func: string, alias?: string): IQueryBuilder;

  /**
   * Builds the final SQL query and returns the query string along with the associated parameters.
   * @returns An object containing the query string and parameters.
   */
  build(): { query: string; params: Record<string, any> };
}
