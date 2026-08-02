import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as express from 'express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: true,
    credentials: true,
  });
  app.use('/uploads', express.static(join(process.cwd(), 'uploads')));
  const port = process.env.PORT || 5000;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 NestJS ERP Backend listening on port ${port}`);
}
bootstrap();
