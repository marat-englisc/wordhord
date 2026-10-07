import { defineConfig } from "drizzle-kit";
import { CONSTANTS } from "./src/config/constants";

export default defineConfig({
  out: "./drizzle/users",
  schema: "./src/db/schemas/user/*.ts",
  dialect: "sqlite",
  dbCredentials: {
    url: CONSTANTS.USERS_DATABASE_URL,
  },
});
