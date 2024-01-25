import type { LayoutLoad } from './$types';
import { account } from '$lib/db/client';

export const load: LayoutLoad = async () => {
	try {
		return {
			account: await account.get()
		};
	} catch {
		return {
			account: null
		};
	}
};
