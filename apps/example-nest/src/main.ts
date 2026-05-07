import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { setupBetterOpenApiViewer } from '@clementoh/better-openapi-viewer-nestjs';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  const config = new DocumentBuilder()
    .setTitle('Example API')
    .setDescription('Demo API for Better OpenAPI Viewer development.')
    .setVersion('0.0.0')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', in: 'header', name: 'x-api-key' }, 'apiKey')
    .addServer('http://localhost:3000', 'Local development')
    .addServer('/api', 'Relative API prefix')
    .build();
  const document = SwaggerModule.createDocument(app, config);

  setupBetterOpenApiViewer(app, {
    path: 'docs',
    jsonPath: 'docs/openapi.json',
    document,
  });

  SwaggerModule.setup('swagger', app, document);

  await app.listen(process.env.PORT ? Number(process.env.PORT) : 3000);
}

void bootstrap();
