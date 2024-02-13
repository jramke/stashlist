import browser from "webextension-polyfill";

browser.action.onClicked.addListener((tab, info) => {
  browser.tabs.create({
    // url: 'http://127.0.0.1:5173/'
    url: 'https://stashlist.vercel.app'
  })
})

browser.contextMenus.create({
  id: 'stash-page',
  title: 'Stash page',
  contexts: ['all']
});

browser.runtime.onMessage.addListener(async (message: any, sender: any) => {
  if (message.newStash) {   
    const result = await makePostRequest("http://127.0.0.1:5173/api/saves/new", message.newStash);
    await browser.tabs.sendMessage(sender.tab.id, {
      newStashAdded: result
    })
  }
})

browser.contextMenus.onClicked.addListener(async (info, tab) => {  
  if (info.menuItemId === 'stash-page') {
    const currentUrl = info?.pageUrl;

    if (!currentUrl) return;

    const result = await makePostRequest('http://127.0.0.1:5173/api/saves/new?edit=true', { url: currentUrl });
    const tabId = tab?.id || 0;
    await browser.tabs.sendMessage(tabId, {
        editNewStash: result
    })
  }
});

async function makePostRequest(url: string, body: {}) {
  try {
    const response = await fetch(url, {
      method: "POST",
      body: JSON.stringify(body),
    });

    if (response.status !== 200) {
      throw Error('Something went wrong');
    }

    const result = await response.json();
    return result;

  } catch (e) {
    console.error(e);
  }
}