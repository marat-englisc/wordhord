import { randomUUID } from "node:crypto";
import { mkdir, lstat, rename, rm, open } from "node:fs/promises";
import { isAbsolute, relative, resolve, extname } from "node:path";
import { InputFile } from "grammy";
import { eq } from "drizzle-orm";
import { getDatabase } from "../config/db";
import { cardTable } from "../db/schemas/card/card";
import type { BotContext } from "./types";
import { UserInputError } from "./types";

export const AUDIO_DIRECTORY = resolve(__dirname, "../../audio");
export const MAX_AUDIO_BYTES = 20 * 1024 * 1024;
const extensions = new Set([".mp3", ".ogg", ".oga", ".wav", ".m4a", ".flac"]);

export function resolveAudioPath(value: string): string {
  const path = resolve(AUDIO_DIRECTORY, isAbsolute(value) ? value : resolve(AUDIO_DIRECTORY, "..", value));
  const rel = relative(AUDIO_DIRECTORY, path);
  if (!rel || rel.startsWith("..") || isAbsolute(rel)) throw new UserInputError("Аудиофайл должен находиться в папке audio.");
  return path;
}

export async function audioInput(value: string): Promise<InputFile | string> {
  // Support legacy Telegram file IDs and public URLs already present in content.
  if (/^https:\/\//i.test(value) || !/[\\/]/.test(value)) return value;
  const path = resolveAudioPath(value);
  // Check every component without requiring realpath privileges on Windows.
  let component = AUDIO_DIRECTORY;
  for (const part of ["", ...relative(AUDIO_DIRECTORY, path).split(/[\\/]/)]) {
    component = resolve(component, part);
    if ((await lstat(component)).isSymbolicLink()) throw new UserInputError("Ссылки на файлы вне audio не поддерживаются.");
  }
  return new InputFile(path);
}

/** Download to a unique temporary file; only a complete, validated file is published. */
export async function saveUploadedAudio(ctx: BotContext, download: typeof fetch = fetch): Promise<string> {
  const media = ctx.message?.audio ?? ctx.message?.voice ?? ctx.message?.document;
  if (!media) throw new UserInputError("Пришли аудиофайл или голосовое сообщение.");
  const name = "file_name" in media ? media.file_name ?? "" : "voice.ogg";
  let extension = extname(name).toLowerCase();
  const mime = "mime_type" in media ? media.mime_type ?? "" : "";
  if (!extensions.has(extension)) {
    extension = ({ "audio/mpeg": ".mp3", "audio/ogg": ".ogg", "audio/wav": ".wav", "audio/x-wav": ".wav", "audio/mp4": ".m4a", "audio/flac": ".flac" } as Record<string, string>)[mime] ?? "";
  }
  if (!extension) throw new UserInputError("Поддерживаются MP3, OGG, WAV, M4A и FLAC.");
  if ((media.file_size ?? 0) > MAX_AUDIO_BYTES) throw new UserInputError("Размер аудио должен быть не больше 20 МБ.");
  const file = await ctx.api.getFile(media.file_id);
  if (!file.file_path) throw new UserInputError("Telegram пока не отдаёт файл. Отправь его ещё раз.");
  if ((file.file_size ?? 0) > MAX_AUDIO_BYTES) throw new UserInputError("Размер аудио должен быть не больше 20 МБ.");
  // Never pass the token-bearing URL to application logs or error messages.
  const url = `https://api.telegram.org/file/bot${ctx.api.token}/${file.file_path.split("/").map(encodeURIComponent).join("/")}`;
  await mkdir(AUDIO_DIRECTORY, { recursive: true });
  const filename = `${randomUUID()}${extension}`;
  const target = resolve(AUDIO_DIRECTORY, filename);
  const temporary = `${target}.part`;
  try {
    const response = await download(url, { signal: AbortSignal.timeout(60_000), redirect: "error" });
    if (!response.ok || !response.body) throw new Error("Download failed");
    if (Number(response.headers.get("content-length") ?? 0) > MAX_AUDIO_BYTES) throw new UserInputError("Размер аудио должен быть не больше 20 МБ.");
    const handle = await open(temporary, "wx");
    try {
      let size = 0;
      for await (const chunk of response.body) {
        size += chunk.byteLength;
        if (size > MAX_AUDIO_BYTES) throw new UserInputError("Размер аудио должен быть не больше 20 МБ.");
        await handle.writeFile(chunk);
      }
      if (!size) throw new UserInputError("Аудиофайл пустой.");
    } finally { await handle.close(); }
    await rename(temporary, target);
    return `audio/${filename}`;
  } catch (error) {
    await rm(temporary, { force: true });
    if (error instanceof UserInputError) throw error;
    throw new UserInputError("Не удалось скачать аудио. Отправь файл ещё раз.");
  }
}

export async function discardUnusedAudio(value: string | null): Promise<void> {
  if (!value?.startsWith("audio/")) return;
  if (await getDatabase().$count(cardTable, eq(cardTable.audioUrl, value))) return;
  try { await rm(resolveAudioPath(value), { force: true }); }
  catch { console.error("Could not remove an unused local audio file"); }
}
