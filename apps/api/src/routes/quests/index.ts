import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { loadQuestsFromFilesystem, getQuestById } from '../../services/quest-loader.js';

interface QuestQuery {
  difficulty?: string;
  tag?: string;
}

export default async function questsRoutes(fastify: FastifyInstance) {
  // GET / - List all quests
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as QuestQuery;

    try {
      // Try Supabase first
      let queryBuilder = fastify.supabase
        .from('quests')
        .select('id, title, description, difficulty, tags, time_limit_min, starter_code, created_at');

      if (query.difficulty) {
        queryBuilder = queryBuilder.eq('difficulty', query.difficulty);
      }

      const { data: quests, error } = await queryBuilder.order('created_at', {
        ascending: false,
      });

      if (!error && quests && quests.length > 0) {
        return reply.send(quests);
      }
    } catch (error) {
      fastify.log.debug('Supabase unavailable for quests, using filesystem');
    }

    // Fallback to filesystem
    let quests = loadQuestsFromFilesystem();

    if (query.difficulty) {
      quests = quests.filter((q) => q.difficulty === query.difficulty);
    }

    if (query.tag) {
      quests = quests.filter((q) => q.tags.includes(query.tag!));
    }

    return reply.send(quests);
  });

  // GET /:id - Get quest detail by ID
  fastify.get('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    // Check memory cache
    const cacheKey = `quest:${id}`;
    const cached = await fastify.cache.getJSON<any>(cacheKey);
    if (cached) return reply.send(cached);

    try {
      // Try Supabase
      const { data: quest, error } = await fastify.supabase
        .from('quests')
        .select('*')
        .eq('id', id)
        .single();

      if (!error && quest) {
        await fastify.cache.setJSON(cacheKey, quest, 24 * 60 * 60);
        return reply.send(quest);
      }
    } catch (error) {
      fastify.log.debug('Supabase unavailable for quest detail, using filesystem');
    }

    // Fallback to filesystem
    const quest = getQuestById(id);
    if (!quest) {
      return reply.status(404).send({ error: 'Quest not found' });
    }

    await fastify.cache.setJSON(cacheKey, quest, 24 * 60 * 60);
    return reply.send(quest);
  });
}
