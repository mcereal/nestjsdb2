// src/services/db2.query-builder.ts

import { Db2Service } from "src/services/db2.service";

export class Db2QueryBuilder {
  private query: string;
  private params: Record<string, any>;
  private hasWhereClause: boolean;
  private namedParamsCounter: number;
  private schema: string;

  constructor() {
    this.reset();
  }

  reset(): Db2QueryBuilder {
    this.query = "";
    this.params = {};
    this.hasWhereClause = false;
    this.namedParamsCounter = 0;
    return this;
  }

  private generateParamName(): string {
    return `param${this.namedParamsCounter++}`;
  }

  private addParam(value: any): string {
    const paramName = this.generateParamName();
    this.params[paramName] = value;
    return paramName;
  }

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

  distinct(): Db2QueryBuilder {
    this.query = this.query.replace(/^SELECT /, "SELECT DISTINCT ");
    return this;
  }

  useSchema(schemaName: string): Db2QueryBuilder {
    this.schema = schemaName;
    return this;
  }

  from(table: string, alias?: string): Db2QueryBuilder {
    const schemaPrefix = this.schema ? `${this.schema}.` : "";
    this.query += `FROM ${schemaPrefix}${table} ${alias ? `AS ${alias} ` : ""}`;
    return this;
  }

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

  and(condition: string, params: any[] = []): Db2QueryBuilder {
    if (!this.hasWhereClause) {
      throw new Error("Cannot use AND without a preceding WHERE clause.");
    }
    this.validateParams(params); // Validate parameters
    this.query += `AND ${condition} `;
    params.forEach((param) => this.addParam(param)); // Add parameters with validation
    return this;
  }

  or(condition: string, params: any[] = []): Db2QueryBuilder {
    if (!this.hasWhereClause) {
      throw new Error("Cannot use OR without a preceding WHERE clause.");
    }
    this.validateParams(params); // Validate parameters
    this.query += `OR ${condition} `;
    params.forEach((param) => this.addParam(param)); // Add parameters with validation
    return this;
  }

  orderBy(column: string, direction: "ASC" | "DESC" = "ASC"): Db2QueryBuilder {
    this.query += `ORDER BY ${column} ${direction} `;
    return this;
  }

  limit(limit: number): Db2QueryBuilder {
    this.query += `LIMIT ${limit} `;
    return this;
  }

  offset(offset: number): Db2QueryBuilder {
    this.query += `OFFSET ${offset} `;
    return this;
  }

  join(
    table: string,
    condition: string,
    type: "INNER" | "LEFT" | "RIGHT" | "FULL" | "NATURAL" | "CROSS" = "INNER"
  ): Db2QueryBuilder {
    this.query += `${type} JOIN ${table} ON ${condition} `;
    return this;
  }

  groupBy(columns: string | string[]): Db2QueryBuilder {
    const cols = Array.isArray(columns) ? columns.join(", ") : columns;
    this.query += `GROUP BY ${cols} `;
    return this;
  }

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

  subquery(subquery: Db2QueryBuilder, alias: string): Db2QueryBuilder {
    const { query: subQueryStr, params: subQueryParams } = subquery.build();

    this.query += `(${subQueryStr}) AS ${alias} `;
    Object.assign(this.params, subQueryParams); // Merge subquery parameters into main parameters

    return this;
  }

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

  like(column: string, pattern: string): Db2QueryBuilder {
    if (!this.hasWhereClause) {
      throw new Error("Cannot use LIKE without a preceding WHERE clause.");
    }
    this.query += `${column} LIKE ? `;
    this.params.push(pattern);
    return this;
  }

  count(column: string = "*", alias?: string): Db2QueryBuilder {
    this.query += `COUNT(${column}) ${alias ? `AS ${alias} ` : ""}`;
    return this;
  }

  build(): { query: string; params: Record<string, any> } {
    let finalQuery = this.query;
    for (const [key, value] of Object.entries(this.params)) {
      const placeholder = `:${key}`;
      finalQuery = finalQuery.replace(new RegExp(placeholder, "g"), "?");
    }
    return { query: finalQuery, params: this.params };
  }

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

  async execute<T>(dbService: Db2Service): Promise<T> {
    const { query, params } = this.build();

    // Convert named parameters to positional parameters for dbService if required
    const positionalParams = Object.values(params);

    return dbService.query<T>(query, positionalParams);
  }

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
