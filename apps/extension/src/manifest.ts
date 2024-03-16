import pkg from "../package.json";

const sharedManifest: Partial<chrome.runtime.ManifestBase> = {
  content_scripts: [
    {
      js: ["src/entries/contentScript/primary/main.ts"],
      // matches: ["*://*/*"],
    },
  ],
  icons: {
    "16": "icons/icon16.png",
    "32": "icons/icon32.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  // options_ui: {
  //   page: "src/entries/options/index.html",
  //   open_in_tab: true,
  // },
  permissions: ["contextMenus", "activeTab"],
  commands: {
    "stash-page": {
      suggested_key: {
        default: "Ctrl+B",
        windows: "Ctrl+B",
        mac: "Command+B",
      },
      description: "Stash the current page"
    }
  }
};

const browserAction = {
  default_icon: {
    "16": "icons/icon16.png",
    "32": "icons/icon32.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  // default_popup: "src/entries/popup/index.html",
};

const ManifestV2 = {
  ...sharedManifest,
  background: {
    scripts: ["src/entries/background/script.ts"],
    persistent: true,
  },
  browser_action: browserAction,
  // options_ui: {
  //   ...sharedManifest.options_ui,
  //   chrome_style: false,
  // },
  permissions: [...sharedManifest.permissions, "*://*/*"],
};

const ManifestV3 = {
  ...sharedManifest,
  action: browserAction,
  background: {
    service_worker: "src/entries/background/serviceWorker.ts",
  },
  // host_permissions: ["*://*/*"],
};

export function getManifest(manifestVersion: number): chrome.runtime.ManifestV2 | chrome.runtime.ManifestV3 {
  const manifest = {
    author: pkg.author,
    description: pkg.description,
    name: pkg.displayName ?? pkg.name,
    version: pkg.version,
  };

  if (manifestVersion === 2) {
    return {
      ...manifest,
      ...ManifestV2,
      manifest_version: manifestVersion,
    };
  }

  if (manifestVersion === 3) {
    return {
      ...manifest,
      ...ManifestV3,
      manifest_version: manifestVersion,
    };
  }

  throw new Error(
    `Missing manifest definition for manifestVersion ${manifestVersion}`
  );
}
