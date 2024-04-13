// See https://kit.svelte.dev/docs/types#app

import type { TODO } from '$lib/types';

// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			user: import('lucia').User | null;
			session: import('lucia').Session | null;
		}
		// interface PageData {}
		interface PageState {
			editStash?: {
				form: import('sveltekit-superforms').SuperValidated | null | string;
				save: TODO;
				groups: TODO;
				isDialog: boolean;
			};
			editGroup?: {
				form: import('sveltekit-superforms').SuperValidated | null | string;
				groups: TODO;
				isDialog: boolean;
			};
		}
		// interface Platform {}
		namespace Superforms {
			type Message = {
				type: 'error' | 'success';
				text: string;
			};
		}
	}
}

export {};
