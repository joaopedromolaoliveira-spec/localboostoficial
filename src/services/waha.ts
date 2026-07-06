// Cliente REST para rizrmd/whatsapp-web-api (https://github.com/rizrmd/whatsapp-web-api)
// Chamado direto do navegador. Configure VITE_WAHA_URL apontando para o servidor
// (ex.: https://meu-whatsapp-api.up.railway.app). O servidor precisa liberar CORS.

export const SESSION_NAME = "principal";

export type WahaStatus =
  | "STOPPED" | "STARTING" | "SCAN_QR_CODE"
  | "WORKING" | "FAILED" | "STOPPING";

export type WahaSession = {
  name: string;
  status: WahaStatus;
  me?: { id: string; pushName?: string } | null;
};

type ApiResponse<T> = { success: boolean; message?: string; data?: T };
type HealthData = { paired: boolean; connected: boolean; webhook_configured?: boolean };
type PairData = { qr_code: string; qr_image_url: string; expires_in: number };
type DeviceData = { device_id?: string; jid?: string; connected: boolean; paired: boolean };

// Memoriza QR e último "pair" para inferir estado STARTING/SCAN_QR_CODE.
let lastQrImage: string | null = null;
let lastQrAt = 0;
const QR_TTL_MS = 60_000;

function baseUrl(): string {
  const url = import.meta.env.VITE_WAHA_URL as string | undefined;
  if (!url) throw new Error("VITE_WAHA_URL não configurada");
  return url.replace(/\/+$/, "");
}

async function request<T>(path: string, init: RequestInit = {}): Promise<ApiResponse<T>> {
  const res = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  const raw = await res.text();
  let body: ApiResponse<T> | null = null;
  try { body = raw ? (JSON.parse(raw) as ApiResponse<T>) : null; } catch { /* not json */ }
  if (!res.ok) {
    const msg = body?.message || raw || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  if (body && body.success === false) throw new Error(body.message || "Erro na API");
  return body ?? ({ success: true } as ApiResponse<T>);
}

function statusFromHealth(h: HealthData): WahaStatus {
  if (h.paired && h.connected) return "WORKING";
  if (lastQrImage && Date.now() - lastQrAt < QR_TTL_MS) return "SCAN_QR_CODE";
  if (!h.paired) return "STOPPED";
  return "STARTING";
}

/** Inicia (ou obtém) a sessão gerando um QR de pareamento. */
export async function createSession(_name = SESSION_NAME): Promise<WahaSession> {
  // Se já está pareado e conectado, não força novo QR.
  const health = await request<HealthData>("/health");
  if (health.data?.paired && health.data.connected) {
    return { name: SESSION_NAME, status: "WORKING" };
  }
  const pair = await request<PairData>("/pair");
  if (pair.data?.qr_image_url) {
    lastQrImage = pair.data.qr_image_url;
    lastQrAt = Date.now();
  }
  return { name: SESSION_NAME, status: "SCAN_QR_CODE" };
}

export async function getSession(_name = SESSION_NAME): Promise<WahaSession> {
  const health = await request<HealthData>("/health");
  const data = health.data ?? { paired: false, connected: false };
  return { name: SESSION_NAME, status: statusFromHealth(data) };
}

/** Retorna URL (ou data URL) da imagem do QR code atual. */
export async function getQRCode(_name = SESSION_NAME): Promise<string> {
  if (lastQrImage && Date.now() - lastQrAt < QR_TTL_MS) return lastQrImage;
  const pair = await request<PairData>("/pair");
  if (!pair.data?.qr_image_url) throw new Error("QR code indisponível");
  lastQrImage = pair.data.qr_image_url;
  lastQrAt = Date.now();
  return lastQrImage;
}

export async function sendMessage(phone: string, text: string, _name = SESSION_NAME) {
  const number = phone.replace(/\D/g, "");
  return request("/send", {
    method: "POST",
    body: JSON.stringify({ number, message: text }),
  });
}

export async function disconnect(_name = SESSION_NAME) {
  lastQrImage = null; lastQrAt = 0;
  return request("/disconnect", { method: "POST" });
}

export async function getDevice(): Promise<DeviceData | null> {
  try { return (await request<DeviceData>("/devices")).data ?? null; }
  catch { return null; }
}
