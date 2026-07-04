// WAHA HTTP client — server-only. Uses platform-managed credentials.
// Reads API key from WAHA_API_KEY OR WHATSAPP_API_KEY (WAHA's own convention),
// records which var was picked, and logs a masked summary once at boot.

export type WahaKeyInfo = {
  source: "WAHA_API_KEY" | "WHATSAPP_API_KEY" | null;
  present: boolean;
  length: number;
  masked: string;
};

export type WahaConfig = { base_url: string; api_key: string | null; key_info: WahaKeyInfo };

let bootLogged = false;

function pickKey(): WahaKeyInfo & { value: string | null } {
  const primary = process.env.WAHA_API_KEY?.trim();
  const fallback = process.env.WHATSAPP_API_KEY?.trim();
  const [value, source] = primary
    ? [primary, "WAHA_API_KEY" as const]
    : fallback
      ? [fallback, "WHATSAPP_API_KEY" as const]
      : [null, null];
  const length = value?.length ?? 0;
  const masked = value ? `${value.slice(0, 3)}…${value.slice(-2)} (${length} chars)` : "(ausente)";
  return { value, source, present: !!value, length, masked };
}

export function getWahaKeyInfo(): WahaKeyInfo {
  const { value: _v, ...info } = pickKey();
  void _v;
  return info;
}

export function getWahaConfig(): WahaConfig {
  const base_url = (process.env.WAHA_BASE_URL ?? process.env.WAHA_URL ?? "").replace(/\/+$/, "");
  const picked = pickKey();
  const key_info: WahaKeyInfo = {
    source: picked.source, present: picked.present, length: picked.length, masked: picked.masked,
  };
  if (!bootLogged) {
    bootLogged = true;
    console.log(`[WAHA] boot base_url=${base_url || "(ausente)"} key_source=${key_info.source ?? "(ausente)"} key=${key_info.masked}`);
  }
  if (!base_url) throw new Error("WAHA_BASE_URL não configurado no servidor");
  return { base_url, api_key: picked.value, key_info };
}

function authHeaders(cfg: WahaConfig): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (cfg.api_key) h["X-Api-Key"] = cfg.api_key;
  return h;
}

function url(cfg: WahaConfig, path: string) {
  return `${cfg.base_url}${path.startsWith("/") ? path : `/${path}`}`;
}

export class WahaHttpError extends Error {
  status: number;
  endpoint: string;
  constructor(status: number, endpoint: string, message: string) {
    super(message);
    this.status = status;
    this.endpoint = endpoint;
    this.name = "WahaHttpError";
  }
}

export async function wahaRequest<T = unknown>(cfg: WahaConfig, path: string, init: RequestInit = {}): Promise<T> {
  const target = url(cfg, path);
  const res = await fetch(target, {
    ...init,
    headers: { ...authHeaders(cfg), ...(init.headers as Record<string, string> | undefined) },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new WahaHttpError(res.status, path, text || res.statusText);
  }
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) return (await res.json()) as T;
  if (ct.startsWith("image/")) {
    const buf = await res.arrayBuffer();
    const b64 = Buffer.from(buf).toString("base64");
    return (`data:${ct};base64,${b64}`) as unknown as T;
  }
  return (await res.text()) as unknown as T;
}

export const mapWahaStatus = (s?: string) => {
  switch ((s ?? "").toUpperCase()) {
    case "WORKING": return "working" as const;
    case "SCAN_QR_CODE": return "scan_qr" as const;
    case "STARTING": return "connecting" as const;
    case "FAILED": return "failed" as const;
    default: return "disconnected" as const;
  }
};

export async function startSession(cfg: WahaConfig, sessionName: string, webhookUrl: string) {
  const payload = {
    name: sessionName,
    config: {
      webhooks: [{ url: webhookUrl, events: ["message", "message.any", "session.status"] }],
    },
  };
  try {
    return await wahaRequest(cfg, "/api/sessions/start", { method: "POST", body: JSON.stringify(payload) });
  } catch (firstErr) {
    // If it's an auth error, don't retry — propagate immediately.
    if (firstErr instanceof WahaHttpError && (firstErr.status === 401 || firstErr.status === 403)) {
      throw firstErr;
    }
    try {
      await wahaRequest(cfg, "/api/sessions", { method: "POST", body: JSON.stringify(payload) });
    } catch { /* may already exist */ }
    return await wahaRequest(cfg, `/api/sessions/${sessionName}/start`, { method: "POST" });
  }
}

export async function stopSession(cfg: WahaConfig, sessionName: string) {
  return wahaRequest(cfg, `/api/sessions/${sessionName}/stop`, { method: "POST" });
}

export async function getQrImage(cfg: WahaConfig, sessionName: string) {
  return wahaRequest<string>(cfg, `/api/${sessionName}/auth/qr?format=image`);
}

export async function requestPairingCode(cfg: WahaConfig, sessionName: string, phoneNumber: string) {
  return wahaRequest<{ code: string }>(cfg, `/api/${sessionName}/auth/request-code`, {
    method: "POST",
    body: JSON.stringify({ phoneNumber }),
  });
}

export async function getSessionInfo(cfg: WahaConfig, sessionName: string) {
  return wahaRequest<{ name: string; status: string; me?: { id: string; pushName?: string } }>(
    cfg, `/api/sessions/${sessionName}`,
  );
}

export async function sendText(cfg: WahaConfig, sessionName: string, chatId: string, text: string) {
  return wahaRequest(cfg, "/api/sendText", {
    method: "POST",
    body: JSON.stringify({ session: sessionName, chatId, text }),
  });
}

export function phoneToChatId(phone: string) {
  return `${phone.replace(/\D/g, "")}@c.us`;
}

export function chatIdToPhone(chatId: string) {
  return chatId.replace(/@.*/, "");
}

// Best-effort insert into public.waha_error_log. Never throws.
export async function logWahaError(params: {
  owner_id: string | null;
  endpoint: string;
  http_status: number | null;
  message: string;
  key_info: WahaKeyInfo;
}) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Truncate message and never store the secret value.
    const message = (params.message ?? "").slice(0, 500);
    await supabaseAdmin.from("waha_error_log").insert({
      owner_id: params.owner_id,
      endpoint: params.endpoint,
      http_status: params.http_status,
      message,
      key_source: params.key_info.source,
      key_length: params.key_info.length,
    });
  } catch (e) {
    console.error("[waha_error_log] insert failed", (e as Error).message);
  }
}
