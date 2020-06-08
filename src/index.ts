import { createWorkerAddon, runCli } from "@watchedcom/sdk";
import { directoryHandler, itemHandler } from "./handlers";

const zdfMediathekAddon = createWorkerAddon({
  id: "zdf-mediathek",
  name: "ZDF Mediathek",
  version: "0.0.3",
  icon: "https://www.zdf.de/static/img/appicons/favicon-144.png",
  itemTypes: ["movie", "series", "directory"],
  actions: ["directory", "item", "resolve"],
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
        search: { enabled: false },
      },
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
      id: "zdf-startseite-110",
      name: "ZDF Mediathek",
      config: { showOnHomescreen: true },
    },
    {
      id: "meist-gesehen-100",
      name: "ZDF: Meist gesehen",
      config: { showOnHomescreen: true },
    },
    {
      id: "categories",
      name: "ZDF: Kategorien",
    },
    {
      id: "recently-added",
      name: "ZDF: Kürzlich hinzugefügt",
    },
  ],
});

zdfMediathekAddon.registerActionHandler("directory", directoryHandler);

zdfMediathekAddon.registerActionHandler("item", itemHandler);

runCli([zdfMediathekAddon], {
  singleMode: true,
});
