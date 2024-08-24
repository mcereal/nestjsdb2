// src/services/db2.query-builder.ts

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
 * @requires Db2Service
 *
 * @example
 * const queryBuilder = new Db2QueryBuilder();
 * queryBuilder
 *  .select("id", "name")
 * .from("users")
 * .where("age > ?", [18])
 * .orderBy("name", "ASC")
 * .limit(10);
 *
 * const { query, params } = queryBuilder.build();
 * console.log(query); // SELECT id, name FROM users WHERE age > ? ORDER BY name ASC LIMIT 10
 *
 * const results = await queryBuilder.execute<User>(dbService);
 * console.log(results); // [{ id: 1, name: "Alice" }, { id: 2, name: "Bob" }]
 *
 */

import { Db2Service } from "src/services/db2.service";

/**
 * @class Db2QueryBuilder
 * @classdesc A fluent interface for building and executing SQL queries for Db2 databases.
 * This class provides methods for constructing various SQL clauses, such as SELECT, WHERE, JOIN,
 * GROUP BY, ORDER BY, and more. The query builder supports subqueries, parameterized queries,
 * and conditional clauses, allowing for flexible and dynamic query generation.
 *
 * @example
 * const queryBuilder = new Db2QueryBuilder();
 * queryBuilder
 * .select("id", "name")
 * .from("users")
 * .where("age > ?", [18])
 * .orderBy("name", "ASC")
 * .limit(10);
 *
 * const { query, params } = queryBuilder.build();
 * console.log(query); // SELECT id, name FROM users WHERE age > ? ORDER BY name ASC LIMIT 10
 *
 * const results = await queryBuilder.execute<User>(dbService);
 * console.log(results); // [{ id: 1, name: "Alice" }, { id: 2, name: "Bob" }]
 *
 */
export class Db2QueryBuilder {
  private query: string;
  private params: Record<string, any>;
  private hasWhereClause: boolean;
  private namedParamsCounter: number;
  private schema: string;

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
    this.params = {};
    this.hasWhereClause = false;
    this.namedParamsCounter = 0;
    return this;
  }

  /**
   * Generates a unique parameter name.
   * @returns A string representing a unique parameter name.
   */
  private generateParamName(): string {
    return `param${this.namedParamsCounter++}`;
  }

  /**
   * Adds a parameter to the query.
   * @param value - The value of the parameter to add.
   * @returns The parameter name used for the value.
   */
  private addParam(value: any): string {
    const paramName = this.generateParamName();
    this.params[paramName] = value;
    return paramName;
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
   * Sets the schema for the query.
   * @param schemaName - The name of the schema to use.
   * @returns The Db2QueryBuilder instance for method chaining.
   */
  useSchema(schemaName: string): Db2QueryBuilder {
    this.schema = schemaName;
    return this;
  }

  /**
   * Specifies the table to select from, with an optional alias.
   * @param table - The name of the table.
   * @param alias - Optional alias for the table.
   * @returns The Db2QueryBuilder instance for method chaining.
   */
  from(table: string, alias?: string): Db2QueryBuilder {
    const schemaPrefix = this.schema ? `${this.schema}.` : "";
    this.query += `FROM ${schemaPrefix}${table} ${alias ? `AS ${alias} ` : ""}`;
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
    this.validateParams(params); // Validate parameters
    this.query += `WHERE ${condition} `;
    params.forEach((param) => this.addParam(param)); // Add parameters with validation
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
    this.validateParams(params); // Validate parameters
    this.query += `AND ${condition} `;
    params.forEach((param) => this.addParam(param)); // Add parameters with validation
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
    this.validateParams(params); // Validate parameters
    this.query += `OR ${condition} `;
    params.forEach((param) => this.addParam(param)); // Add parameters with validation
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
    // Validate parameters
    this.validateParams(params);

    this.query += `HAVING ${condition} `;

    // Add parameters using named placeholders
    params.forEach((param) => {
      const paramName = this.addParam(param);
      this.query = this.query.replace("?", `:${paramName}`);
    });

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
    Object.assign(this.params, subQueryParams); // Merge subquery parameters into main parameters

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
      this.validateParams(values); // Validate values
      const paramNames = values.map((value) => `:${this.addParam(value)}`);
      this.query += `${column} IN (${paramNames.join(", ")}) `;
    } else {
      const { query: subQueryStr, params: subQueryParams } = values.build();
      this.query += `${column} IN (${subQueryStr}) `;
      Object.assign(this.params, subQueryParams);
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
      this.validateParams(values); // Validate values
      const paramNames = values.map((value) => `:${this.addParam(value)}`);
      this.query += `${column} NOT IN (${paramNames.join(", ")}) `;
    } else {
      const { query: subQueryStr, params: subQueryParams } = values.build();
      this.query += `${column} NOT IN (${subQueryStr}) `;
      Object.assign(this.params, subQueryParams); // Merge subquery params into main params
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

    // Validate parameters
    this.validateParams([start, end]);

    // Generate parameter names and add to params
    const startParamName = this.addParam(start);
    const endParamName = this.addParam(end);

    this.query += `${column} BETWEEN :${startParamName} AND :${endParamName} `;

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
   * Build the final query string by replacing named parameters.
   * @returns An object containing the query string with placeholders replaced and parameters.
   */
  build(): { query: string; params: Record<string, any> } {
    let finalQuery = this.query;
    for (const [key, value] of Object.entries(this.params)) {
      const placeholder = `:${key}`;
      finalQuery = finalQuery.replace(new RegExp(placeholder, "g"), "?");
    }
    return { query: finalQuery, params: this.params };
  }

  /**
   * Adds an INSERT INTO statement for bulk inserts.
   * @param table - The table to insert into.
   * @param columns - The columns to insert values into.
   * @param values - An array of value arrays to insert in bulk.
   * @returns The Db2QueryBuilder instance for method chaining.
   */
  insertInto(
    table: string,
    columns: string[],
    values: any[][]
  ): Db2QueryBuilder {
    const placeholders = columns.map(() => "?").join(", ");
    this.query += `INSERT INTO ${table} (${columns.join(", ")}) VALUES `;
    this.query += values.map(() => `(${placeholders})`).join(", ");
    this.params.push(...values.flat());
    return this;
  }

  /**
   * Adds an UPDATE statement for batch updates.
   * @param table - The table to update.
   * @param updates - An object mapping columns to their new values.
   * @param where - The condition to update rows.
   * @returns The Db2QueryBuilder instance for method chaining.
   */
  update(
    table: string,
    updates: Record<string, any>,
    where: string,
    whereParams: any[]
  ): Db2QueryBuilder {
    const setClause = Object.keys(updates)
      .map((key) => `${key} = ?`)
      .join(", ");
    this.query += `UPDATE ${table} SET ${setClause} WHERE ${where} `;
    this.params.push(...Object.values(updates), ...whereParams);
    return this;
  }

  /**
   * Executes the built query using a provided Db2Service instance.
   * @param dbService - The Db2Service instance to execute the query on.
   * @returns The results of the query execution.
   * @throws Error if the query execution fails.
   */
  async execute<T>(dbService: Db2Service): Promise<T> {
    const { query, params } = this.build();

    // Convert named parameters to positional parameters for dbService if required
    const positionalParams = Object.values(params);

    return dbService.query<T>(query, positionalParams);
  }

  /**
   * Wraps query execution in a transaction.
   * @param dbService - The Db2Service instance to execute the query on.
   * @param operation - The operation to execute as a part of the transaction.
   * @returns The result of the transaction operation.
   * @throws Error if the transaction fails.
   */
  async inTransaction<T>(
    dbService: Db2Service,
    operation: () => Promise<T>
  ): Promise<T> {
    await dbService.beginTransaction();
    try {
      const result = await operation();
      await dbService.commitTransaction();
      return result;
    } catch (error) {
      await dbService.rollbackTransaction();
      throw error;
    }
  }

  /**
   * Validates the parameters to ensure they meet specific requirements.
   * Throws an error if any parameter is invalid.
   * @param params - The array of parameters to validate.
   * @throws Error if a parameter is null, undefined, or of an invalid type.
   */
  private validateParams(params: any[]): void {
    params.forEach((param) => {
      if (param === undefined || param === null) {
        throw new Error("Parameter value cannot be null or undefined");
      }

      // Check for allowed types
      const allowedTypes = ["string", "number", "boolean", "object"];
      if (!allowedTypes.includes(typeof param)) {
        throw new Error(`Invalid parameter type: ${typeof param}`);
      }

      // Check for object type specifics
      if (typeof param === "object" && !(param instanceof Date)) {
        throw new Error("Only Date objects are allowed as parameter objects");
      }

      // Add more validations as necessary
      // Example: Check string length
      if (typeof param === "string" && param.length > 255) {
        throw new Error("String parameter value exceeds maximum length of 255");
      }
    });
  }
}
