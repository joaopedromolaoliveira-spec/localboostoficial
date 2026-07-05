import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import {
  createSession, getSession, getQRCode, sendMessage as apiSend,
  disconnect as apiDisconnect, SESSION_NAME, type WahaSession, type WahaStatus,
} from "@/services/waha";

export type ConnectionStatus = "disconnected" | "connecting" | "connected";

type Ctx = {
  connectionStatus: ConnectionStatus;
  rawStatus: WahaStatus | null;
  qrCode: string | null;
  loading: boolean;
  error: string | null;
  session: WahaSession | null;
  connect: () => Promise<void>;
  sendMessage: (phone: string, text: string) => Promise<void>;
  disconnect: () => Promise<void>;
};

const WhatsAppContext = createContext<Ctx | null>(null);

function toConnection(s?: WahaStatus | null): ConnectionStatus {
  if (s === "WORKING") return "connected";
  if (s === "STARTING" || s === "SCAN_QR_CODE") return "connecting";
  return "disconnected";
}

export function WhatsAppProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<WahaSession | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);

  const stopPolling = () => {
    if (pollRef.current) { window.clearInterval(pollRef.current); pollRef.current = null; }
  };

  const refreshQr = useCallback(async () => {
    try { setQrCode(await getQRCode()); } catch { /* ainda não pronto */ }
  }, []);

  const poll = useCallback(async () => {
    try {
      const s = await getSession();
      setSession(s);
      setError(null);
      if (s.status === "SCAN_QR_CODE") await refreshQr();
      if (s.status === "WORKING") setQrCode(null);
      if (s.status === "FAILED" || s.status === "STOPPED") {
        // reconexão automática
        await createSession().catch(() => null);
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }, [refreshQr]);

  const startPolling = useCallback(() => {
    stopPolling();
    pollRef.current = window.setInterval(() => { void poll(); }, 5000);
  }, [poll]);

  const connect = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const s = await createSession();
      setSession(s);
      if (s.status !== "WORKING") await refreshQr();
      startPolling();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [refreshQr, startPolling]);

  const sendMessage = useCallback(async (phone: string, text: string) => {
    setLoading(true); setError(null);
    try { await apiSend(phone, text); }
    catch (e) { setError((e as Error).message); throw e; }
    finally { setLoading(false); }
  }, []);

  const disconnect = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      await apiDisconnect();
      setSession({ name: SESSION_NAME, status: "STOPPED" });
      setQrCode(null);
      stopPolling();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Detecta sessão existente ao montar + inicia polling.
  useEffect(() => {
    void (async () => {
      try {
        const s = await getSession();
        setSession(s);
        if (s.status === "SCAN_QR_CODE") await refreshQr();
        startPolling();
      } catch {
        // sessão ainda não existe — usuário clica em Conectar
      }
    })();
    return stopPolling;
  }, [refreshQr, startPolling]);

  return (
    <WhatsAppContext.Provider value={{
      connectionStatus: toConnection(session?.status),
      rawStatus: session?.status ?? null,
      qrCode, loading, error, session,
      connect, sendMessage, disconnect,
    }}>
      {children}
    </WhatsAppContext.Provider>
  );
}

export function useWhatsApp() {
  const ctx = useContext(WhatsAppContext);
  if (!ctx) throw new Error("useWhatsApp deve ser usado dentro de WhatsAppProvider");
  return ctx;
}
