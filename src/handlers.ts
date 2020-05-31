import { WorkerHandlers, DirectoryItem, MovieItem } from "@watchedcom/sdk";
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
import {
  makeApiQuery,
  makeCdnQuery,
  CdnDocResponse,
  contentTypeMapping,
} from "./zdf.service";

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
  // await ctx.requestCache(input.rootId, {
  //   ttl: 24 * 3600 * 1000,
  //   refreshInterval: 1 * 3600 * 1000,
  // });
  //   if (["zdf", "mostviewed"].indexOf(`${input.rootId}`) > -1) {
  //     await ctx.requestCache(input.rootId, {
  //       ttl: 24 * 3600 * 1000,
  //       refreshInterval: 1 * 3600 * 1000,
  //     });
  //   }

  console.log("directory", input);

  //const t = await i18n.cloneInstance().changeLanguage(input.language);

  const { rootId } = input;
  const cursor: number = <number>input.cursor || 1;

  // Perform search
  if (input["search"].length) {
    return searchVideos(input.search).then((results) =>
      buildDefaultDirectoryResponse(input, cursor, results)
    );
  }

  if (rootId === "categories") {
    const data = await makeApiQuery(
      <string>input.cursor || "/search/documents?q=&contentTypes=category"
    );

    const results: any[] = data["http://zdf.de/rels/search/results"];
    const nextCursor = data["next"] || null;

    return {
      nextCursor,
      items: results.map<DirectoryItem>((_) => {
        const target = _["http://zdf.de/rels/target"];
        const layouts = target["teaserImageRef"]["layouts"];

        return {
          type: "directory",
          name: target["teaserHeadline"],
          rootId: "category-entrypoint",
          id: target.id,
          images: {
            poster: layouts["3000x3000"] || layouts["original"],
          },
        };
      }),
    };
  }

  if (input.rootId === "category-entrypoint") {
    const { cluster } = await makeCdnQuery<CdnDocResponse>(
      `document/${input.id}`
    );

    return {
      nextCursor: null,
      items: cluster
        .map((c) => {
          return c.teaser
            .map((_) => {
              return {
                type: contentTypeMapping[_.contentType],
                ids: {
                  id: _.id,
                },
                name: _.titel,
                images: {
                  poster: _.teaserBild[1].url,
                },
              };
            })
            .filter((_) => _.type);
        })
        .flat(Infinity),
    };
  }

  // Overview directory "zdf"
  if (rootId === "zdf") {
    return getStartPage().then((results) =>
      buildDefaultDirectoryResponse(input, cursor, results)
    );
  }

  // Sendungen A-Z
  if (rootId === "sendungen-a-z") {
    return getAZ().then((results) =>
      buildAZDirectoryResponse(input, cursor, results)
    );
  }

  // Sendung
  if (rootId === "brand") {
    return getBrand(input.id as string).then((results) =>
      buildDefaultDirectoryResponse(input, cursor, results)
    );
  }

  // Meist gesehen
  if (rootId === "mostviewed") {
    return getMostViewed().then((results) =>
      buildDefaultDirectoryResponse(input, cursor, results)
    );
  }

  throw new Error(`No handler for category: ${rootId} / ${input.id}`);
};

export const itemHandler: WorkerHandlers["item"] = async (input, ctx) => {
  console.log("item", input);

  await ctx.requestCache(input.ids.id, {
    ttl: Infinity,
    refreshInterval: 24 * 3600 * 1000,
  });

  return getVideoItemById(<string>input.ids.id).then((video) => {
    if (!video) {
      throw new Error("invalid item");
    }
    return buildResponseItem(input, video);
  });
};
