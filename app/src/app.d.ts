// See https://kit.svelte.dev/docs/types#app

import type { SuperValidated } from 'sveltekit-superforms';

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
			selected: {
				form: SuperValidated | null | string;
			}
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
