import ImageKit from "imagekit-javascript";

const urlEndpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || "";
const publicKey = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY || "";

let imagekit: ImageKit | null = null;

if (typeof window !== "undefined" && urlEndpoint && publicKey) {
  try {
    // @ts-ignore - authenticationEndpoint IS valid for imagekit-javascript but types might be outdated
    imagekit = new ImageKit({
      urlEndpoint,
      publicKey,
      authenticationEndpoint: "/api/imagekit/auth",
    });
  } catch (e) {
    console.error("Failed to initialize ImageKit SDK:", e);
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
  if (!imagekit) {
    return Promise.reject(new Error("ImageKit is not configured. Please check your Environment Variables."));
  }

  return new Promise((resolve, reject) => {
    // @ts-ignore - The SDK handles signature/token internally via authenticationEndpoint
    imagekit!.upload(
      {
        file,
        fileName: fileName || file.name.replace(/\s+/g, '-'), // Basic sanitization
        // The SDK handles authentication internally if authenticationEndpoint is provided
        folder: "/house-of-oath", 
      },
      (err, result) => {
        if (err) {
          console.error("ImageKit Upload Error:", err);
          reject(err);
        } else {
          resolve({
            url: result?.url || "",
            fileId: result?.fileId || "",
            name: result?.name || "",
          });
        }
      }
    );
  });
}

export default imagekit;
