// src/db2.module.ts

import { Db2Client } from './db2-client';
import { MigrationService } from '../services/migration.service';
import {
  IDb2ConfigOptions,
  IConnectionManager,
  IPoolManager,
  ITransactionManager,
  IDb2ConfigManager,
} from '../interfaces';
import { EntityMetadataStorage, MetadataManager } from '../orm/metadata';
import { ClassConstructor } from '../orm/types';
import { Schema } from '../orm/schema';
import { Model } from '../orm/model';
import { ModelRegistry } from '../orm/model-registry';
import { Logger } from '../utils/logger';
import { Db2Config } from './db2-config.module';
import { Db2PoolManager } from './db2-pool.manager';
import { ConnectionManager } from './connection-manager';
import { createAuthStrategy } from '../auth';
import { TransactionManager } from './transaction-manager';

export class Db2Module implements IDb2ConfigManager {
  private static instance: Db2Module | null = null;
  private static modelRegistry: ModelRegistry | null = null;

  private readonly logger = new Logger(Db2Module.name);

  private db2ConfigOptions: IDb2ConfigOptions;
  private connectionManager: IConnectionManager;
  private poolManager: IPoolManager;
  private db2Client: Db2Client;
  private transactionManager: ITransactionManager;
  private migrationService: MigrationService;
  private modelRegistryInstance: ModelRegistry;
  private metadataManager: MetadataManager;

  private constructor(config: IDb2ConfigOptions) {
    const db2Config = new Db2Config(config);
    this.db2ConfigOptions = db2Config.config;

    this.poolManager = new Db2PoolManager(this.db2ConfigOptions, null); // Pass null initially
    this.connectionManager = new ConnectionManager(this.poolManager);
    const authStrategy = createAuthStrategy(
      this.db2ConfigOptions,
      this.connectionManager,
    );
    this.poolManager.setAuthStrategy(authStrategy);

    this.db2Client = new Db2Client(
      db2Config,
      this.connectionManager,
      this.poolManager,
    );
    this.transactionManager = new TransactionManager(
      this.db2Client,
      this.db2ConfigOptions,
    );
    this.migrationService = new MigrationService();
    this.modelRegistryInstance = new ModelRegistry();
    this.metadataManager = new MetadataManager();
  }

  get config(): IDb2ConfigOptions {
    return this.db2ConfigOptions;
  }

  /**
   * Initializes the Db2Module instance synchronously.
   * @param config Configuration options.
   * @returns The initialized Db2Module instance.
   */
  public static forRoot(config: IDb2ConfigOptions): Db2Module {
    if (this.instance) {
      throw new Error('Db2Module is already initialized.');
    }
    this.instance = new Db2Module(config);
    this.modelRegistry = this.instance.modelRegistryInstance;
    return this.instance;
  }

  /**
   * Initializes the Db2Module instance asynchronously.
   * @param configFactory A factory function to provide configuration options.
   * @returns A promise that resolves to the initialized Db2Module instance.
   */
  public static async forRootAsync(
    configFactory: () => Promise<IDb2ConfigOptions> | IDb2ConfigOptions,
  ): Promise<Db2Module> {
    if (this.instance) {
      throw new Error('Db2Module is already initialized.');
    }
    const configOptions = await configFactory();
    this.instance = new Db2Module(configOptions);
    this.modelRegistry = this.instance.modelRegistryInstance;
    await this.instance.init();
    return this.instance;
  }

  /**
   * Registers entity models.
   * @param entities Array of entity classes to register.
   */
  public static forFeature(entities: ClassConstructor<any>[]) {
    if (!this.instance || !this.modelRegistry) {
      throw new Error(
        'Db2Module must be initialized with forRoot or forRootAsync before registering entities.',
      );
    }
    return this.instance.registerEntities(entities);
  }

  /**
   * Asynchronously registers entity models.
   * @param entities Array of entity classes to register.
   */
  public static async forFeatureAsync(
    entities: ClassConstructor<any>[],
  ): Promise<void> {
    if (!this.instance || !this.modelRegistry) {
      throw new Error(
        'Db2Module must be initialized with forRoot or forRootAsync before registering entities.',
      );
    }
    await this.instance.registerEntitiesAsync(entities);
  }

  /**
   * Initializes the module by setting up the pool, client, running migrations, and registering models.
   */
  private async init(): Promise<void> {
    try {
      // Initialize pool manager
      await this.poolManager.init();
      this.logger.info('Pool manager initialized.');

      // Initialize Db2 client
      await this.db2Client.init();
      this.logger.info('Db2 client initialized.');

      // Run migrations if enabled
      if (this.db2ConfigOptions.migration?.enabled) {
        await this.runMigrations();
        this.logger.info('Migrations run successfully.');
      }

      this.logger.info('Db2Module initialized successfully.');
    } catch (error) {
      this.logger.error('Failed to initialize Db2Module:', error);
      throw error; // Propagate the error after logging
    }
  }

  /**
   * Asynchronously registers entities (if needed).
   * @param entities Array of entity classes to register.
   */
  private async registerEntitiesAsync(
    entities: ClassConstructor<any>[],
  ): Promise<void> {
    this.registerEntities(entities);
    // Add any asynchronous initialization if required
  }

  /**
   * Creates model providers for given entities.
   * @param entities Array of entity classes.
   * @returns Array of provider definitions.
   */
  private static createModelProviders(entities: ClassConstructor<any>[]) {
    const schema = new Schema(entities);

    // Initialize metadata for all entities
    entities.forEach((entity) => {
      schema.setEntity(entity);
      schema.getMetadata(entity);
    });

    return entities.map((entity) =>
      Db2Module.createModelProvider(entity, schema),
    );
  }

  /**
   * Creates a single model provider for an entity.
   * @param entity The entity class.
   * @param schema The schema instance.
   * @returns A provider definition.
   */
  private static createModelProvider(
    entity: ClassConstructor<any>,
    schema: Schema<ClassConstructor<any>[]>,
  ) {
    const metadata = EntityMetadataStorage.getEntityMetadata(entity);
    if (!metadata || metadata.entityType !== 'table') {
      throw new Error(`Entity ${entity.name} is not a valid table entity.`);
    }

    return {
      provide: `${entity.name}Model`,
      useFactory: (client: Db2Client, modelRegistry: ModelRegistry) => {
        const model = new Model(client, schema, modelRegistry);
        model.setEntity(entity);
        modelRegistry.registerModel(`${entity.name}Model`, model);
        return model;
      },
      // Inject dependencies manually since we're not using NestJS
      dependencies: [
        this.instance?.db2Client,
        this.instance?.modelRegistryInstance,
      ],
    };
  }

  /**
   * Registers entities by creating and registering their corresponding models.
   * @param entities Array of entity classes to register.
   */
  private registerEntities(entities: ClassConstructor<any>[]): void {
    const schema = new Schema(entities);

    // Initialize metadata for all entities
    entities.forEach((entity) => {
      schema.setEntity(entity);
      schema.getMetadata(entity);
    });

    // Create and register models
    entities.forEach((entity) => {
      const metadata = EntityMetadataStorage.getEntityMetadata(entity);
      if (!metadata || metadata.entityType !== 'table') {
        throw new Error(`Entity ${entity.name} is not a valid table entity.`);
      }

      const model = new Model(
        this.db2Client,
        schema,
        this.modelRegistryInstance,
      );
      model.setEntity(entity);
      this.modelRegistryInstance.registerModel(`${entity.name}Model`, model);
    });

    this.logger.info('Entities registered successfully.');
  }
  /**
   * Runs database migrations using the MigrationService.
   */
  private async runMigrations(): Promise<void> {
    const entities = this.metadataManager.getAllEntities();

    for (const entity of entities) {
      let tableMetadata;
      try {
        tableMetadata =
          this.metadataManager.getEntityMetadata(entity).tableMetadata;
      } catch (error) {
        this.db2Client.logger.warn(
          `No table metadata found for entity ${entity.name}. Skipping.`,
        );
        continue;
      }

      // Extract column details and options
      const columns = tableMetadata.columns.reduce(
        (acc, column) => {
          acc[column.propertyKey] = column.type;
          return acc;
        },
        {} as Record<string, string>,
      );

      const options = {
        primaryKeys: tableMetadata.primaryKeys
          .map((pk) => pk.propertyKey)
          .join(','),
        // Add other options as needed
      };

      const createTableSQL = this.migrationService.generateCreateTableSQL(
        tableMetadata.tableName,
        columns,
        options,
      );

      // Execute the generated SQL
      await this.db2Client.query(createTableSQL);
      this.logger.info(
        `Migration executed for table: ${tableMetadata.tableName}`,
      );
    }
  }

  /**
   * Provides access to the TransactionManager instance.
   * @returns TransactionManager instance.
   */
  public getTransactionManager(): ITransactionManager {
    return this.transactionManager;
  }

  /**
   * Provides access to the MigrationService instance.
   * @returns MigrationService instance.
   */
  public getMigrationService(): MigrationService {
    return this.migrationService;
  }

  /**
   * Provides access to the ModelRegistry instance.
   * @returns ModelRegistry instance.
   */
  public getModelRegistry(): ModelRegistry {
    return this.modelRegistryInstance;
  }

  /**
   * Retrieves a registered model by its name.
   * @param name - The name of the model to retrieve.
   * @returns The model instance if found, or `undefined` if not registered.
   */
  public getModel<T>(name: string): Model<T> | undefined {
    return this.modelRegistryInstance.getModel<T>(name);
  }
}
