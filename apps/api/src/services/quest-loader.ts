import fs from 'node:fs/promises';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

export interface LoadedQuest {
  id: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  time_limit_min: number;
  tags: string[];
  starter_code: string;
  template_html?: string;
  test_cases: any[];
}

const DIFFICULTY_MAP: Record<number, 'easy' | 'medium' | 'hard'> = {
  1: 'easy',
  2: 'medium',
  3: 'hard',
  4: 'hard',
  5: 'hard',
};

let cachedQuests: LoadedQuest[] | null = null;

function findQuestsDir(): string {
  let dir = process.cwd();
  for (let i = 0; i < 5; i++) {
    const candidate = path.join(dir, 'quests');
    if (existsSync(candidate)) return candidate;
    dir = path.dirname(dir);
  }
  return path.resolve(process.cwd(), 'quests');
}

/**
 * Async loader — call during server startup (onReady) to avoid
 * blocking the event loop on the first user request.
 */
export async function preloadQuests(): Promise<LoadedQuest[]> {
  if (cachedQuests) return cachedQuests;

  const questsDir = findQuestsDir();
  const quests: LoadedQuest[] = [];

  try {
    const entries = await fs.readdir(questsDir, { withFileTypes: true });

    await Promise.all(
      entries
        .filter((e) => e.isDirectory() && e.name.startsWith('quest-'))
        .map(async (entry) => {
          const questDir = path.join(questsDir, entry.name);
          const metaPath = path.join(questDir, 'meta.json');

          try {
            const metaRaw = await fs.readFile(metaPath, 'utf-8');
            const meta = JSON.parse(metaRaw);

            const [starterCode, templateHtml] = await Promise.all([
              fs.readFile(path.join(questDir, 'starter.js'), 'utf-8').catch(() => '// Start coding here\n'),
              fs.readFile(path.join(questDir, 'template.html'), 'utf-8').catch(() => undefined),
            ]);

            const diffNum = typeof meta.difficulty === 'number' ? meta.difficulty : 1;

            quests.push({
              id: entry.name,
              title: meta.title || entry.name,
              description: meta.description || '',
              difficulty: DIFFICULTY_MAP[diffNum] || 'medium',
              time_limit_min: meta.time_limit_min || meta.timeEstimate || 30,
              tags: meta.tags || [],
              starter_code: starterCode,
              template_html: templateHtml,
              test_cases: meta.test_cases || [],
            });
          } catch (err) {
            console.warn(`Failed to load quest ${entry.name}:`, err);
          }
        })
    );
  } catch (err) {
    console.warn(`Quests directory not found at ${questsDir}`);
    return [];
  }

  quests.sort((a, b) => a.id.localeCompare(b.id));
  cachedQuests = quests;
  return quests;
}

/**
 * Synchronous getter — returns cached quests (empty array if not preloaded).
 * For use in route handlers after preloadQuests() has run.
 */
export function loadQuestsFromFilesystem(): LoadedQuest[] {
  if (cachedQuests) return cachedQuests;

  // Fallback: sync load if somehow called before preload (shouldn't happen)
  const questsDir = findQuestsDir();
  if (!existsSync(questsDir)) return [];

  const entries = readdirSync(questsDir, { withFileTypes: true });
  const quests: LoadedQuest[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory() || !entry.name.startsWith('quest-')) continue;
    const questDir = path.join(questsDir, entry.name);
    const metaPath = path.join(questDir, 'meta.json');
    if (!existsSync(metaPath)) continue;

    try {
      const meta = JSON.parse(readFileSync(metaPath, 'utf-8'));
      const starterCode = existsSync(path.join(questDir, 'starter.js'))
        ? readFileSync(path.join(questDir, 'starter.js'), 'utf-8')
        : '// Start coding here\n';
      const templateHtml = existsSync(path.join(questDir, 'template.html'))
        ? readFileSync(path.join(questDir, 'template.html'), 'utf-8')
        : undefined;

      quests.push({
        id: entry.name,
        title: meta.title || entry.name,
        description: meta.description || '',
        difficulty: DIFFICULTY_MAP[typeof meta.difficulty === 'number' ? meta.difficulty : 1] || 'medium',
        time_limit_min: meta.time_limit_min || meta.timeEstimate || 30,
        tags: meta.tags || [],
        starter_code: starterCode,
        template_html: templateHtml,
        test_cases: meta.test_cases || [],
      });
    } catch {}
  }

  quests.sort((a, b) => a.id.localeCompare(b.id));
  cachedQuests = quests;
  return quests;
}

export function getQuestById(id: string): LoadedQuest | null {
  const quests = loadQuestsFromFilesystem();
  return quests.find((q) => q.id === id) || null;
}
