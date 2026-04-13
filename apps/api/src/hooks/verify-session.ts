import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { sessionStore } from '../services/session-store.js';

/**
 * Shared preHandler that verifies session exists and belongs to the user.
 * Checks in-memory store first (dev mode), then falls back to Supabase.
 * Sets `request.session` on success, sends 404 on failure.
 */
export function createVerifySession(fastify: FastifyInstance) {
  return async function verifySession(request: FastifyRequest, reply: FastifyReply) {
    const { sessionId } = request.params as { sessionId: string };
    const userId = (request as any).user?.id;

    // Check in-memory session store first
    const memSession = sessionStore.get(sessionId);
    if (memSession) {
      (request as any).sessionData = memSession;
      return;
    }

    // Try Supabase
    try {
      const { data: session, error } = await fastify.supabase
        .from('sessions')
        .select('id, quest_id, user_id, status')
        .eq('id', sessionId)
        .eq('user_id', userId)
        .single();

      if (!error && session) {
        (request as any).sessionData = session;
        return;
      }
    } catch {}

    return reply.status(404).send({ error: 'Session not found' });
  };
}
