// WAHA HTTP client helpers (https://waha.devlike.pro/)
// Credentials live in server-side env vars only — never exposed to the browser.

export type WahaConfig = { base_url: string | null; api_key: string | null };

export function getEnvWahaConfig(): WahaConfig | null {
  const base_url = process.env.WAHA_BASE_URL ?? null;
  const api_key = process.env.WAHA_API_KEY ?? null;
  if (!base_url) return null;
  return { base_url, api_key };
}

function authHeaders(cfg: WahaConfig): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (cfg.api_key) h["X-Api-Key"] = cfg.api_key;
  return h;
}

function url(cfg: WahaConfig, path: string) {
  const base = (cfg.base_url ?? "").replace(/\/+$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function wahaRequest<T = unknown>(cfg: WahaConfig, path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url(cfg, path), {
    ...init,
    headers: { ...authHeaders(cfg), ...(init.headers as Record<string, string> | undefined) },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`WAHA ${res.status}: ${text || res.statusText}`);
  }
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) return (await res.json()) as T;
  // image/png for QR endpoints
  if (ct.startsWith("image/")) {
    const buf = await res.arrayBuffer();
    const b64 = Buffer.from(buf).toString("base64");
    return (`data:${ct};base64,${b64}`) as unknown as T;
  }
  return (await res.text()) as unknown as T;
}

export type WahaSessionState = "STARTING" | "SCAN_QR_CODE" | "WORKING" | "FAILED" | "STOPPED";

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
  // WAHA upsert: try start; if already exists, request status. The config includes
  // a webhook so we receive message + session events.
  const payload = {
    name: sessionName,
    config: {
      webhooks: [
        {
          url: webhookUrl,
          events: ["message", "message.any", "session.status"],
        },
      ],
    },
  };
  try {
    return await wahaRequest(cfg, "/api/sessions/start", { method: "POST", body: JSON.stringify(payload) });
  } catch (e) {
    // Some WAHA versions expose /api/sessions to create then /api/sessions/{name}/start
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
  // Returns image/png — converted to data: URL by wahaRequest.
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
    cfg,
    `/api/sessions/${sessionName}`,
  );
}

export async function sendText(cfg: WahaConfig, sessionName: string, chatId: string, text: string) {
  return wahaRequest(cfg, "/api/sendText", {
    method: "POST",
    body: JSON.stringify({ session: sessionName, chatId, text }),
  });
}

export function phoneToChatId(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return `${digits}@c.us`;
}

export function chatIdToPhone(chatId: string) {
  return chatId.replace(/@.*/, "");
}
