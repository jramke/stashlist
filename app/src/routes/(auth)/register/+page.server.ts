import type { PageServerLoad, Actions } from './$types';

import { fail } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms/server';
import { formSchema } from './schema';
import { lucia } from "$lib/server/auth";
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { Argon2id } from "oslo/password";


export const load: PageServerLoad = async () => {
	return {
		form: await superValidate(formSchema)
	};
};


//! CONTINUE with login
// https://lucia-auth.com/tutorials/username-and-password/sveltekit
// https://github.com/bmdavis419/sveltekit-lucia-example
// https://github.com/delay/sveltekit-auth
// https://www.youtube.com/watch?v=dqdOqSLxeko
// https://www.youtube.com/watch?v=4ZhtoOFKFP8
// https://github.com/lucia-auth/examples/tree/main/sveltekit

export const actions: Actions = {
	default: async (event) => {
		const form = await superValidate(event, formSchema);

		if (!form.valid) {
			return fail(400, {
				form
			});
		}

		const userId = crypto.randomUUID();
		const hashedPassword = await new Argon2id().hash(form.data.password);

		// TODO: check if email is already used
		db.insert(user).values({
			id: userId,
			email: form.data.email,
			hashedPassword: hashedPassword
		})

		const session = await lucia.createSession(userId, {});
		const sessionCookie = lucia.createSessionCookie(session.id);
		event.cookies.set(sessionCookie.name, sessionCookie.value, {
			path: ".",
			...sessionCookie.attributes
		});


		return {
			form
		};
	}
};
