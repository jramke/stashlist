import type { PageServerLoad, Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { superValidate, message } from 'sveltekit-superforms/server';
import { formSchema } from './schema';
import { db } from '$lib/server/db';
import { lucia } from '$lib/server/auth';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { Argon2id } from 'oslo/password';
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
			const existingUser = await db
				.select()
				.from(user)
				.where(eq(user.email, form.data.email.toLowerCase()))
				.get();
			if (!existingUser) {
				// NOTE:
				// Returning immediately allows malicious actors to figure out valid usernames from response times,
				// allowing them to only focus on guessing passwords in brute-force attacks.
				// As a preventive measure, you may want to hash passwords even for invalid usernames.
				// However, valid usernames can be already be revealed with the signup page among other methods.
				// It will also be much more resource intensive.
				// Since protecting against this is none-trivial,
				// it is crucial your implementation is protected against brute-force attacks with login throttling etc.
				// If usernames are public, you may outright tell the user that the username is invalid.
				return message(form, { type: 'error', text: 'Incorrect email or password.' });
			}

			const validPassword = await new Argon2id().verify(
				existingUser.hashedPassword,
				form.data.password
			);
			if (!validPassword) {
				return message(form, { type: 'error', text: 'Incorrect email or password.' });
			}

			const session = await lucia.createSession(existingUser.id, {});
			const sessionCookie = lucia.createSessionCookie(session.id);
			event.cookies.set(sessionCookie.name, sessionCookie.value, {
				path: '.',
				...sessionCookie.attributes
			});
		} catch (error) {
			console.log('Login error', error);
			return message(form, { type: 'error', text: 'Something went wrong. Please try again.' });
		}

		redirect(302, siteConfig.appUrl);
	}
};
