import ImageKit from "@imagekit/javascript";

const urlEndpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || "";
const publicKey = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY || "";

let imagekitInstance: ImageKit | null = null;

/**
 * Lazy-initializer for ImageKit.
 * This ensures the SDK is never touched during initial site load/boot.
 */
function getIKInstance(): ImageKit {
  if (imagekitInstance) return imagekitInstance;

  if (!urlEndpoint || !publicKey) {
    throw new Error("ImageKit configuration is missing (URL or Public Key).");
  }

  try {
    imagekitInstance = new ImageKit({
      urlEndpoint,
      publicKey,
      authenticationEndpoint: "/api/imagekit/auth",
    });
    return imagekitInstance;
  } catch (e: any) {
    throw new Error(`Failed to initialize ImageKit: ${e.message}`);
  }
}

export interface ImageKitUploadResponse {
  url: string;
  fileId: string;
  name: string;
}

/**
 * Uploads a file to ImageKit.io
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

  return new Promise((resolve, reject) => {
    try {
      const ik = getIKInstance();

      // Basic sanitization for the filename
      const safeName = (fileName || file.name)
        .replace(/\s+/g, '-')
        .replace(/[^a-zA-Z0-9.\-_]/g, '');

      ik.upload(
        {
          file,
          fileName: safeName,
          folder: "/house-of-oath", 
        },
        (err: Error | null, result: any) => {
          if (err) {
            console.error("ImageKit Upload Error:", err);
            reject(new Error(`Cloud upload failed: ${err.message}`));
          } else {
            resolve({
              url: result?.url || "",
              fileId: result?.fileId || "",
              name: result?.name || "",
            });
          }
        }
      );
    } catch (e: any) {
      reject(new Error(`ImageKit Setup Error: ${e.message}`));
    }
  });
}

// Export something safe for potential top-level imports
export const isConfigured = !!(urlEndpoint && publicKey);
