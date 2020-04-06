import { WorkerHandlers, Source, ResolveRequest, ItemResponse } from "@watchedcom/sdk";
import { getToken, getMostViewed, getVideoItemById, buildResponseItem } from "./lib";

export const directoryHandler: WorkerHandlers["directory"] = async (input, ctx) => {
    console.log("directory", input);

    const cursor: number = <number>input.cursor || 1;

    const token = await getToken(ctx.cache);

    const results = await getMostViewed(token);

    return {
        nextCursor: results.length ? cursor + 1 : null,
        features: {
            filter: []
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

    const token = await getToken(ctx.cache);

    const video = await getVideoItemById(input.ids.id, token);
    if (!video) {
        throw new Error("invalid item");
    }

    // build item response
    const item = buildResponseItem(input, video);

    console.log(item);

    return item;
};

