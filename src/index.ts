import { createWorkerAddon } from "@watchedcom/sdk";
import { directoryHandler, itemHandler } from "./handlers";

export const zdfMediathekAddon = createWorkerAddon({
  "id": "addon-zdf-mediathek",
  "name": "ZDF Mediathek",
  "version": "0.0.2",
  "itemTypes": [
    "movie",
    "series",
  ],
  actions: ["directory", "item"],
  defaultDirectoryFeatures: {
    search: { enabled: true },
  },
  defaultDirectoryOptions: {
      imageShape: "landscape",
      displayName: true,
  }
});

zdfMediathekAddon.registerActionHandler("directory", directoryHandler);

zdfMediathekAddon.registerActionHandler("item", itemHandler);