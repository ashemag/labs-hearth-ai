import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const ALLOWED_BUCKETS = new Set(["contact-images", "user-avatars"]);

function canAccessPath(userId: string, path: string) {
  const [ownerId] = path.split("/");
  return ownerId === userId;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { bucket: string; path: string[] } }
) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { bucket, path } = params;
  const storagePath = path.join("/");

  if (!bucket || !storagePath || !ALLOWED_BUCKETS.has(bucket)) {
    return NextResponse.json({ error: "Invalid media request" }, { status: 400 });
  }

  if (!canAccessPath(user.id, storagePath)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.storage.from(bucket).createSignedUrl(storagePath, 60);

  if (error || !data?.signedUrl) {
    console.error("Failed to create signed media URL:", error);
    return NextResponse.json({ error: "Media not found" }, { status: 404 });
  }

  return NextResponse.redirect(data.signedUrl, 302);
}
