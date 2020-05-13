import {
  Source,
  ItemResponse,
  SeriesItem,
  SeriesEpisodeItem,
  MovieItem,
  DirectoryResponse,
} from "@watchedcom/sdk/dist";
import fetch from "node-fetch";
import { ENDPOINT, TOKEN_CACHE_DURATION, FAKE_PLAYER_ID } from "./config";
import { matchAll } from "./modwrapper";

export interface zdfItem {
  id: String;
  type: "iptv" | "movie" | "series";
  title: string;
  description: string;
  language: string | null;
  thumbnail: string;
  url: string;
  sources: Source[] | null;
}

interface zdfMovieItem extends zdfItem {
  type: "movie";
}

interface zdfSeriesItem extends zdfItem {
  type: "series";
  season: number;
  episode: number;
  name: string;
}

// Get Token
export const getToken = async (cache) => {
  let token = "";

  if (cache) {
    token = await cache.get("api_token").then(async (t) => {
      if (t === undefined) {
        t = await _getTokenFromWeb(fetch);
        cache.set("api_token", t, TOKEN_CACHE_DURATION);
      }
      return t;
    });
  } else {
    token = await _getTokenFromWeb(fetch);
  }

  return token;
};

// Get Token
export const getClientToken = async (ctx) => {
  let token = "";

  if (ctx.cache) {
    token = await ctx.cache.get("client_api_token").then(async (t) => {
      if (t === undefined) {
        t = await _getTokenFromWeb(ctx.fetch);
        ctx.cache.set("client_api_token", t, TOKEN_CACHE_DURATION);
      }
      return t;
    });
  } else {
    token = await _getTokenFromWeb(ctx.fetch);
  }

  return token;
};

// search
export const searchVideos = async (
  query: String,
  token: String
): Promise<zdfItem[]> => {
  return await _parsePage(`${ENDPOINT.API}/search/documents?q=${query}`, token);
};

// start-page
export const getStartPage = async (token: String): Promise<zdfItem[]> => {
  return await _parsePage(
    `${ENDPOINT.API}/content/documents/zdf-startseite-100.json?profile=default`,
    token
  );
};

// content/documents/meist-gesehen-100.json?profile=default
export const getMostViewed = async (token: String): Promise<zdfItem[]> => {
  return await _parsePage(
    `${ENDPOINT.API}/content/documents/meist-gesehen-100.json?profile=default`,
    token
  );
};

// Alle Sendungen von A-Z
// content/documents/sendungen-100.json?profile=default
export const getAZ = async (token): Promise<zdfItem[]> => {
  return await _parsePage(
    `${ENDPOINT.API}/content/documents/sendungen-100.json?profile=default`,
    token
  );
};

export const getNewest = async (token: String): Promise<zdfItem[]> => {
  return await _parsePage(
    `${ENDPOINT.API}/content/documents/meist-gesehen-100.json?profile=default`,
    token
  );
};

//
export const getBrand = async (brand, token: string) => {
  return await _parsePage(
    `${ENDPOINT.API}/content/documents/${brand}.json?profile=default`,
    token
  );
};

// Get a single video by id
export const getVideoItemById = async (
  id,
  token: String
): Promise<zdfItem | null> => {
  return await _getUrl(
    `${ENDPOINT.API}/content/documents/${id}.json?profile=player`,
    token
  )
    .then((resp) => resp.json())
    .then(async (js) => {
      const item = _grepItem(js);
      if (item) {
        item.id = id;
        const url = js.mainVideoContent["http://zdf.de/rels/target"][
          "http://zdf.de/rels/streams/ptmd-template"
        ].replace("{playerId}", FAKE_PLAYER_ID);
        item.sources = await _getVideoSources(`${ENDPOINT.API}/${url}`, token);
      }
      return item;
    });
};

export const buildResponseItem = (
  input,
  video: zdfItem | zdfSeriesItem
): ItemResponse => {
  let item;

  switch (video.type) {
    case "series":
      item = <SeriesItem>{
        ids: input.ids,
        name: video["name"] ?? video.title,
        description: video.description,
        language: video.language ?? "de",
        images: {
          poster: video.thumbnail,
        },
        type: video.type,
        episodes: [
          <SeriesEpisodeItem>{
            ids: input.ids,
            name: video.title,
            description: video.description,
            episode: video["episode"] ?? 1,
            season: video["season"] ?? 1,
            sources: video.sources,
          },
        ],
      };

      break;

    case "movie":
      item = <MovieItem>{
        ids: input.ids,
        name: video.title,
        description: video.description,
        language: video.language ?? "de",
        images: {
          poster: video.thumbnail,
        },
        type: video.type,
        sources: video.sources,
      };
      break;
  }

  return item;
};

const _parsePage = async (url: String, token): Promise<zdfItem[]> => {
  return await _getUrl(url, token)
    .then((resp) => resp.json())
    .then((json) => {
      //console.dir(json,{depth:20});
      let items: zdfItem[] = [];
      switch (json.profile) {
        case "http://zdf.de/rels/content/page-home":
          items = _parseStartPage(json);
          break;

        case "http://zdf.de/rels/content/page-index":
          items = _parsePageIndex(json);
          break;

        case "http://zdf.de/rels/search/result":
          items = _parseSearchResult(json);
          break;

        case "http://zdf.de/rels/search/result-page":
          items = _parseSearchPage(json);
          break;

        case "http://zdf.de/rels/content/special-page-brand-a-z":
          items = _parseBrandsPage(json);
          break;

        default:
          console.log(`Unknown profile ${json.profile}`);
          break;
      }

      return items ?? [];
    });
};

const _getUrl = async (url: String, token) => {
  return await fetch(url, { headers: { "Api-Auth": `Bearer ${token}` } });
};

const _parseStartPage = (json): zdfItem[] => {
  return json.module[0].teaser
    .map((teaser) => _grepItem(teaser["http://zdf.de/rels/target"]))
    .filter((item) => !!item);
};

const _parseSearchPage = (json): zdfItem[] => {
  return json["http://zdf.de/rels/search/results"]
    .map((result) =>
      undefined === result["http://zdf.de/rels/target"]
        ? false
        : _grepItem(result["http://zdf.de/rels/target"])
    )
    .filter((item) => !!item);
};

const _parseSearchResult = (json): zdfItem[] => {
  return json.module
    .map(
      (module) =>
        module.filterRef.resultsWithVideo["http://zdf.de/rels/search/results"]
    )
    .map((result) =>
      undefined === result["http://zdf.de/rels/target"]
        ? false
        : _grepItem(result["http://zdf.de/rels/target"])
    )
    .filter((item) => !!item);
};

const _parsePageIndex = (json): zdfItem[] => {
  return ("contentType" in json && json.contentType == "brand"
    ? [json["http://zdf.de/rels/brand"]]
    : json.module.shift().filterRef.resultsWithVideo[
        "http://zdf.de/rels/search/results"
      ]
  )
    .map((result) =>
      undefined === result["http://zdf.de/rels/target"]
        ? false
        : _grepItem(result["http://zdf.de/rels/target"])
    )
    .filter((item) => !!item);

  /*
    return (('contentType' in json) && json.contentType == 'brand'? [json['http://zdf.de/rels/brand']]: json.module.shift().filterRef.resultsWithVideo['http://zdf.de/rels/search/results'])
    .map((result) => {
        //console.dir(result);
        return undefined === result['http://zdf.de/rels/target']? false: _grepItem(result['http://zdf.de/rels/target']);
    })
    .filter(item => !!item);
    */
};

const _parseBrandsPage = (json): zdfItem[] => {
  //console.dir(json,false);
  return json.brand
    .flatMap((brand) =>
      !("teaser" in brand)
        ? null
        : brand.teaser
            .map((teaser) =>
              undefined === teaser["http://zdf.de/rels/target"]
                ? false
                : _grepItem(teaser["http://zdf.de/rels/target"])
            )
            .filter((item) => !!item)
    )
    .filter((item) => !!item);
};

const _grepImage = (target) => {
  if (target.contentType === "brand" && "stage" in target) {
    return (
      target.stage[0].teaser[0]["http://zdf.de/rels/target"].layouts[
        "768xauto"
      ] ||
      target.stage[0].teaser[0]["http://zdf.de/rels/target"].layouts[
        "1920x1080"
      ]
    );
  }

  if ("teaserImageRef" in target && "layouts" in target.teaserImageRef) {
    return (
      target.teaserImageRef.layouts["768xauto"] ||
      target.teaserImageRef.layouts["1920x1080"]
    );
  }
  return "";
};

const _grepItem = (target): zdfItem | zdfSeriesItem | zdfMovieItem | null => {
  //console.log("target");
  //console.dir(target,{depth:12});
  if (target["profile"] == "http://zdf.de/rels/not-found") {
    console.info("not-found");
    return null;
  }
  if (target["profile"] == "http://zdf.de/rels/gone") {
    console.info("gone");
    return null;
  }

  if (!target["hasVideo"]) {
    console.info("!hasVideo");
    return null;
  }

  const contentTypeMapping = {
    //news: 'series',
    episode: "series",
    clip: "movie",
    brand: "directory",
  };

  const item = {
    id: target.id ?? "",
    type: "",
    title: target.altText ?? target.title ?? target.teaserHeadline ?? "",
    description: target.teasertext ?? "",
    thumbnail: _grepImage(target),
    url: "",
    sources: [],
  };

  switch (target.contentType) {
    //case 'news':
    case "episode":
    case "clip":
      const content = target.mainVideoContent["http://zdf.de/rels/target"];
      if (undefined === content["http://zdf.de/rels/streams/ptmd-template"]) {
        console.log("No ptmd", content);
        return null;
      }
      item.title = content.title;
      item.type = contentTypeMapping[target.contentType];
      item.url =
        ENDPOINT.API +
        content["http://zdf.de/rels/streams/ptmd-template"].replace(
          "{playerId}",
          FAKE_PLAYER_ID
        );

      if (item.type === "series") {
        const brand = target["http://zdf.de/rels/brand"];

        item["name"] = brand.title;
        item["episode"] = 1;
        item["season"] = 1;
      }

      break;

    case "brand":
      //console.dir(target, {depth:12});
      item.type = contentTypeMapping[target.contentType];

      if ("http://zdf.de/rels/search/page-video-counter-with-video" in target) {
        item.url =
          ENDPOINT.API +
          target["http://zdf.de/rels/search/page-video-counter-with-video"][
            "self"
          ].replace(/&limit=0/, "&limit=100");
      } else if ("stage" in target) {
        item.url = target.id;
      }
      break;

    default:
      console.log(`Invalid content type ${target.contentType}`);
      return null;
      break;
  }

  // TODO: Dirty fixed typing error with <any> to make tsc work
  return <any>item;
};

const _getVideoSources = async (url, token) => {
  return await _getUrl(url, token)
    .then((resp) => resp.json())
    .then((js) => {
      const sources: Source[] = [];

      /*
        if (undefined !== js['captions']) {
            js.captions.map((caption)=>{
                if('ebu-tt-d-basic-de' === caption.format) {
                    subtitle = caption.uri;
                }
            });
        }
        */

      js.priorityList.map((item) => {
        if ("h264_aac_mp4_http_na_na" === item.formitaeten[0]?.type) {
          item.formitaeten[0].qualities.map((quality) => {
            if (["veryhigh", "high", "low"].indexOf(quality.quality) > -1) {
              sources.push({
                //icon: "",
                languages: [quality.audio.tracks[0].language.substr(0, 2)],
                type: "url",
                name: quality.quality,
                url: `${quality.audio.tracks[0].uri}`,
              });
            }
          });
        }
      });

      return sources;
    });
};

const _getTokenFromWeb = async (fetchFn: CallableFunction) => {
  const token = await fetchFn(`${ENDPOINT.WWW}/`)
    .then((res) => res.text())
    .then((html) => {
      let t = undefined;
      if (!t) {
        const matches = matchAll(html, /apiToken: '([\w\d]+)'/gi);
        for (;;) {
          const match = matches.nextRaw();
          if (!match) {
            break;
          }
          t = match[1];
        }
      }
      if (!t) {
        const matches = matchAll(html, /"apiToken": "([\w\d]+)"/gi);
        for (;;) {
          const match = matches.nextRaw();
          if (!match) {
            break;
          }
          t = match[1];
        }
      }
      return t;
    });

  return token;
};
