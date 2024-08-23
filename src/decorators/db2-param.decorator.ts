/**
 * @fileoverview This file contains the implementation of the Db2Param decorator.
 * The Db2Param decorator is a custom parameter decorator used in NestJS controllers to extract
 * specific parameters from the execution context, such as a request object, or any other context-specific arguments.
 * It simplifies the retrieval of arguments for methods, allowing for clean and concise controller method signatures.
 *
 * @function Db2Param
 *
 * @requires createParamDecorator from "@nestjs/common"
 * @requires ExecutionContext from "@nestjs/common"
 *
 * @exports Db2Param
 */

import { createParamDecorator, ExecutionContext } from "@nestjs/common";

/**
 * @function Db2Param
 * @description A custom parameter decorator for use in NestJS that extracts specific parameters
 * from the execution context, such as request objects or other context-specific arguments.
 * This decorator simplifies the process of retrieving parameters, ensuring that they are consistently
 * accessed across different parts of the application.
 *
 * @param {unknown} _data - Optional data passed to the decorator. This parameter is not used but
 *                          kept for compatibility with the NestJS createParamDecorator signature.
 * @param {ExecutionContext} ctx - The execution context from which the parameter is to be extracted.
 *                                 This provides access to the request and response objects, among other things.
 * @returns {any} - The extracted parameter, which is the first argument in the execution context's arguments array.
 *
 * @example
 * // Example usage of the Db2Param decorator in a NestJS controller
 * import { Controller, Get } from "@nestjs/common";
 * import { Db2Param } from "src/decorators/db2-param.decorator";
 *
 * @Controller('example')
 * class ExampleController {
 *   @Get()
 *   someMethod(@Db2Param() param: any): string {
 *     // param will be the first argument from the execution context
 *     return `Received parameter: ${param}`;
 *   }
 * }
 */
export const Db2Param = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    // Extracts and returns the first argument from the execution context
    return ctx.getArgs()[0];
  }
);
