import * as path from "path";

const i18next = require("i18next");
const FSBackend = require("i18next-node-fs-backend");

i18next.use(new FSBackend(null, {
    loadPath: path.join("locales", "{{lng}}.json"),
    addPath: path.join("locales", "{{lng}}.missing.json"),
    jsonIndent: 2
}));

i18next.init({
    debug: false,
    fallbackLng: "en",
    whitelist: ["de", "en"],
    ns: ["zdfMediathekAddon"],
    defaultNS: "zdfMediathekAddon",
    load: "languageOnly",
    saveMissing: true,
    updateMissing: true
});

export const i18n = i18next;