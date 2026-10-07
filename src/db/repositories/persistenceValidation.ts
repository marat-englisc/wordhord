interface ProgressWrite {
  due: Date;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  state: number;
  lastReview?: Date | null;
}

interface ReviewWrite {
  rating: number;
  state: number;
  due: Date;
  stability: number;
  difficulty: number;
  scheduledDays: number;
  elapsedDays: number;
  lastElapsedDays: number;
  learningSteps: number;
  review: Date;
}

export function validateDateWrite(value: unknown, label: string): void {
  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) {
    throw new RangeError(`${label} must be a valid Date`);
  }
}

export function optionalDateWrite(value: unknown, label: string): void {
  if (value !== null && value !== undefined) validateDateWrite(value, label);
}

function validateCounter(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${label} must be a non-negative safe integer`);
  }
}

function validateState(value: number): void {
  if (!Number.isInteger(value) || value < 0 || value > 3) {
    throw new RangeError("state must be an integer between 0 and 3");
  }
}

function validateMemory(stability: number, difficulty: number): void {
  if (!Number.isFinite(stability) || stability < 0) {
    throw new RangeError("stability must be a finite non-negative number");
  }
  if (!Number.isFinite(difficulty) || difficulty < 0 || difficulty > 10) {
    throw new RangeError("difficulty must be a finite number between 0 and 10");
  }
}

export function validateProgressWrite(data: ProgressWrite): void {
  validateDateWrite(data.due, "due");
  optionalDateWrite(data.lastReview, "lastReview");
  validateState(data.state);
  validateMemory(data.stability, data.difficulty);
  for (const key of ["elapsedDays", "scheduledDays", "learningSteps", "reps", "lapses"] as const) {
    validateCounter(data[key], key);
  }
  if (data.state !== 0 &&
    (!data.lastReview || data.stability <= 0 || data.difficulty < 1)) {
    throw new RangeError("A learned card needs lastReview, positive stability and difficulty >= 1");
  }
}

export function validateReviewWrite(data: ReviewWrite): void {
  if (!Number.isInteger(data.rating) || data.rating < 0 || data.rating > 4) {
    throw new RangeError("rating must be an integer between 0 and 4");
  }
  validateState(data.state);
  validateMemory(data.stability, data.difficulty);
  validateDateWrite(data.due, "due");
  validateDateWrite(data.review, "review");
  for (const key of ["scheduledDays", "elapsedDays", "lastElapsedDays", "learningSteps"] as const) {
    validateCounter(data[key], key);
  }
}

/** Drizzle ignores undefined updates; validate the same state that it will persist. */
export function mergeDefinedValues<T extends object>(existing: T, changes: Partial<T>): T {
  return {
    ...existing,
    ...Object.fromEntries(Object.entries(changes).filter(([, value]) => value !== undefined)),
  };
}
