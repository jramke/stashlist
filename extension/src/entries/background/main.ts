import browser from "webextension-polyfill";

browser.runtime.onInstalled.addListener(() => {
  console.log("Extension installed");
});


browser.contextMenus.create({
  id: 'stash',
  title: 'Stash page',
  contexts: ['all']
});

browser.contextMenus.onClicked.addListener(async (info, tab) => { 
  if (info.menuItemId === 'stash') {
    console.log(info.pageUrl);
    //TODO: fetch POST to app api endpoint
    //TODO: selected text as snippet
    
  }
});