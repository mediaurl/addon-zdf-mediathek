import { WorkerHandlers } from "@watchedcom/sdk";
import { i18n } from "./i18n";
import {
  makeApiQuery,
  makeCdnQuery,
  CdnDocResponse,
  mapCdnClusterResp,
  mapSearchResp,
  mapCdnDocResp,
} from "./zdf.service";

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

  return makeCdnQuery<CdnDocResponse>(`document/${input.id}`).then(
    mapCdnClusterResp
  );

  // throw new Error(`No handler for category: ${rootId} / ${input.id}`);
};

export const itemHandler: WorkerHandlers["item"] = async (input, ctx) => {
  console.log("item", input);

  await ctx.requestCache(input.ids.id);

  return makeCdnQuery(`document/${input.ids.id}`).then(mapCdnDocResp);
};
