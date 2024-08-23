// Purpose: Custom decorator to extract the Db2 parameter from the request object.
import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export const Db2Param = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    return ctx.getArgs()[0]; // Assuming the first argument is the parameter
  }
);
