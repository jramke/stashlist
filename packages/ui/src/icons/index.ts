import type { Icon as LucideIcon } from "lucide-svelte";

import { Plus, FolderPlus, Folder, Check, Bookmark, Compass, LogOut, Pencil, Trash2, X, Sun, Moon,MoreHorizontal, Trash, CircleDashed, Loader2 } from "lucide-svelte";

import GitHub from "./github.svelte";
import Google from "./google.svelte";
import Stash from "./stash.svelte";


export type Icon = LucideIcon;

export {
    GitHub,
    Google, 
    Stash,
    Plus, 
    FolderPlus, 
    Folder, 
    Check, 
    Bookmark, 
    Compass, 
    LogOut, 
    Pencil, 
    Trash2 as Trash, 
    X, 
    Sun, 
    Moon,
    MoreHorizontal, 
    CircleDashed, 
    Loader2 as Loader
}