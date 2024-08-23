export class Db2QueryBuilder {
  private query: string;
  private params: any[];
  private hasWhereClause: boolean;

  constructor() {
    this.reset();
  }

  /**
   * Resets the query builder to its initial state.
   */
  reset(): Db2QueryBuilder {
    this.query = "";
    this.params = [];
    this.hasWhereClause = false;
    return this;
  }

  /**
   * Specifies the columns to be selected, with optional aliasing.
   * @param columns - A single column, an array of columns, or an object mapping columns to aliases.
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
   * Adds the DISTINCT keyword to the select statement.
   */
  distinct(): Db2QueryBuilder {
    this.query = this.query.replace(/^SELECT /, "SELECT DISTINCT ");
    return this;
  }

  /**
   * Specifies the table to select from, with an optional alias.
   * @param table - The name of the table.
   * @param alias - Optional alias for the table.
   */
  from(table: string, alias?: string): Db2QueryBuilder {
    this.query += `FROM ${table} ${alias ? `AS ${alias} ` : ""}`;
    return this;
  }

  /**
   * Adds a WHERE clause to the query.
   * @param condition - The condition to filter results by.
   * @param params - Optional parameters for the condition.
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
   * Adds an AND condition to the WHERE clause.
   * @param condition - The condition to add.
   * @param params - Optional parameters for the condition.
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
   * Adds an OR condition to the WHERE clause.
   * @param condition - The condition to add.
   * @param params - Optional parameters for the condition.
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
   */
  orderBy(column: string, direction: "ASC" | "DESC" = "ASC"): Db2QueryBuilder {
    this.query += `ORDER BY ${column} ${direction} `;
    return this;
  }

  /**
   * Adds a LIMIT clause to the query.
   * @param limit - The maximum number of rows to return.
   */
  limit(limit: number): Db2QueryBuilder {
    this.query += `LIMIT ${limit} `;
    return this;
  }

  /**
   * Adds an OFFSET clause to the query.
   * @param offset - The number of rows to skip before starting to return rows.
   */
  offset(offset: number): Db2QueryBuilder {
    this.query += `OFFSET ${offset} `;
    return this;
  }

  /**
   * Adds a JOIN clause to the query.
   * @param table - The table to join.
   * @param condition - The condition for the join.
   * @param type - The type of join (INNER, LEFT, RIGHT, FULL, NATURAL, CROSS).
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
   * Adds a GROUP BY clause to the query.
   * @param columns - The column(s) to group by.
   */
  groupBy(columns: string | string[]): Db2QueryBuilder {
    const cols = Array.isArray(columns) ? columns.join(", ") : columns;
    this.query += `GROUP BY ${cols} `;
    return this;
  }

  /**
   * Adds a HAVING clause to the query for use with GROUP BY.
   * @param condition - The condition to filter grouped results.
   * @param params - Optional parameters for the condition.
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
   */
  count(column: string = "*", alias?: string): Db2QueryBuilder {
    this.query += `COUNT(${column}) ${alias ? `AS ${alias} ` : ""}`;
    return this;
  }

  /**
   * Builds the final query string and returns it along with parameters.
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
   * @returns The results of the query.
   */
  async execute(dbConnection: any): Promise<any> {
    const { query, params } = this.build();
    return dbConnection.query(query, params);
  }
}
