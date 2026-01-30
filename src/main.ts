import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';
import { join } from 'path';

// Load .env from project root (not dist)
dotenv.config({ path: join(__dirname, '..', '..', '.env') });

console.log('DATABASE_URL at runtime:', process.env.DATABASE_URL);

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors();

  await app.listen(process.env.PORT ?? 3005, '0.0.0.0');
}
bootstrap();
