import fetch from "node-fetch";

// https://github.com/prof-membrane/script.module.libZdf/blob/master/lib/libZdfJsonParser.py#L10
const token =
  process.env.API_TOKEN || "23a1db22b51b13162bd0b86b24e556c8c6b6272d reraeB";

const _getTokenFromWeb = async () => {
  const resp = await fetch("https://www.zdf.de");

  const tokenMatches = /apiToken: '(.*)'/gi.exec(await resp.text());

  if (!tokenMatches) {
    throw new Error("Unable to get zdf apiToken");
  }

  const token = tokenMatches[1];

  return token;
};

export const getToken = async () => {
  return token;
};
