import { Cache } from 'cache-manager';
import { Logger } from '../utils';

export const CacheResult = (ttl = 60): MethodDecorator => {
  const logger = new Logger('CacheResultDecorator');

  return (
    _target: unknown, // Changed to `unknown` as it is not being used
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) => {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // Retrieve the cache manager instance from the current class
      const cache = (this as any).cache as Cache;

      // Check if cache is available
      if (!cache) {
        logger.warn(
          `Cache manager not available for ${propertyKey.toString()}. Proceeding without caching.`,
        );
        return originalMethod.apply(this, args);
      }

      // Create a unique cache key based on method name and arguments
      const cacheKey = `${propertyKey.toString()}-${JSON.stringify(args)}`;

      try {
        // Attempt to retrieve the result from cache
        const cachedResult = await cache.get(cacheKey);
        if (cachedResult !== undefined) {
          logger.debug(`Cache hit for key: ${cacheKey}`);
          return cachedResult; // Return cached result if available
        }

        logger.debug(`Cache miss for key: ${cacheKey}. Executing method.`);
        // Execute the original method
        const result = await originalMethod.apply(this, args);

        // Set the result in the cache with the specified TTL
        await cache.set(cacheKey, result, ttl);

        return result; // Return the result of the method execution
      } catch (error) {
        logger.error(
          `Cache operation failed for ${propertyKey.toString()}: ${
            error.message
          }`,
        );
        // Fallback: execute the method without caching
        return originalMethod.apply(this, args);
      }
    };

    return descriptor;
  };
};
