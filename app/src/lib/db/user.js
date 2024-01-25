import { writable } from 'svelte/store';
import { ID } from 'appwrite';
import { account } from '$lib/db/client';
import { goto } from '$app/navigation';

// Avoid auth calls in server-side, so that a user is not shared between requests
const isBrowser = typeof window !== 'undefined';

const createUser = () => {
	// const store = writable(null);

	// async function init() {
	// 	if (!isBrowser) return;
	// 	try {
	// 		store.set(await account.get());
	// 	} catch (e) {
	// 		store.set(null);
	// 	}
	// }

	// init();

	async function register(email, password, name) {
		if (!isBrowser) return;
		try {
			await account.create(ID.unique(), email, password, name);
			await login(email, password);
		} catch (error) {
			console.log('failed to register user', error);
		}
	}

	async function login(email, password) {
		if (!isBrowser) return;
		try {
			await account.createEmailSession(email, password);
			// await init();
			goto('/');
		} catch (error) {
			console.log('failed to log in user', error);
		}
	}

	async function logout() {
		await account.deleteSession('current');
		store.set(null);
	}

	return {
		// Exposes the store's value with $user
		// subscribe: store.subscribe,
		register,
		login,
		logout,
		// init
	};
};

export const user = createUser();
