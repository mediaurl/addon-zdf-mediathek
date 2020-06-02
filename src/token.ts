import fetch from "node-fetch";

let _tokenP: null | Promise<string> = null;

const _getTokenFromWeb = async () => {
  const resp = await fetch(
    "https://www.zdf.de/dokumentation/terra-x/unsere-waelder-die-sprache-der-baeume-100.html"
  );

  const tokenMatches = /"apiToken": "(.*)"/gi.exec(await resp.text());

  if (!tokenMatches) {
    throw new Error("Unable to get zdf apiToken");
  }

  const token = tokenMatches[1];

  return token;
};

export const getToken = () => {
  if (!_tokenP) {
    _tokenP = _getTokenFromWeb();
  }

  return _tokenP;
};

export const refreshToken = () => {
  _tokenP = _getTokenFromWeb();
};
