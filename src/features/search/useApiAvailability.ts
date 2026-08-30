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
    void checkApiHealth()
      .then((health) => {
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
      })
      .catch(() => {
        if (cancelled) return;
        setState({
          status: "unavailable",
          reason:
            "API proxy is not reachable. Run npm run dev:all for Find film, or import an SRT file.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
