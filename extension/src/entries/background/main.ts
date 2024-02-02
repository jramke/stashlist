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

    const favicon = tab?.favIconUrl || 'default-favicon'; // TODO: maybe handle on svelte side
    const title = tab?.title;
    //TODO: handle the new props on the svelte side

    try {
      const formData = new FormData();
      formData.append('url', currentUrl);
      // const response = await fetch('http://127.0.0.1:5173/api/saves/new', {
      //   method: "POST",
      //   body: formData,
      // });
      // if (response.status !== 200) {
      //   throw Error('Something went wrong');
      // }
      // console.log(response);
    } catch (error) {
      console.log(error);
    }
    
  }
});