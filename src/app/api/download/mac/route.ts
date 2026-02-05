import { NextResponse } from "next/server";

const GITHUB_REPO = "ashemag/hearth-imessage-sync";

export async function GET() {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
      {
        headers: { Accept: "application/vnd.github.v3+json" },
        next: { revalidate: 300 }, // cache for 5 minutes
      }
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch latest release" },
        { status: 502 }
      );
    }

    const release = await res.json();
    const dmgAsset = release.assets?.find(
      (a: { name: string }) =>
        a.name.endsWith(".dmg") && !a.name.endsWith(".blockmap")
    );

    if (!dmgAsset) {
      return NextResponse.json(
        { error: "No DMG found in latest release" },
        { status: 404 }
      );
    }

    return NextResponse.redirect(dmgAsset.browser_download_url, 302);
  } catch {
    return NextResponse.json(
      { error: "Failed to resolve download URL" },
      { status: 500 }
    );
  }
}
