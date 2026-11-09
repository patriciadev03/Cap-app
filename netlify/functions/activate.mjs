import { getStore } from "@netlify/blobs";
import { makeHandler } from "./lib.mjs";

export default async (req, context) => {
  const store = getStore({ name: "cap-devices", consistency: "strong" });
  return makeHandler(store, process.env)(req);
};
