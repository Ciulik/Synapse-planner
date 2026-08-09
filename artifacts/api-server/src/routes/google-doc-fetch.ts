

// Fetches the plain text of a publicly shared Google Doc.
// The doc must be shared as "Anyone with the link can view."

export function extractGoogleDocId(url: string): string | null {
  const match = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

export async function fetchGoogleDocText(shareUrl: string): Promise<string> {
  const docId = extractGoogleDocId(shareUrl);
  if (!docId) {
    throw new Error("Could not find a valid Google Doc ID in that link.");
  }

  const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`;
  const response = await fetch(exportUrl);

  if (!response.ok) {
    throw new Error(
      'Could not read that doc. Make sure it is shared as "Anyone with the link can view."',
    );
  }

  const text = await response.text();
  if (!text || text.trim().length === 0) {
    throw new Error("That doc appears to be empty.");
  }

  return text;
}
