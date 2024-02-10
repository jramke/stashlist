<script lang="ts">
  import logo from "~/assets/logo.svg";
	import { Button } from "./components/ui/button";

  const imageUrl = new URL(logo, import.meta.url).href;

  let count: number = 0
  const increment = () => {
    count += 1
  }
</script>

<img src={imageUrl} height="45" alt="" />
<h1>
  <slot></slot>
</h1>
<Button on:click={increment}>
  Clicks: {count}
</Button>
