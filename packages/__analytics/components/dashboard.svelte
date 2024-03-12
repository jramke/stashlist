<script lang="ts">
    import type { ActionData, PageData } from './$types';
    import { onMount } from "svelte";
    import { PinInput } from "./ui";
    import DashboardContent from './dashboard-content.svelte';

    // dashboard component to view all data
    // create custom components for cards, ... with bits-ui
    // maybe make them overridable for styles

    export let form: ActionData;
    export let data: PageData;

</script>

<div class="container">
    <h1 class="text-5xl font-bold pb-4">Analytics</h1>

    {#if data.loggedIn === false}
        <form method="POST" action="/analytics">
            {#if form?.missing}<p class="error">The pin is required!</p>{/if}
            {#if form?.incorrect}<p class="error">Invalid pin!</p>{/if}
            <label for="password">Password:</label>
            <PinInput name="password" />
            <button type="submit">Log in</button>
        </form>
    {:else}
        {#await data.analytics}
            Loading...
        {:then analytics} 
            <DashboardContent {analytics} />
        {/await}

    {/if}

</div>