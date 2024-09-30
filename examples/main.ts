// testconnection/main.ts

import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { Logger } from '@mcereal/nestjsdb2';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });
  const logger = new Logger('Bootstrap');
  const PORT = process.env.PORT || 3010;

  const options = new DocumentBuilder()
    .setTitle('Blog Platform API')
    .setDescription('API documentation for the Blog Platform')
    .setVersion('1.0')
    .addTag('Users')
    .addTag('Posts')
    .addTag('Comments')
    .addTag('Categories')
    .addTag('UserRoles')
    .addTag('UserPostCount')
    .addTag('RecentPosts')
    .addTag('UserComments')
    .addServer(`http://localhost:${PORT}`)
    .build();
  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup('api-docs', app, document);

  try {
    logger.info('Starting the application...');
    await app.listen(PORT, '0.0.0.0', () => {
      logger.info(`Application is listening on port: ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start the application', error);
  }
}

bootstrap();
