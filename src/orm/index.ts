// src/orm/index.ts

/**
 * @module
 * @description
 * Entry point for the ORM module.
 * @preferred
 *
 * @example
 * ```ts
 * import { ModelRegistry } from '@mceral/nestjsdb2/packages/orm';
 * ```
 */

export * from './model'; // re-export from model.ts
export * from './schema'; // re-export from schema.ts
export * from './model-registry'; // re-export from model-registry.ts
export * from './interfaces'; // re-export from interfaces/index.ts
export * from './decorators'; // re-export from decorators/index.ts
