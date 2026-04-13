/**
 * Seed quest data from the quests/ directory into PostgreSQL
 * Reads quest metadata and starter/solution code, then inserts into database
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface QuestMeta {
  slug: string;
  title: string;
  description: string;
  difficulty: number;
  time_limit_min: number;
  tags: string[];
  test_cases?: Array<{
    id: string;
    description: string;
    type: string;
  }>;
}

interface QuestData {
  slug: string;
  title: string;
  description: string;
  difficulty: number;
  time_limit_min: number;
  tags: string[];
  starter_code: string;
  solution_code: string;
  test_cases?: Array<{
    id: string;
    description: string;
    type: string;
  }>;
}

/**
 * Find all quest directories
 */
function findQuestDirs(): string[] {
  const questsDir = path.join(__dirname, "..", "quests");

  if (!fs.existsSync(questsDir)) {
    console.warn(`Quests directory not found: ${questsDir}`);
    return [];
  }

  const entries = fs.readdirSync(questsDir);
  return entries
    .filter((entry) => entry.startsWith("quest-"))
    .map((entry) => path.join(questsDir, entry))
    .filter((dir) => fs.statSync(dir).isDirectory());
}

/**
 * Load quest metadata and code files
 */
function loadQuest(questDir: string): QuestData | null {
  try {
    const metaPath = path.join(questDir, "meta.json");
    const starterPath = path.join(questDir, "starter.js");
    const solutionPath = path.join(questDir, "solution.js");

    if (!fs.existsSync(metaPath)) {
      console.warn(`Missing meta.json in ${questDir}`);
      return null;
    }

    const meta: QuestMeta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
    const starter_code = fs.existsSync(starterPath)
      ? fs.readFileSync(starterPath, "utf-8")
      : "";
    const solution_code = fs.existsSync(solutionPath)
      ? fs.readFileSync(solutionPath, "utf-8")
      : "";

    return {
      ...meta,
      starter_code,
      solution_code,
    };
  } catch (error) {
    console.error(`Failed to load quest from ${questDir}:`, error);
    return null;
  }
}

/**
 * Insert quest into database
 * This is a placeholder that would integrate with your database
 */
async function insertQuest(questData: QuestData): Promise<void> {
  try {
    // In a real implementation, this would use Supabase or similar
    // const { data, error } = await supabase
    //   .from('quests')
    //   .insert({
    //     slug: questData.slug,
    //     title: questData.title,
    //     description: questData.description,
    //     difficulty: questData.difficulty,
    //     time_limit_min: questData.time_limit_min,
    //     tags: questData.tags,
    //     starter_code: questData.starter_code,
    //   })

    // For now, we'll just log the data
    console.log(`  ✓ Quest loaded: ${questData.slug} (${questData.title})`);

    // If you have code embeddings for RAG, you would insert them here
    // const { data: embeddingData, error: embeddingError } = await supabase
    //   .from('code_embeddings')
    //   .insert({
    //     quest_slug: questData.slug,
    //     code: questData.solution_code,
    //     type: 'solution',
    //   })
  } catch (error) {
    console.error(`Failed to insert quest ${questData.slug}:`, error);
    throw error;
  }
}

/**
 * Main seed function
 */
async function seedQuests(): Promise<void> {
  console.log("🌱 Starting quest data seeding...\n");

  const questDirs = findQuestDirs();

  if (questDirs.length === 0) {
    console.warn("No quest directories found.");
    return;
  }

  console.log(`Found ${questDirs.length} quests\n`);

  let successCount = 0;
  let failureCount = 0;

  for (const questDir of questDirs) {
    const questName = path.basename(questDir);

    try {
      const questData = loadQuest(questDir);

      if (!questData) {
        failureCount++;
        continue;
      }

      // In a real implementation with a database, you would:
      // await insertQuest(questData);
      console.log(`  ✓ ${questName}`);
      console.log(`    Title: ${questData.title}`);
      console.log(`    Difficulty: ${questData.difficulty}`);
      console.log(`    Time Limit: ${questData.time_limit_min} minutes`);
      console.log(`    Tags: ${questData.tags.join(", ")}`);
      console.log("");

      successCount++;
    } catch (error) {
      console.error(`  ✗ Failed to seed ${questName}:`, error);
      failureCount++;
    }
  }

  console.log("\n✨ Quest seeding complete!");
  console.log(`   Success: ${successCount}`);
  console.log(`   Failed: ${failureCount}`);
  console.log(`   Total: ${successCount + failureCount}`);

  if (failureCount > 0) {
    process.exit(1);
  }
}

/**
 * Run the seed script
 */
seedQuests().catch((error) => {
  console.error("Fatal error during quest seeding:", error);
  process.exit(1);
});
