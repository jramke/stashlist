import browser from "webextension-polyfill";

browser.runtime.onInstalled.addListener(() => {
  console.log("Extension installed");
});

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

browser.contextMenus.onClicked.addListener(async (info, tab) => {  
  if (info.menuItemId === 'stash-page') {
    const currentUrl = info?.pageUrl;

    if (!currentUrl) return;

    try {
      const response = await fetch('http://127.0.0.1:5173/api/saves/new?edit=true', {
        method: "POST",
        body: JSON.stringify({
          url: currentUrl
        }),
      });

      if (response.status !== 200) {
        throw Error('Something went wrong');
      }

      const result = await response.json();
      console.log(result);
      // await browser.runtime.sendMessage({
      //   newStash: result
      // })
      const tabId = tab?.id || 0;
      await browser.tabs.sendMessage(tabId, {
        newStash: result
      })
    } catch (error) {
      console.log(error);
    }
    
  }
});