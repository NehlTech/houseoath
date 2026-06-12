import ImageKit from "@imagekit/nodejs";
import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/apiAuth";

export async function GET(request: NextRequest) {
  const { error } = await requireApiAuth(request);
  if (error) return error;

  const publicKey = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY;
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  const urlEndpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT;

  if (!publicKey || !privateKey || !urlEndpoint) {
    return NextResponse.json(
      { error: "Image upload service is temporarily unavailable." },
      { status: 500 }
    );
  }

  try {
    const imagekit = new ImageKit({ privateKey });
    const authenticationParameters = imagekit.helper.getAuthenticationParameters();
    return NextResponse.json(authenticationParameters);
  } catch {
    return NextResponse.json(
      { error: "Failed to generate upload credentials." },
      { status: 500 }
    );
  }
}
