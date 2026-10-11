/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
    /** Address - The address of your Stashlist. */
    instance: string;
    /** API token - Make one under Settings, API tokens in Stashlist. */
    token: string;
};

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences;

declare namespace Preferences {
    /** Preferences accessible in the `search-stashes` command */
    export type SearchStashes = ExtensionPreferences & {};
    /** Preferences accessible in the `stash-link` command */
    export type StashLink = ExtensionPreferences & {};
}

declare namespace Arguments {
    /** Arguments passed to the `search-stashes` command */
    export type SearchStashes = {};
    /** Arguments passed to the `stash-link` command */
    export type StashLink = {
        /** Link (or the clipboard) */
        link: string;
    };
}
