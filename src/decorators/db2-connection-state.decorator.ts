// Purpose: Decorator to check the DB2 connection state before executing a method.
import { Db2Service } from "src/services/db2.service";
import { Db2ConnectionState } from "src/enums/db2.enums";

export function CheckDb2ConnectionState(
  requiredState: Db2ConnectionState
): MethodDecorator {
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

      if (db2Service.getState() !== requiredState) {
        throw new Error(`DB2 connection state must be ${requiredState}`);
      }

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}
