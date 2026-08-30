export type ReadwiseHighlightPayload = {
  text: string;
  title: string;
  author?: string;
  category?: string;
  location?: number;
  location_type?: "page" | "order" | "time_offset" | "none";
  note?: string;
  highlighted_at?: string;
  source_type?: string;
};

export async function pushHighlightsToReadwise(
  token: string,
  highlights: ReadwiseHighlightPayload[],
): Promise<{ count: number }> {
  const response = await fetch("https://readwise.io/api/v2/highlights/", {
    method: "POST",
    headers: {
      Authorization: `Token ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ highlights }),
  });

  if (!response.ok) {
    let detail = `Readwise error (${response.status})`;
    try {
      const body = (await response.json()) as { detail?: string };
      if (body.detail) detail = body.detail;
    } catch {
      // ignore
    }
    throw new Error(detail);
  }

  return { count: highlights.length };
}
