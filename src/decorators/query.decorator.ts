// src/decorators/db2-query.decorator.ts

import { Db2Service } from "src/services/db2.service";
import { Logger } from "@nestjs/common";

export const Db2Query = (
  query: string,
  executeQuery: boolean = true
): MethodDecorator => {
  const logger = new Logger("Db2QueryDecorator");

  return (
    _target: Object,
    _propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) => {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const db2Service = (this as any).db2Service as Db2Service;

      if (!db2Service) {
        logger.error("Db2Service is not available on the instance");
        throw new Error("Db2Service is not available");
      }

      let queryResult;
      if (executeQuery) {
        try {
          queryResult = await db2Service.query(query, args);
          logger.log(`Query executed successfully: ${query}`);
        } catch (error) {
          logger.error(`Error executing query: ${query} - ${error.message}`);
          throw new Error(`Error executing query: ${error.message}`);
        }
      } else {
        logger.warn(`Query execution bypassed for: ${query}`);
      }

      return await originalMethod.apply(this, [queryResult, ...args]);
    };

    return descriptor;
  };
};
