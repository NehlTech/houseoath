import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/apiAuth";

const ALLOWED_HOSTNAMES = new Set(["ik.imagekit.io", "uploadthing.com"]);

const APP_ORIGIN =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://houseofoath.vercel.app";

export async function GET(request: NextRequest) {
  const { error } = await requireApiAuth(request);
  if (error) return error;

  const url = request.nextUrl.searchParams.get("url");
  if (!url) return new NextResponse("Missing url parameter", { status: 400 });

  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return new NextResponse("Only absolute URLs are supported", { status: 400 });
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return new NextResponse("Invalid URL", { status: 400 });
  }

  if (!ALLOWED_HOSTNAMES.has(parsedUrl.hostname)) {
    return new NextResponse("Host not allowed", { status: 403 });
  }

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Upstream error: ${response.status}`);

    const contentType = response.headers.get("Content-Type") || "";
    if (!contentType.startsWith("image/")) {
      return new NextResponse("Remote resource is not an image", { status: 400 });
    }

    const arrayBuffer = await response.arrayBuffer();
    const headers = new Headers();
    headers.set("Content-Type", contentType);
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Cache-Control", "public, max-age=86400, s-maxage=86400, stale-while-revalidate=86400");
    headers.set("Access-Control-Allow-Origin", APP_ORIGIN);
    headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");

    return new NextResponse(arrayBuffer, { status: 200, headers });
  } catch {
    return new NextResponse("Failed to proxy image", { status: 500 });
  }
}
