import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface LLMParams {
  systemPrompt: string;
  userMessage: string;
  maxTokens?: number;
}

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000;

export async function analyzeWithLLM(params: LLMParams): Promise<Record<string, unknown>> {
  const { systemPrompt, userMessage, maxTokens = 2048 } = params;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(
        `[${new Date().toISOString()}] Calling LLM (attempt ${attempt}/${MAX_RETRIES})...`
      );

      const response = await Promise.race([
        client.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: maxTokens,
          system: systemPrompt,
          messages: [
            {
              role: 'user',
              content: userMessage,
            },
          ],
        }),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error('LLM request timeout after 30 seconds')),
            30000
          )
        ),
      ]);

      const responseText =
        response.content[0].type === 'text' ? response.content[0].text : '';

      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn(
          `[${new Date().toISOString()}] No JSON found in LLM response`
        );
        return { raw_response: responseText };
      }

      const result = JSON.parse(jsonMatch[0]);
      console.log(
        `[${new Date().toISOString()}] LLM analysis completed successfully`
      );
      return result;
    } catch (error) {
      lastError = error as Error;

      if (
        error instanceof Error &&
        error.message.includes('rate_limit')
      ) {
        if (attempt < MAX_RETRIES) {
          const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1);
          console.warn(
            `[${new Date().toISOString()}] Rate limit hit, retrying in ${delay}ms...`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
      }

      console.error(
        `[${new Date().toISOString()}] Error calling LLM (attempt ${attempt}):`,
        error
      );

      if (attempt === MAX_RETRIES) {
        break;
      }
    }
  }

  throw lastError || new Error('Failed to call LLM after all retries');
}
