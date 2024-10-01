export interface IFactory<T> {
  create(): Promise<T>;
  destroy(client: T): Promise<void>;
  validate?(client: T): Promise<boolean>;
}
