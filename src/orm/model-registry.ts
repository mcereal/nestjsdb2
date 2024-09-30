// src/orm/model-registry.ts

import { Injectable, Logger } from '@nestjs/common';
import { Model } from './model';

@Injectable()
export class ModelRegistry {
  private readonly logger = new Logger(ModelRegistry.name);
  private readonly models: Map<string, Model<any>> = new Map();

  /**
   * Registers a new model with the given name.
   * @param name - The name of the model to register.
   * @param model - The model instance to register.
   * @throws Will throw an error if a model with the same name is already registered.
   *
   * @example
   * ```ts
   * modelRegistry.registerModel('User', userModel);
   * ```
   */
  registerModel(name: string, model: Model<any>): void {
    try {
      if (this.models.has(name)) {
        throw new Error(`Model with name '${name}' is already registered.`);
      }
      this.models.set(name, model);
      this.logger.log(`Model '${name}' registered successfully.`);
    } catch (error) {
      this.logger.error(`Failed to register model '${name}': ${error.message}`);
      throw new Error(`Failed to register model '${name}': ${error.message}`);
    }
  }

  /**
   * Retrieves a registered model by its name.
   * @param name - The name of the model to retrieve.
   * @returns The model instance if found, or `undefined` if not registered.
   *
   * @example
   * ```ts
   * const userModel = modelRegistry.getModel<User>('User');
   * ```
   */
  getModel<T>(name: string): Model<T> | undefined {
    try {
      return this.models.get(name);
    } catch (error) {
      this.logger.error(`Failed to retrieve model '${name}': ${error.message}`);
      throw new Error(`Failed to retrieve model '${name}': ${error.message}`);
    }
  }

  /**
   * Checks if a model with the given name is registered.
   * @param name - The name of the model to check.
   * @returns `true` if the model is registered, `false` otherwise.
   *
   * @example
   * ```ts
   * const exists = modelRegistry.hasModel('User');
   * ```
   */
  hasModel(name: string): boolean {
    try {
      return this.models.has(name);
    } catch (error) {
      this.logger.error(
        `Failed to check if model '${name}' exists: ${error.message}`,
      );
      throw new Error(
        `Failed to check if model '${name}' exists: ${error.message}`,
      );
    }
  }

  /**
   * Retrieves all registered models.
   * @returns An array of all registered models.
   *
   * @example
   * ```ts
   * const allModels = modelRegistry.getAllModels();
   * ```
   */
  getAllModels(): Model<any>[] {
    try {
      return Array.from(this.models.values());
    } catch (error) {
      this.logger.error(`Failed to retrieve all models: ${error.message}`);
      throw new Error(`Failed to retrieve all models: ${error.message}`);
    }
  }
}
