import { ActionHandlers, ResolvedUrl } from "@mediaurl/sdk";
import * as url from "url";
import {
  makeApiQuery,
  makeCdnQuery,
  CdnDocResponse,
  mapCdnClusterResp,
  mapSearchResp,
  mapCdnDocResp,
  extractSources,
} from "./zdf.service";

export const directoryHandler: ActionHandlers["catalog"] = async (
  input,
  ctx
) => {
  // console.log("directory", input);

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

  if (id === "recently-added") {
    return makeApiQuery(
      cursor ||
        `search/documents?q=*&hasVideo=true&limit=20&contentTypes=episode&sortBy=date&sortOrder=desc`
    ).then(mapSearchResp);
  }

  return makeCdnQuery<CdnDocResponse>(`document/${input.id}`).then(
    mapCdnClusterResp
  );

  // throw new Error(`No handler for category: ${rootId} / ${input.id}`);
};

export const itemHandler: ActionHandlers["item"] = async (input, ctx) => {
  // console.log("item", input);

  await ctx.requestCache(input.ids.id);

  return makeCdnQuery(`document/${input.ids.id}`).then(mapCdnDocResp);
};

export const resolveHandler: ActionHandlers["resolve"] = async (input, ctx) => {
  const id = url.parse(input.url).hostname;

  if (!id) throw new Error(`Unable to extract id from ${input.url}`);

  return makeCdnQuery(`document/${id[1]}`).then(({ document }) => {
    const result = <ResolvedUrl[]>extractSources(document);

    return result;
  });
};

export const sourceHandler: ActionHandlers["source"] = async (input, ctx) => {
  const {
    ids: { id },
    episode,
  } = input;
  const episodeId = episode.ids?.id;

  const targetId = episodeId ?? id;

  const result = await makeCdnQuery(`document/${targetId}`).then(
    ({ document }) => extractSources(document)
  );

  return result;
};
