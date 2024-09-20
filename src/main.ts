import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { Logger } from "@nestjs/common";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger("Bootstrap");

  try {
    logger.log("Starting the application...");
    await app.listen(3000);
    process.on("unhandledRejection", (reason, promise) => {
      logger.error("Unhandled Rejection:", reason);
    });
    logger.log("Application is running on: http://localhost:3000");
  } catch (error) {
    logger.error("Failed to start the application", error);
  }
}

bootstrap();
