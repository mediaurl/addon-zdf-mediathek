import { createWorkerAddon, runCli } from "@mediaurl/sdk";
import {
  directoryHandler,
  itemHandler,
  sourceHandler,
  resolveHandler,
} from "./handlers";

export const zdfMediathekAddon = createWorkerAddon({
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
      id: "categories",
      name: "ZDF",
      search: { enabled: true },
    },
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

zdfMediathekAddon.registerActionHandler("source", sourceHandler);

zdfMediathekAddon.registerActionHandler("resolve", resolveHandler);

runCli([zdfMediathekAddon], {
  singleMode: true,
});
