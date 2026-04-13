import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';

const DEV_USER = {
  id: 'dev-user-001',
  username: 'developer',
  email: 'dev@devlens.local',
  avatar_url: '',
};

const devAuthPlugin = fp(async (fastify: FastifyInstance) => {
  const isDevMode =
    process.env.NODE_ENV !== 'production' &&
    (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY);

  if (!isDevMode) return;

  fastify.log.info('Dev auth mode enabled — all requests authenticated as dev user');

  fastify.addHook('onRequest', async (request) => {
    // Patch jwtVerify to always succeed in dev mode
    request.jwtVerify = async () => DEV_USER as any;
    // Set user directly
    (request as any).user = DEV_USER;
  });
});

export default devAuthPlugin;
