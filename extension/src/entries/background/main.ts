import browser from "webextension-polyfill";

browser.runtime.onInstalled.addListener(() => {
  console.log("Extension installed");
});

browser.action.onClicked.addListener((tab, info) => {
  console.log('clicked');
  // const dropzone = document.createElement('div');
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
      const formData = new FormData();
      formData.append('url', currentUrl);
      const response = await fetch('http://127.0.0.1:5173/api/saves/new', {
        method: "POST",
        // mode: "cors", // no-cors, *cors, same-origin
        // cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
        // credentials: "same-origin", // include, *same-origin, omit
        // headers: {
        //   "Content-Type": "application/json",
        // },
        // redirect: "follow", // manual, *follow, error
        // referrerPolicy: "no-referrer", // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
        body: formData, // body data type must match "Content-Type" header
      });
      const result = await response.json();
      console.log(result);
    } catch (error) {
      console.log(error);
    }
    
  }
});