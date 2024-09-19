import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { Logger } from "@nestjs/common";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger("Bootstrap");

  try {
    await app.listen(3000);
    logger.log("Application is running on: http://localhost:3000");
  } catch (error) {
    logger.error("Failed to start the application", error);
  }
}

bootstrap();
