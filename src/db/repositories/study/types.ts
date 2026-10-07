import type { ApplicationDatabase } from "../../../config/db";

// A transaction and the application database expose the same read operations.
export type StudyReadDatabase = Pick<ApplicationDatabase, "select" | "selectDistinct">;
