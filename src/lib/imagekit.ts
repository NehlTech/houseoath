import { upload } from "@imagekit/javascript";

const urlEndpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || "";
const publicKey = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY || "";

/**
 * Interface for the response from ImageKit.io
 */
export interface ImageKitUploadResponse {
  url: string;
  fileId: string;
  name: string;
}

/**
 * Internal helper to fetch authentication parameters from the server.
 * This is required for the functional upload API in @imagekit/javascript 5.x
 */
async function fetchAuthParams() {
  const response = await fetch("/api/imagekit/auth");
  if (!response.ok) {
    throw new Error(`Failed to fetch auth params: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Uploads a file to ImageKit.io using the functional API.
 * This ensures the SDK doesn't crash during boot-up and follows modern ImageKit patterns.
 * 
 * @param file The file object from input change event
 * @param fileName Optional custom name for the file
 * @returns Promise with upload response
 */
export async function uploadToImageKit(
  file: File, 
  fileName?: string
): Promise<ImageKitUploadResponse> {
  // If we're on the server, we can't upload via this client utility
  if (typeof window === "undefined") {
    throw new Error("uploadToImageKit can only be called from the browser.");
  }

  if (!urlEndpoint || !publicKey) {
    throw new Error("ImageKit configuration is missing (URL or Public Key).");
  }

  try {
    // 1. Get authentication parameters from our API route
    const { signature, token, expire } = await fetchAuthParams();

    // 2. Prepare file name
    const safeName = (fileName || file.name)
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9.\-_]/g, '');

    // 3. Upload using the functional API
    const result = await upload({
      file,
      fileName: safeName,
      publicKey,
      signature,
      token,
      expire,
      folder: "/house-of-oath",
    });

    return {
      url: result.url || "",
      fileId: result.fileId || "",
      name: result.name || "",
    };
  } catch (e: any) {
    console.error("ImageKit Upload Error:", e);
    throw new Error(`Cloud upload failed: ${e.message}`);
  }
}

// Export something safe for potential top-level imports
export const isConfigured = !!(urlEndpoint && publicKey);
