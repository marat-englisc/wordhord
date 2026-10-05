import { defineConfig } from "drizzle-kit";
import { DATABASE_URL } from "./src/config/constants";

export default defineConfig({
  out: "./drizzle",
  schema: "./src/db/schemas/**/*.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: DATABASE_URL,
  },
});
