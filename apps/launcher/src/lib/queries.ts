import { groups, loading, saves } from "./stores";
import { getRecord } from "./stronghold";
import { dev } from "$app/environment";
import { fetch } from '@tauri-apps/plugin-http';
import { siteConfig } from "@repo/constants";

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
        savesData = await getData(siteConfig.wwwUrl + '/api/saves');
        groupsData = await getData(siteConfig.wwwUrl + '/api/groups');
    } 

    saves.set(savesData?.saves);
    groups.set(groupsData);

    loading.set(false);
}