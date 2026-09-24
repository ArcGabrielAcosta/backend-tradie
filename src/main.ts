import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const swaggerPath = process.env.SWAGGER_PATH ?? 'docs';
  const config = new DocumentBuilder()
    .setTitle('Tradie API')
    .setDescription(
      'Backend API for the Tradie platform. Consumed by the web and mobile clients.',
    )
    .setVersion('0.0.1')
    .addBearerAuth()
    .build();

  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(swaggerPath, app, documentFactory, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = process.env.PORT ?? 3001;
  await app.listen(port);

  const nestlensPath = process.env.NESTLENS_PATH ?? '/nestlens';
  console.log(`API listening on http://localhost:${port}`);
  console.log(`Swagger UI at http://localhost:${port}/${swaggerPath}`);
  console.log(`NestLens at http://localhost:${port}${nestlensPath}`);
}
bootstrap();
