import { Client, Stronghold, type Store } from '@tauri-apps/plugin-stronghold';
import { appDataDir } from '@tauri-apps/api/path';
import { get, writable, type Writable } from 'svelte/store';

export const stronghold = <Writable<any>>writable(null);
export const strongholdClientStore = <Writable<Store|null>>writable(null);

export async function initStronghold() {
  const vaultPath = `${await appDataDir()}/vault.hold`;
  const vaultPassword = 'vault-password'; // TODO: use env
  const strongholdObj = await Stronghold.load(vaultPath, vaultPassword);


  let client: Client;
  const clientName = 'stashlist-stronghold-client';
  try {
    client = await strongholdObj.loadClient(clientName);
  } catch {
    client = await strongholdObj.createClient(clientName);
  }
  
  stronghold.set(strongholdObj);
  strongholdClientStore.set(client.getStore());
}

// Insert a record to the store
export async function insertRecord(key: string, value: string) {
  const store = get(strongholdClientStore);
  if (!store) {
    console.error('Store not initialized - this function must be called client-side');
    return;
  }

  const data = Array.from(new TextEncoder().encode(value));
  await store.insert(key, data);
}

// Read a record from store
export async function getRecord(key: string): Promise<string> {
  const store = get(strongholdClientStore);
  if (!store) {
    console.error('Store not initialized - this function must be called client-side');
    return '';
  }

  const data = await store.get(key);
  return new TextDecoder().decode(new Uint8Array(data ?? new ArrayBuffer(0)));
}
