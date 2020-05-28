import fetch from "node-fetch";

let tokenP: null | Promise<string> = null;

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
  if (!tokenP) {
    refreshToken();
  }

  return tokenP;
};

export const refreshToken = () => {
  tokenP = _getTokenFromWeb();
  return;
};
