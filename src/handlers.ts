import { WorkerHandlers } from "@watchedcom/sdk";
import { i18n } from "./i18n";
import {
  zdfItem,
  searchVideos,
  getAZ,
  getMostViewed,
  getVideoItemById,
  buildResponseItem,
  getBrand,
  getStartPage,
} from "./lib";

const buildDefaultDirectoryResponse = (
  input,
  cursor: number = 0,
  results: zdfItem[]
) => {
  const response = {
    nextCursor:
      ["mostviewed", "zdf", "az"].indexOf(input.rootId) > -1
        ? null
        : results.length
        ? cursor + 1
        : null,
    features: {
      filter: [],
      search: { enabled: ["zdf", "az"].indexOf(input.rootId) == -1 },
    },
    options: {
      displayName: true,
    },
    items: results.map((item) => {
      const id = item.id;
      return {
        id,
        ids: { id },
        type: item.type,
        name: item.title,
        language: item.language ?? "de",
        images: { poster: item.thumbnail },
      };
    }),
  };

  return response;
};

const buildAZDirectoryResponse = (
  input,
  cursor: number = 0,
  results: zdfItem[]
) => {
  const response = {
    nextCursor: results.length ? cursor + 1 : null,
    features: {
      filter: [],
      search: { enabled: true },
    },
    options: {
      displayName: true,
    },
    items: results.map((item) => {
      const id = item.id;
      return {
        rootId: "brand",
        id,
        ids: { id },
        type: item.type,
        name: item.title,
        language: item.language ?? "de",
        images: { poster: item.thumbnail },
      };
    }),
  };

  return response;
};

export const directoryHandler: WorkerHandlers["directory"] = async (
  input,
  ctx
) => {
  // Cache big request for 1 hour
  await ctx.requestCache(input.rootId, {
    ttl: 24 * 3600 * 1000,
    refreshInterval: 1 * 3600 * 1000,
  });
  //   if (["zdf", "mostviewed"].indexOf(`${input.rootId}`) > -1) {
  //     await ctx.requestCache(input.rootId, {
  //       ttl: 24 * 3600 * 1000,
  //       refreshInterval: 1 * 3600 * 1000,
  //     });
  //   }

  console.log("directory", input);

  //const t = await i18n.cloneInstance().changeLanguage(input.language);

  const cursor: number = <number>input.cursor || 1;

  let response;

  // Perform search
  if (input["search"].length) {
    return searchVideos(input.search).then((results) =>
      buildDefaultDirectoryResponse(input, cursor, results)
    );
  }

  // RootDirectories
  switch (input.rootId) {
    // Overview directory "zdf"
    case "zdf":
      response = getStartPage().then((results) =>
        buildDefaultDirectoryResponse(input, cursor, results)
      );
      break;

    // Sendungen A-Z
    case "az":
      response = getAZ().then((results) =>
        buildAZDirectoryResponse(input, cursor, results)
      );
      break;

    // Sendung
    case "brand":
      // Sendung: input.id
      response = getBrand(input.id as string).then((results) =>
        buildDefaultDirectoryResponse(input, cursor, results)
      );
      break;

    // Meist gesehen
    case "mostviewed":
      response = getMostViewed().then((results) =>
        buildDefaultDirectoryResponse(input, cursor, results)
      );
      break;

    // Neu in der Medithek
    case "newses":
      break;

    // Nachrichten
    case "news":
      break;

    // Rubriken
    case "category":
      break;
  }

  return response;
};

export const itemHandler: WorkerHandlers["item"] = async (input, ctx) => {
  console.log("item", input);

  await ctx.requestCache(input.ids.id, {
    ttl: Infinity,
    refreshInterval: 24 * 3600 * 1000,
  });

  return getVideoItemById(input.ids.id).then((video) => {
    if (!video) {
      throw new Error("invalid item");
    }
    return buildResponseItem(input, video);
  });
};
