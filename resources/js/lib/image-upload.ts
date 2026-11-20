/**
 * Compress & resize an image in the browser to web-optimal dimensions (max 1600px)
 * so large architectural renders / phone photos upload smoothly without hitting POST limits.
 */
export async function prepareWebImage(
    file: File,
    options: { maxWidth?: number; maxHeight?: number; maxBytes?: number; quality?: number } = {}
): Promise<{ file: File; error?: string }> {
    const {
        maxWidth = 1600,
        maxHeight = 1600,
        maxBytes = 5 * 1024 * 1024, // 5 MB
        quality = 0.85,
    } = options;

    if (!file.type.startsWith('image/')) {
        if (file.size > maxBytes) {
            return {
                file,
                error: `Ukuran file "${file.name}" (${(file.size / 1024 / 1024).toFixed(1)} MB) melebihi batas maksimal ${Math.round(maxBytes / 1024 / 1024)} MB.`,
            };
        }
        return { file };
    }

    // Always try to resize/compress images larger than 1 MB or with huge dimensions
    try {
        const bitmap = await createImageBitmap(file);
        const { width, height } = bitmap;

        const scale = Math.min(1, maxWidth / width, maxHeight / height);
        const targetW = Math.round(width * scale);
        const targetH = Math.round(height * scale);

        if (scale === 1 && file.size <= 1.2 * 1024 * 1024) {
            bitmap.close();
            return { file };
        }

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            bitmap.close();
            return { file };
        }
        ctx.drawImage(bitmap, 0, 0, targetW, targetH);
        bitmap.close();

        const outputType = file.type === 'image/png' ? 'image/jpeg' : file.type === 'image/webp' ? 'image/webp' : 'image/jpeg';
        const blob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob(resolve, outputType, quality)
        );

        if (!blob) {
            return { file };
        }

        const ext = outputType === 'image/webp' ? 'webp' : 'jpg';
        const baseName = file.name.replace(/\.[^.]+$/, '');
        const optimized = new File([blob], `${baseName}.${ext}`, {
            type: outputType,
            lastModified: Date.now(),
        });

        if (optimized.size > maxBytes) {
            return {
                file: optimized,
                error: `Ukuran gambar "${file.name}" masih terlalu besar (${(optimized.size / 1024 / 1024).toFixed(1)} MB). Maksimal ${Math.round(maxBytes / 1024 / 1024)} MB.`,
            };
        }

        return { file: optimized };
    } catch {
        if (file.size > maxBytes) {
            return {
                file,
                error: `Ukuran gambar "${file.name}" (${(file.size / 1024 / 1024).toFixed(1)} MB) terlalu besar. Maksimal ${Math.round(maxBytes / 1024 / 1024)} MB.`,
            };
        }
        return { file };
    }
}
