import type { PageServerLoad, Actions } from './$types';

import { redirect } from '@sveltejs/kit';
import { superValidate, message } from 'sveltekit-superforms/server';
import { formSchema } from './schema';
import { lucia } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { Argon2id } from 'oslo/password';
import { eq } from 'drizzle-orm';
import { generateId } from 'lucia';
import { siteConfig } from '$lib/config/site';

export const load: PageServerLoad = async () => {
	return {
		form: await superValidate(formSchema)
	};
};

export const actions: Actions = {
	default: async (event) => {
		const form = await superValidate(event, formSchema);

		if (!form.valid) {
			return message(form, { type: 'error', text: 'Something went wrong. Please try again.' });
		}

		try {
			const userId = generateId(15);
			const hashedPassword = await new Argon2id().hash(form.data.password);
			const email = form.data.email.toLowerCase();

			const existingUser = await db.select().from(user).where(eq(user.email, email)).get();
			if (existingUser) {
				return message(form, { type: 'error', text: 'User with this email already exists.' });
			}

			await db.insert(user).values({
				id: userId,
				name: form.data.name,
				email: email,
				hashedPassword: hashedPassword
			});

			const session = await lucia.createSession(userId, {});
			const sessionCookie = lucia.createSessionCookie(session.id);
			event.cookies.set(sessionCookie.name, sessionCookie.value, {
				path: '.',
				...sessionCookie.attributes
			});
		} catch (error) {
			console.log('Register error', error);
			return message(form, { type: 'error', text: 'Something went wrong. Please try again.' });
		}

		redirect(302, siteConfig.appUrl);
	}
};
