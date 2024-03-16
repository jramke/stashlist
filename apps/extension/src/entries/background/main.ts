import browser, { type Tabs } from "webextension-polyfill";

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
    result = await makePostRequest("http://127.0.0.1:5173/api/saves/new/website", message.saveWebsite);
  }
  if (message.saveImage) {   
    result = await makePostRequest("http://127.0.0.1:5173/api/saves/new/image", message.saveImage);
  }
  await browser.tabs.sendMessage(sender.tab.id, {
    newStashAdded: result
  })
})

browser.contextMenus.onClicked.addListener(async (info, tab) => {  
  if (info.menuItemId === 'stash-page') {
    await initStashPage(tab)
  }
  if (info.menuItemId === 'stash-image') {
    await initStashImage(tab, info.srcUrl)
  }
});

browser.commands.onCommand.addListener(async (command, tab) => {
  if (command === 'stash-page') {
    await initStashPage(tab)
  }
})

async function initStashPage(tab: Tabs.Tab | undefined) {
  const currentUrl = tab?.url;

  if (!currentUrl) return;

  const result = await makePostRequest('http://127.0.0.1:5173/api/saves/new/website?edit=true', { url: currentUrl });
  const tabId = tab?.id || 0;
  await browser.tabs.sendMessage(tabId, {
    editNewStash: result
  })
}

async function initStashImage(tab: Tabs.Tab | undefined, imageUrl: string | undefined) {
  if (!imageUrl) return;

  const result = await makePostRequest('http://127.0.0.1:5173/api/saves/new/image?edit=true', { imageUrl: imageUrl });
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
      console.log(response);
      throw Error('Something went wrong: ' + response.status + ' ' + response.statusText);
    }

    const result = await response.json();
    return result;

  } catch (e) {
    console.error(e);
  }
}