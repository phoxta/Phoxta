import { useState } from "react";
import { invokeAction } from "@/lib/db/ops/ai";

/** Loading/error/result state for a per-domain AI action (the `ai-actions` fn). */
export function useAiAction<T = unknown>() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<T | null>(null);

  async function run(orgId: string, action: string, input?: Record<string, unknown>): Promise<T | null> {
    setLoading(true);
    setError(null);
    const { data, error } = await invokeAction<T>(orgId, action, input ?? {});
    setLoading(false);
    if (error) {
      setError(error);
      return null;
    }
    setResult(data);
    return data;
  }

  function reset() {
    setError(null);
    setResult(null);
  }

  return { run, loading, error, result, reset, setError };
}
