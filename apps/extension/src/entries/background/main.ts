import browser, { type Tabs } from "webextension-polyfill";

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
    await initStashPage(tab)
  }
});

browser.commands.onCommand.addListener(async (command, tab) => {
  console.log(command, tab);
  if (command === 'stash-page') {
    await initStashPage(tab)
  }
})

async function initStashPage(tab: Tabs.Tab | undefined) {
  const currentUrl = tab?.url;

    if (!currentUrl) return;

    const result = await makePostRequest('http://127.0.0.1:5173/api/saves/new?edit=true', { url: currentUrl });
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
      throw Error('Something went wrong');
    }

    const result = await response.json();
    return result;

  } catch (e) {
    console.error(e);
  }
}