import { Camera, RefreshCw, SwitchCamera, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

interface CameraCaptureModalProps {
    open: boolean;
    onClose: () => void;
    onCapture: (file: File, previewUrl: string) => void;
}

export function CameraCaptureModal({
    open,
    onClose,
    onCapture,
}: CameraCaptureModalProps) {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const [facingMode, setFacingMode] = useState<'environment' | 'user'>(
        'environment',
    );
    const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [starting, setStarting] = useState(false);

    const stopStream = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
        }
    }, []);

    const startCamera = useCallback(
        async (mode: 'environment' | 'user') => {
            stopStream();
            setErrorMessage(null);
            setStarting(true);

            if (
                typeof navigator === 'undefined' ||
                !navigator.mediaDevices?.getUserMedia
            ) {
                setErrorMessage(
                    'Browser atau koneksi tidak mendukung akses kamera langsung. Gunakan tombol Unggah / Pilih File.',
                );
                setStarting(false);
                return;
            }

            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: { ideal: mode },
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                    },
                    audio: false,
                });
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    await videoRef.current.play();
                }
            } catch {
                setErrorMessage(
                    'Izin kamera ditolak atau kamera tidak ditemukan. Pastikan kamera laptop/HP aktif atau gunakan lampirkan file.',
                );
            } finally {
                setStarting(false);
            }
        },
        [stopStream],
    );

    useEffect(() => {
        if (!open) {
            stopStream();
            setCapturedDataUrl(null);
            setErrorMessage(null);
            return;
        }
        startCamera(facingMode);
        return () => stopStream();
    }, [open, facingMode, startCamera, stopStream]);

    if (!open) {
        return null;
    }

    const handleSnap = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) {
            return;
        }

        const width = video.videoWidth || 1280;
        const height = video.videoHeight || 720;
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            return;
        }
        ctx.drawImage(video, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
        setCapturedDataUrl(dataUrl);
        stopStream();
    };

    const handleRetake = () => {
        setCapturedDataUrl(null);
        startCamera(facingMode);
    };

    const handleUsePhoto = () => {
        const canvas = canvasRef.current;
        if (!canvas || !capturedDataUrl) {
            return;
        }
        canvas.toBlob(
            (blob) => {
                if (!blob) {
                    return;
                }
                const file = new File(
                    [blob],
                    `site-visit-${Date.now()}.jpg`,
                    { type: 'image/jpeg' },
                );
                const previewUrl = URL.createObjectURL(file);
                onCapture(file, previewUrl);
                onClose();
            },
            'image/jpeg',
            0.88,
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
            <div className="w-full max-w-lg overflow-hidden rounded-2xl border bg-card shadow-2xl">
                <div className="flex items-center justify-between border-b px-4 py-3">
                    <div className="flex items-center gap-2">
                        <Camera className="size-4 text-primary" />
                        <h3 className="text-sm font-semibold">
                            Kamera Lokasi Site Visit
                        </h3>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                        <X className="size-4" />
                    </button>
                </div>

                <div className="relative aspect-video w-full bg-stone-950">
                    {capturedDataUrl ? (
                        <img
                            src={capturedDataUrl}
                            alt="Hasil jepretan kamera"
                            className="h-full w-full object-cover"
                        />
                    ) : errorMessage ? (
                        <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-xs text-stone-300">
                            <Camera className="size-8 text-stone-500" />
                            <p>{errorMessage}</p>
                        </div>
                    ) : (
                        <>
                            <video
                                ref={videoRef}
                                playsInline
                                muted
                                className="h-full w-full object-cover"
                            />
                            {starting && (
                                <div className="absolute inset-0 flex items-center justify-center bg-stone-950/60 text-xs text-white">
                                    Menghubungkan kamera...
                                </div>
                            )}
                        </>
                    )}
                    <canvas ref={canvasRef} className="hidden" />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/30 px-4 py-3">
                    {!capturedDataUrl ? (
                        <>
                            <button
                                type="button"
                                onClick={() =>
                                    setFacingMode((prev) =>
                                        prev === 'environment'
                                            ? 'user'
                                            : 'environment',
                                    )
                                }
                                className="inline-flex h-9 items-center gap-1.5 rounded-lg border bg-background px-3 text-xs font-medium hover:bg-muted"
                            >
                                <SwitchCamera className="size-3.5" />
                                Putar Kamera
                            </button>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="inline-flex h-9 items-center rounded-lg border bg-background px-3 text-xs font-medium hover:bg-muted"
                                >
                                    Batal
                                </button>
                                <button
                                    type="button"
                                    disabled={!!errorMessage || starting}
                                    onClick={handleSnap}
                                    className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                                >
                                    <Camera className="size-3.5" />
                                    Ambil Foto
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <button
                                type="button"
                                onClick={handleRetake}
                                className="inline-flex h-9 items-center gap-1.5 rounded-lg border bg-background px-3 text-xs font-medium hover:bg-muted"
                            >
                                <RefreshCw className="size-3.5" />
                                Foto Ulang
                            </button>
                            <button
                                type="button"
                                onClick={handleUsePhoto}
                                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                            >
                                Gunakan Foto Ini
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
