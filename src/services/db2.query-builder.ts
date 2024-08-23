/**
 * @fileoverview This file contains the implementation of the Db2QueryBuilder class.
 * This class provides a fluent interface for building and executing SQL queries
 * specifically for Db2 databases. It includes methods for constructing various SQL clauses,
 * such as SELECT, WHERE, JOIN, GROUP BY, ORDER BY, and more. The query builder also supports
 * subqueries, parameterized queries, and conditional clauses.
 *
 * @class Db2QueryBuilder
 *
 * @exports Db2QueryBuilder
 */

export class Db2QueryBuilder {
  private query: string;
  private params: any[];
  private hasWhereClause: boolean;

  constructor() {
    this.reset();
  }

  /**
   * Resets the query builder to its initial state.
   * This method clears the current query string, parameters, and the WHERE clause flag.
   * @returns The Db2QueryBuilder instance for method chaining.
   */
  reset(): Db2QueryBuilder {
    this.query = "";
    this.params = [];
    this.hasWhereClause = false;
    return this;
  }

  /**
   * Specifies the columns to be selected, with optional aliasing.
   * @param columns - A single column name, an array of column names, or an object mapping column names to aliases.
   * @returns The Db2QueryBuilder instance for method chaining.
   */
  select(columns: string | string[] | Record<string, string>): Db2QueryBuilder {
    if (typeof columns === "string") {
      this.query += `SELECT ${columns} `;
    } else if (Array.isArray(columns)) {
      this.query += `SELECT ${columns.join(", ")} `;
    } else {
      const cols = Object.entries(columns)
        .map(([col, alias]) => `${col} AS ${alias}`)
        .join(", ");
      this.query += `SELECT ${cols} `;
    }
    return this;
  }

  /**
   * Adds the DISTINCT keyword to the select statement to remove duplicate rows from the result set.
   * @returns The Db2QueryBuilder instance for method chaining.
   */
  distinct(): Db2QueryBuilder {
    this.query = this.query.replace(/^SELECT /, "SELECT DISTINCT ");
    return this;
  }

  /**
   * Specifies the table to select from, with an optional alias.
   * @param table - The name of the table.
   * @param alias - Optional alias for the table.
   * @returns The Db2QueryBuilder instance for method chaining.
   */
  from(table: string, alias?: string): Db2QueryBuilder {
    this.query += `FROM ${table} ${alias ? `AS ${alias} ` : ""}`;
    return this;
  }

  /**
   * Adds a WHERE clause to the query to filter results based on specified conditions.
   * Throws an error if a WHERE clause already exists.
   * @param condition - The condition to filter results by.
   * @param params - Optional parameters for the condition.
   * @returns The Db2QueryBuilder instance for method chaining.
   * @throws Error if a WHERE clause already exists.
   */
  where(condition: string, params: any[] = []): Db2QueryBuilder {
    if (this.hasWhereClause) {
      throw new Error(
        "WHERE clause already exists. Use and() or or() to add more conditions."
      );
    }
    this.query += `WHERE ${condition} `;
    this.params.push(...params);
    this.hasWhereClause = true;
    return this;
  }

  /**
   * Adds an AND condition to the existing WHERE clause.
   * @param condition - The condition to add.
   * @param params - Optional parameters for the condition.
   * @returns The Db2QueryBuilder instance for method chaining.
   * @throws Error if no WHERE clause exists.
   */
  and(condition: string, params: any[] = []): Db2QueryBuilder {
    if (!this.hasWhereClause) {
      throw new Error("Cannot use AND without a preceding WHERE clause.");
    }
    this.query += `AND ${condition} `;
    this.params.push(...params);
    return this;
  }

  /**
   * Adds an OR condition to the existing WHERE clause.
   * @param condition - The condition to add.
   * @param params - Optional parameters for the condition.
   * @returns The Db2QueryBuilder instance for method chaining.
   * @throws Error if no WHERE clause exists.
   */
  or(condition: string, params: any[] = []): Db2QueryBuilder {
    if (!this.hasWhereClause) {
      throw new Error("Cannot use OR without a preceding WHERE clause.");
    }
    this.query += `OR ${condition} `;
    this.params.push(...params);
    return this;
  }

  /**
   * Specifies the ordering of the results.
   * @param column - The column to order by.
   * @param direction - The direction to order by (ASC or DESC).
   * @returns The Db2QueryBuilder instance for method chaining.
   */
  orderBy(column: string, direction: "ASC" | "DESC" = "ASC"): Db2QueryBuilder {
    this.query += `ORDER BY ${column} ${direction} `;
    return this;
  }

  /**
   * Adds a LIMIT clause to the query to limit the number of rows returned.
   * @param limit - The maximum number of rows to return.
   * @returns The Db2QueryBuilder instance for method chaining.
   */
  limit(limit: number): Db2QueryBuilder {
    this.query += `LIMIT ${limit} `;
    return this;
  }

  /**
   * Adds an OFFSET clause to the query to skip a specified number of rows.
   * @param offset - The number of rows to skip before starting to return rows.
   * @returns The Db2QueryBuilder instance for method chaining.
   */
  offset(offset: number): Db2QueryBuilder {
    this.query += `OFFSET ${offset} `;
    return this;
  }

  /**
   * Adds a JOIN clause to the query to join another table.
   * @param table - The table to join.
   * @param condition - The condition for the join.
   * @param type - The type of join (INNER, LEFT, RIGHT, FULL, NATURAL, CROSS).
   * @returns The Db2QueryBuilder instance for method chaining.
   */
  join(
    table: string,
    condition: string,
    type: "INNER" | "LEFT" | "RIGHT" | "FULL" | "NATURAL" | "CROSS" = "INNER"
  ): Db2QueryBuilder {
    this.query += `${type} JOIN ${table} ON ${condition} `;
    return this;
  }

  /**
   * Adds a GROUP BY clause to the query to group results by specified columns.
   * @param columns - The column(s) to group by.
   * @returns The Db2QueryBuilder instance for method chaining.
   */
  groupBy(columns: string | string[]): Db2QueryBuilder {
    const cols = Array.isArray(columns) ? columns.join(", ") : columns;
    this.query += `GROUP BY ${cols} `;
    return this;
  }

  /**
   * Adds a HAVING clause to the query for filtering grouped results.
   * @param condition - The condition to filter grouped results.
   * @param params - Optional parameters for the condition.
   * @returns The Db2QueryBuilder instance for method chaining.
   */
  having(condition: string, params: any[] = []): Db2QueryBuilder {
    this.query += `HAVING ${condition} `;
    this.params.push(...params);
    return this;
  }

  /**
   * Adds a subquery to the query.
   * @param subquery - The subquery to be added.
   * @param alias - Alias for the subquery result set.
   * @returns The Db2QueryBuilder instance for method chaining.
   */
  subquery(subquery: Db2QueryBuilder, alias: string): Db2QueryBuilder {
    const { query: subQueryStr, params: subQueryParams } = subquery.build();
    this.query += `(${subQueryStr}) AS ${alias} `;
    this.params.push(...subQueryParams);
    return this;
  }

  /**
   * Adds a condition for values IN a set (subquery or list).
   * @param column - The column to check.
   * @param values - The set of values or subquery.
   * @returns The Db2QueryBuilder instance for method chaining.
   * @throws Error if no WHERE clause exists.
   */
  in(column: string, values: any[] | Db2QueryBuilder): Db2QueryBuilder {
    if (!this.hasWhereClause) {
      throw new Error("Cannot use IN without a preceding WHERE clause.");
    }
    if (Array.isArray(values)) {
      this.query += `${column} IN (${values.map(() => "?").join(", ")}) `;
      this.params.push(...values);
    } else {
      const { query: subQueryStr, params: subQueryParams } = values.build();
      this.query += `${column} IN (${subQueryStr}) `;
      this.params.push(...subQueryParams);
    }
    return this;
  }

  /**
   * Adds a condition for values NOT IN a set (subquery or list).
   * @param column - The column to check.
   * @param values - The set of values or subquery.
   * @returns The Db2QueryBuilder instance for method chaining.
   * @throws Error if no WHERE clause exists.
   */
  notIn(column: string, values: any[] | Db2QueryBuilder): Db2QueryBuilder {
    if (!this.hasWhereClause) {
      throw new Error("Cannot use NOT IN without a preceding WHERE clause.");
    }
    if (Array.isArray(values)) {
      this.query += `${column} NOT IN (${values.map(() => "?").join(", ")}) `;
      this.params.push(...values);
    } else {
      const { query: subQueryStr, params: subQueryParams } = values.build();
      this.query += `${column} NOT IN (${subQueryStr}) `;
      this.params.push(...subQueryParams);
    }
    return this;
  }

  /**
   * Adds a BETWEEN condition to the query.
   * @param column - The column to check.
   * @param start - The starting value of the range.
   * @param end - The ending value of the range.
   * @returns The Db2QueryBuilder instance for method chaining.
   * @throws Error if no WHERE clause exists.
   */
  between(column: string, start: any, end: any): Db2QueryBuilder {
    if (!this.hasWhereClause) {
      throw new Error("Cannot use BETWEEN without a preceding WHERE clause.");
    }
    this.query += `${column} BETWEEN ? AND ? `;
    this.params.push(start, end);
    return this;
  }

  /**
   * Adds a LIKE condition to the query.
   * @param column - The column to check.
   * @param pattern - The pattern to match.
   * @returns The Db2QueryBuilder instance for method chaining.
   * @throws Error if no WHERE clause exists.
   */
  like(column: string, pattern: string): Db2QueryBuilder {
    if (!this.hasWhereClause) {
      throw new Error("Cannot use LIKE without a preceding WHERE clause.");
    }
    this.query += `${column} LIKE ? `;
    this.params.push(pattern);
    return this;
  }

  /**
   * Adds a COUNT aggregate function to the query.
   * @param column - The column to count.
   * @param alias - Optional alias for the count result.
   * @returns The Db2QueryBuilder instance for method chaining.
   */
  count(column: string = "*", alias?: string): Db2QueryBuilder {
    this.query += `COUNT(${column}) ${alias ? `AS ${alias} ` : ""}`;
    return this;
  }

  /**
   * Builds the final query string and returns it along with parameters.
   * Trims extra spaces and appends a semicolon to the end of the query.
   * @returns An object containing the query string and parameters.
   */
  build(): { query: string; params: any[] } {
    return {
      query: this.query.trim() + ";",
      params: this.params,
    };
  }

  /**
   * Executes the built query using a provided database connection.
   * @param dbConnection - The database connection to execute the query on.
   * @returns The results of the query execution.
   * @throws Error if the query execution fails.
   */
  async execute(dbConnection: any): Promise<any> {
    const { query, params } = this.build();
    return dbConnection.query(query, params);
  }
}
