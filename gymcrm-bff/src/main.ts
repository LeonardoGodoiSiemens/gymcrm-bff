import 'dotenv/config';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { configureApp } from './api/configure-app';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app, { gatewaySecret: process.env.GATEWAY_SECRET, corsOrigin: process.env.CORS_ORIGIN });

  const config = new DocumentBuilder()
    .setTitle('GymCRM - BFF (Backend for Frontend)')
    .setDescription(
      'Ponto de entrada do Microfrontend. Agrega MS Estoque (MongoDB), MS Matrículas (Azure SQL) e a Azure Function; ' +
        'faz proxy CRUD dos microsserviços.',
    )
    .setVersion('1.0')
    .addApiKey({ type: 'apiKey', name: 'x-gateway-secret', in: 'header' }, 'gateway-secret')
    .build();
  SwaggerModule.setup('swagger', app, SwaggerModule.createDocument(app, config));

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, '0.0.0.0');
  console.log(`bff listening on :${port} (Swagger: /swagger)`);
}
bootstrap();
