import { redirect } from "@sveltejs/kit";
import type { LayoutLoad } from './$types';

//TODO: results in endless loop between login and app

// export const load: LayoutLoad = async ({ parent }) => {
// 	const { account } = await parent();
// 	console.log('app', account);
// 	if (account === null) redirect(303, '/login');
// };