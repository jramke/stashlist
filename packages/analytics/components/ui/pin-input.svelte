<script lang="ts">
    import { PinInput, Toggle } from "bits-ui";
    import { Eye, EyeOff } from 'lucide-svelte';

    let value: string[] | undefined = [];
    export let name: string;
 
    let unlocked = false;
    let pinInputType: "text" | "password" = "password";
    $: pinInputType = unlocked ? "text" : "password";
</script>

<PinInput.Root
    bind:value
    class="flex items-center gap-2"
    type={pinInputType}
    placeholder=""
>
    <PinInput.Input
        class="flex h-input w-10 select-none rounded border border-foreground bg-background px-2 py-3 text-center font-alt text-[17px] tracking-[0.01em] text-foreground placeholder-shown:border-border-input focus-within:border-border-input-hover focus-within:shadow-date-field-focus hover:border-border-input-hover"
    />
    <PinInput.Input
        class="flex h-input w-10 select-none rounded border border-foreground bg-background px-2 py-3 text-center font-alt text-[17px] tracking-[0.01em] text-foreground placeholder-shown:border-border-input focus-within:border-border-input-hover focus-within:shadow-date-field-focus hover:border-border-input-hover"
    />
    <PinInput.Input
        class="flex h-input w-10 select-none rounded border border-foreground bg-background px-2 py-3 text-center font-alt text-[17px] tracking-[0.01em] text-foreground placeholder-shown:border-border-input focus-within:border-border-input-hover focus-within:shadow-date-field-focus hover:border-border-input-hover"
    />
    <PinInput.Input
        class="flex h-input w-10 select-none rounded border border-foreground bg-background px-2 py-3 text-center font-alt text-[17px] tracking-[0.01em] text-foreground placeholder-shown:border-border-input focus-within:border-border-input-hover focus-within:shadow-date-field-focus hover:border-border-input-hover"
    />
    <PinInput.HiddenInput {name} />
    <Toggle.Root
        aria-label="toggle code visibility"
        class="inline-flex size-10 items-center justify-center rounded-[9px] text-foreground/40 transition-all hover:bg-muted active:scale-98 active:bg-dark-10 active:data-[state=on]:bg-dark-10"
        bind:pressed={unlocked}
    >
        {#if unlocked}
            <Eye class="size-5" />
        {:else}
            <EyeOff class="size-5" />
        {/if}
          
    </Toggle.Root>
</PinInput.Root>