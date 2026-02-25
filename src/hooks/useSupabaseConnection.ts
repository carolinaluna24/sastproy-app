import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

type ConnectionStatus = "checking" | "connected" | "error";

export type SupabaseConnectionState = {
  status: ConnectionStatus;
  lastCheckedAt: Date | null;
  latencyMs: number | null;
  error: PostgrestError | Error | null;
  refresh: () => Promise<void>;
};

/**
 * Recomendación: crea una tabla `healthcheck` con una sola fila, por ejemplo:
 * - id: 1
 * y permisos de lectura (RLS) según tu caso.
 */
export function useSupabaseConnection(tableName: string = "healthcheck"): SupabaseConnectionState {
  const [status, setStatus] = useState<ConnectionStatus>("checking");
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [error, setError] = useState<PostgrestError | Error | null>(null);

  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;

    setStatus("checking");
    setError(null);

    const start = (typeof performance !== "undefined" ? performance.now() : Date.now());

    try {
      // Query mínima: 1 fila, 1 columna, sin traer payload grande
      const { error: qErr } = await supabase
        .from(tableName)
        .select("id", { head: true, count: "exact" }) // head:true evita payload; count solo como “ping”
        .limit(1);

      const end = (typeof performance !== "undefined" ? performance.now() : Date.now());
      setLatencyMs(Math.round(end - start));
      setLastCheckedAt(new Date());

      if (qErr) {
        setStatus("error");
        setError(qErr);
        return;
      }

      setStatus("connected");
    } catch (e) {
      const end = (typeof performance !== "undefined" ? performance.now() : Date.now());
      setLatencyMs(Math.round(end - start));
      setLastCheckedAt(new Date());

      setStatus("error");
      setError(e instanceof Error ? e : new Error("Unknown error"));
    } finally {
      inFlight.current = false;
    }
  }, [tableName]);

  useEffect(() => {
    // check inicial
    refresh();
  }, [refresh]);

  return useMemo(
    () => ({ status, lastCheckedAt, latencyMs, error, refresh }),
    [status, lastCheckedAt, latencyMs, error, refresh]
  );
}