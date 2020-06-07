import {
  WorkerHandlers,
  DirectoryItem,
  MovieItem,
  DirectoryResponse,
  MainItem,
} from "@watchedcom/sdk";
import { i18n } from "./i18n";
import { getVideoById } from "./lib";
import {
  makeApiQuery,
  makeCdnQuery,
  CdnDocResponse,
  resolveContentType,
} from "./zdf.service";

const mapSearchResp = (json: any): DirectoryResponse => {
  const results: any[] = json["http://zdf.de/rels/search/results"];
  const nextCursor = json["next"] || null;

  return {
    nextCursor,
    items: results.map<MainItem>((_) => {
      const target = _["http://zdf.de/rels/target"];
      const layouts = target["teaserImageRef"]["layouts"];

      return {
        type: resolveContentType(target.contentType),
        name: target["teaserHeadline"],
        id: target.id,
        ids: { id: target.id },
        images: {
          poster: layouts["3000x3000"] || layouts["original"],
        },
      };
    }),
  };
};

const mapCdnResp = (json: any) => {
  const { cluster, stage } = json;

  return {
    nextCursor: null,
    items: cluster
      .map((c) => {
        return c.teaser
          .filter((_) => _.type === "video")
          .map((_) => {
            return {
              type: resolveContentType(_.contentType),
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
};

export const directoryHandler: WorkerHandlers["directory"] = async (
  input,
  ctx
) => {
  console.log("directory", input);

  //const t = await i18n.cloneInstance().changeLanguage(input.language);

  const { id } = input;
  const search = input.search;
  const cursor = <string>input.cursor;

  await ctx.requestCache([id, cursor, search]);

  if (search) {
    return makeApiQuery(
      cursor || `search/documents?hasVideo=true&types=page-video&q=${search}`
    ).then(mapSearchResp);
  }

  if (id === "categories") {
    return makeApiQuery(
      cursor ||
        `search/documents?hasVideo=true&sortOrder=desc&sortBy=views&contentTypes=category`
    ).then(mapSearchResp);
  }

  return makeCdnQuery<CdnDocResponse>(`document/${input.id}`).then(mapCdnResp);

  // throw new Error(`No handler for category: ${rootId} / ${input.id}`);
};

export const itemHandler: WorkerHandlers["item"] = async (input, ctx) => {
  console.log("item", input);

  await ctx.requestCache(input.ids.id);

  return getVideoById(input.ids.id as string);
};
