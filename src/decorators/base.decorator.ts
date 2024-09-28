// src/decorators/base.decorator.ts
import { ClassConstructor } from '../types';
import { addMetadata, MetadataType } from './utils';

export abstract class BaseDecorator<T> {
  constructor(
    protected metadataType: MetadataType,
    protected optionsValidator: (options: T) => void,
    protected metadataCreator: (
      propertyKey: string | symbol,
      options: T,
    ) => any,
    protected uniqueCheckFn?: (existing: any, newEntry: any) => boolean,
  ) {}

  decorate(options: T): PropertyDecorator | ClassDecorator {
    return (target: Object | Function, propertyKey?: string | symbol) => {
      // Validate options
      this.optionsValidator(options);

      if (typeof target === 'function') {
        // Class Decorator
        (this as any).createClassMetadata(target as Function, options);
      } else if (propertyKey) {
        // Property Decorator
        const constructor = target.constructor as ClassConstructor;
        const metadataEntry = this.metadataCreator(propertyKey, options);
        addMetadata(
          constructor,
          this.metadataType,
          metadataEntry,
          this.uniqueCheckFn,
        );
      }
    };
  }

  protected abstract createClassMetadata(target: Function, options: T): void;
}
