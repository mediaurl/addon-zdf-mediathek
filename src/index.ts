import { createWorkerAddon } from "@watchedcom/sdk";
import { directoryHandler, itemHandler } from "./handlers";
import { i18n } from "./i18n";

export const zdfMediathekAddon = createWorkerAddon({
  id: "addon-zdf-mediathek",
  name: "ZDF Mediathek",
  version: "0.0.2",
  itemTypes: [ "movie", "series", "directory" ],
  actions: [ "directory", "item", "resolve" ],
  defaultDirectoryFeatures: {
    search: { enabled: true },
  },
  defaultDirectoryOptions: {
      imageShape: "landscape",
      displayName: true,
  },
  rootDirectories: [
    {
      id: "mostviewed",
      features: {
        search: { enabled: false }
      }
    },
    /*
    {
      id: "az",
      features: {
        search: { enabled: true },
      },
    },
    {
      id: "newest",
      features: {
        search: { enabled: false }
      },
    },
    {
      id: "news",
      features: {
        search: { enabled: false }
      },
    },
    {
      id: "category",
      features: {
        search: { enabled: false }
      },
    }
    */
  ],
  dashboards: [
    {
      rootId: "zdf",
      id: "zdf",
      name: "ZDF Mediathek",
      config: { showOnHomescreen: true },
      //itemTypes: ["directory", "series", "movie"]
    },
    {
      rootId: "mostviewed",
      id: "mostviewed",
      name: "ZDF: Meist gesehen",
      config: { showOnHomescreen: true }
    },
    /*
    { 
      rootId: "az",
      id: "az",
      name: "ZDF: Sendungen A-Z",
      config: { showOnHomescreen: false }
    }
    */
  ]
});

zdfMediathekAddon.registerActionHandler("directory", directoryHandler);

zdfMediathekAddon.registerActionHandler("item", itemHandler);
