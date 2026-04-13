import type { FastifyRequest } from 'fastify';

/**
 * Shared authentication hook for protected routes.
 * Verifies JWT token on request. In dev mode, dev-auth plugin
 * patches jwtVerify to always succeed.
 */
export async function requireAuth(request: FastifyRequest): Promise<void> {
  try {
    await request.jwtVerify();
  } catch (error) {
    const err = new Error('Invalid or missing JWT token') as any;
    err.statusCode = 401;
    throw err;
  }
}
