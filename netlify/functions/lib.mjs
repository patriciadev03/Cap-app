import { pbkdf2Sync, randomBytes, createCipheriv, timingSafeEqual } from "node:crypto";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};
const json = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...CORS } });

const normCode = (s) => String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
const normId = (s) => String(s || "").toUpperCase().replace(/[^0-9A-F]/g, "");
const b64u = (b) => b.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

function sameCode(a, b) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

function makeActivation(deviceId, masterKeyB64) {
  const dk = pbkdf2Sync(deviceId, "CAP-device-v1", 100000, 32, "sha256");
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", dk, iv);
  const ct = Buffer.concat([c.update(Buffer.from(masterKeyB64, "base64")), c.final()]);
  return b64u(Buffer.concat([iv, ct, c.getAuthTag()]));
}

export function makeHandler(store, env) {
  return async (req) => {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
    if (req.method !== "POST") return json(405, { error: "method" });

    let body;
    try { body = await req.json(); } catch { return json(400, { error: "bad_request" }); }

    const max = parseInt(env.CAP_MAX_DEVICES || "10", 10);
    const shared = normCode(env.CAP_SHARED_CODE);
    const code = normCode(body.code);
    const id = normId(body.deviceId);
    if (!shared || !env.CAP_MASTER_KEY) return json(500, { error: "server_config" });
    if (id.length !== 24) return json(400, { error: "bad_device" });
    if (!code || !sameCode(code, shared)) return json(401, { error: "invalid" });

    const list = (await store.get("devices", { type: "json" })) || [];
    if (!list.includes(id)) {
      if (list.length >= max) return json(403, { error: "limit" });
      list.push(id);
      await store.setJSON("devices", list);
    }
    return json(200, { activation: makeActivation(id, env.CAP_MASTER_KEY) });
  };
}
