import { Logger } from "@nestjs/common";

export function Db2Audit(): MethodDecorator {
  const logger = new Logger("Db2AuditDecorator");

  return function (
    _target: Object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const entity = args[0]; // Assume the first argument is the entity
      const beforeChange = { ...entity }; // Deep copy for comparison

      const result = await originalMethod.apply(this, args);

      const afterChange = args[0]; // Updated entity

      logger.log(`Audit log for method ${String(propertyKey)}`);
      logger.log(`Before: ${JSON.stringify(beforeChange)}`);
      logger.log(`After: ${JSON.stringify(afterChange)}`);

      // Here you could add logic to save this audit information to a database or audit log

      return result;
    };

    return descriptor;
  };
}
