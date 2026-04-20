import { db } from '$lib/server/db';

export async function getQuestions() {
	const questions = await db.query.questionsTable.findMany();

	return questions;
}
