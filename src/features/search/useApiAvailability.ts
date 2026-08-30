import { useEffect, useState } from "react";
import { checkApiHealth } from "../../lib/api/client";

export type ApiAvailability =
  | { status: "checking" }
  | { status: "available" }
  | { status: "unavailable"; reason: string };

/**
 * Find film needs the local proxy. file:// portable builds never have it;
 * http(s) builds probe /api/health.
 */
export function useApiAvailability(): ApiAvailability {
  const [state, setState] = useState<ApiAvailability>({ status: "checking" });

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.protocol === "file:") {
      setState({
        status: "unavailable",
        reason:
          "Find film needs the local API proxy. Use npm run dev:all, or import an SRT file instead.",
      });
      return;
    }

    let cancelled = false;

    async function probeWithRetry(attempt = 0): Promise<void> {
      const maxAttempts = 8;
      try {
        const health = await checkApiHealth();
        if (cancelled) return;
        if (health.ok && health.tmdb) {
          setState({ status: "available" });
          return;
        }
        setState({
          status: "unavailable",
          reason:
            "Movie search is not configured. Start the proxy with API keys, or import an SRT file.",
        });
      } catch (err) {
        if (cancelled) return;
        if (attempt < maxAttempts - 1) {
          await new Promise((r) => setTimeout(r, 1000));
          if (!cancelled) await probeWithRetry(attempt + 1);
          return;
        }
        const hint =
          err instanceof Error && err.message.includes("API proxy")
            ? err.message
            : "API proxy is not reachable. Run npm run dev:all for Find film, or import an SRT file.";
        setState({
          status: "unavailable",
          reason: hint,
        });
      }
    }

    void probeWithRetry();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
