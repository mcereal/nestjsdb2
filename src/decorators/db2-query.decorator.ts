// Purpose: Decorator to execute a DB2 query using the Db2Service.
import { Db2Service } from "src/services/db2.service";

export function Db2Query(query: string): MethodDecorator {
  return function (
    _target: Object,
    _propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value; // Save a reference to the original method

    descriptor.value = async function (...args: any[]) {
      const db2Service = (this as any).db2Service as Db2Service;
      if (!db2Service) {
        throw new Error("Db2Service is not available");
      }

      try {
        // Execute the DB2 query
        const result = await db2Service.query(query, args);

        // Optionally call the original method if you need its behavior
        // If not required, you can remove this line
        await originalMethod.apply(this, args);

        return result;
      } catch (error) {
        throw new Error(`Error executing query: ${error.message}`);
      }
    };

    return descriptor;
  };
}
