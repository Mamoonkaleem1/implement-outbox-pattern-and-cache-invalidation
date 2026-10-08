import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security Headers
  app.use(helmet());

  // Enable CORS
  app.enableCors();

  // Global API Prefix
  app.setGlobalPrefix('api/v1');

  // Global Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
    }),
  );

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('Authentication Service')
    .setDescription('Production Grade Authentication API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('docs', app, document);

  // Prisma Shutdown Hook
  const prisma = app.get(PrismaService);

  await prisma.enableShutdownHooks(app);

  await app.listen(process.env.PORT ?? 3000);

  console.log(
    `🚀 Application running on http://localhost:${process.env.PORT ?? 3000}/api/v1`,
  );

  console.log(
    `📚 Swagger Docs: http://localhost:${process.env.PORT ?? 3000}/docs`,
  );
}

void bootstrap();
