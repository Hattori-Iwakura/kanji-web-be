import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

export interface AuthTokens {
  accessToken: string;
  user: {
    id: number;
    email: string;
    name: string;
    role: string;
  };
}

/**
 * Register a new user and return auth tokens
 */
export async function registerUser(
  app: INestApplication,
  data: {
    email: string;
    password: string;
    name?: string;
  },
): Promise<AuthTokens> {
  const response = await request(app.getHttpServer())
    .post('/auth/register')
    .send(data);

  if (response.status !== 201) {
    console.log('Register failed:', response.status, response.body);
    throw new Error(`Register failed: ${response.status} - ${JSON.stringify(response.body)}`);
  }

  return response.body;
}

/**
 * Login user and return auth tokens
 */
export async function loginUser(
  app: INestApplication,
  credentials: {
    email: string;
    password: string;
  },
): Promise<AuthTokens> {
  const response = await request(app.getHttpServer())
    .post('/auth/login')
    .send(credentials)
    .expect(201);

  return response.body;
}

/**
 * Create and login a test user in one step
 */
export async function createAndLoginUser(
  app: INestApplication,
  data?: {
    email?: string;
    password?: string;
    name?: string;
  },
): Promise<AuthTokens> {
  const timestamp = Date.now();
  const userData = {
    email: data?.email || `test-${timestamp}@example.com`,
    password: data?.password || 'TestPassword123!@#',
    name: data?.name,
  };

  return await registerUser(app, userData);
}

/**
 * Create and login an admin user
 */
export async function createAndLoginAdmin(
  app: INestApplication,
): Promise<AuthTokens> {
  // First create a regular user
  const user = await createAndLoginUser(app, {
    email: `admin-${Date.now()}@example.com`,
    password: 'AdminPassword123!@#',
  });

  // Update user role to ADMIN directly in database
  const { PrismaService } = await import('../../src/shared/services/prisma.service');
  const prisma = app.get(PrismaService);
  
  await prisma.user.update({
    where: { id: user.user.id },
    data: { role: 'ADMIN' },
  });

  // Login again to get token with admin role
  return await loginUser(app, {
    email: user.user.email,
    password: 'AdminPassword123!@#',
  });
}

/**
 * Get authorization header for requests
 */
export function getAuthHeader(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}

/**
 * Make authenticated GET request
 */
export async function authenticatedGet(
  app: INestApplication,
  path: string,
  token: string,
) {
  return request(app.getHttpServer())
    .get(path)
    .set('Authorization', `Bearer ${token}`);
}

/**
 * Make authenticated POST request
 */
export async function authenticatedPost(
  app: INestApplication,
  path: string,
  token: string,
  data?: any,
) {
  return request(app.getHttpServer())
    .post(path)
    .set('Authorization', `Bearer ${token}`)
    .send(data);
}

/**
 * Make authenticated PUT request
 */
export async function authenticatedPut(
  app: INestApplication,
  path: string,
  token: string,
  data?: any,
) {
  return request(app.getHttpServer())
    .put(path)
    .set('Authorization', `Bearer ${token}`)
    .send(data);
}

/**
 * Make authenticated PATCH request
 */
export async function authenticatedPatch(
  app: INestApplication,
  path: string,
  token: string,
  data?: any,
) {
  return request(app.getHttpServer())
    .patch(path)
    .set('Authorization', `Bearer ${token}`)
    .send(data);
}

/**
 * Make authenticated DELETE request
 */
export async function authenticatedDelete(
  app: INestApplication,
  path: string,
  token: string,
) {
  return request(app.getHttpServer())
    .delete(path)
    .set('Authorization', `Bearer ${token}`);
}
