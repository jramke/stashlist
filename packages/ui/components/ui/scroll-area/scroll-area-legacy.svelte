<script lang="ts">
  import { cn } from '$ui/utils';
  import { onMount } from 'svelte';

  let className: string | undefined | null = undefined;
  export { className as class };
  export let indicatorMask = false;

  let scrollArea: HTMLDivElement;
  let scrollbarVisible = false;

  onMount(() => {
    const observer = new ResizeObserver(() => {
      scrollbarVisible = scrollArea.scrollHeight > scrollArea.clientHeight;
    });
    if (scrollArea.children?.[0]) {
      observer.observe(scrollArea.children[0] as HTMLElement);
    } else {
      observer.observe(scrollArea);
    }
    return () => observer.disconnect();
  });
</script>

<div
  class={cn(className, 'scroll-area')}
  data-scrollbar-visible={scrollbarVisible}
  data-scrollbar-indicator={indicatorMask}
  bind:this={scrollArea}
>
  <slot />
</div>

<style lang="postcss">
  .scroll-area {
    overflow-y: auto;
    background-clip: border-box;

    @supports not selector(::-webkit-scrollbar) {
      scrollbar-width: thin;
      scrollbar-color: hsl(var(--accent)) hsl(var(--foreground));
    }
    &::-webkit-scrollbar {
      background: transparent;
    }

    &::-webkit-scrollbar-thumb {
      border-color: rgba(0, 0, 0, 0);
      border-style: solid;
      border-width: 6px;
      background-clip: padding-box;
      border-radius: 9999px;
      background-color: hsl(var(--accent));
    }

    &::-webkit-scrollbar-thumb:hover {
      background-color: hsl(var(--foreground) / 0.4);
    }

    &[data-scrollbar-visible='true'][data-scrollbar-indicator='true'] {
      --mask-size: 48px;

      @supports (animation-timeline: scroll()) {
        mask:
          linear-gradient(var(--smooth-gradient-stops-white-transparent)) 50% 0 / 100% 0 no-repeat,
          linear-gradient(white, white) 50% 50% / 100% 100% no-repeat,
          linear-gradient(var(--smooth-gradient-stops-transparent-white)) 50% 100% / 100% 100px no-repeat;
        mask-composite: exclude;
        animation:
          mask-up both linear,
          mask-down both linear;
        animation-timeline: scroll(self);
        animation-range:
          0 2rem,
          calc(100% - 2rem) 100%;
        @keyframes mask-up {
          100% {
            mask-size:
              100% 100px,
              100% 100%,
              100% 100px;
          }
        }
        @keyframes mask-down {
          100% {
            mask-size:
              100% 100px,
              100% 100%,
              100% 0;
          }
        }
      }
    }
  }
</style>
