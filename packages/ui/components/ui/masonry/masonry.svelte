<script lang="ts">
	import { cn } from '$ui/utils';
	import { onMount, onDestroy, tick } from 'svelte';

	export let gapSize: number = 6;
    export let columns: number;
	export let items: any[] = []; // pass in data if it's dynamically updated
	let grids: any[] = [];
	let masonryElement: HTMLDivElement;

	export const refreshLayout = async () => {
		// console.log("REFRESHING LAYOUT")
		grids.forEach(async (grid) => {
			/* get the post relayout number of columns */
			let ncol = getComputedStyle(grid._el).gridTemplateColumns.split(' ').length;

            // @ts-ignore
			grid.items.forEach((c) => {
				let new_h = c.getBoundingClientRect().height;

				if (new_h !== +c.dataset.h) {
					c.dataset.h = new_h;
					grid.mod++;
				}
			});

			/* if the number of columns has changed */
			if (grid.ncol !== ncol || grid.mod) {
				/* update number of columns */
				grid.ncol = ncol;
				/* revert to initial positioning, no margin */
                // @ts-ignore
				grid.items.forEach((c) => c.style.removeProperty('margin-top')); 
				/* if we have more than one column */
				if (grid.ncol > 1) {
                    // @ts-ignore
					grid.items.slice(ncol).forEach((c, i) => {
						let prev_fin =
								grid.items[i].getBoundingClientRect().bottom /* bottom edge of item above */,
							curr_ini = c.getBoundingClientRect().top; /* top edge of current item */

						c.style.marginTop = `${prev_fin + grid.gap - curr_ini}px`;
					});
				}

				grid.mod = 0;
			}
		});
	};

	const calcGrid = async (_masonryArr: any[]) => {
		await tick();
		if (_masonryArr.length && getComputedStyle(_masonryArr[0]).gridTemplateRows !== 'masonry') {
			grids = _masonryArr.map((grid) => {
				return {
					_el: grid,
					gap: parseFloat(getComputedStyle(grid).gridRowGap),
					items: [...grid.childNodes].filter(
						(c) => c.nodeType === 1 && +getComputedStyle(c).gridColumnEnd !== -1
					),
					ncol: 0,
					mod: 0
				};
			});
			refreshLayout();
		}
	};

	onMount(() => {
		window.addEventListener('resize', refreshLayout, false);

		const masonryImages = masonryElement.querySelectorAll('img');
		masonryImages?.forEach((img) => {
			img.addEventListener('load', refreshLayout, false);
		});

		return () => {
			window.removeEventListener('resize', refreshLayout, false);
			masonryImages?.forEach((img) => {
				img.removeEventListener('load', refreshLayout, false);
			});
		};
	});

	$: if (masonryElement) {
		calcGrid([masonryElement]);
	}

	$: if (items || columns) {
		// update if items or columns are changed
		masonryElement = masonryElement; // refresh masonryElement
	}
</script>

<!-- 
  An almost direct copy and paste of: https://css-tricks.com/a-lightweight-masonry-solution
-->

<div
	bind:this={masonryElement}
	class={cn(`__grid--masonry`, 'grid content-center [&>*]:self-start', `gap-${gapSize} grid-cols-${columns}`)}
>
	<slot />
</div>