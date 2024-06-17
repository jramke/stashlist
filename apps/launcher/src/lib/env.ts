import { invoke } from "@tauri-apps/api/core";

export async function getEnv(name: string) {
  return await invoke<string>("get_env", { name });
}