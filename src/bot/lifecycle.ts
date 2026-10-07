import type { Bot } from "grammy";
import type { BotContext } from "./types";
import { configureBotCommands } from "./handlers";

/** Wait for in-flight middleware before releasing the database connection. */
export async function runBot(
  bot: Bot<BotContext>,
  close: () => void,
  logger: Pick<Console, "error"> = console,
): Promise<void> {
  bot.catch((error) => {
    logger.error(`Update ${error.ctx.update.update_id} failed:`, error.error);
  });

  const initialization = new AbortController();
  let stopping: Promise<void> | undefined;
  const stop = () => {
    initialization.abort();
    stopping ??= bot.stop().catch((error: unknown) => {
      logger.error("Bot shutdown failed:", error);
      process.exitCode = 1;
    });
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  try {
    try {
      // start() begins getMe before creating its polling abort controller.
      // grammY's Node types still use the legacy AbortSignal shim.
      await bot.init(initialization.signal as unknown as Parameters<Bot["init"]>[0]);
      if (initialization.signal.aborted) return;
      await configureBotCommands(bot, initialization.signal as unknown as Parameters<Bot["init"]>[0]);
    } catch (error) {
      if (initialization.signal.aborted) return;
      throw error;
    }
    if (initialization.signal.aborted) return;
    await bot.start();
  } finally {
    process.off("SIGINT", stop);
    process.off("SIGTERM", stop);
    try {
      await stopping;
    } finally {
      close();
    }
  }
}
