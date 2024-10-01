// src/interfaces/config-manager.interface.ts

import { IConfigOptions } from './config-options.interface';

export interface IDb2ConfigManager {
  get config(): IConfigOptions;
}
