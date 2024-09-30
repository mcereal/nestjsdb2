// src/modules/db2/query-builder.ts

import { Db2Client } from '../db';
import { IQueryBuilder } from '../interfaces';

export class QueryBuilder<T> implements IQueryBuilder {
  private selectColumns: string[] = [];
  private distinctFlag: boolean = false;
  private schemaName?: string;
  private tableName?: string;
  private alias?: string;
  private whereConditions: string[] = [];
  private whereParams: any[] = [];
  private orderByConditions: string[] = [];
  private limitNumber?: number;
  private offsetNumber?: number;
  private joinConditions: string[] = [];
  private groupByColumns: string[] = [];
  private havingConditions: string[] = [];
  private havingParams: any[] = [];
  private countFlag: boolean = false;
  private countColumn?: string;
  private countAlias?: string;

  constructor(
    private table: string,
    private client: Db2Client,
  ) {
    this.tableName = table;
  }

  public reset(): IQueryBuilder {
    this.selectColumns = [];
    this.distinctFlag = false;
    this.schemaName = undefined;
    this.tableName = undefined;
    this.alias = undefined;
    this.whereConditions = [];
    this.whereParams = [];
    this.orderByConditions = [];
    this.limitNumber = undefined;
    this.offsetNumber = undefined;
    this.joinConditions = [];
    this.groupByColumns = [];
    this.havingConditions = [];
    this.havingParams = [];
    this.countFlag = false;
    this.countColumn = undefined;
    this.countAlias = undefined;
    return this;
  }

  select(columns: string | string[] | Record<string, string>): IQueryBuilder {
    if (typeof columns === 'string') {
      this.selectColumns.push(columns);
    } else if (Array.isArray(columns)) {
      this.selectColumns.push(...columns);
    } else {
      // Record<string, string> as alias
      for (const [key, value] of Object.entries(columns)) {
        this.selectColumns.push(`${key} AS ${value}`);
      }
    }
    return this;
  }

  distinct(): IQueryBuilder {
    this.distinctFlag = true;
    return this;
  }

  useSchema(schemaName: string): IQueryBuilder {
    this.schemaName = schemaName;
    return this;
  }

  from(table: string, alias?: string): IQueryBuilder {
    this.tableName = table;
    this.alias = alias;
    return this;
  }

  where(condition: string, params: any[] = []): IQueryBuilder {
    this.whereConditions.push(condition);
    this.whereParams.push(...params);
    return this;
  }

  and(condition: string, params: any[] = []): IQueryBuilder {
    if (this.whereConditions.length === 0) {
      throw new Error('Cannot use AND without a preceding WHERE clause.');
    }
    this.whereConditions.push(`AND ${condition}`);
    this.whereParams.push(...params);
    return this;
  }

  or(condition: string, params: any[] = []): IQueryBuilder {
    if (this.whereConditions.length === 0) {
      throw new Error('Cannot use OR without a preceding WHERE clause.');
    }
    this.whereConditions.push(`OR ${condition}`);
    this.whereParams.push(...params);
    return this;
  }

  orderBy(column: string, direction: 'ASC' | 'DESC' = 'ASC'): IQueryBuilder {
    this.orderByConditions.push(`${column} ${direction}`);
    return this;
  }

  limit(limit: number): IQueryBuilder {
    this.limitNumber = limit;
    return this;
  }

  offset(offset: number): IQueryBuilder {
    this.offsetNumber = offset;
    return this;
  }

  join(
    table: string,
    condition: string,
    type: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL' | 'NATURAL' | 'CROSS' = 'INNER',
  ): IQueryBuilder {
    this.joinConditions.push(`${type} JOIN ${table} ON ${condition}`);
    return this;
  }

  groupBy(columns: string | string[]): IQueryBuilder {
    if (typeof columns === 'string') {
      this.groupByColumns.push(columns);
    } else {
      this.groupByColumns.push(...columns);
    }
    return this;
  }

  having(condition: string, params: any[] = []): IQueryBuilder {
    this.havingConditions.push(condition);
    this.havingParams.push(...params);
    return this;
  }

  count(column: string = '*', alias: string = 'count'): IQueryBuilder {
    this.countFlag = true;
    this.countColumn = column;
    this.countAlias = alias;
    return this;
  }

  insertInto(table: string, columns: string[], values: any[][]): IQueryBuilder {
    // Implement if needed
    return this;
  }

  update(
    table: string,
    updates: Record<string, any>,
    where: string,
    whereParams: any[],
  ): IQueryBuilder {
    // Implement if needed
    return this;
  }

  deleteFrom(table: string): IQueryBuilder {
    // Implement if needed
    return this;
  }

  upsert(
    table: string,
    insertColumns: string[],
    insertValues: any[][],
    conflictTarget: string,
    updateColumns: string[],
    updateValues: any[],
  ): IQueryBuilder {
    // Implement if needed
    return this;
  }

  subquery(subquery: IQueryBuilder, alias: string): IQueryBuilder {
    // Implement if needed
    return this;
  }

  useFunction(func: string, alias?: string): IQueryBuilder {
    if (alias) {
      this.selectColumns.push(`${func} AS ${alias}`);
    } else {
      this.selectColumns.push(func);
    }
    return this;
  }

  build(): { query: string; params: Record<string, any> } {
    let sql = '';

    // SELECT clause
    if (this.countFlag && this.countColumn) {
      sql += `SELECT COUNT(${this.countColumn}) AS ${this.countAlias} `;
    } else {
      sql += 'SELECT ';
      if (this.distinctFlag) {
        sql += 'DISTINCT ';
      }
      sql +=
        this.selectColumns.length > 0 ? this.selectColumns.join(', ') : '*';
      sql += ' ';
    }

    // FROM clause
    if (this.schemaName) {
      sql += `${this.schemaName}.`;
    }
    sql += this.tableName ? `${this.tableName} ` : '';

    if (this.alias) {
      sql += `AS ${this.alias} `;
    }

    // JOIN clauses
    if (this.joinConditions.length > 0) {
      sql += this.joinConditions.join(' ') + ' ';
    }

    // WHERE clause
    if (this.whereConditions.length > 0) {
      sql += 'WHERE ' + this.whereConditions.join(' ') + ' ';
    }

    // GROUP BY clause
    if (this.groupByColumns.length > 0) {
      sql += 'GROUP BY ' + this.groupByColumns.join(', ') + ' ';
    }

    // HAVING clause
    if (this.havingConditions.length > 0) {
      sql += 'HAVING ' + this.havingConditions.join(' AND ') + ' ';
    }

    // ORDER BY clause
    if (this.orderByConditions.length > 0) {
      sql += 'ORDER BY ' + this.orderByConditions.join(', ') + ' ';
    }

    // LIMIT and OFFSET
    if (this.limitNumber !== undefined) {
      sql += `LIMIT ${this.limitNumber} `;
    }
    if (this.offsetNumber !== undefined) {
      sql += `OFFSET ${this.offsetNumber} `;
    }

    // Trim and return
    sql = sql.trim() + ';';
    const params = [...this.whereParams, ...this.havingParams];
    return { query: sql, params };
  }

  public async execute(): Promise<any> {
    const { query, params } = this.build();
    return this.client.query(query, params);
  }
}
