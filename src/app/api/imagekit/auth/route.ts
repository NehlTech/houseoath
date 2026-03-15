import ImageKit from "@imagekit/nodejs";
import { NextResponse } from "next/server";

export async function GET() {
  const publicKey = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY;
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  const urlEndpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT;

  // Basic validation
  if (!publicKey || !privateKey || !urlEndpoint) {
    console.error("ImageKit server-side configuration is missing.");
    return NextResponse.json(
      { 
        error: "ImageKit configuration is missing on server.",
        details: {
          hasPublic: !!publicKey,
          hasPrivate: !!privateKey,
          hasEndpoint: !!urlEndpoint
        }
      },
      { status: 500 }
    );
  }

  try {
    // Initialize inside the handler to be sure it gets the latest process.env on Vercel
    // Note: ImageKit Node.js SDK 7.x only requires privateKey in options
    const imagekit = new ImageKit({
      privateKey,
    });

    const authenticationParameters = imagekit.helper.getAuthenticationParameters();
    return NextResponse.json(authenticationParameters);
  } catch (error: any) {
    console.error("ImageKit Auth Error:", error);
    return NextResponse.json(
      { error: "Failed to generate authentication parameters", message: error.message },
      { status: 500 }
    );
  }
}
