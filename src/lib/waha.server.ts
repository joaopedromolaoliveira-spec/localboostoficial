// WAHA HTTP client — server-only. Uses platform-managed credentials.
// The end user never configures WAHA; both BASE_URL and API_KEY come from
// environment secrets (WAHA_BASE_URL / WAHA_API_KEY).

export type WahaConfig = { base_url: string; api_key: string | null };

export class WahaHttpError extends Error {
  status: number;
  body: string;

  constructor(status: number, body: string, statusText: string) {
    super(`WAHA ${status}: ${body || statusText}`);
    this.name = "WahaHttpError";
    this.status = status;
    this.body = body;
  }
}

export function getWahaConfig(): WahaConfig {
  const base_url = process.env.WAHA_BASE_URL?.replace(/\/+$/, "") ?? "";
  const api_key = process.env.WAHA_API_KEY ?? null;
  if (!base_url) throw new Error("WAHA_BASE_URL não configurado no servidor");
  return { base_url, api_key };
}

function authHeaders(cfg: WahaConfig): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (cfg.api_key) h["X-Api-Key"] = cfg.api_key;
  return h;
}

function url(cfg: WahaConfig, path: string) {
  return `${cfg.base_url}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function wahaRequest<T = unknown>(cfg: WahaConfig, path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url(cfg, path), {
    ...init,
    headers: { ...authHeaders(cfg), ...(init.headers as Record<string, string> | undefined) },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new WahaHttpError(res.status, text, res.statusText);
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
    case "STOPPED": return "disconnected" as const;
    case "FAILED": return "failed" as const;
    default: return "disconnected" as const;
  }
};

function sessionPayload(sessionName: string, webhookUrl: string) {
  return {
    name: sessionName,
    config: {
      metadata: { "localboost.session": sessionName },
      ignore: { status: true, groups: false, channels: true, broadcast: true },
      webhooks: [{
        url: webhookUrl,
        events: ["message", "message.any", "session.status"],
        retries: { policy: "constant", delaySeconds: 2, attempts: 10 },
      }],
    },
  };
}

function isNotFound(error: unknown) {
  return error instanceof WahaHttpError && error.status === 404;
}

function isConflict(error: unknown) {
  return error instanceof WahaHttpError && (error.status === 409 || error.status === 422 || /exist|already/i.test(error.body));
}

async function createSession(cfg: WahaConfig, sessionName: string, webhookUrl: string) {
  return wahaRequest(cfg, "/api/sessions", {
    method: "POST",
    body: JSON.stringify(sessionPayload(sessionName, webhookUrl)),
  });
}

export async function updateSessionConfig(cfg: WahaConfig, sessionName: string, webhookUrl: string) {
  return wahaRequest(cfg, `/api/sessions/${sessionName}`, {
    method: "PUT",
    body: JSON.stringify(sessionPayload(sessionName, webhookUrl)),
  });
}

export async function restartSession(cfg: WahaConfig, sessionName: string) {
  return wahaRequest(cfg, `/api/sessions/${sessionName}/restart`, { method: "POST" });
}

export async function logoutSession(cfg: WahaConfig, sessionName: string) {
  return wahaRequest(cfg, `/api/sessions/${sessionName}/logout`, { method: "POST" });
}

export async function deleteSession(cfg: WahaConfig, sessionName: string) {
  return wahaRequest(cfg, `/api/sessions/${sessionName}`, { method: "DELETE" });
}

export async function startSession(cfg: WahaConfig, sessionName: string, webhookUrl: string, options: { reset?: boolean } = {}) {
  if (options.reset) {
    await deleteSession(cfg, sessionName).catch(() => undefined);
    try {
      return await createSession(cfg, sessionName, webhookUrl);
    } catch (error) {
      if (!isConflict(error)) throw error;
      await updateSessionConfig(cfg, sessionName, webhookUrl).catch(() => undefined);
      return restartSession(cfg, sessionName);
    }
  }

  try {
    const info = await getSessionInfo(cfg, sessionName);
    const status = mapWahaStatus(info.status);
    if (status === "working" || status === "scan_qr" || status === "connecting") {
      return info;
    }
    if (status === "failed") {
      await logoutSession(cfg, sessionName).catch(() => undefined);
      await updateSessionConfig(cfg, sessionName, webhookUrl).catch(() => undefined);
      return restartSession(cfg, sessionName);
    }
  } catch (error) {
    if (!isNotFound(error)) throw error;
  }

  try {
    return await createSession(cfg, sessionName, webhookUrl);
  } catch (error) {
    if (!isConflict(error)) throw error;
    await updateSessionConfig(cfg, sessionName, webhookUrl).catch(() => undefined);
    return wahaRequest(cfg, `/api/sessions/${sessionName}/start`, { method: "POST" });
  }
}

export async function ensureSessionReady(cfg: WahaConfig, sessionName: string, webhookUrl: string, reset = false) {
  await startSession(cfg, sessionName, webhookUrl, { reset });

  let qr: string | null = null;
  let phoneNumber: string | null = null;
  let status: "scan_qr" | "working" | "connecting" | "failed" | "disconnected" = "connecting";

  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      const info = await getSessionInfo(cfg, sessionName);
      status = mapWahaStatus(info.status);
      phoneNumber = info.me?.id ? chatIdToPhone(info.me.id) : null;
      if (status === "working") break;
    } catch {
      // WAHA can need a short moment before the newly-created session is readable.
    }

    if (status === "scan_qr" || status === "connecting") {
      try {
        qr = await getQrImage(cfg, sessionName);
        if (qr) {
          status = "scan_qr";
          break;
        }
      } catch {
        // QR not generated yet; keep polling briefly.
      }
    }

    if (status === "failed") break;
    await new Promise((resolve) => setTimeout(resolve, 900));
  }

  if (status === "failed" && !reset) {
    return ensureSessionReady(cfg, sessionName, webhookUrl, true);
  }

  return { status, qr, phoneNumber };
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
