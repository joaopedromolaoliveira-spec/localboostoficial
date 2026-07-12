// Evolution API client — server only
// Docs: https://evolution-api.com/docs

const BASE = process.env.EVOLUTION_API_URL ?? "https://api.evolution.local";
const API_KEY = process.env.EVOLUTION_API_KEY;

export interface EvolutionInstance {
  instanceName: string;
  qrcode?: {
    code: string;
    base64?: string;
  };
  phoneNumber?: string;
  profileName?: string;
  profilePictureUrl?: string;
  status: "disconnected" | "connecting" | "scan_qr" | "connected" | "failed" | "reconnecting";
}

export interface EvolutionWebhookPayload {
  event: string;
  instance: string;
  data: Record<string, unknown>;
}

/**
 * Create a new Evolution API instance with QR Code
 */
export async function createEvolutionInstance(instanceName: string): Promise<EvolutionInstance> {
  if (!API_KEY) throw new Error("EVOLUTION_API_KEY not configured");

  const res = await fetch(`${BASE}/instance/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": API_KEY,
    },
    body: JSON.stringify({
      instanceName,
      qrcode: true,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Evolution API ${res.status}: ${text.slice(0, 300)}`);
  }

  const json = await res.json() as EvolutionInstance;
  return json;
}

/**
 * Get instance details including QR Code
 */
export async function getEvolutionInstance(instanceName: string): Promise<EvolutionInstance> {
  if (!API_KEY) throw new Error("EVOLUTION_API_KEY not configured");

  const res = await fetch(`${BASE}/instance/get/${instanceName}`, {
    method: "GET",
    headers: {
      "apikey": API_KEY,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Evolution API ${res.status}: ${text.slice(0, 300)}`);
  }

  const json = await res.json() as EvolutionInstance;
  return json;
}

/**
 * Connect instance (pair with WhatsApp)
 */
export async function connectEvolutionInstance(instanceName: string): Promise<EvolutionInstance> {
  if (!API_KEY) throw new Error("EVOLUTION_API_KEY not configured");

  const res = await fetch(`${BASE}/instance/connect/${instanceName}`, {
    method: "POST",
    headers: {
      "apikey": API_KEY,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Evolution API ${res.status}: ${text.slice(0, 300)}`);
  }

  const json = await res.json() as EvolutionInstance;
  return json;
}

/**
 * Disconnect instance
 */
export async function disconnectEvolutionInstance(instanceName: string): Promise<{ success: boolean }> {
  if (!API_KEY) throw new Error("EVOLUTION_API_KEY not configured");

  const res = await fetch(`${BASE}/instance/disconnect/${instanceName}`, {
    method: "DELETE",
    headers: {
      "apikey": API_KEY,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Evolution API ${res.status}: ${text.slice(0, 300)}`);
  }

  return { success: true };
}

/**
 * Send a text message
 */
export async function sendEvolutionMessage(
  instanceName: string,
  to: string,
  message: string
): Promise<{ success: boolean; messageId?: string }> {
  if (!API_KEY) throw new Error("EVOLUTION_API_KEY not configured");

  const phone = to.replace(/\D/g, "");
  const res = await fetch(`${BASE}/message/sendText/${instanceName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": API_KEY,
    },
    body: JSON.stringify({
      number: phone,
      text: message,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Evolution API ${res.status}: ${text.slice(0, 300)}`);
  }

  const json = await res.json() as { success: boolean; messageId?: string };
  return json;
}

/**
 * Set webhook URL for instance
 */
export async function setEvolutionWebhook(
  instanceName: string,
  webhookUrl: string,
  events: string[] = ["messages.upsert", "connection.update"]
): Promise<{ success: boolean }> {
  if (!API_KEY) throw new Error("EVOLUTION_API_KEY not configured");

  const res = await fetch(`${BASE}/webhook/set/${instanceName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": API_KEY,
    },
    body: JSON.stringify({
      url: webhookUrl,
      events,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Evolution API ${res.status}: ${text.slice(0, 300)}`);
  }

  return { success: true };
}

/**
 * List all instances
 */
export async function listEvolutionInstances(): Promise<EvolutionInstance[]> {
  if (!API_KEY) throw new Error("EVOLUTION_API_KEY not configured");

  const res = await fetch(`${BASE}/instance/list`, {
    method: "GET",
    headers: {
      "apikey": API_KEY,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Evolution API ${res.status}: ${text.slice(0, 300)}`);
  }

  const json = await res.json() as { instances: EvolutionInstance[] };
  return json.instances ?? [];
}
