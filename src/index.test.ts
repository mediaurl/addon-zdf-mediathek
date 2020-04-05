import { testAddon } from "@watchedcom/test";
import { zdfMediathekAddon } from "./index";

import { autotest } from "./lib";

// Depending on your addon, change the test timeout
jest.setTimeout(20000);

test(`Test addon "${zdfMediathekAddon.getId()}"`, done => {
  testAddon(zdfMediathekAddon)
    .then(done)
    .catch(done);
});
