import { groups, loading, saves } from "./stores";
import { getRecord } from "./stronghold";
import { dev } from "$app/environment";
import { fetch } from '@tauri-apps/plugin-http';

export async function getItems() {
    loading.set(true);
    const getData = async (url: string) => {
        const response = await fetch(url, 
            { 
                method: 'GET',
                headers: {
                    'X-Api-Key': await getRecord('api-key'),
                }
            }
        );

        if (!response.ok) {
            console.error(response.statusText, response);
            loading.set(false);
            return;
        }
        
        let result;
        
        if (dev) {
            result = await response.text();            
            result = JSON.parse(result);
        } else {
            result = await response.json();
        }
        
        return result;
    }

    let savesData: any;
    let groupsData: any;
    if (dev) {
        savesData = await getData('/saves.json');
        groupsData = await getData('/groups.json');
    } else {
        savesData = await getData('https://www.stashlist.app/api/saves');
        groupsData = await getData('https://www.stashlist.app/api/groups');
    } 

    saves.set(savesData?.saves);
    groups.set(groupsData);

    loading.set(false);
}