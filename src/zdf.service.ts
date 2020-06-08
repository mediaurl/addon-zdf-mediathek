import * as url from "url";
import { getToken } from "./token";
import fetch, { Response } from "node-fetch";
import {
  ItemTypes,
  DirectoryResponse,
  MainItem,
  Source,
  PlayableItem,
  SeriesEpisodeItem,
} from "@watchedcom/sdk";

const throwIfNotOk = async (resp: Response) => {
  const errorText = `${resp.statusText} (HTTP ${resp.status}) on ${resp.url}`;

  if (!resp.ok) {
    throw new Error(errorText);
  }

  return resp;
};

export const makeApiQuery = async <T = any>(path: string): Promise<T> => {
  return fetch(url.resolve("https://api.zdf.de/", path), {
    headers: { "Api-Auth": `Bearer ${await getToken()}` },
  })
    .then(throwIfNotOk)
    .then((resp) => resp.json());
};

export const makeCdnQuery = async <T = any>(path: string): Promise<T> => {
  return fetch(
    url.resolve("https://zdf-cdn.live.cellular.de/mediathekV2/", path)
  )
    .then(throwIfNotOk)
    .then((resp) => resp.json());
};

export interface CdnDocResponse {
  cluster: {
    teaser: {
      id: string;
      titel: string;
      contentType: string;
      teaserBild: {
        1: {
          url: string;
        };
      };
    }[];
  }[];
}

const contentTypeMapping: { [contentType: string]: ItemTypes } = {
  news: "series",
  episode: "series",
  clip: "movie",
  brand: "directory",
  category: "directory",
};

const resolveContentType = (contentType: string): ItemTypes => {
  const value = contentTypeMapping[contentType];

  if (!value) {
    throw new Error(`Unable to resolve type: ${contentType}`);
  }

  return value;
};

export const mapSearchResp = (json: any): DirectoryResponse => {
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
          poster:
            layouts["3000x3000"] ||
            layouts["original"] ||
            Object.values(layouts)[0],
        },
      };
    }),
  };
};

export const mapCdnClusterResp = (json: any) => {
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

export const mapCdnDocResp = (data: any) => {
  const { document } = data;
  const { id } = document;

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
