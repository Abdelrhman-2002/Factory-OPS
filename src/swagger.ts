import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule, type OpenAPIObject } from '@nestjs/swagger';
import { AUTH, type Auth } from './auth/auth.js';

export const SESSION_COOKIE = 'better-auth.session_token';
export const SESSION_SECURITY = 'session';

const HTTP_METHODS = ['get', 'put', 'post', 'delete', 'patch', 'options', 'head', 'trace'] as const;

// One OpenAPI document for the whole API: the Nest controllers plus the Better Auth
// routes under /api/auth (sign in, sign out, sessions, admin and organization plugins).
export async function createOpenApiDocument(app: INestApplication): Promise<OpenAPIObject> {
  const config = new DocumentBuilder()
    .setTitle('Factory OPS API')
    .setDescription(
      'Multi tenant factory management API. Sign in with `POST /api/auth/sign-in/email`; ' +
        'the session is kept in an HTTP only cookie that every other route reads. ' +
        'Signup is closed: platform admins create organizations, organization admins create employees.',
    )
    .setVersion('0.0.1')
    .addCookieAuth(SESSION_COOKIE, { type: 'apiKey', in: 'cookie', name: SESSION_COOKIE }, SESSION_SECURITY)
    .build();

  const document = SwaggerModule.createDocument(app, config);
  mergeBetterAuth(document, await app.get<Auth>(AUTH).api.generateOpenAPISchema());
  return document;
}

type BetterAuthSchema = Awaited<ReturnType<Auth['api']['generateOpenAPISchema']>>;

function mergeBetterAuth(document: OpenAPIObject, authSchema: BetterAuthSchema) {
  const tags = new Set<string>();

  for (const [path, item] of Object.entries(authSchema.paths ?? {})) {
    const pathItem = structuredClone(item) as Record<string, { tags?: string[] } | undefined>;
    for (const method of HTTP_METHODS) {
      const operation = pathItem[method];
      if (!operation) continue;
      operation.tags = (operation.tags?.length ? operation.tags : ['Default']).map((tag) => `Auth: ${tag}`);
      operation.tags.forEach((tag) => tags.add(tag));
    }
    document.paths[`/api/auth${path}`] = pathItem as OpenAPIObject['paths'][string];
  }

  // Better Auth models (User, Session, Organization, ...) go in alongside the Nest DTOs.
  const components = (authSchema.components ?? {}) as NonNullable<OpenAPIObject['components']>;
  document.components ??= {};
  document.components.schemas = { ...components.schemas, ...document.components.schemas };
  document.components.securitySchemes = {
    ...components.securitySchemes,
    ...document.components.securitySchemes,
  };

  document.tags = [...(document.tags ?? []), ...[...tags].sort().map((name) => ({ name }))];
}
