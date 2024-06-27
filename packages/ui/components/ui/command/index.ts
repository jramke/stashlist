import { Command as CommandPrimitive } from "cmdk-sv";

import Root from "./command.svelte";
import Dialog from "./command-dialog.svelte";
import Empty from "./command-empty.svelte";
import Group from "./command-group.svelte";
import Item from "./command-item.svelte";
import Input from "./command-input.svelte";
import List from "./command-list.svelte";
import Separator from "./command-separator.svelte";
import Shortcut from "./command-shortcut.svelte";
import Footer from "./command-footer.svelte";
import Loading from "./command-loading.svelte";
import Breadcrumbs from "./command-breadcrumbs.svelte";

export {
	Root,
	Dialog,
	Empty,
	Group,
	Item,
	Input,
	List,
	Separator,
	Shortcut,
	Loading,
	Footer,
	Breadcrumbs,
	//
	Root as Command,
	Dialog as CommandDialog,
	Empty as CommandEmpty,
	Group as CommandGroup,
	Item as CommandItem,
	Input as CommandInput,
	List as CommandList,
	Separator as CommandSeparator,
	Shortcut as CommandShortcut,
	Loading as CommandLoading,
	Footer as CommandFooter,
	Breadcrumbs as CommandBreadcrumbs,
};
