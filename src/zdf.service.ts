import * as url from "url";
import { getToken, refreshToken } from "./token";
import fetch, { Response } from "node-fetch";
import {
  ItemTypes,
  DirectoryResponse,
  MainItem,
  Source,
  PlayableItem,
  SeriesEpisodeItem,
  Subtitle,
} from "@mediaurl/sdk";
import { zdfMediathekAddon } from ".";

const throwIfNotOk = (sideEffectFn?: (resp: Response) => void) => {
  const fn = async (resp: Response) => {
    const errorText = `${resp.statusText} (HTTP ${resp.status}) on ${resp.url}`;

    if (!resp.ok) {
      if (sideEffectFn) {
        sideEffectFn(resp);
      }

      throw new Error(errorText);
    }

    return resp;
  };

  return fn;
};

export const makeApiQuery = async <T = any>(path: string): Promise<T> => {
  return fetch(url.resolve("https://api.zdf.de/", path), {
    headers: { "Api-Auth": `Bearer ${await getToken()}` },
  })
    .then(throwIfNotOk((resp) => refreshToken()))
    .then((resp) => resp.json());
};

export const makeCdnQuery = async <T = any>(path: string): Promise<T> => {
  return fetch(
    url.resolve("https://zdf-cdn.live.cellular.de/mediathekV2/", path)
  )
    .then(throwIfNotOk())
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
  episode: "movie",
  clip: "movie",
  brand: "series",
  category: "directory",
};

export const extractEpisode = (teaser: any): SeriesEpisodeItem => {
  return {
    name: teaser.titel,
    description: teaser.beschreibung,
    season: teaser.seasonNumber || 1,
    episode: teaser.episodeNumber || 1,
    ids: { id: teaser.id },
  };
};

export const extractSources = (document: any): Source[] => {
  return ((document.formitaeten || []) as any[])
    .filter(
      (_) => _.type === "h264_aac_ts_http_m3u8_http" && _.class === "main"
    )
    .map<Source>((_) => {
      return {
        type: "url",
        url: _.url,
        name: _.quality,
        languages: [_.language.substring(0, 2)],
        subtitles: (<any[]>document.captions || [])
          .filter((_) => _.format === "webvtt")
          .map<Subtitle>((_) => ({
            name: `Language - ${_.language}`,
            url: _.uri,
            type: "vtt",
            language: _.language.substring(0, 2),
          })),
      };
    });
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
          .filter((_) => {
            return (
              Object.keys(contentTypeMapping).indexOf(_.contentType) !== -1
            );
          })
          .map((_) => {
            return {
              type: resolveContentType(_.contentType),
              id: _.id,
              ids: {
                id: _.id,
              },
              name: _.titel,
              images: {
                poster: _.teaserBild
                  ? _.teaserBild[Object.keys(_.teaserBild)[0]]?.url
                  : undefined,
              },
            };
          });
      })
      .flat(Infinity),
  };
};

export const mapCdnDocResp = (data: any) => {
  const { document, cluster } = data;
  const { id } = document;

  // Used to filter out recomendations from related items
  const docStructureNodePath = document.structureNodePath;

  const name = document.titel;
  const type = resolveContentType(document.contentType);
  const description = document.beschreibung;

  const sources: Source[] = extractSources(document);

  if (type === "directory") {
    throw new Error("Not playable item");
  }

  const teasers = (<any[]>cluster || []).map((_) => _.teaser).flat(Infinity);

  const episodes: SeriesEpisodeItem[] = teasers
    .filter(
      (_) =>
        _.contentType === "episode" &&
        _.structureNodePath === docStructureNodePath
    )
    .map(extractEpisode);

  const item: PlayableItem = {
    type,
    ids: { id },
    name,
    description,
    images: { poster: document.teaserBild["1"].url },
    videos: teasers
      .filter((_) => _.contentType === "clip")
      .map((_) => {
        return {
          name: _.titel,
          id: _.id,
          type: "url",
          url: `${zdfMediathekAddon.getId()}:${_.id}`,
        };
      }),
  };

  if (item.type === "series") {
    Object.assign(item, { episodes });
  } else {
    Object.assign(item, { sources });
  }

  return item;
};
