import { SqlInjectionChecker } from "../utils/sql-injection-checker";
import { Db2QueryBuilderInterface } from "../interfaces";

export class Db2QueryBuilder implements Db2QueryBuilderInterface {
  private query: string;
  private params: Record<string, any>;
  private hasWhereClause: boolean;
  private namedParamsCounter: number;
  private schema: string;
  private sqlInjectionChecker: SqlInjectionChecker;

  public constructor() {
    this.sqlInjectionChecker = new SqlInjectionChecker();
    this.reset();
  }

  public reset(): Db2QueryBuilder {
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

  public select(
    columns: string | string[] | Record<string, string>
  ): Db2QueryBuilder {
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

  public distinct(): Db2QueryBuilder {
    this.query = this.query.replace(/^SELECT /, "SELECT DISTINCT ");
    return this;
  }

  public useSchema(schemaName: string): Db2QueryBuilder {
    this.schema = schemaName;
    return this;
  }

  public from(table: string, alias?: string): Db2QueryBuilder {
    this.sqlInjectionChecker.validateParams([table]);
    const schemaPrefix = this.schema ? `${this.schema}.` : "";
    this.query += `FROM ${schemaPrefix}${table} ${alias ? `AS ${alias} ` : ""}`;
    return this;
  }

  public where(condition: string, params: any[] = []): Db2QueryBuilder {
    if (this.hasWhereClause) {
      throw new Error(
        "WHERE clause already exists. Use and() or or() to add more conditions."
      );
    }
    this.sqlInjectionChecker.validateParams(params);
    this.query += `WHERE ${condition} `;
    params.forEach((param) => this.addParam(param));
    this.hasWhereClause = true;
    return this;
  }

  public and(condition: string, params: any[] = []): Db2QueryBuilder {
    if (!this.hasWhereClause) {
      throw new Error("Cannot use AND without a preceding WHERE clause.");
    }
    this.sqlInjectionChecker.validateParams(params);
    this.query += `AND ${condition} `;
    params.forEach((param) => this.addParam(param));
    return this;
  }

  public or(condition: string, params: any[] = []): Db2QueryBuilder {
    if (!this.hasWhereClause) {
      throw new Error("Cannot use OR without a preceding WHERE clause.");
    }
    this.sqlInjectionChecker.validateParams(params);
    this.query += `OR ${condition} `;
    params.forEach((param) => this.addParam(param));
    return this;
  }

  public orderBy(
    column: string,
    direction: "ASC" | "DESC" = "ASC"
  ): Db2QueryBuilder {
    this.sqlInjectionChecker.validateParams([column, direction]);
    this.query += `ORDER BY ${column} ${direction} `;
    return this;
  }

  public limit(limit: number): Db2QueryBuilder {
    this.sqlInjectionChecker.validateParams([limit]);
    this.query += `LIMIT ${limit} `;
    return this;
  }

  public offset(offset: number): Db2QueryBuilder {
    this.sqlInjectionChecker.validateParams([offset]);
    this.query += `OFFSET ${offset} `;
    return this;
  }

  public join(
    table: string,
    condition: string,
    type: "INNER" | "LEFT" | "RIGHT" | "FULL" | "NATURAL" | "CROSS" = "INNER"
  ): Db2QueryBuilder {
    this.sqlInjectionChecker.validateParams([table, condition, type]);
    this.query += `${type} JOIN ${table} ON ${condition} `;
    return this;
  }

  public groupBy(columns: string | string[]): Db2QueryBuilder {
    const cols = Array.isArray(columns) ? columns.join(", ") : columns;
    this.sqlInjectionChecker.validateParams([cols]);
    this.query += `GROUP BY ${cols} `;
    return this;
  }

  public having(condition: string, params: any[] = []): Db2QueryBuilder {
    this.sqlInjectionChecker.validateParams(params);
    this.query += `HAVING ${condition} `;
    params.forEach((param) => {
      const paramName = this.addParam(param);
      this.query = this.query.replace("?", `:${paramName}`);
    });
    return this;
  }

  public count(column: string = "*", alias?: string): Db2QueryBuilder {
    this.sqlInjectionChecker.validateParams([column]);
    this.query += `COUNT(${column}) ${alias ? `AS ${alias} ` : ""}`;
    return this;
  }

  public insertInto(
    table: string,
    columns: string[],
    values: any[][]
  ): Db2QueryBuilder {
    this.sqlInjectionChecker.validateParams([table, ...columns, ...values]);
    const placeholders = columns.map(() => "?").join(", ");
    this.query += `INSERT INTO ${table} (${columns.join(", ")}) VALUES `;
    this.query += values.map(() => `(${placeholders})`).join(", ");
    this.params.push(...values.flat());
    return this;
  }

  public update(
    table: string,
    updates: Record<string, any>,
    where: string,
    whereParams: any[]
  ): Db2QueryBuilder {
    this.sqlInjectionChecker.validateParams([
      table,
      ...Object.keys(updates),
      ...Object.values(updates),
      where,
      ...whereParams,
    ]);
    const setClause = Object.keys(updates)
      .map((key) => `${key} = ?`)
      .join(", ");
    this.query += `UPDATE ${table} SET ${setClause} WHERE ${where} `;
    this.params.push(...Object.values(updates), ...whereParams);
    return this;
  }

  public deleteFrom(table: string): Db2QueryBuilder {
    this.sqlInjectionChecker.validateParams([table]);
    this.query += `DELETE FROM ${table} `;
    return this;
  }

  public upsert(
    table: string,
    insertColumns: string[],
    insertValues: any[][],
    conflictTarget: string,
    updateColumns: string[],
    updateValues: any[]
  ): Db2QueryBuilder {
    this.sqlInjectionChecker.validateParams([
      table,
      ...insertColumns,
      ...insertValues.flat(),
      conflictTarget,
      ...updateColumns,
      ...updateValues,
    ]);
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

  public subquery(subquery: Db2QueryBuilder, alias: string): Db2QueryBuilder {
    const { query: subQueryStr, params: subQueryParams } = subquery.build();
    this.query += `(${subQueryStr}) AS ${alias} `;
    Object.assign(this.params, subQueryParams);
    return this;
  }

  public useFunction(func: string, alias?: string): Db2QueryBuilder {
    this.sqlInjectionChecker.validateParams([func]);
    this.query += `${func} ${alias ? `AS ${alias} ` : ""}`;
    return this;
  }

  public build(): { query: string; params: Record<string, any> } {
    let finalQuery = this.query;
    for (const [key, _value] of Object.entries(this.params)) {
      const placeholder = `:${key}`;
      finalQuery = finalQuery.replace(new RegExp(placeholder, "g"), "?");
    }
    return { query: finalQuery, params: this.params };
  }
}
