import { ID, Query } from 'appwrite';
import { databases, databaseId } from '$lib/db/client';

const SAVES_COLLECTION_ID = '65b01af1112f19d044b2';

export async function getSaves() {
	return await databases.listDocuments(
		databaseId,
		SAVES_COLLECTION_ID,
		// Use a query to show the latest ideas first
		[Query.orderDesc('$createdAt')]
	);
}

export async function addSave(userId, url) {
	await databases.createDocument(databaseId, SAVES_COLLECTION_ID, ID.unique(), {
		userId,
		url
	});
}

export async function deleteSave(id) {
	await databases.deleteDocument(databaseId, SAVES_COLLECTION_ID, id);
}
