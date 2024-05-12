<script lang="ts">
	import type { SelectGroup } from "$lib/server/db/schema";
	import type { TODO } from "$lib/types";

	import { Gradient } from "$lib/components/app";
	import { cn } from "@repo/ui/utils";
	import { ItemImage } from "$lib/components/app/saves/item";
	import { siteConfig } from "$lib/config/site";

    export let title: SelectGroup['title'];
    export let gradientIndex: SelectGroup['gradientIndex'];
    export let id: SelectGroup['id'];
    export let saves: TODO[];

    const saveItems = saves.map(saveData => saveData.save);
    const realLength = saveItems.length;
    saveItems.length > 4 && (saveItems.length = 4);
    saveItems.reverse();

    const isEmpty = saveItems.length === 0;


</script>

<div class="flex flex-col gap-4 group-list__item">
    <a href={siteConfig.appUrl + '/group/' + id} class={cn("w-full aspect-og flex items-center justify-center py-5 group-list__item__image-wrapper", isEmpty && 'border rounded-lg outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2')}>
        {#if isEmpty}
            <span class="text-muted-foreground text-sm text-center px-5">
                This group is empty.
                <!-- <br><a class="underline underline-offset-4" href={siteConfig.appUrl + '/unsorted'}>View unsorted stashes</a>. -->
            </span>
        {:else}
            <div class={cn("relative aspect-og", saveItems.length === 1 ? 'w-full h-full' : 'w-full h-full')}>
                {#each saveItems as {title, imageUrl, gradientIndex}, i}
                    <div class={cn(`group-list__item__image-${i} absolute aspect-og w-full rounded-md shadow-md shadow-[0_0_6px_-1px_rgba(0,0,0,0.6)] overflow-hidden`)}>
                        <ItemImage {imageUrl} {title} {gradientIndex} />
                    </div>
                {/each}
            </div>
        {/if}
    </a>
    <div class="flex flex-col gap-1">
        <div class="flex items-center gap-2">
            <div class="rounded-full size-4 shrink-0 overflow-hidden relative">
                <Gradient {gradientIndex} />
            </div>
            <a href={siteConfig.appUrl + '/group/' + id} tabindex="-1">
                <h3 class="line-clamp-1 text-lg font-bold break-words">
                    {title}
                </h3>
            </a>
        </div>
        <span class="ms-6 text-muted-foreground text-xs">{realLength} Item{realLength === 1 ? '' : 's'}</span>
    </div>
</div>

<style lang="scss">
    $transforms: (
        1: (
            0: (
                default: scale(1),
                hover: translateY(clamp(6%, 0px, 20px)) translateX(clamp(-20px, -6%, 0px)) scale(.9) rotate(-3deg)
            ),
            1: (
                default: rotate(4deg) translateY(1px),
                hover: translateX(clamp(12%, 0px, 50px)) scale(.9) rotate(-3deg)
            ),
            2: (
                default: rotate(-5deg),
                hover: translateY(clamp(-50px, -12%, 0px)) scale(.9) rotate(-3deg)
            ),
            3: (
                default: rotate(3deg),
                hover: translateX(clamp(-50px, -12%, 0px)) scale(.9) rotate(5deg)
            )
        ),
        2: (
            0: (
                default: scale(1),
                hover: translateY(clamp(6%, 0px, 20px)) translateX(-6%) scale(.9) rotate(-3deg)
            ),
            1: (
                default: rotate(6deg) translateY(-2px),
                hover: translateX(clamp(12%, 0px, 50px)) scale(.9) rotate(-3deg)
            ),
            2: (
                default: rotate(-3deg),
                hover: translateY(clamp(-50px, -12%, 0px)) scale(.9) rotate(-3deg)
            ),
            3: (
                default: rotate(2deg),
                hover: translateX(clamp(-50px, -12%, 0px)) scale(.9) rotate(5deg)
            )
        ),
        3: (
            1: (
                default: rotate(-2deg) translateY(2px),
                hover: translateX(clamp(12%, 0px, 50px)) scale(.9) rotate(-3deg)
            ),
            2: (
                default: rotate(4deg),
                hover: translateY(clamp(-50px, -12%, 0px)) scale(.9) rotate(-3deg)
            ),
            3: (
                default: rotate(-3deg),
                hover: translateX(clamp(-50px, -12%, 0px)) scale(.9) rotate(5deg)
            )
        ),
        4: (
            1: (
                default: rotate(3deg) translateY(-1px),
                hover: translateX(clamp(12%, 0px, 50px)) scale(.9) rotate(-3deg)
            ),
            2: (
                default: rotate(-6deg),
                hover: translateY(clamp(-50px, -12%, 0px)) scale(.9) rotate(-3deg)
            ),
            3: (
                default: rotate(2deg),
                hover: translateX(clamp(-50px, -12%, 0px)) scale(.9) rotate(5deg)
            )
        )
    );

    .group-list__item {
        --spring-easing: linear(
            0, 0.007, 0.029 2.2%, 0.117, 0.233 7.1%, 0.622 14.3%, 0.732 16.7%, 0.823,
            0.899, 0.959, 1.005 26%, 1.038 28.6%, 1.052, 1.062, 1.067, 1.068 36%,
            1.059 40.5%, 1.015 53.4%, 1 61.6%, 0.995 71.2%, 1
        );
    }
    @each $nth, $transformsSet in $transforms {
        .group-list__item:nth-child(#{$nth}n) {
            .group-list__item__image {
                @each $child, $transform in $transformsSet {
                    &-#{$child} {
                        transform: map-get($transform, "default");
                        transition: var(--spring-easing) 500ms;
                    }
                }
            }
        }
    }
    @each $nth, $transformsSet in $transforms {
        .group-list__item:nth-child(#{$nth}n) {
            .group-list__item__image-wrapper {
                &:hover, &:focus-visible {
                    z-index: 100;
                    outline: none;
                    .group-list__item__image {
                        @each $child, $transform in $transformsSet {
                            &-#{$child} {
                                transform: map-get($transform, "default") map-get($transform, "hover");
                            }
                        }
                    }
                }
                &:not(:hover) {
                    animation: zIndexHack 500ms;
                }
            }
        }
    }
    @keyframes zIndexHack {
        0%, 100% {
            z-index: 10;
        }
    }
</style>