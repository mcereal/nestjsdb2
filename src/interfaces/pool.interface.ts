// src/interfaces/pool.interface.ts

export interface IPoolResource<T> {
  resource: T;
  inUse: boolean;
  lastUsed: number;
  createdAt: number;
}

export interface IPool<T> {
  acquire(): Promise<T>;
  release(resource: T): void;
  drain(): Promise<void>;
  clear(): Promise<void>;
}
