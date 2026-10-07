import "dotenv/config";

export function getAdminTelegramIds(value = process.env.ADMIN_TELEGRAM_IDS ?? ""): ReadonlySet<number> {
  if (!value.trim()) return new Set();
  const ids = value.split(",").map((part) => {
    const text = part.trim();
    const id = Number(text);
    if (!/^\d+$/.test(text) || !Number.isSafeInteger(id) || id < 1) {
      throw new Error("ADMIN_TELEGRAM_IDS must contain positive Telegram IDs separated by commas");
    }
    return id;
  });
  return new Set(ids);
}

export function getStudyTimeZone(value = process.env.STUDY_TIME_ZONE ?? "Europe/Moscow"): string {
  try { new Intl.DateTimeFormat("ru-RU", { timeZone: value }).format(); }
  catch { throw new Error("STUDY_TIME_ZONE must be a valid IANA time zone"); }
  return value;
}
