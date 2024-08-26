// src/decorators/db2-param.decorator.ts

import {
  createParamDecorator,
  ExecutionContext,
  BadRequestException,
} from "@nestjs/common";
import { SqlInjectionChecker } from "../utils/sql-injection-checker"; // Import the SqlInjectionChecker

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
    const sqlInjectionChecker = new SqlInjectionChecker();
    const args = ctx.getArgs();

    let paramValue: any;

    // Default to the first argument if no key or index is provided
    if (data === undefined) {
      paramValue = args[0];
    } else if (typeof data === "string") {
      const request = ctx.switchToHttp().getRequest();
      paramValue =
        request[data] ||
        args.find((arg) => arg && typeof arg === "object" && arg[data])?.[data];
    } else if (typeof data === "number") {
      paramValue = args[data];
    }

    // If the parameter is not found, throw an exception
    if (paramValue === undefined) {
      throw new BadRequestException(
        `Parameter ${data} not found in execution context`
      );
    }

    try {
      sqlInjectionChecker.validateParams([paramValue]);
    } catch (error) {
      throw new BadRequestException(`Invalid parameter: ${error.message}`);
    }

    return paramValue;
  }
);
