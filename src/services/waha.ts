// WAHA REST client — chamado direto do navegador.
// Configure VITE_WAHA_URL no .env (ex.: https://meu-servidor-waha.com).
// O servidor WAHA precisa: (1) estar sem WAHA_API_KEY e (2) ter CORS liberado.

export const SESSION_NAME = "principal";

export type WahaStatus =
  | "STOPPED" | "STARTING" | "SCAN_QR_CODE"
  | "WORKING" | "FAILED" | "STOPPING";

export type WahaSession = {
  name: string;
  status: WahaStatus;
  me?: { id: string; pushName?: string } | null;
};

function baseUrl(): string {
  const url = import.meta.env.VITE_WAHA_URL as string | undefined;
  if (!url) throw new Error("VITE_WAHA_URL não configurada");
  return url.replace(/\/+$/, "");
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) return (await res.json()) as T;
  if (ct.startsWith("image/")) {
    const buf = await res.arrayBuffer();
    const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
    return (`data:${ct};base64,${b64}`) as unknown as T;
  }
  return (await res.text()) as unknown as T;
}

export async function createSession(name = SESSION_NAME): Promise<WahaSession> {
  try {
    return await request<WahaSession>("/api/sessions", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  } catch (e) {
    // Se já existe, apenas devolva o estado atual.
    if (/already|exist|422|409/i.test((e as Error).message)) {
      return getSession(name);
    }
    throw e;
  }
}

export async function getSession(name = SESSION_NAME): Promise<WahaSession> {
  return request<WahaSession>(`/api/sessions/${name}`);
}

export async function getQRCode(name = SESSION_NAME): Promise<string> {
  // WAHA retorna imagem PNG em /qr; convertida em data URL pelo request().
  return request<string>(`/api/${name}/auth/qr?format=image`);
}

export async function sendMessage(phone: string, text: string, name = SESSION_NAME) {
  const chatId = `${phone.replace(/\D/g, "")}@c.us`;
  return request("/api/sendText", {
    method: "POST",
    body: JSON.stringify({ session: name, chatId, text }),
  });
}

export async function disconnect(name = SESSION_NAME) {
  return request(`/api/sessions/${name}/logout`, { method: "POST" }).catch(async () => {
    await request(`/api/sessions/${name}/stop`, { method: "POST" });
  });
}
