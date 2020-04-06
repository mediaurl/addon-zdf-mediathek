import fetch from 'node-fetch';
import { matchAll } from "./modwrapper";
import { ENDPOINT, TOKEN_CACHE_DURATION, FAKE_PLAYER_ID } from "./config";
import { Source, ItemResponse, SeriesItem, SeriesEpisodeItem, MovieItem } from '@watchedcom/sdk/dist';

interface zdfItem {
    id: String,
    type: "iptv" | "movie" | "series",
    title: string,
    description: String,
    thumbnail: String,
    url: String,
    sources: Source[] | null
}

interface zdfMovieItem extends zdfItem {
    type: "movie"
}

interface zdfSeriesItem extends zdfItem {
    type: "series",
    season: number,
    episode: number,
    name: string
}


// Get Token
export const getToken = async (cache) => {
    let token = "";

    if (cache) {
        token = await cache.get('api_token').then(async (t) => {
            if (t === undefined) {
                t = await _getTokenFromWeb(fetch);
                cache.set('api_token', t, TOKEN_CACHE_DURATION);
            }
            return t;
        });
    }
    else {
        token = await _getTokenFromWeb(fetch);
    }

    return token;
};

// Get Token
export const getClientToken = async (ctx) => {
    let token = "";

    if (ctx.cache) {
        token = await ctx.cache.get('client_api_token').then(async (t) => {
            if (t === undefined) {
                t = await _getTokenFromWeb(ctx.fetch);
                ctx.cache.set('client_api_token', t, TOKEN_CACHE_DURATION);
            }
            return t;
        });
    }
    else {
        token = await _getTokenFromWeb(ctx.fetch);
    }

    return token;
};

// meist gesehen
// content/documents/meist-gesehen-100.json?profile=default
export const getMostViewed = async (token:String): Promise<zdfItem[]> => {
    return await _parsePage(`${ENDPOINT.API}/content/documents/meist-gesehen-100.json?profile=default`, token);
};

// Alle Sendungen von A-Z
// content/documents/sendungen-100.json?profile=default
export const getAZ  = async (token): Promise<zdfItem[]> => {
    return await _parsePage(`${ENDPOINT.API}/content/documents/sendungen-100.json?profile=default`, token);
};

// Get a single video by id
export const getVideoItemById = async (id, token): Promise<zdfItem|null> => {
    return await _getUrl(`${ENDPOINT.API}/content/documents/${id}.json?profile=player`, token)
    .then(resp => resp.json())
    .then(async (js) => {
        const item = _grepItem(js);
        if (item) {
            item.id = id;
            const url = js.mainVideoContent['http://zdf.de/rels/target']['http://zdf.de/rels/streams/ptmd-template'].replace('{playerId}',FAKE_PLAYER_ID);
            item.sources = await _getVideoSources(`${ENDPOINT.API}/${url}`, token);
        }
        return item;
    });
}

export const buildResponseItem = (input, video: zdfItem|zdfSeriesItem): ItemResponse => {
    let item = {};

    switch(video.type) {
        case 'series':
            item = <SeriesItem>{
                ids: input.ids,
                name: video.name,
                description: video.description,
                images: {
                    poster: video.thumbnail
                },
                type: video.type,
                episodes: [
                    <SeriesEpisodeItem>{
                        ids: input.ids,
                        name: video.title,
                        description: video.description,
                        episode: video.episode,
                        season: video.season,
                        sources: video.sources
                    }
                ]
            };

            break;

        case 'movie':
            item = <MovieItem>{
                ids: input.ids,
                name: video.title,
                description: video.description,
                images: {
                    poster: video.thumbnail
                },
                type: video.type,
                sources: video.sources
            };
            break;
    }

    return item;
};

const _parsePage = async (url:String, token): Promise<zdfItem[]> => {
    const result:zdfItem[] = await _getUrl(url, token)
    .then(resp => resp.json())
    .then((js) => {
        let items:zdfItem[] = [];

        switch (js.profile) {
            case 'http://zdf.de/rels/content/page-index':
                items = _parsePageIndex(js);
                break;

            case 'http://zdf.de/rels/search/result':
                items = _parseSearchResult(js);
                break;

            case 'http://zdf.de/rels/search/result-page':
                items = _parseSearchPage(js);
                break;
        }
    
        return items?? [];
    });

    return result;
};

const _getUrl = async (url:String, token) => {
    return await fetch(url,{headers:{'Api-Auth':`Bearer ${token}`}});
};

const _parseSearchPage = (json): zdfItem[] => {
    const results = json['http://zdf.de/rels/search/results'].map(result => _grepItem(result['http://zdf.de/rels/target'])).filter(item => !!item);
    return results;
};

const _parseSearchResult = (json): zdfItem[] => {
    const results = json.module.map((module)=>{
        return module.filterRef.resultsWithVideo['http://zdf.de/rels/search/results']
        .map(result => _grepItem(result['http://zdf.de/rels/target'])).filter(item => !!item);
    });
    return results;
};

const _parsePageIndex = (json): zdfItem[] => {
    const results = json.module[0].filterRef.resultsWithVideo['http://zdf.de/rels/search/results']?? [];
    return results.map(result => _grepItem(result['http://zdf.de/rels/target'])).filter(item => !!item);
};

const _grepItem = (target): zdfItem|zdfSeriesItem|zdfMovieItem|null => {
    //console.log("target", target);
    if (target['profile'] == 'http://zdf.de/rels/not-found') {
        return null;
    }
    if (target['profile'] == 'http://zdf.de/rels/gone') {
        return null;
    }
    
    if (!target['hasVideo']) {
        return null;
    }
    //console.log(target.programmeItem[0]['http://zdf.de/rels/target']);

    const content = target.mainVideoContent['http://zdf.de/rels/target'];
    const brand   = target['http://zdf.de/rels/brand'];
    const contentTypeMapping = {
        //news: 'series',
        episode: 'series',
        clip: 'movie'
    };

    const item = {
        id: target.id?? "",
        type: "",
        title: content.title?? target.title?? target.teaserHeadline?? "",
        description: target.teasertext?? "",
        thumbnail: target.teaserImageRef?.layouts['768xauto'] || target.teaserImageRef?.layouts['1920x1080'],
        url: "",
        sources: []
    };

    switch (target.contentType) {
        //case 'news':
        case 'episode':
        case 'clip':
            if (undefined === content['http://zdf.de/rels/streams/ptmd-template']) {
                console.log("No ptmd", content)
                return null;
            }
            item.type = contentTypeMapping[target.contentType];
            item.url  = ENDPOINT.API + content['http://zdf.de/rels/streams/ptmd-template'].replace('{playerId}',FAKE_PLAYER_ID);

            if (item.type === "series") {
                item['name']    = brand.title;
                item['episode'] = 1;
                item['season']  = 1;
            }
            
            break;

        default:
            console.log(`Invalid content type ${target.contentType}`);
            return null;
            break;
    }

    return item;
};

const _getVideoSources = async (url, token) => {
    return await _getUrl(url, token)
    .then(resp => resp.json())
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

        js.priorityList.map((item)=>{

            if (false && 'h264_aac_ts_http_m3u8_http' === item.formitaeten[0]?.type) {
                item.formitaeten[0].qualities.map((quality)=>{
                    if (quality['quality'] == 'auto') {
                        url.push(`${quality.audio.tracks[0].uri}`);
                        sources.push({
                            type: "url",
                            url: `${quality.audio?.tracks[0].uri}`
                        });
                    }
                })
            }

            if ('h264_aac_mp4_http_na_na' === item.formitaeten[0]?.type) {
                item.formitaeten[0].qualities.map((quality)=>{
                    //console.log(quality.audio?.tracks[0]);
                    if (['veryhigh', 'high', 'low'].indexOf(quality.quality)>-1) {
                        sources.push({
                            //icon: "",
                            languages: [quality.audio.tracks[0].language.substr(0,2)],
                            type: "url",
                            name: quality.quality,
                            url: `${quality.audio.tracks[0].uri}`
                        });
                    }
                })
            }
        });

        return sources;
    })
}

const _getTokenFromWeb = async (fetchFn: CallableFunction) => {
    const token = await fetchFn(`${ENDPOINT.WWW}/`)
    .then(res => res.text())
    .then((html) => {
        let t  = undefined;
        if (!t) {
            const matches = matchAll(html, /apiToken: '([\w\d]+)'/gi);
            for(;;) {
                const match = matches.nextRaw();
                if (!match) {
                    break;
                }
                t = match[1];
            }
        }
        if (!t) {
            const matches = matchAll(html, /"apiToken": "([\w\d]+)"/gi);
            for(;;) {
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
}
