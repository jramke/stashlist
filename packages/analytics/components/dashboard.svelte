<script lang="ts">
    import type { ActionData } from './$types';

    import { onMount } from "svelte";
    import { PinInput } from "./ui";

    // dashboard component to view all data
    // create custom components for cards, ... with bits-ui
    // maybe make them overridable for styles

    export let form: ActionData;


    async function getPageViews() {
        try {
            const response = await fetch('/api/analytics');
            const result = response.json();
            return result; 
        } catch (error) {
            console.error('Error getting page views data: ', error);
        }
    }

    let data: any; // TODO: add type

    onMount(async () => {
        data = await getPageViews();
    })

    $: console.log(data);
    $: console.log(form);

</script>

<div class="container">
    Dashboard

    <form method="POST" action="/analytics">
        {#if form?.missing}<p class="error">The pin is required!</p>{/if}
	    {#if form?.incorrect}<p class="error">Invalid pin!</p>{/if}
        <label for="password">Password:</label>
        <PinInput name="password" />
        <button type="submit">Log in</button>
    </form>

</div>