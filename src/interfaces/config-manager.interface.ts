// src/interfaces/config-manager.interface.ts

import { IDb2ConfigOptions } from './db2-config-options.interface';

export interface IDb2ConfigManager {
  get config(): IDb2ConfigOptions;
}
