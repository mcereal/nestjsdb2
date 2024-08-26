// src/decorators/db2-param.decorator.ts

import {
  createParamDecorator,
  ExecutionContext,
  BadRequestException,
} from "@nestjs/common";

/**
 * @function Db2Param
 * @description A custom parameter decorator for use in NestJS that extracts specific parameters
 * from the execution context. This decorator allows for flexible parameter extraction by providing
 * an optional key or index to target specific arguments, such as parts of the request object.
 *
 * @param {string | number | undefined} data - Optional key or index specifying which part of the context
 *                                             to extract. If not provided, defaults to the first argument.
 * @param {ExecutionContext} ctx - The execution context from which the parameter is to be extracted.
 *                                 Provides access to request and response objects, among other things.
 * @returns {any} - The extracted parameter value based on the provided key or index.
 *
 * @throws {BadRequestException} - If the requested parameter is not found in the context.
 *
 * @example
 * // Example usage of the Db2Param decorator in a NestJS controller
 * import { Controller, Get } from '@nestjs/common';
 * import { Db2Param } from 'src/decorators/db2-param.decorator';
 *
 * @Controller('example')
 * class ExampleController {
 *   @Get()
 *   someMethod(@Db2Param('userId') userId: string): string {
 *     // userId will be extracted from the request parameters or other context-specific arguments
 *     return `Received userId: ${userId}`;
 *   }
 * }
 */
export const Db2Param = createParamDecorator(
  (data: string | number | undefined, ctx: ExecutionContext) => {
    // Get the arguments passed to the execution context
    const args = ctx.getArgs();

    // Default to the first argument if no key or index is provided
    if (data === undefined) {
      return args[0];
    }

    // Handle extraction based on string key (e.g., 'body', 'query', 'params')
    if (typeof data === "string") {
      // Attempt to get the parameter from different context objects
      const request = ctx.switchToHttp().getRequest();
      if (request[data]) {
        return request[data];
      }
      // Fallback to searching in args if not found in request
      const foundArg = args.find(
        (arg) => arg && typeof arg === "object" && arg[data]
      );
      if (foundArg) {
        return foundArg[data];
      }
    }

    // Handle extraction based on array index
    if (typeof data === "number") {
      if (args[data] !== undefined) {
        return args[data];
      }
    }

    // If the parameter is not found, throw an exception
    throw new BadRequestException(
      `Parameter ${data} not found in execution context`
    );
  }
);
