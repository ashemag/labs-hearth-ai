const PRIVATE_BUCKETS = new Set(["contact-images", "user-avatars"]);

export type PrivateBucket = "contact-images" | "user-avatars";

export function buildPrivateMediaUrl(bucket: PrivateBucket, path: string, cacheBust = true) {
  if (!PRIVATE_BUCKETS.has(bucket) || !path) {
    throw new Error("Invalid private media bucket or path");
  }

  const encodedPath = path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  const params = new URLSearchParams();
  if (cacheBust) {
    params.set("t", Date.now().toString());
  }

  const suffix = params.toString() ? `?${params.toString()}` : "";
  return `/api/media/${bucket}/${encodedPath}${suffix}`;
}

export function extractStoragePath(urlOrPath: string | null | undefined, bucket: PrivateBucket) {
  if (!urlOrPath) {
    return null;
  }

  if (
    !urlOrPath.startsWith("http://") &&
    !urlOrPath.startsWith("https://") &&
    !urlOrPath.startsWith("/")
  ) {
    return urlOrPath;
  }

  try {
    const url = new URL(
      urlOrPath.startsWith("http://") || urlOrPath.startsWith("https://")
        ? urlOrPath
        : `https://local.hearth.ai${urlOrPath}`
    );

    if (url.pathname === "/api/media") {
      const mediaBucket = url.searchParams.get("bucket");
      const mediaPath = url.searchParams.get("path");
      return mediaBucket === bucket ? mediaPath : null;
    }

    const mediaPrefix = `/api/media/${bucket}/`;
    if (url.pathname.startsWith(mediaPrefix)) {
      return url.pathname
        .slice(mediaPrefix.length)
        .split("/")
        .map((segment) => decodeURIComponent(segment))
        .join("/");
    }

    const publicPrefix = `/storage/v1/object/public/${bucket}/`;
    if (url.pathname.includes(publicPrefix)) {
      return decodeURIComponent(url.pathname.split(publicPrefix)[1] || "");
    }
  } catch {
    return null;
  }

  return null;
}
