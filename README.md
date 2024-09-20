# IBM DB2 Module for NestJS

[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=mcereal_nestjsdb2&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=mcereal_nestjsdb2) [![Coverage](https://sonarcloud.io/api/project_badges/measure?project=mcereal_nestjsdb2&metric=coverage)](https://sonarcloud.io/summary/new_code?id=mcereal_nestjsdb2) [![Maintainability Rating](https://sonarcloud.io/api/project_badges/measure?project=mcereal_nestjsdb2&metric=sqale_rating)](https://sonarcloud.io/summary/new_code?id=mcereal_nestjsdb2) [![Reliability Rating](https://sonarcloud.io/api/project_badges/measure?project=mcereal_nestjsdb2&metric=reliability_rating)](https://sonarcloud.io/summary/new_code?id=mcereal_nestjsdb2) [![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=mcereal_nestjsdb2&metric=security_rating)](https://sonarcloud.io/summary/new_code?id=mcereal_nestjsdb2) [![Release](https://github.com/mcereal/nestjsdb2/actions/workflows/release.yaml/badge.svg)](https://github.com/mcereal/nestjsdb2/actions/workflows/release.yaml) [![npm version](https://badge.fury.io/js/@mcereal%2Fnestjsdb2.svg)](https://badge.fury.io/js/@mcereal%2Fnestjsdb2) [![CI](https://github.com/mcereal/nestjsdb2/actions/workflows/ci.yaml/badge.svg)](https://github.com/mcereal/nestjsdb2/actions/workflows/ci.yaml) [![CodeQL Advanced](https://github.com/mcereal/nestjsdb2/actions/workflows/codeql.yml/badge.svg)](https://github.com/mcereal/nestjsdb2/actions/workflows/codeql.yml) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

The `@mcereal/nestjs` package is a powerful and flexible TypeScript library that integrates IBM DB2 database capabilities into NestJS applications. This package provides decorators, services, and utility functions to handle common database operations, connection management, caching, error handling, and transaction management, specifically tailored for IBM DB2 environments.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Usage](#usage)
  - [Using Db2Module](#using-db2module)
  - [Query Execution](#query-execution)
  - [Transaction Management](#transaction-management)
  - [Using Query Builder](#using-query-builder)
  - [Decorators](#decorators)
- [Error Handling](#error-handling)
- [Health Checks](#health-checks)
- [Cache Management](#cache-management)
- [Security](#security)
- [Contributing](#contributing)
- [License](#license)

## Features

- **Easy Integration**: Seamlessly integrate IBM DB2 databases into NestJS applications.
- **Typed Configuration**: TypeScript-based configuration options for better type safety and IDE support.
- **Connection Management**: Supports connection pooling, failover, and connection state monitoring.
- **Query Builder**: A fluent API for building SQL queries with support for subqueries, parameterized queries, and more.
- **Transaction Management**: Built-in support for transactions with `beginTransaction`, `commitTransaction`, and `rollbackTransaction`.
- **Caching**: Integrated caching with customizable TTL to improve performance for expensive queries.
- **Decorators**: Custom decorators to enforce connection state checks and cache results.
- **Health Checks**: Support for implementing health checks using NestJS Terminus.

## Installation

```bash
npm install @mcereal/nestjsdb2 --save
```

## Getting Started

To get started, import the Db2Module into your NestJS application and configure it using the provided options.

```typescript
import { Module } from '@nestjs/common';
import { Db2Module } from '@mcereal/nestjsdb2';

@Module({
  imports: [
    Db2Module.forRoot({
      host: 'localhost',
      port: 50000,
      username: 'db2user',
      password: 'password',
      database: 'sampledb',
    }),
  ],
})
export class AppModule {}
```

## Configuration

The Db2Module can be configured either synchronously or asynchronously:

### Synchronous Configuration

```typescript
Db2Module.forRoot({
  host: 'localhost',
  port: 50000,
  username: 'db2user',
  password: 'password',
  database: 'sampledb',
  useTls: true, // Optional
  sslCertificatePath: '/path/to/certificate.pem', // Optional
  cacheEnabled: true, // Optional
});
```

### Asynchronous Configuration

```typescript
Db2Module.forRootAsync({
  useFactory: async (configService: ConfigService) => ({
    host: configService.get<string>('DB_HOST'),
    port: configService.get<number>('DB_PORT'),
    username: configService.get<string>('DB_USER'),
    password: configService.get<string>('DB_PASS'),
    database: configService.get<string>('DB_NAME'),
  }),
  inject: [ConfigService],
});
```

## Usage

### Using Db2Module

Inject the Db2Service into your service or controller to interact with the DB2 database:

```typescript
import { Injectable } from '@nestjs/common';
import { Db2Service } from 'ibm_db2';

@Injectable()
export class UserService {
  constructor(private readonly db2Service: Db2Service) {}

  async getUserData(userId: string) {
    return this.db2Service.query('SELECT * FROM users WHERE id = ?', [userId]);
  }
}
```

### Query Execution

The `query` method executes a SQL query and returns the result as an array of objects:

```typescript
const result = await this.db2Service.query('SELECT * FROM users');
```

### Transaction Management

The `beginTransaction`, `commitTransaction`, and `rollbackTransaction` methods provide support for transactions:

```typescript
await this.db2Service.beginTransaction();
await this.db2Service.query('INSERT INTO users (name) VALUES (?)', ['Alice']);
await this.db2Service.commitTransaction();
```

### Using Query Builder

The `QueryBuilder` class provides a fluent API for building SQL queries:

```typescript
const query = new QueryBuilder()
  .select('name', 'email')
  .from('users')
  .where('id = ?', [userId])
  .limit(1)
  .build();

const result = await this.db2Service.query(query);
```

### Decorators

The `@Transaction`, `@Connection`, and `@Cache` decorators can be used to enforce connection state checks and cache results:

```typescript
import { Transaction, Connection, Cache } from 'ibm_db2';

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

  @Cache({ ttl: 60 })
  async getRecentUsers() {
    return this.db2Service.query(
      'SELECT * FROM users ORDER BY created_at DESC LIMIT 10',
    );
  }
}
```

## Error Handling

The `ibm_db2` module provides detailed error messages and stack traces for common database errors. You can catch and handle these errors in your application:

```typescript
try {
  await this.db2Service.query('SELECT * FROM non_existent_table');
} catch (error) {
  console.error('An error occurred:', error.message);
}
```

## Health Checks

You can implement health checks for your NestJS application using the `TerminusModule` and the `Db2HealthIndicator`:

```typescript
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { Db2HealthIndicator } from 'ibm_db2';

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

## Cache Management

The `ibm_db2` module supports integrated caching with customizable TTL to improve performance for expensive queries. You can enable caching by setting the `cacheEnabled` option in the module configuration:

```typescript
Db2Module.forRoot({
  host: 'localhost',
  port: 50000,
  username
    password
    database
    cacheEnabled: true,
});
```

You can use the `@Cache` decorator to cache the results of a query with a specific TTL:

```typescript
import { Cache } from 'ibm_db2';

@Injectable()
export class UserService {
  @Cache({ ttl: 60 })
  async getRecentUsers() {
    return this.db2Service.query(
      'SELECT * FROM users ORDER BY created_at DESC LIMIT 10',
    );
  }
}
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
