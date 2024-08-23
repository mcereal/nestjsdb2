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

import { Cache } from "cache-manager"; // Assuming you're using a cache manager

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
  return function (
    _target: Object,
    _propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cache = (this as any).cache as Cache; // Retrieve the cache manager instance
      const cacheKey = `${_propertyKey.toString()}-${JSON.stringify(args)}`; // Create a unique cache key based on method name and arguments

      const cachedResult = await cache.get(cacheKey); // Check if result is in cache
      if (cachedResult) {
        return cachedResult; // Return cached result if available
      }

      const result = await originalMethod.apply(this, args); // Execute the original method
      await cache.set(cacheKey, result, { ttl }); // Cache the result with the specified TTL

      return result; // Return the result of the method execution
    };

    return descriptor;
  };
}
