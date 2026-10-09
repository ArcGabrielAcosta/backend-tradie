import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { join } from 'path';
import { AppModule } from './app/app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  app.use(helmet());
  app.enableCors({
    origin: config.get<string[]>('corsOrigins'),
    credentials: true,
  });

  const apiPrefix = config.get<string>('apiPrefix') ?? 'api/v1';
  app.setGlobalPrefix(apiPrefix, {
    exclude: ['/', 'nestlens', 'nestlens/(.*)', 'docs', 'docs-json'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  app.useStaticAssets(join(process.cwd(), 'public'));

  const swaggerPath = config.get<string>('swaggerPath') ?? 'docs';
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Tradie API')
    .setDescription(
      'Backend API for the Tradie platform. Auth uses Firebase ID tokens (Bearer). Session cache and rate limits use Redis.',
    )
    .setVersion('0.1.0')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'Firebase ID token',
    })
    .addTag('auth')
    .addTag('categories')
    .addTag('admin-categories')
    .addTag('health')
    .build();

  const documentFactory = () =>
    SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(swaggerPath, app, documentFactory, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = config.get<number>('port') ?? 3001;
  await app.listen(port);

  const nestlensPath = process.env.NESTLENS_PATH ?? '/nestlens';
  console.log(`API listening on http://localhost:${port}`);
  console.log(`API prefix: /${apiPrefix}`);
  console.log(`Swagger UI at http://localhost:${port}/${swaggerPath}`);
  console.log(`NestLens at http://localhost:${port}${nestlensPath}`);
  console.log(
    `Firebase auth mode: ${config.get<string>('firebase.mode') ?? 'mock'}`,
  );
}
bootstrap();
