import browser, { type Tabs } from "webextension-polyfill";

// const baseUrl = 'https://stashlist.app';
const baseUrl = import.meta.env.MODE === 'development' ?'http://127.0.0.1:5173' : 'https://stashlist.app';

function isValidUrl(url: string) {
  // Regular expression to match the pattern *://*/*
  var regex = /^[^:]+:\/\/[^\/]+\/.*$/;
  return regex.test(url);
}

browser.action.onClicked.addListener((tab, info) => {
  browser.tabs.create({
    url: 'https://stashlist.app'
  })
})

browser.contextMenus.create({
  id: 'stash-page',
  title: 'Stash page',
  contexts: ['page']
});
browser.contextMenus.create({
  id: 'stash-image',
  title: 'Stash Image',
  contexts: ['image']
});

browser.runtime.onMessage.addListener(async (message: any, sender: any) => {
  let result;
  if (message.saveWebsite) {   
    result = await makePostRequest(baseUrl + "/api/saves/new/website?fetchMetaData=false", message.saveWebsite);
  }
  if (message.saveImage) {   
    result = await makePostRequest(baseUrl + "/api/saves/new/image", message.saveImage);
  }
  await browser.tabs.sendMessage(sender.tab.id, {
    newStashAdded: result
  })
})

browser.contextMenus.onClicked.addListener(async (info, tab) => {
  if (tab && tab.url && !isValidUrl(tab.url)) {
    console.log('invalid url', tab.url);
    return
  }

  if (info.menuItemId === 'stash-page') {
    await initStashPage(tab)
  }
  if (info.menuItemId === 'stash-image') {
    await initStashImage(tab, info.srcUrl)
  }
});

browser.commands.onCommand.addListener(async (command, tab) => {
  console.log('command', command);
  console.log('tab', tab);
  if (tab && tab.url && !isValidUrl(tab.url)) {
    console.log('invalid url');
    return
  }
  
  if (command === 'stash-page') {
    await initStashPage(tab)
  }
})

async function initStashPage(tab: Tabs.Tab | undefined) {
  const currentUrl = tab?.url;

  if (!currentUrl) return;

  const result = await makePostRequest(baseUrl + '/api/saves/new/website?edit=true', { url: currentUrl });
  const tabId = tab?.id || 0;
  await browser.tabs.sendMessage(tabId, {
    editNewStash: result
  })
}

async function initStashImage(tab: Tabs.Tab | undefined, imageUrl: string | undefined) {
  if (!imageUrl) return;

  const result = await makePostRequest(baseUrl + '/api/saves/new/image?edit=true', { imageUrl: imageUrl });
  const tabId = tab?.id || 0;
  await browser.tabs.sendMessage(tabId, {
    editNewStash: result
  })
}

async function makePostRequest(url: string, body: {}) {
  try {
    const response = await fetch(url, {
      method: "POST",
      body: JSON.stringify(body),
    });

    if (response.status !== 200) {
      if (response.status === 401) {
        browser.tabs.create({ url: baseUrl + '/login'})
        return;
      }
      throw Error('Something went wrong: ' + response.status + ' ' + response.statusText);
    }
    
    if (response.headers.get("content-type") !== "application/json") {
      throw Error('Response is not JSON');
    }

    const result = await response.json();

    return result;

  } catch (e) {
    console.error(e);
  }
}