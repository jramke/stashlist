<script lang="ts">
  import { Command } from '$lib/command';
  import { onMount } from 'svelte';

  onMount(async () => {
    console.log('page mount');
  });

</script>

<Command />
