const TOKEN_KEY = "transcript-maker:readwise-token";

export function getReadwiseToken(): string {
  try {
    return localStorage.getItem(TOKEN_KEY)?.trim() ?? "";
  } catch {
    return "";
  }
}

export function setReadwiseToken(token: string): void {
  const trimmed = token.trim();
  try {
    if (trimmed) {
      localStorage.setItem(TOKEN_KEY, trimmed);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // ignore quota / private mode
  }
}
