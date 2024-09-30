// src/config/index.ts

import db2Config from './db2.config';
import db2DevelopmentConfig from './db2.development.config';
import db2ProductionConfig from './db2.production.config';
// Import other configurations as needed

const environment = process.env.NODE_ENV || 'development';

const configArray = [db2Config];

if (environment === 'development') {
  configArray.push(db2DevelopmentConfig);
} else if (environment === 'production') {
  configArray.push(db2ProductionConfig);
}

export default configArray;
