import ImageKit from "@imagekit/javascript";

const urlEndpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || "";
const publicKey = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY || "";

let imagekit: ImageKit | null = null;
let initError: string | null = null;

// Initialize only on client-side and only if keys are present
if (typeof window !== "undefined") {
  if (!urlEndpoint || !publicKey) {
    initError = "ImageKit configuration is missing (URL or Public Key).";
    console.warn(initError);
  } else {
    try {
      imagekit = new ImageKit({
        urlEndpoint,
        publicKey,
        authenticationEndpoint: "/api/imagekit/auth",
      });
    } catch (e: any) {
      initError = `Failed to initialize ImageKit: ${e.message}`;
      console.error(initError);
    }
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
  // If we don't have an instance, we reject with the specific initialization error
  if (!imagekit) {
    return Promise.reject(new Error(initError || "ImageKit not initialized. Ensure environment variables are set in Vercel."));
  }

  return new Promise((resolve, reject) => {
    try {
      // Basic sanitization for the filename
      const safeName = (fileName || file.name)
        .replace(/\s+/g, '-')
        .replace(/[^a-zA-Z0-9.\-_]/g, '');

      imagekit!.upload(
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
      reject(new Error(`Unexpected upload error: ${e.message}`));
    }
  });
}

export default imagekit;
