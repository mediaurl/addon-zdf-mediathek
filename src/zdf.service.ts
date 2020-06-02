import * as url from "url";
import { getToken } from "./token";
import fetch, { Response } from "node-fetch";
import { MovieItem, ItemTypes } from "@watchedcom/sdk/dist";

const throwIfNotOk = (resp: Response) => {
  if (!resp.ok) {
    throw new Error(`${resp.statusText} (HTTP ${resp.status}) on ${resp.url}`);
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

export const contentTypeMapping: { [contentType: string]: ItemTypes } = {
  //news: 'series',
  episode: "series",
  clip: "movie",
  brand: "directory",
};
