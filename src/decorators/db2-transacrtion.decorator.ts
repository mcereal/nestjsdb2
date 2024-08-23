// Purpose: Decorator for handling transaction in db2 service.
import { Db2Service } from "src/services/db2.service";

export function Transaction(): MethodDecorator {
  return function (
    _target: Object,
    _propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const db2Service = (this as any).db2Service as Db2Service;
      if (!db2Service) {
        throw new Error("Db2Service is not available");
      }

      await db2Service.beginTransaction();
      try {
        const result = await originalMethod.apply(this, args);
        await db2Service.commitTransaction();
        return result;
      } catch (error) {
        await db2Service.rollbackTransaction();
        throw error;
      }
    };

    return descriptor;
  };
}
