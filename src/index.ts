import { createWorkerAddon } from "@watchedcom/sdk";
import { directoryHandler, itemHandler } from "./handlers";

export const zdfMediathekAddon = createWorkerAddon({
  "id": "addon-zdf-mediathek",
  "name": "ZDF Mediathek",
  "version": "0.0.1",
  "itemTypes": [
    "movie",
    "series",
  ],
  actions: ["directory", "item", "resolve"],
});

zdfMediathekAddon.registerActionHandler("directory", directoryHandler);

zdfMediathekAddon.registerActionHandler("item", itemHandler);

zdfMediathekAddon.registerActionHandler("resolve", async (input, ctx) => {
  // resolve action handler code goes here
  throw new Error("Not implemented");
});
