// src/decorators/cache-result.decorator.ts

/**
 * @fileoverview This file contains the implementation of the CacheResult decorator.
 * The CacheResult decorator is used to cache the results of method calls, reducing redundant
 * executions and improving performance. The decorator checks if a cached result exists before
 * executing the method, returning the cached result if available. If not, it executes the method,
 * caches the result, and then returns it.
 *
 * @function CacheResult
 *
 * @requires Cache from "cache-manager"
 *
 * @exports CacheResult
 */

import { Cache } from "cache-manager";
import { Logger } from "@nestjs/common";

/**
 * @function CacheResult
 * @description A method decorator that caches the result of the decorated method for a specified
 * time-to-live (TTL) period. If the method is called again with the same arguments within the TTL,
 * the cached result is returned instead of re-executing the method. This can significantly improve
 * performance for expensive operations that produce the same result when called with the same parameters.
 *
 * @param {number} [ttl=60] - The time-to-live for the cached result, in seconds. Defaults to 60 seconds.
 * @returns {MethodDecorator} - A method decorator that wraps the original method with caching logic.
 *
 * @example
 * // Example usage of the CacheResult decorator in a service class
 * import { Injectable } from "@nestjs/common";
 * import { CacheResult } from "src/decorators/cache-result.decorator";
 *
 * @Injectable()
 * class ExampleService {
 *   @CacheResult(120) // Cache the result for 120 seconds
 *   async getExpensiveData() {
 *     // Perform an expensive data retrieval operation
 *   }
 * }
 */
export function CacheResult(ttl: number = 60): MethodDecorator {
  const logger = new Logger("CacheResultDecorator");

  return function (
    target: Object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cache = (this as any).cache as Cache; // Retrieve the cache manager instance
      if (!cache) {
        logger.warn(
          `Cache manager not available for ${propertyKey.toString()}. Proceeding without caching.`
        );
        return originalMethod.apply(this, args);
      }

      const cacheKey = `${propertyKey.toString()}-${JSON.stringify(args)}`; // Create a unique cache key based on method name and arguments

      try {
        const cachedResult = await cache.get(cacheKey); // Check if result is in cache
        if (cachedResult !== undefined) {
          logger.debug(`Cache hit for key: ${cacheKey}`);
          return cachedResult; // Return cached result if available
        }

        logger.debug(`Cache miss for key: ${cacheKey}. Executing method.`);
        const result = await originalMethod.apply(this, args); // Execute the original method
        await cache.set(cacheKey, result, ttl); // Cache the result with the specified TTL

        return result; // Return the result of the method execution
      } catch (error) {
        logger.error(
          `Cache operation failed for ${propertyKey.toString()}: ${
            error.message
          }`
        );
        // Fallback: execute the method without caching
        return originalMethod.apply(this, args);
      }
    };

    return descriptor;
  };
}
