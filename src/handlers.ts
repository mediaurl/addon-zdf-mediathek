import { WorkerHandlers } from "@watchedcom/sdk";
import { zdfItem, getToken, getMostViewed, getVideoItemById, buildResponseItem, searchVideos } from "./lib";
import { i18n } from "./i18n";

export const directoryHandler: WorkerHandlers["directory"] = async (input, ctx) => {
    console.log("directory", input);

    const t = await i18n.cloneInstance().changeLanguage(input.language);

    const cursor: number = <number>input.cursor || 1;

    const token = await getToken(ctx.cache);

    let results:zdfItem[] = [];

    // Handle search
    if (input['search'].length) {
        results = await searchVideos(input.search, token);
    }

    else {
        results = await getMostViewed(token);
    }

    return {
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
                id,
                ids: { id },
                type: item.type,
                name: item.title,
                images: { poster: item.thumbnail }
            };
        }),
    };
};

export const itemHandler: WorkerHandlers["item"] = async (input, ctx) => {
    console.log("item", input);

    await ctx.requestCache(input.ids.id, {
        ttl: Infinity,
        refreshInterval: 24 * 3600 * 1000
    });

    const token = await getToken(ctx.cache);
    const video = await getVideoItemById(input.ids.id, token);
    if (!video) {
        throw new Error("invalid item");
    }

    return buildResponseItem(input, video);
};

