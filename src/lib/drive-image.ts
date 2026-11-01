// Normalizes any Google Drive share/view/uc link to Drive's dedicated thumbnail
// endpoint, which is what Drive actually intends for embedding as an <img src>.
// The older "uc?export=view&id=..." form frequently serves an interstitial page
// instead of the image bytes, which renders as a broken image in the browser.
export function resolveImageUrl(url: string): string {
  if (!url.includes("drive.google.com")) return url;

  const idParam = url.match(/[?&]id=([^&]+)/);
  const pathMatch = url.match(/\/file\/d\/([^/]+)/);
  const fileId = idParam?.[1] ?? pathMatch?.[1];

  return fileId ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000` : url;
}
