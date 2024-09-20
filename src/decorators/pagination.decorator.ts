// src/decorators/db2-pagination.decorator.ts

import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * @function Db2Pagination
 * @description A parameter decorator for use in NestJS that extracts pagination parameters
 * (page and limit) from the HTTP request query and provides them to the method.
 * This decorator is useful for methods that need to handle pagination for database queries.
 *
 * @returns {Object} - An object containing 'skip' and 'limit' values for pagination.
 *
 * @example
 * // Example usage of the Db2Pagination decorator in a service class
 * import { Injectable } from '@nestjs/common';
 * import { Db2Pagination } from 'src/decorators/db2-pagination.decorator';
 *
 * @Injectable()
 * class ExampleService {
 *   async findEntities(@Db2Pagination() pagination: { skip: number, limit: number }) {
 *     // Use the skip and limit values to paginate the query
 *   }
 * }
 */
export const Db2Pagination = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const page = parseInt(request.query.page, 10) || 1; // Default to page 1 if not provided
    const limit = parseInt(request.query.limit, 10) || 10; // Default to 10 items per page if not provided
    const skip = (page - 1) * limit; // Calculate the number of items to skip

    return { skip, limit };
  },
);
