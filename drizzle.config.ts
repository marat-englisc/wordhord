import { defineConfig } from "drizzle-kit";
import { CONSTANTS } from "./src/config/constants";

export default defineConfig({
  out: "./drizzle",
  schema: "./src/db/schemas/**/*.ts",
  dialect: "sqlite",
  dbCredentials: {
    url: CONSTANTS.DATABASE_URL,
  },
});
