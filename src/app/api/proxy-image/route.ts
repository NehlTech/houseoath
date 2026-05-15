import { NextRequest, NextResponse } from "next/server";

// Allowlist: only proxy images from trusted hosts
const ALLOWED_HOSTNAMES = new Set(["ik.imagekit.io", "uploadthing.com"]);

const APP_ORIGIN =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://houseoath.vercel.app";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return new NextResponse("Missing url parameter", { status: 400 });
  }

  // Only proxy absolute URLs (http/https). Reject relative paths.
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return new NextResponse("Only absolute URLs are supported", { status: 400 });
  }

  // SSRF guard: reject any hostname not in the allowlist
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
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    // Only proxy image content types
    const contentType = response.headers.get("Content-Type") || "";
    if (!contentType.startsWith("image/")) {
      return new NextResponse("Remote resource is not an image", { status: 400 });
    }

    const arrayBuffer = await response.arrayBuffer();
    const headers = new Headers();
    headers.set("Content-Type", contentType);
    headers.set("Cache-Control", "public, max-age=86400, s-maxage=86400, stale-while-revalidate=86400");
    // Restrict CORS to the app's own origin only
    headers.set("Access-Control-Allow-Origin", APP_ORIGIN);
    headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("Image proxy error:", error);
    return new NextResponse("Failed to proxy image", { status: 500 });
  }
}
