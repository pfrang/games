import { createDb } from "../src/index.js";
import { questionsTable } from "../src/schema.js";
import { questions } from "./questions/index.js";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

const db = createDb(url);

await db
  .insert(questionsTable)
  .values(questions.map((q) => ({ questions: q })));

console.log(`Seeded ${questions.length} questions.`);
process.exit(0);
