import { EventEmitter } from 'events';
import { IFactory } from '../interfaces/factory.interface';
import { IPoolOptions } from '../interfaces/pool-options.interface';
import { IPool, IPoolResource } from '../interfaces/pool.interface';

export class Pool<T> extends EventEmitter implements IPool<T> {
  private factory: IFactory<T>;
  private options: IPoolOptions;
  private resources: IPoolResource<T>[] = [];
  private waitingClients: Array<{
    resolve: (resource: T) => void;
    reject: (error: any) => void;
    timeout: NodeJS.Timeout;
  }> = [];
  private draining: boolean = false;
  private idleCheckInterval: NodeJS.Timeout | null = null;

  constructor(factory: IFactory<T>, options: IPoolOptions) {
    super();
    this.factory = factory;
    this.options = options;
    this.initialize();

    // Set up periodic idle checks
    if (this.options.idleCheckIntervalMillis !== undefined) {
      this.idleCheckInterval = setInterval(() => {
        this.checkIdleResources();
      }, this.options.idleCheckIntervalMillis);
    }
  }

  private async initialize() {
    for (let i = 0; i < this.options.minPoolSize; i++) {
      await this.createResource();
    }
  }

  private checkIdleResources(): void {
    const now = Date.now();
    for (const res of this.resources) {
      const hasExceededLifetime = this.options.maxLifetime
        ? now - res.createdAt > this.options.maxLifetime
        : false;
      const hasExceededIdleTime =
        now - res.lastUsed > (this.options.idleTimeoutMillis || 30000);

      if (!res.inUse && (hasExceededIdleTime || hasExceededLifetime)) {
        this.destroy(res.resource).catch((err) =>
          this.emit('destroyError', err),
        );
      }
    }
  }

  private async createResource(): Promise<void> {
    try {
      if (this.resources.length >= this.options.maxPoolSize) {
        return;
      }

      const resource = await this.factory.create();
      this.resources.push({
        resource,
        inUse: false,
        lastUsed: Date.now(),
        createdAt: Date.now(),
      });
      this.emit('createSuccess', resource);
      this.checkWaitingClients();
    } catch (error) {
      this.emit('createError', error);
    }
  }

  private checkWaitingClients(): void {
    if (this.waitingClients.length === 0) return;

    for (let i = 0; i < this.resources.length; i++) {
      const res = this.resources[i];
      if (!res.inUse) {
        const client = this.waitingClients.shift();
        if (client) {
          res.inUse = true;
          clearTimeout(client.timeout);
          client.resolve(res.resource);
          this.emit('acquire', res.resource);
          if (this.resources.length > this.options.maxPoolSize) {
            this.destroy(res.resource).catch((err) =>
              this.emit('destroyError', err),
            );
          }
        }
        if (this.waitingClients.length === 0) break;
      }
    }
  }

  public acquire(): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      if (this.draining) {
        return reject(
          new Error('Pool is draining, cannot acquire new resources.'),
        );
      }

      const availableResource = this.resources.find((res) => !res.inUse);
      if (availableResource) {
        availableResource.inUse = true;
        this.emit('acquire', availableResource.resource);
        return resolve(availableResource.resource);
      }

      if (this.resources.length < this.options.maxPoolSize) {
        this.createResource()
          .then(() => {
            const newResource = this.resources.find((res) => !res.inUse);
            if (newResource) {
              newResource.inUse = true;
              this.emit('acquire', newResource.resource);
              resolve(newResource.resource);
            } else {
              reject(new Error('Failed to create a new resource.'));
            }
          })
          .catch(reject);
      } else if (
        !this.options.maxWaitingClients ||
        this.waitingClients.length < this.options.maxWaitingClients
      ) {
        const timeout = setTimeout(() => {
          const index = this.waitingClients.findIndex(
            (c) => c.timeout === timeout,
          );
          if (index !== -1) {
            const client = this.waitingClients.splice(index, 1)[0];
            client.reject(new Error('Acquire timeout'));
          }
        }, this.options.acquireTimeoutMillis || 30000);

        this.waitingClients.push({ resolve, reject, timeout });
      } else {
        reject(
          new Error('No available resources and max waiting clients reached.'),
        );
      }
    });
  }

  public async release(resource: T): Promise<void> {
    if (this.draining) {
      this.destroy(resource).catch((err) => this.emit('destroyError', err));
      return;
    }

    const poolResource = this.resources.find(
      (res) => res.resource === resource,
    );
    if (!poolResource) {
      this.emit(
        'releaseError',
        new Error('Resource does not belong to the pool.'),
      );
      return;
    }

    // Validate the resource before releasing
    if (this.options.validationFunction) {
      const isValid = await this.options.validationFunction(resource);
      if (!isValid) {
        this.destroy(resource).catch((err) => this.emit('destroyError', err));
        return;
      }
    }

    poolResource.inUse = false;
    poolResource.lastUsed = Date.now();
    this.emit('release', resource);
    this.checkWaitingClients();
  }

  public async drain(): Promise<void> {
    this.draining = true;
    await this.clear();
    if (this.idleCheckInterval) {
      clearInterval(this.idleCheckInterval);
      this.idleCheckInterval = null;
    }
    this.emit('drain');
  }

  public async clear(): Promise<void> {
    const destroyPromises = this.resources.map((res) =>
      this.factory.destroy(res.resource),
    );
    await Promise.all(destroyPromises);
    this.resources = [];
    this.waitingClients.forEach((client) => {
      clearTimeout(client.timeout);
      client.reject(new Error('Pool is being cleared.'));
    });
    this.waitingClients = [];
    this.emit('clear');
  }

  private async destroy(resource: T): Promise<void> {
    try {
      await this.factory.destroy(resource);
      this.resources = this.resources.filter(
        (res) => res.resource !== resource,
      );
      this.emit('destroy', resource);
    } catch (error) {
      this.emit('destroyError', error);
      throw error;
    }
  }
}
