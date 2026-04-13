import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

interface GitHubUser {
  id: number;
  login: string;
  email: string | null;
  avatar_url: string;
  name: string | null;
}

export default async function authRoutes(fastify: FastifyInstance) {
  // GET /github - Redirect to GitHub OAuth authorize URL
  fastify.get('/github', async (_request: FastifyRequest, reply: FastifyReply) => {
    const clientId = process.env.GITHUB_CLIENT_ID || '';
    if (!clientId) {
      return reply.status(500).send({ error: 'GitHub OAuth not configured' });
    }

    const redirectUri = process.env.GITHUB_REDIRECT_URI || 'http://localhost:4000/auth/github/callback';
    const scope = 'user:email';

    const githubAuthUrl = new URL('https://github.com/login/oauth/authorize');
    githubAuthUrl.searchParams.append('client_id', clientId);
    githubAuthUrl.searchParams.append('redirect_uri', redirectUri);
    githubAuthUrl.searchParams.append('scope', scope);
    githubAuthUrl.searchParams.append('allow_signup', 'true');

    return reply.redirect(githubAuthUrl.toString());
  });

  // GET /github/callback - Handle GitHub OAuth callback
  fastify.get(
    '/github/callback',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { code, state } = request.query as {
        code?: string;
        state?: string;
        error?: string;
      };

      if (!code) {
        return reply.status(400).send({ error: 'Missing authorization code' });
      }

      try {
        // Exchange code for access token
        const tokenResponse = await fetch(
          'https://github.com/login/oauth/access_token',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
            body: JSON.stringify({
              client_id: process.env.GITHUB_CLIENT_ID,
              client_secret: process.env.GITHUB_CLIENT_SECRET,
              code,
            }),
          }
        );

        const tokenData = (await tokenResponse.json()) as {
          access_token?: string;
          error?: string;
        };

        if (!tokenData.access_token) {
          fastify.log.warn(
            `GitHub OAuth token error: ${tokenData.error || 'unknown'}`
          );
          return reply.status(401).send({ error: 'Failed to obtain access token' });
        }

        // Get user info from GitHub
        const userResponse = await fetch('https://api.github.com/user', {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'DevLens-API',
          },
        });

        const githubUser = (await userResponse.json()) as GitHubUser;

        if (!githubUser.id || !githubUser.login) {
          return reply.status(401).send({ error: 'Failed to fetch GitHub user' });
        }

        // Upsert user — try Supabase, fallback to in-memory
        let user: any;

        try {
          const { data, error: upsertError } = await fastify.supabase
            .from('users')
            .upsert(
              {
                id: `github_${githubUser.id}`,
                github_id: githubUser.id,
                username: githubUser.login,
                email: githubUser.email || `${githubUser.login}@github.local`,
                avatar_url: githubUser.avatar_url,
                name: githubUser.name,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'github_id' }
            )
            .select()
            .single();

          if (!upsertError && data) {
            user = data;
          }
        } catch (_) {}

        // Fallback: construct user object directly from GitHub data
        if (!user) {
          user = {
            id: `github_${githubUser.id}`,
            username: githubUser.login,
            email: githubUser.email || `${githubUser.login}@github.local`,
            avatar_url: githubUser.avatar_url,
          };
          fastify.log.info(`User ${githubUser.login} authenticated via GitHub (in-memory fallback)`);
        }

        // Create JWT token
        const token = fastify.jwt.sign({
          id: user.id,
          username: user.username,
          email: user.email,
          avatar_url: user.avatar_url,
        });

        // Redirect to frontend with token
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const callbackUrl = new URL('/auth/callback', frontendUrl);
        callbackUrl.searchParams.append('token', token);

        return reply.redirect(callbackUrl.toString());
      } catch (error) {
        fastify.log.error(error, 'GitHub OAuth callback error');
        return reply.status(500).send({ error: 'Authentication failed' });
      }
    }
  );

  // GET /me - Get current user (requires JWT)
  fastify.get('/me', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch (error) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    try {
      const userId = request.user.id;

      // Query user from database, fallback to JWT payload
      try {
        const { data: user, error } = await fastify.supabase
          .from('users')
          .select('id, username, email, avatar_url, name, github_id')
          .eq('id', userId)
          .single();

        if (!error && user) {
          return reply.send({ user });
        }
      } catch (_) {}

      // Fallback: return user info from JWT payload
      return reply.send({
        user: {
          id: request.user.id,
          username: request.user.username,
          email: request.user.email,
          avatar_url: (request.user as any).avatar_url || '',
        },
      });
    } catch (error) {
      fastify.log.error(error, 'Error fetching current user');
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // POST /refresh - Refresh JWT token
  fastify.post('/refresh', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch (error) {
      // Try to validate even if expired within 7 days
      const authHeader = request.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      try {
        const decoded = fastify.jwt.verify(authHeader.slice(7), {
          checkExpiresAt: false, // Allow expired tokens within grace period
        });

        // Check if token was issued within the last 7 days
        const issuedAt = (decoded as any).iat || 0;
        const now = Math.floor(Date.now() / 1000);
        const sevenDaysInSeconds = 7 * 24 * 60 * 60;

        if (now - issuedAt > sevenDaysInSeconds) {
          return reply.status(401).send({ error: 'Token refresh expired' });
        }

        // Issue new token
        const newToken = fastify.jwt.sign({
          id: (decoded as any).id,
          username: (decoded as any).username,
          email: (decoded as any).email,
          avatar_url: (decoded as any).avatar_url,
        });

        return reply.send({ token: newToken });
      } catch (verifyError) {
        return reply.status(401).send({ error: 'Invalid token' });
      }
    }

    // Token is valid, issue new one
    try {
      const newToken = fastify.jwt.sign({
        id: request.user.id,
        username: request.user.username,
        email: request.user.email,
        avatar_url: request.user.avatar_url,
      });

      return reply.send({ token: newToken });
    } catch (error) {
      fastify.log.error(error, 'Error refreshing token');
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
}
