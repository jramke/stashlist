import type { Icon as LucideIcon } from "lucide-svelte";

import { Monitor, Plus, FolderPlus, Folder, Check, Bookmark, Compass, LogOut, Pencil, Trash2, X, Sun, Moon, MoreHorizontal, Trash, CircleDashed, Loader2, LayoutGrid, StretchHorizontal, ChevronsUpDown, LayoutDashboard } from "lucide-svelte";

import GitHub from "./github.svelte";
import Google from "./google.svelte";
import Stash from "./stash.svelte";
import Logo from "./logo.svelte";


export type Icon = LucideIcon;

export {
    GitHub,
    Google, 
    Stash,
    Logo,
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
    Loader2 as Loader,
    LayoutGrid,
    StretchHorizontal,
    ChevronsUpDown,
    Monitor,
    LayoutDashboard as Masonry
}