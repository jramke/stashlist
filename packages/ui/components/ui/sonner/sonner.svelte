<script lang="ts">
	import { Toaster as Sonner, type ToasterProps as SonnerProps } from 'svelte-sonner';

	type $$Props = SonnerProps;

	// if we use modewatcher for the theme, the extension breaks pages. 
	// Cause mode watcher sets the theme for the whole page.
	// As long we only use darkmode we just set it manually here.
	export let theme: $$Props['theme'] = 'dark';
</script>

<Sonner
	theme={theme}
	class="toaster group"
	toastOptions={{
		classes: {
			toast:
				'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
			description: 'group-[.toast]:text-muted-foreground',
			actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
			cancelButton: 'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground'
		}
	}}
	{...$$restProps}
/>
