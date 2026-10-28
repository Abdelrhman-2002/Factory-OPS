import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { AppModule } from '../app.module.js';
import { createOpenApiDocument } from '../swagger.js';

// Writes the full OpenAPI document to openapi.json at the project root.
// Runs from the compiled output (npm run openapi) because the Swagger CLI plugin
// adds the DTO metadata at build time.
const app = await NestFactory.create(AppModule, { logger: ['error'] });
try {
  const document = await createOpenApiDocument(app);
  const target = resolve(process.cwd(), 'openapi.json');
  await writeFile(target, `${JSON.stringify(document, null, 2)}\n`);
  console.log(`OpenAPI document written to ${target} (${Object.keys(document.paths).length} paths)`);
} finally {
  await app.close();
}
