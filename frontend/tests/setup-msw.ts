import { setupServer } from "msw/node";

// Minimal MSW server placeholder. Add handlers in individual tests via
// `server.use(http.get(...))` or extend this list as the API surface grows.
export const server = setupServer();
