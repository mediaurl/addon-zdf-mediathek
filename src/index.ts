import { createWorkerAddon } from "@watchedcom/sdk";
import { directoryHandler, itemHandler } from "./handlers";

export const zdfMediathekAddon = createWorkerAddon({
  id: "addon-zdf-mediathek",
  name: "ZDF Mediathek",
  version: "0.0.2",
  itemTypes: [ "movie", "series", "directory" ],
  actions: [ "directory", "item" ],
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
      }
    }
  ],
  dashboards: [
    {
      rootId: "mostviewed",
      id: "zdf/mostviewed",
      name: "ZDF - Meist gesehen"
    }
  ]
});

zdfMediathekAddon.registerActionHandler("directory", directoryHandler);

zdfMediathekAddon.registerActionHandler("item", itemHandler);