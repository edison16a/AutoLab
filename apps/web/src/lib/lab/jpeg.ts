/** Storage keeps every photo as JPEG. Pi captures already are; uploads may be PNG or WebP. */
export async function toJpeg(blob: Blob, quality = 0.9): Promise<Blob> {
  if (blob.type === "image/jpeg") return blob;
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser can't convert the image.");
  // JPEG has no transparency. White keeps transparent areas from turning black.
  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((jpeg) => (jpeg ? resolve(jpeg) : reject(new Error("Couldn't convert the image."))), "image/jpeg", quality),
  );
}
