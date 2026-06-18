const DEFAULT_GRAPH_VERSION = "v21.0";
const MAX_HANDLES = 25;
const MAX_MEDIA_PER_HANDLE = 12;

export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ message: "Use GET." });
  }

  const accessToken = process.env.META_ACCESS_TOKEN;
  const igUserId = process.env.META_IG_USER_ID;
  const graphVersion = process.env.META_GRAPH_VERSION || DEFAULT_GRAPH_VERSION;

  if (!accessToken || !igUserId) {
    return response.status(200).json({
      setupRequired: true,
      posts: [],
      accountsChecked: 0,
      message: "Meta API credentials are missing. Add META_ACCESS_TOKEN and META_IG_USER_ID in Vercel and .env.local."
    });
  }

  const handles = parseHandles(request.query.handles);
  const limit = clamp(Number(request.query.limit || 6), 1, MAX_MEDIA_PER_HANDLE);

  if (!handles.length) {
    return response.status(400).json({ message: "Add at least one Instagram handle." });
  }

  const results = await Promise.allSettled(
    handles.map((handle) => fetchBusinessDiscovery({
      handle,
      accessToken,
      igUserId,
      graphVersion,
      limit
    }))
  );

  const posts = results
    .filter((result) => result.status === "fulfilled")
    .flatMap((result) => result.value)
    .sort((a, b) => new Date(b.timestamp).valueOf() - new Date(a.timestamp).valueOf());

  const failures = results
    .map((result, index) => ({ result, handle: handles[index] }))
    .filter((item) => item.result.status === "rejected")
    .map((item) => ({ handle: item.handle, message: item.result.reason.message }));

  return response.status(200).json({
    setupRequired: false,
    accountsChecked: handles.length,
    posts,
    failures
  });
}

async function fetchBusinessDiscovery({ handle, accessToken, igUserId, graphVersion, limit }) {
  const fields = [
    `business_discovery.username(${handle}){`,
    "username,",
    "name,",
    `media.limit(${limit}){caption,media_type,permalink,timestamp}`,
    "}"
  ].join("");

  const url = new URL(`https://graph.facebook.com/${graphVersion}/${igUserId}`);
  url.searchParams.set("fields", fields);
  url.searchParams.set("access_token", accessToken);

  const graphResponse = await fetch(url);
  const data = await graphResponse.json();

  if (!graphResponse.ok) {
    const message = data?.error?.message || `Meta API request failed for ${handle}.`;
    throw new Error(message);
  }

  const account = data.business_discovery;
  const media = account?.media?.data || [];

  return media.map((item) => ({
    id: `${handle}-${item.id || item.permalink || item.timestamp}`,
    handle: account.username || handle,
    caption: item.caption || "",
    mediaType: item.media_type || "UNKNOWN",
    permalink: item.permalink || "",
    timestamp: item.timestamp || new Date().toISOString()
  }));
}

function parseHandles(value) {
  return String(value || "")
    .split(",")
    .map((handle) => handle.trim().replace(/^@/, "").toLowerCase())
    .filter((handle) => /^[a-z0-9._]{1,30}$/.test(handle))
    .slice(0, MAX_HANDLES);
}

function clamp(value, min, max) {
  if (Number.isNaN(value)) return min;
  return Math.min(Math.max(value, min), max);
}
