import { v2 as cloudinary } from "cloudinary";

if (
  !process.env.CLOUDINARY_CLOUD_NAME ||
  !process.env.CLOUDINARY_API_KEY ||
  !process.env.CLOUDINARY_API_SECRET
) {
  throw new Error("Cloudinary environment variables are not set");
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

async function uploadReceipt(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "QuickSplit/receipts",
        resource_type: "image",
      },
      (error, result) => {
        if (error) {
          console.error("Cloudinary upload error:", error);
          return reject(new Error("Failed to upload receipt"));
        }
        resolve(result!.secure_url);
      }
    );

    uploadStream.end(buffer);
  });
}

async function deleteReceipt(url: string): Promise<void> {
  const publicId = url.split("/").slice(-1)[0].split(".")[0];
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(
      publicId,
      { resource_type: "image" },
      (error) => {
        if (error) {
          console.error("Cloudinary delete error:", error);
          return reject(new Error("Failed to delete receipt"));
        }
        resolve();
      }
    );
  });
}

export { uploadReceipt, deleteReceipt };
