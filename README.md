# IBM DB2 Module for NestJS

[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=mcereal_nestjsdb2&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=mcereal_nestjsdb2) [![Coverage](https://sonarcloud.io/api/project_badges/measure?project=mcereal_nestjsdb2&metric=coverage)](https://sonarcloud.io/summary/new_code?id=mcereal_nestjsdb2) [![Maintainability Rating](https://sonarcloud.io/api/project_badges/measure?project=mcereal_nestjsdb2&metric=sqale_rating)](https://sonarcloud.io/summary/new_code?id=mcereal_nestjsdb2) [![Reliability Rating](https://sonarcloud.io/api/project_badges/measure?project=mcereal_nestjsdb2&metric=reliability_rating)](https://sonarcloud.io/summary/new_code?id=mcereal_nestjsdb2) [![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=mcereal_nestjsdb2&metric=security_rating)](https://sonarcloud.io/summary/new_code?id=mcereal_nestjsdb2) [![npm version](https://badge.fury.io/js/@mcereal%2Fnestjsdb2.svg)](https://badge.fury.io/js/@mcereal%2Fnestjsdb2) [![CodeQL Advanced](https://github.com/mcereal/nestjsdb2/actions/workflows/codeql.yml/badge.svg)](https://github.com/mcereal/nestjsdb2/actions/workflows/codeql.yml) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) [![Build](https://github.com/mcereal/nestjsdb2/actions/workflows/build.yaml/badge.svg)](https://github.com/mcereal/nestjsdb2/actions/workflows/build.yaml)

The `@mcereal/nestjs` package is a powerful and flexible TypeScript library that integrates IBM DB2 database capabilities into NestJS applications. This package provides decorators, services, and utility functions to handle common database operations, connection management, caching, error handling, and transaction management, specifically tailored for IBM DB2 environments.

**This package it under active development and is not yet ready for production use. Please use with caution and report any issues or bugs you encounter.**

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Usage](#usage)
  - [Importing Db2Module](#importing-db2module)
  - [Database Operations](#database-operations)
  - [Using Db2Module](#using-db2module)
  - [Query Execution](#query-execution)
    - [Basic Query Execution](#basic-query-execution)
    - [Batch Operations](#batch-operations)
    - [Transaction Management](#transaction-management)
    - [ORM Support](#orm-support)
    - [Query Builder](#query-builder)
  - [Decorators](#decorators)
  - [Error Handling](#error-handling)
  - [Health Checks](#health-checks)
  - [Security](#security)
- [Contributing](#contributing)
- [License](#license)

## Features

- **Easy Integration**: Seamlessly integrate IBM DB2 databases into NestJS applications.
- **Typed Configuration**: TypeScript-based configuration options for better type safety and IDE support.
- **Connection Management**: Supports connection pooling, failover, and connection state monitoring.
- **Query Builder**: A fluent API for building SQL queries with support for subqueries, parameterized queries, and more.
- **Transaction Management**: Built-in support for transactions with `beginTransaction`, `commitTransaction`, and `rollbackTransaction`.
- **Batch Operations**: Execute multiple queries in a single batch operation for improved performance.
- **Decorators**: Custom decorators to enforce connection state checks and cache results.
- **Health Checks**: Support for implementing health checks using NestJS Terminus.
- **ORM Support**: Lightweight ORM-like interface for defining schemas and models.

## Installation

```bash
npm install @mcereal/nestjsdb2 --save
```

**Note**: The `@mcereal/nestjsdb2` package relies on the ibm_db package, which requires Rosetta 2 to run on Apple Silicon Macs. Please ensure Rosetta 2 is installed on your system. You can install Rosetta 2 by running:

```bash
softwareupdate --install-rosetta --agree-to-license
```

## Getting Started

To get started, import the Db2Module into your NestJS application and configure it using the provided options.

```typescript
import { Module } from '@nestjs/common';
import { Db2Module } from '@mcereal/nestjsdb2';

@Module({
  imports: [
    Db2Module.forRoot({
      auth: {
        authType: 'password',
        username: 'db2user',
        password: 'password',
      },
      host: 'localhost',
      port: 50000,
      database: 'sampledb',
      useTls: false,
      retry: {
        maxReconnectAttempts: 5,
        reconnectInterval: 3000,
      },
      queryTimeout: 10000, // in milliseconds
    }),
  ],
})
export class AppModule {}
```

## Configuration

The Db2Module can be configured either synchronously or asynchronously:

### Synchronous Configuration

```typescript
import { Module } from '@nestjs/common';
import { Db2Module } from '@mcereal/nestjsdb2';

@Module({
  imports: [
    Db2Module.forRoot({
      auth: {
        authType: 'password',
        username: 'db2user',
        password: 'password',
      },
      host: 'localhost',
      port: 50000,
      database: 'sampledb',
      useTls: false,
      cacheEnabled: true,
      retry: {
        maxReconnectAttempts: 5,
        reconnectInterval: 3000,
      },
      queryTimeout: 10000,
    }),
  ],
})
export class AppModule {}
```

### Asynchronous Configuration

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Db2Module } from '@mcereal/nestjsdb2';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    Db2Module.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        auth: {
          authType: 'password',
          username: configService.get<string>('DB_USER'),
          password: configService.get<string>('DB_PASS'),
        },
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        useTls: configService.get<boolean>('DB2_SSL_CONNECTION'),
        database: configService.get<string>('DB_NAME'),
        sslCertificatePath: configService.get<string>('DB_SSL_CERT_PATH'),
        retry: {
          maxReconnectAttempts: configService.get<number>('DB_RETRY_MAX') || 5,
          reconnectInterval:
            configService.get<number>('DB_RETRY_INTERVAL') || 3000,
        },
        queryTimeout: configService.get<number>('DB_QUERY_TIMEOUT') || 10000,
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

## Usage

### Importing Db2Module

Ensure that the Db2Module is imported and configured in your root module (AppModule).

```typescript
import { Module } from '@nestjs/common';
import { Db2Module } from '@mcereal/nestjsdb2';

@Module({
  imports: [
    Db2Module.forRoot({
      auth: {
        authType: 'password',
        username: 'db2user',
        password: 'password',
      },
      host: 'localhost',
      port: 50000,
      database: 'sampledb',
      useTls: false,
      cacheEnabled: true,
    }),
  ],
})
export class AppModule {}
```

### Database Operations

### Basic Query Execution

The `query` method executes a SQL query and returns the result as an array of objects:

```typescript
const result = await this.db2Service.query('SELECT * FROM users');
```

### Batch Operations

The `batch` method executes multiple queries in a single batch operation:

```typescript
const queries = [
  { sql: 'INSERT INTO users (name) VALUES (?)', params: ['Alice
  { sql: 'INSERT INTO users (name) VALUES (?)', params: ['Bob'] },
];

const results = await this.db2Service.batch(queries);
```

### Transaction Management

The `beginTransaction`, `commitTransaction`, and `rollbackTransaction` methods provide support for transactions:

```typescript
await this.db2Service.beginTransaction();
await this.db2Service.query('INSERT INTO users (name) VALUES (?)', ['Alice']);
await this.db2Service.commitTransaction();
```

### Query Builder

The `QueryBuilder` class provides a fluent API for building SQL queries with support for subqueries, parameterized queries, and more.

Create a new Query builder by providing the table name and an instance of th Db2Client class.

```typescript
import { QueryBuilder } from '@mcereal/nestjsdb2';

const queryBuilder = new QueryBuilder('users', this.db2Service);

const result = await queryBuilder
  .select(['id', 'name'])
  .where('name', '=', 'Alice')
  .orderBy('created_at', 'DESC')
  .limit(10)
  .execute();

console.log(result);
```

### Decorators

The `@Transaction`, `@Connection`, and `` decorators can be used to enforce connection state checks and cache results:

```typescript
import { Transaction, Connection, Query, Param } from '@mcereal/nestjsdb2';

@Injectable()
export class UserService {
  @Transaction()
  async createUser(name: string) {
    await this.db2Service.query('INSERT INTO users (name) VALUES (?)', [name]);
  }

  @Connection()
  async getUserData(userId: string) {
    return this.db2Service.query('SELECT * FROM users WHERE id = ?', [userId]);
  }

  @Query('SELECT * FROM users WHERE id = ?')
  async getUserData(@Param('id') userId: string) {
    return this.db2Service.query('SELECT * FROM users WHERE id = ?', [userId]);

}
```

#### ORM Support

The `@mcereal/nestjsdb2` package provides a lightweight ORM-like inrerface for working with DB2. You can define schemas using the `Schema` class and model classes using the `Model` class.

1. First, define an entity class using the `@Entity` decorator, and define the schema using the `Schema` class:

```typescript
import { Schema, Model } from '@mcereal/nestjsdb2';
import { Entity, Column, PrimaryKey } from '@mcereal/nestjsdb2';

@Entity({
  entityType: 'table',
  name: 'users',
})
export class User {
  @PrimaryKey()
  id!: string;

  @Column()
  name!: string;

  @Column()
  email!: string;
}

export const UserSchema = new Schema([User]);

const UserModel = new Model('users', UserSchema);
```

2. Register the `Schema` and `Model` classes in the module configuration as providers:

```typescript
Db2Module.forRoot({
  auth: {
    authType: 'password',
    host: 'localhost',
    port: 50000,
    database: 'sampledb',
    useTls: false,
  },
  providers: [
    {
      provide: 'UserModel',
      useValue: UserModel,
    },
  ],
});
```

3. Use `Db2Module.forFeature` to register the `Schema` and `Model` classes in a feature module:

```typescript

@Module({
  imports: [
    Db2Module.forFeature({
      auth: {
        authType: 'password',
        host: 'localhost',
        port: 50000,
        database: 'sampledb',
        useTls: false,
      },
      providers: [
        {
          provide: 'UserModel',
          useValue: UserModel,
        },
      ],
    }),
  ],
})
```

4. Use the `UserModel` class to perform CRUD operations on the `users` table:

```typescript
import { Injectable, Inject } from '@nestjs/common';

@Injectable()
export class UserService {
  constructor(@Inject('UserModel') private userModel: Model<UserModel>) {}

  async createUser(name: string, email: string) {
    return this.userModel.insert({ name, email });
  }

  async getUserById(id: string) {
    return this.userModel.findOne({ id });
  }

  async updateUser(id: string, name: string, email: string) {
    return this.userModel.update({ id }, { name, email });
  }

  async deleteUser(id: string) {
    return this.userModel.delete({ id });
  }
}
```

## Error Handling

The `@mcereal/nestjsdb2` package provides detailed error messages and stack traces for common database errors. You can import multiple error types like `Db2Error`, `Db2ConnectionError`, `Db2QueryError`, and `Db2TransactionError` to handle specific error scenarios:

```typescript
import {
  Db2Error,
  Db2ConnectionError,
  Db2QueryError,
  Db2TransactionError,
} from '@mcereal/nestjsdb2';

try {
  await this.db2Service.query('SELECT * FROM non_existent_table');
} catch (error) {
  if (error instanceof Db2QueryError) {
    console.error('Query error:', error.message);
  } else if (error instanceof Db2ConnectionError) {
    console.error('Connection error:', error.message);
  } else if (error instanceof Db2TransactionError) {
    console.error('Transaction error:', error.message);
  } else if (error instanceof Db2Error) {
    console.error('DB2 error:', error.message);
  } else {
    console.error('Unknown error:', error.message);
  }
}
```

## Health Checks

You can implement health checks for your NestJS application using the `TerminusModule` and the `Db2HealthIndicator`:

```typescript
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { Db2HealthIndicator } from '@mcereal/nestjsdb2';

@Module({
  imports: [
    TerminusModule.forRoot({
      healthChecks: {
        db2: () => Db2HealthIndicator.pingCheck('db2'),
      },
    }),
  ],
})
export class HealthModule {}
```

## Security

The `@mcereal/nestjsdb2` package follows best practices for security, including:

- **Secure Connections**: Supports TLS encryption for secure communication with the database.
- **Parameterized Queries**: Encourages the use of parameterized queries to prevent SQL injection attacks.
- **Error Handling**: Provides detailed error messages and stack traces for common database errors.
- **Health Checks**: Supports implementing health checks to monitor the database connection status.

## Contributing

Contributions are welcome! Please read our [contributing guidelines](CONTRIBUTING.md) to get started.

## License

This project is licensed under the terms of the [MIT License](LICENSE.md).
