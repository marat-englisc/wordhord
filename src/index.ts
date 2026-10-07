import { createBot } from "./config/bot";
import { getDatabase, closeDatabase } from "./config/db";
import { registerHandlers } from "./bot/handlers";
import { runBot } from "./bot/lifecycle";

export async function main(): Promise<void> {
  const bot = createBot();
  try {
    getDatabase();
    registerHandlers(bot);
    await runBot(bot, closeDatabase);
  } finally {
    closeDatabase();
  }
}

if (require.main === module) {
  main().catch((error: unknown) => {
    console.error("Bot startup failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
