<script lang="ts">
  import '@repo/ui/globals.pcss';
  import '../app.pcss';

  import { listen, emit } from '@tauri-apps/api/event'
  import { onMount } from 'svelte';
  import CommandMenu from './CommandMenu.svelte';

  type Payload =  'opened' | 'closed';

  onMount(async () => {
    const unlisten = await listen<Payload>('toggle-window-rust', (event) => {
      console.log(event.payload);
      if (event.payload === 'opened') {
        console.log('opened');
      }
      if (event.payload === 'closed') {
        console.log('closed');
      }
    });
  });

  function closeWindow() {
    emit('toggle-window-svelte', 'close');
  }



</script>
<main>
  <CommandMenu />
</main>
