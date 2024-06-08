<script lang="ts">
  import { register } from '@tauri-apps/plugin-global-shortcut';

  register('CommandOrControl+Shift+C', (event) => {
    if (event.state === 'Pressed') {
      console.log('JS Shortcut triggered');
    }
  });
</script>

<div class="container">
  <h1>Welcome to Tauri!</h1>

</div>