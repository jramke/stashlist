<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import type { LinkPreview } from '$lib/types';

	export let title: LinkPreview['title'];
	export let url: LinkPreview['url'];
	export let image: LinkPreview['image'];
</script>

<a
	href={url}
	target="_blank"
	rel="norefferrer noopener"
	{title}
	class="block overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm"
>
	{#if image}
		<!-- TODO: https://github.com/sveltejs/kit/issues/11535 -->
		<img loading="lazy" class="m-auto" src={image} alt={'OG Image from ' + title} />
	{/if}
	<Card.Header>
		<Card.Title class="line-clamp-3">{title}</Card.Title>
	</Card.Header>
	<Card.Content class="text-sm text-muted-foreground">{url}</Card.Content>
</a>
