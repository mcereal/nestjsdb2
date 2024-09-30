// src/config/index.ts

import db2Config from './db2.config';
import db2DevelopmentConfig from './db2.development.config';
import db2ProductionConfig from './db2.production.config';
// import other configurations as needed

export default () => {
  const environment = process.env.NODE_ENV || 'development';
  switch (environment) {
    case 'production':
      return [db2Config, db2ProductionConfig];
    case 'development':
    default:
      return [db2Config, db2DevelopmentConfig];
  }
};
