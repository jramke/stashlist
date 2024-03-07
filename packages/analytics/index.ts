import type { AfterNavigate, RequestEvent, MaybePromise } from "@sveltejs/kit";

import Dashboard from "./components/dashboard.svelte";
import Tracker from "./components/tracker.svelte";
import { isBrowser, getEnviroment, consolePrefix } from './utils';
// import * as argon2 from "argon2";
// import { Argon2id } from "oslo/password";
// import { verify } from "@node-rs/argon2";


async function updatePageView(slug: string) {
    try {
        const response = await fetch('/api/analytics?type=pageview', {
            method: 'POST',
            body: JSON.stringify({slug: slug})
        })

        if (response.status !== 200) {
            console.error(response);
            throw Error(`${consolePrefix} Something went calling the analytics api endpoint`);
        }
      
        const result = await response.json();
        return result;

    } catch (error) {
        console.error(`${consolePrefix} Update views failed: ${error}`);
    }
}

// async function verifyHash(hash: string, string: string) {
//     if (isBrowser()) {
//         console.error(`${consolePrefix} you cant use this function client side.`);
//     }
//     try {
//         const argon2id = new Argon2id();
//         if (await argon2id.verify(hash, string)) {
//             return true;
//         } else {
//             return false;
//         }
//     } catch (err) {
//         console.error(`${consolePrefix} failed to verify argon2 hash.`);
//         return false;
//     }
// }

async function track(navigation: AfterNavigate) {
    if (!isBrowser() || navigation === null) {
        console.error(`${consolePrefix} failed to track. Navigation data is missing.`);
        return
    };
    if (navigation.from?.route.id === navigation.to?.route.id) {
        return
    };

    // if (getEnviroment() === 'development') {
    //     console.log('[Svelte Analytics] Page view registerd but not tracked cause app runs in development');
    //     return;
    // }
	
    const slug = navigation.to?.url.pathname;
    if (!slug) return;
    await updatePageView(slug);
    console.log('page view');
}

export {
    Dashboard,
    Tracker,
    track,
    
}