import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { sessionStore } from '../../services/session-store.js';
import { getQuestById } from '../../services/quest-loader.js';
import { analyzeCode } from '../../services/code-analyzer.js';
import { requireAuth } from '../../hooks/require-auth.js';

interface CreateSessionRequest {
  quest_id: string;
}

interface UpdateSessionRequest {
  status: 'completed' | 'abandoned';
  final_code?: string;
}

interface PaginationQuery {
  page?: string;
  limit?: string;
  quest_id?: string;
  status?: string;
}

export default async function sessionsRoutes(fastify: FastifyInstance) {

  // POST / - Create a new session
  fastify.post(
    '/',
    { onRequest: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as CreateSessionRequest;
      const userId = (request as any).user.id;

      if (!body.quest_id) {
        return reply.status(400).send({ error: 'Missing quest_id' });
      }

      try {
        // Try Supabase first
        const { data: session, error } = await fastify.supabase
          .from('sessions')
          .insert({
            user_id: userId,
            quest_id: body.quest_id,
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (!error && session) {
          try {
            await fastify.cache.setJSON(
              `session:${session.id}:state`,
              { status: 'active', events_count: 0, health_score: 0 },
              30 * 24 * 60 * 60
            );
          } catch (_) {}
          return reply.status(201).send(session);
        }
      } catch (error) {
        fastify.log.debug('Supabase unavailable, using in-memory session store');
      }

      // Fallback to in-memory
      const session = sessionStore.create(body.quest_id, userId);
      return reply.status(201).send(session);
    }
  );

  // GET /:id - Get session by ID
  fastify.get(
    '/:id',
    { onRequest: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const userId = (request as any).user.id;

      try {
        const { data: session, error } = await fastify.supabase
          .from('sessions')
          .select('*')
          .eq('id', id)
          .eq('user_id', userId)
          .single();

        if (!error && session) {
          const healthScore = await fastify.cache.getJSON<number>(
            `session:${id}:health_score`
          );
          return reply.send({ ...session, health_score: healthScore ?? 0 });
        }
      } catch (_) {}

      // Fallback
      const session = sessionStore.get(id);
      if (!session) {
        return reply.status(404).send({ error: 'Session not found' });
      }
      return reply.send(session);
    }
  );

  // PATCH /:id - Update session
  fastify.patch(
    '/:id',
    { onRequest: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const body = request.body as UpdateSessionRequest;

      if (!body.status || !['completed', 'abandoned'].includes(body.status)) {
        return reply.status(400).send({ error: 'Invalid status' });
      }

      try {
        const userId = (request as any).user.id;
        const { data: session, error } = await fastify.supabase
          .from('sessions')
          .update({ status: body.status, final_code: body.final_code, updated_at: new Date().toISOString() })
          .eq('id', id)
          .eq('user_id', userId)
          .select()
          .single();

        if (!error && session) return reply.send(session);
      } catch (_) {}

      const session = sessionStore.update(id, {
        status: body.status,
        final_code: body.final_code,
        ended_at: new Date().toISOString(),
      });
      if (!session) return reply.status(404).send({ error: 'Session not found' });
      return reply.send(session);
    }
  );

  // GET / - List sessions
  fastify.get(
    '/',
    { onRequest: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = request.query as PaginationQuery;
      const userId = (request as any).user.id;
      const page = Math.max(1, parseInt(query.page || '1', 10));
      const limit = Math.min(100, Math.max(1, parseInt(query.limit || '20', 10)));

      try {
        let queryBuilder = fastify.supabase
          .from('sessions')
          .select('*', { count: 'exact' })
          .eq('user_id', userId);

        if (query.quest_id) queryBuilder = queryBuilder.eq('quest_id', query.quest_id);
        if (query.status) queryBuilder = queryBuilder.eq('status', query.status);

        const { data: sessions, error, count } = await queryBuilder
          .order('created_at', { ascending: false })
          .range((page - 1) * limit, page * limit - 1);

        if (!error && sessions) {
          return reply.send({ sessions, total: count || 0, page, limit });
        }
      } catch (_) {}

      // Fallback
      const result = sessionStore.list(userId, { page, limit, status: query.status });
      return reply.send({ ...result, page, limit });
    }
  );

  // POST /:id/submit - Submit solution
  fastify.post(
    '/:id/submit',
    { onRequest: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const body = request.body as { code: string };

      // Update session status
      let session = sessionStore.get(id);
      if (session) {
        sessionStore.update(id, {
          status: 'completed',
          final_code: body.code,
          ended_at: new Date().toISOString(),
        });
      } else {
        try {
          const userId = (request as any).user.id;
          await fastify.supabase
            .from('sessions')
            .update({ status: 'completed', final_code: body.code, updated_at: new Date().toISOString() })
            .eq('id', id)
            .eq('user_id', userId);
        } catch (_) {}
      }

      // Analyze the submitted code
      const analysis = analyzeCode(body.code);
      const summary = {
        session_id: id,
        health_score: analysis.health_score,
        breakdown: analysis.breakdown,
        issues: analysis.code_quality_detail.issues.map((i) => ({
          type: i.type,
          description: i.message,
          severity: i.severity,
          line: i.line,
        })),
        recommendations: [
          analysis.breakdown.code_quality < 70 ? '변수 이름을 더 명확하게 작성하세요' : null,
          analysis.bug_risk_detail.risk_score > 30 ? '에러 처리를 추가하세요' : null,
          analysis.breakdown.code_quality < 80 ? 'let/const를 사용하고 === 비교를 권장합니다' : null,
          '이벤트 리스너를 한 곳에서 관리하세요',
          '코드 주석을 추가하세요',
        ].filter(Boolean),
      };

      // Store for later retrieval by dashboard
      sessionStore.storeAnalysis(id, summary);

      // Update session health score
      sessionStore.update(id, { health_score: analysis.health_score });

      return reply.send(summary);
    }
  );
}
