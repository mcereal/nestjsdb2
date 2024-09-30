// src/orm/model.ts
// Usage: Create a Model class to interact
// with the database using the schema.

import { Schema } from './schema';
import { Injectable, Logger } from '@nestjs/common';
import { IQueryBuilder } from '../interfaces/query-builder.interface';
import { QueryBuilder } from '../db/query-builder';
import { ModelRegistry } from './model-registry';
import { validateOrReject } from '../validation/validateOrReject';
import {
  ManyToManyMetadata,
  ManyToOneMetadata,
  OneToManyMetadata,
} from './interfaces/relations.interfaces';
import { MetadataManager } from './metadata';
import { ClassConstructor } from './types';
import { Db2Client } from '../db';

@Injectable()
export class Model<T> {
  private readonly logger = new Logger(Model.name);
  private schema: Schema<ClassConstructor<any>[]>;
  private currentEntity?: ClassConstructor<any>;
  private metadataManager: MetadataManager;

  constructor(
    private client: Db2Client,
    schema: Schema<ClassConstructor<any>[]>,
    private modelRegistry: ModelRegistry,
  ) {
    this.schema = schema;
    this.metadataManager = new MetadataManager();
  }

  /**
   * Set the current entity context for schema operations.
   * @param entity - The class constructor of the entity.
   * @throws Will throw an error if setting the entity fails.
   */
  setEntity(entity: ClassConstructor<any>): void {
    try {
      this.schema.setEntity(entity);
      this.currentEntity = entity;
    } catch (error) {
      this.logger.error(`Failed to set entity: ${error.message}`);
      throw new Error(`Failed to set entity: ${error.message}`);
    }
  }

  /**
   * Integrate QueryBuilder for advanced queries.
   * @returns A new instance of the QueryBuilder.
   * @throws Will throw an error if retrieving the metadata fails.
   *
   * @example
   * ```ts
   * const queryBuilder = model.createQueryBuilder();
   * ```
   */
  createQueryBuilder(): IQueryBuilder {
    try {
      const metadata = this.schema.getCurrentMetadata();
      return new QueryBuilder(metadata.tableMetadata!.tableName, this.client);
    } catch (error) {
      this.logger.error(`Failed to create query builder: ${error.message}`);
      throw new Error(`Failed to create query builder: ${error.message}`);
    }
  }

  /**
   * Create a new instance of the model with validation and default values.
   * @param data - Partial data to initialize the model.
   * @returns A new instance of the model.
   * @throws Will throw an error if schema metadata is invalid or required properties are missing.
   *
   * @example
   * ```ts
   * const user = model.create({ username: 'john_doe', age: 25 });
   * ```
   */
  create(data: Partial<T>): T {
    try {
      const metadata = this.schema.getCurrentMetadata();
      if (!metadata.tableMetadata) {
        throw new Error('Invalid schema metadata for model.');
      }

      const instance = {} as T;

      // Initialize columns with data, defaults, and validation using schema columns
      for (const column of metadata.tableMetadata.columns) {
        const { propertyKey, default: defaultValue, nullable } = column;
        const value = data[propertyKey as keyof T];

        if (value !== undefined) {
          // Use provided value
          instance[propertyKey as keyof T] = value;
        } else if (defaultValue !== undefined) {
          // Set default value if not provided
          instance[propertyKey as keyof T] =
            typeof defaultValue === 'function' ? defaultValue() : defaultValue;
        } else if (!nullable) {
          // Handle required columns or constraints
          throw new Error(
            `Property '${propertyKey}' is required in table '${metadata.tableMetadata.tableName}'.`,
          );
        }
      }

      return instance;
    } catch (error) {
      this.logger.error(`Failed to create model instance: ${error.message}`);
      throw new Error(`Failed to create model instance: ${error.message}`);
    }
  }

  /**
   * Create and validate a new instance of the model.
   * @param data - Partial data to initialize the model.
   * @returns A new instance of the model.
   * @throws Will throw an error if validation fails.
   *
   * @example
   * ```ts
   * const user = await model.createAndValidate({ username: 'john_doe', age: 25 });
   * ```
   */
  async createAndValidate(data: Partial<T>): Promise<T> {
    try {
      const instance = this.create(data);
      await validateOrReject(instance as any);
      return instance;
    } catch (error) {
      this.logger.error(
        `Error creating and validating instance: ${error.message}`,
        error.stack,
      );
      throw new Error(
        `Failed to create and validate instance: ${error.message}`,
      );
    }
  }

  /**
   * Save the instance to the database.
   * @param instance - The instance to save.
   * @returns The saved instance.
   * @throws Will throw an error if the table name is not defined or the insert operation fails.
   *
   * @example
   * ```ts
   * const user = await model.save({ username: 'john_doe', age: 25 });
   * ```
   */

  private buildConditions(query: Partial<T>): string {
    // Convert the query object into SQL conditions
    return Object.keys(query)
      .map((key) => `${key} = ?`)
      .join(' AND ');
  }

  // Save the instance to the database
  async save(instance: T): Promise<T> {
    const metadata = this.schema.getCurrentMetadata();
    const tableName = metadata.tableMetadata?.tableName;
    if (!tableName) throw new Error('Table name is not defined in the schema.');

    const columns = metadata.tableMetadata.columns;
    const columnNames = columns.map((col) => col.propertyKey).join(', ');
    const placeholders = columns.map(() => '?').join(', ');
    const values = columns.map(
      (col) => (instance as any)[col.propertyKey] ?? null,
    );

    const sql = `INSERT INTO ${tableName} (${columnNames}) VALUES (${placeholders}) RETURNING *`;
    this.logger.debug(
      `Executing SQL: ${sql} with values: ${JSON.stringify(values)}`,
    );

    try {
      const result = await this.client.query<T[]>(sql, values);
      if (result.length > 0) {
        this.logger.log(
          `Inserted into ${tableName}: ${JSON.stringify(result[0])}`,
        );
        return result[0];
      }
      throw new Error('Insert operation did not return any results.');
    } catch (error) {
      this.logger.error(
        `Error inserting into ${tableName}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   *  Find records with conditions. Supports sorting, limiting, and offset.
   * @param query
   * @param options
   * @returns
   * @throws Will throw an error if the query operation fails.
   *
   * @example
   * ```ts
   * const users = await model.findWithConditions({ age: 25 }, { sort: { username: 'ASC' }, limit: 10, offset: 0 });
   * ```
   */

  async findWithConditions(
    query: Partial<T>,
    options: {
      sort?: Record<string, 'ASC' | 'DESC'>;
      limit?: number;
      offset?: number;
    } = {},
  ): Promise<T[]> {
    const qb = this.createQueryBuilder().where(this.buildConditions(query));

    if (options.sort) {
      for (const [column, direction] of Object.entries(options.sort)) {
        qb.orderBy(column, direction as 'ASC' | 'DESC');
      }
    }

    if (options.limit !== undefined) {
      qb.limit(options.limit);
    }

    if (options.offset !== undefined) {
      qb.offset(options.offset);
    }

    const { query: sql, params } = qb.build();
    this.logger.debug(
      `Executing SQL: ${sql} with params: ${JSON.stringify(params)}`,
    );

    try {
      const results = await this.client.query<T[]>(sql, Object.values(params));
      this.logger.log(
        `Query executed successfully on ${this.schema.getCurrentMetadata().tableMetadata!.tableName}: ${sql}`,
      );
      return results;
    } catch (error) {
      this.logger.error(
        `Error executing query on ${this.schema.getCurrentMetadata().tableMetadata!.tableName}: ${error.message}`,
        error.stack,
      );
      throw new Error(
        `Failed to execute findWithConditions operation: ${error.message}`,
      );
    }
  }

  /**
   * Find records with conditions and return the first result.
   * @param query - The query conditions.
   * @param options - Query options.
   * @returns The first record matching the query.
   * @throws Will throw an error if the query operation fails.
   *
   * @example
   * ```ts
   * const user = await model.findOneWithConditions({ username: 'john_doe' });
   * ```
   */
  async find(query: Partial<T>): Promise<T[]> {
    const metadata = this.schema.getCurrentMetadata();
    const tableName = metadata.tableMetadata?.tableName;
    if (!tableName) throw new Error('Table name is not defined in the schema.');

    // Generate SELECT SQL using the schema's metadata and the query
    const { sql, params } = this.buildSelectQuery(query, tableName);
    this.logger.debug(
      `Executing SQL: ${sql} with params: ${JSON.stringify(params)}`,
    );

    try {
      const results = await this.client.query<T[]>(sql, params);
      this.logger.log(`Query executed successfully on ${tableName}: ${sql}`);
      return results;
    } catch (error) {
      this.logger.error(
        `Error executing query on ${tableName}: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to execute find operation: ${error.message}`);
    }
  }

  /**
   * Find a single record with conditions.
   * @param query - The query conditions.
   * @returns The first record matching the query or null if not found.
   * @throws Will throw an error if the query operation fails.
   *
   * @example
   * ```ts
   * const user = await model.findOne({ username: 'john_doe' });
   * ```
   */
  async findOne(query: Partial<T>): Promise<T | null> {
    const results = await this.find(query);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Update records with conditions.
   * @param query - The query conditions.
   * @param data - The data to update.
   * @throws Will throw an error if the update operation fails.
   *
   * @example
   * ```ts
   * await model.update({ username: 'john_doe' }, { age: 26 });
   * ```
   */
  async update(query: Partial<T>, data: Partial<T>): Promise<void> {
    const metadata = this.schema.getCurrentMetadata();
    const tableName = metadata.tableMetadata?.tableName;
    if (!tableName) throw new Error('Table name is not defined in the schema.');

    // Generate UPDATE SQL using parameterized queries
    const setClause = Object.keys(data)
      .map((key) => `${key} = ?`)
      .join(', ');
    const setValues = Object.keys(data).map((key) => (data as any)[key]);

    const { sql: whereSql, params: whereParams } = this.buildWhereClause(query);
    const sql = `UPDATE ${tableName} SET ${setClause} ${whereSql}`;
    const values = [...setValues, ...whereParams];

    this.logger.debug(
      `Executing SQL: ${sql} with values: ${JSON.stringify(values)}`,
    );

    try {
      await this.client.query(sql, values);
      this.logger.log(
        `Updated records in ${tableName} with query: ${JSON.stringify(query)}`,
      );
    } catch (error) {
      this.logger.error(
        `Error updating ${tableName}: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to execute update operation: ${error.message}`);
    }
  }

  /**
   * Delete records with conditions.
   * @param query - The query conditions.
   * @throws Will throw an error if the delete operation fails.
   *
   * @example
   * ```ts
   * await model.delete({ username: 'john_doe' });
   * ```
   */
  async delete(query: Partial<T>): Promise<boolean> {
    const metadata = this.schema.getCurrentMetadata();
    const tableName = metadata.tableMetadata?.tableName;
    if (!tableName) throw new Error('Table name is not defined in the schema.');

    // Generate DELETE SQL using parameterized queries
    const { sql: whereSql, params: whereParams } = this.buildWhereClause(query);
    const sql = `DELETE FROM ${tableName} ${whereSql}`;

    this.logger.debug(
      `Executing SQL: ${sql} with params: ${JSON.stringify(whereParams)}`,
    );

    try {
      await this.client.query(sql, whereParams);
      this.logger.log(
        `Deleted records from ${tableName} with query: ${JSON.stringify(query)}`,
      );
      return true;
    } catch (error) {
      this.logger.error(
        `Error deleting from ${tableName}: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to execute delete operation: ${error.message}`);
    }
  }

  /**
   * Soft delete records with conditions.
   * @param query - The query conditions.
   * @throws Will throw an error if the soft delete operation fails.
   *
   * @example
   * ```ts
   * await model.softDelete({ username: 'john_doe' });
   * ```
   */
  async softDelete(query: Partial<T>): Promise<void> {
    const metadata = this.schema.getCurrentMetadata();
    const tableName = metadata.tableMetadata?.tableName;
    if (!tableName) throw new Error('Table name is not defined in the schema.');

    // Assume there's a 'deletedAt' column for soft deletes
    const setClause = `deletedAt = ?`;
    const setValue = new Date();

    const { sql: whereSql, params: whereParams } = this.buildWhereClause(query);
    const sql = `UPDATE ${tableName} SET ${setClause} ${whereSql}`;
    const values = [setValue, ...whereParams];

    this.logger.debug(
      `Executing SQL: ${sql} with values: ${JSON.stringify(values)}`,
    );

    try {
      await this.client.query(sql, values);
      this.logger.log(
        `Soft deleted records in ${tableName} with query: ${JSON.stringify(query)}`,
      );
    } catch (error) {
      this.logger.error(
        `Error performing soft delete on ${tableName}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Restore soft-deleted records with conditions.
   * @param query - The query conditions.
   * @throws Will throw an error if the restore operation fails.
   *
   * @example
   * ```ts
   * await model.restore({ username: 'john_doe' });
   * ```
   */
  private buildWhereClause(query: Partial<T>): { sql: string; params: any[] } {
    const keys = Object.keys(query);
    if (keys.length === 0) {
      return { sql: '', params: [] };
    }

    const conditions = keys.map((key) => `${key} = ?`).join(' AND ');
    const params = keys.map((key) => (query as any)[key]);

    return { sql: `WHERE ${conditions}`, params };
  }

  /**
   *      * Build a SELECT query with WHERE conditions.
   * @param query
   * @param tableName
   * @returns
   * @throws Will throw an error if the query operation fails.
   *
   * @example
   * ```ts
   * const { sql, params } = model.buildSelectQuery({ username: 'john_doe' }, 'users');
   * ```
   */
  private buildSelectQuery(
    query: Partial<T>,
    tableName: string,
  ): { sql: string; params: any[] } {
    const { sql: whereSql, params } = this.buildWhereClause(query);
    const sql = `SELECT * FROM ${tableName} ${whereSql};`;
    return { sql, params };
  }

  /**
   * Populate a relation for an instance.
   * @param instance - The instance to populate.
   * @param path - The relation path to populate.
   * @returns The instance with the populated relation.
   * @throws Will throw an error if the relation is not found.
   *
   * @example
   * ```ts
   * const user = await model.populate(user, 'posts');
   * ```
   */
  async populate(instance: T, path: keyof T & string): Promise<T> {
    const oneToManyRelations = this.metadataManager.getPropertyMetadata<
      OneToManyMetadata[]
    >(this.currentEntity, 'oneToManyRelations');
    const manyToOneRelations = this.metadataManager.getPropertyMetadata<
      ManyToOneMetadata[]
    >(this.currentEntity, 'manyToOneRelations');
    const manyToManyRelations = this.metadataManager.getPropertyMetadata<
      ManyToManyMetadata[]
    >(this.currentEntity, 'manyToManyRelations');

    const relationMetadata:
      | ManyToManyMetadata
      | OneToManyMetadata
      | ManyToOneMetadata =
      (oneToManyRelations.find(
        (rel: any) => rel.propertyKey === path,
      ) as OneToManyMetadata) ||
      (manyToOneRelations.find(
        (rel: any) => rel.propertyKey === path,
      ) as ManyToOneMetadata) ||
      (manyToManyRelations.find(
        (rel: any) => rel.propertyKey === path,
      ) as ManyToManyMetadata);

    if (!relationMetadata) {
      throw new Error(
        `Relation '${path}' not found on '${this.schema.getCurrentMetadata().tableMetadata?.tableName}'.`,
      );
    }

    // Determine related model token
    const relatedModelToken = `${relationMetadata.target.name}Model`;

    // Retrieve the related model from the registry
    const relatedModel = this.modelRegistry.getModel<any>(relatedModelToken);

    if (!relatedModel) {
      throw new Error(
        `Related model '${relationMetadata.target.name}' not found.`,
      );
    }

    // Determine the foreign key value based on relation type
    let foreignKeyValue: any;

    if ('manyToManyRelations' in relationMetadata) {
      // For ManyToMany, use instance's id
      foreignKeyValue = (instance as any).id;
    } else if ('manyToOneRelations' in relationMetadata) {
      // For ManyToOne, foreign key is in current instance (e.g., userId)
      foreignKeyValue = (instance as any)[
        `${String(relationMetadata.propertyKey)}Id`
      ];
    } else if ('oneToManyRelations' in relationMetadata) {
      // For OneToMany, foreign key is in related instance (e.g., organizationId)
      foreignKeyValue = (instance as any).id;
    }

    if (foreignKeyValue === undefined) {
      throw new Error(`Foreign key value for relation '${path}' is undefined.`);
    }

    // Fetch related data using the related model's find method
    const relatedData = await relatedModel.find({
      [relationMetadata.propertyKey]: foreignKeyValue,
    });

    // Assign the related data to the instance
    (instance as any)[path] = relatedData;

    this.logger.log(
      `Populated relation '${path}' for instance: ${JSON.stringify(instance)}`,
    );

    return instance;
  }

  /**
   * Find paginated records with conditions.
   * @param query - The query conditions.
   * @param page - The page number.
   * @param pageSize - The page size.
   * @returns Paginated data with total count.
   * @throws Will throw an error if the paginated query operation fails.
   *
   * @example
   * ```ts
   * const { data, total, page, pageSize } = await model.findPaginated({ age: 25 }, 1, 10);
   * ```
   */
  async findPaginated(
    query: Partial<T>,
    page: number = 1,
    pageSize: number = 10,
  ): Promise<{ data: T[]; total: number; page: number; pageSize: number }> {
    const qb = this.createQueryBuilder().where(this.buildConditions(query));

    qb.limit(pageSize).offset((page - 1) * pageSize);

    const { query: sql, params } = qb.build();
    this.logger.debug(
      `Executing SQL: ${sql} with params: ${JSON.stringify(params)}`,
    );
    const data = await this.client.query<T[]>(sql, params);

    // Get total count
    const countQb = this.createQueryBuilder()
      .count()
      .where(this.buildConditions(query));
    const { query: countSql, params: countParams } = countQb.build();
    this.logger.debug(
      `Executing SQL: ${countSql} with params: ${JSON.stringify(countParams)}`,
    );
    const countResult = await this.client.query<{ count: number }[]>(
      countSql,
      countParams,
    );
    const total = countResult.length > 0 ? countResult[0].count : 0;

    this.logger.log(
      `Paginated query executed successfully on ${this.schema.getCurrentMetadata().tableMetadata!.tableName}: ${sql}`,
    );

    return { data, total, page, pageSize };
  }

  /**
   * Execute a transactional operation.
   * @param operations - The operations to execute within the transaction.
   * @throws Will throw an error if the transaction fails.
   *
   * @example
   * ```ts
   * await model.transactional(async () => {
   *   await model.save(user);
   *   await model.save(profile);
   * });
   * ```
   */
  async transactional(operations: () => Promise<void>): Promise<void> {
    try {
      await this.client.beginTransaction();
      await operations();
      await this.client.commitTransaction();
      this.logger.log('Transaction committed successfully.');
    } catch (error) {
      await this.client.rollbackTransaction();
      this.logger.error(`Transaction failed: ${error.message}`, error.stack);
      throw error;
    }
  }
}
