import { Source, SeriesEpisodeItem, PlayableItem } from "@watchedcom/sdk";
import { resolveContentType, makeCdnQuery } from "./zdf.service";

export const getVideoById = async (id: string): Promise<PlayableItem> => {
  const { document } = await makeCdnQuery(`document/${id}`);
  const name = document.titel;
  const type = resolveContentType(document.contentType);
  const description = document.beschreibung;
  const sources: Source[] = (document.formitaeten as any[])
    .filter((_) => _.type === "h264_aac_ts_http_m3u8_http")
    .map<Source>((_) => {
      return {
        type: "url",
        url: _.url,
        name: _.quality,
        languages: [_.language.substring(0, 2)],
      };
    });

  if (type === "directory") {
    throw new Error("Not playable item");
  }

  const item: PlayableItem = {
    type,
    ids: { id },
    name,
    description,
    images: { poster: document.teaserBild["1"].url },
    // sources
  };

  const episode: SeriesEpisodeItem = {
    name,
    season: 1,
    episode: 1,
    ids: { id },
    sources,
  };

  if (item.type === "series") {
    Object.assign(item, { episodes: [episode] });
  } else {
    Object.assign(item, { sources });
  }

  return item;
};
