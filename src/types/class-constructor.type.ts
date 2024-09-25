// src/types/class-constructor.type.ts

export type ClassConstructor<T = any> = new (...args: any[]) => T;
