// src/orm/model-registry.ts
import { Injectable } from '@nestjs/common';
import { Model } from './model';

@Injectable()
export class ModelRegistry {
  private readonly models: Map<string, Model<any>> = new Map();

  registerModel(name: string, model: Model<any>): void {
    if (this.models.has(name)) {
      throw new Error(`Model with name ${name} is already registered.`);
    }
    this.models.set(name, model);
  }

  getModel<T>(name: string): Model<T> | undefined {
    return this.models.get(name);
  }

  hasModel(name: string): boolean {
    return this.models.has(name);
  }

  getAllModels(): Model<any>[] {
    return Array.from(this.models.values());
  }
}
