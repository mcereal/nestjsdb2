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
    this.validateParams(params);
    this.query += `WHERE ${condition} `;
    params.forEach((param) => this.addParam(param));
    this.hasWhereClause = true;
    return this;
  }

  and(condition: string, params: any[] = []): Db2QueryBuilder {
    if (!this.hasWhereClause) {
      throw new Error("Cannot use AND without a preceding WHERE clause.");
    }
    this.validateParams(params);
    this.query += `AND ${condition} `;
    params.forEach((param) => this.addParam(param));
    return this;
  }

  or(condition: string, params: any[] = []): Db2QueryBuilder {
    if (!this.hasWhereClause) {
      throw new Error("Cannot use OR without a preceding WHERE clause.");
    }
    this.validateParams(params);
    this.query += `OR ${condition} `;
    params.forEach((param) => this.addParam(param));
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
    this.validateParams(params);
    this.query += `HAVING ${condition} `;
    params.forEach((param) => {
      const paramName = this.addParam(param);
      this.query = this.query.replace("?", `:${paramName}`);
    });
    return this;
  }

  count(column: string = "*", alias?: string): Db2QueryBuilder {
    this.query += `COUNT(${column}) ${alias ? `AS ${alias} ` : ""}`;
    return this;
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

  deleteFrom(table: string): Db2QueryBuilder {
    this.query += `DELETE FROM ${table} `;
    return this;
  }

  upsert(
    table: string,
    insertColumns: string[],
    insertValues: any[][],
    conflictTarget: string,
    updateColumns: string[],
    updateValues: any[]
  ): Db2QueryBuilder {
    const insertPlaceholder = insertColumns.map(() => "?").join(", ");
    const updatePlaceholder = updateColumns
      .map((col) => `${col} = EXCLUDED.${col}`)
      .join(", ");
    this.query += `INSERT INTO ${table} (${insertColumns.join(", ")}) VALUES `;
    this.query += insertValues.map(() => `(${insertPlaceholder})`).join(", ");
    this.query += ` ON CONFLICT (${conflictTarget}) DO UPDATE SET ${updatePlaceholder}`;
    this.params.push(...insertValues.flat(), ...updateValues);
    return this;
  }

  subquery(subquery: Db2QueryBuilder, alias: string): Db2QueryBuilder {
    const { query: subQueryStr, params: subQueryParams } = subquery.build();
    this.query += `(${subQueryStr}) AS ${alias} `;
    Object.assign(this.params, subQueryParams);
    return this;
  }

  useFunction(func: string, alias?: string): Db2QueryBuilder {
    this.query += `${func} ${alias ? `AS ${alias} ` : ""}`;
    return this;
  }

  build(): { query: string; params: Record<string, any> } {
    let finalQuery = this.query;
    for (const [key, _value] of Object.entries(this.params)) {
      const placeholder = `:${key}`;
      finalQuery = finalQuery.replace(new RegExp(placeholder, "g"), "?");
    }
    return { query: finalQuery, params: this.params };
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

      // Handle specific object types
      if (typeof param === "object") {
        if (param instanceof Date) {
          if (isNaN(param.getTime())) {
            throw new Error("Invalid Date object");
          }
        } else if (Array.isArray(param)) {
          this.validateParams(param);
        } else {
          throw new Error(
            "Only Date objects and arrays are allowed as parameter objects"
          );
        }
      }

      // Check for SQL injection patterns in strings (basic example)
      if (typeof param === "string") {
        if (/[\;\-\-\'\"]/.test(param)) {
          throw new Error(
            "String parameter contains potentially harmful characters"
          );
        }
        if (param.length > 255) {
          throw new Error(
            "String parameter value exceeds maximum length of 255"
          );
        }
        if (!/^[\x20-\x7E]*$/.test(param)) {
          throw new Error("String parameter contains non-ASCII characters");
        }
      }

      // Range checks for numbers
      if (typeof param === "number") {
        if (!Number.isFinite(param)) {
          throw new Error("Number parameter is not finite");
        }
        if (param < -1e9 || param > 1e9) {
          throw new Error("Number parameter is out of valid range");
        }
      }
    });
  }
}
