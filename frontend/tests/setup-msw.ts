import { server as sharedServer } from "./msw/server";

let listening = false;

export const server = {
  use: sharedServer.use.bind(sharedServer),
  resetHandlers: sharedServer.resetHandlers.bind(sharedServer),
  listen: (...args: Parameters<typeof sharedServer.listen>) => {
    if (listening) return;
    listening = true;
    return sharedServer.listen(...args);
  },
  close: () => {
    if (!listening) return;
    listening = false;
    return sharedServer.close();
  },
};
