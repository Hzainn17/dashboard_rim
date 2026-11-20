import * as React from 'react';
import { useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import {
    CheckCircle2,
    Compass,
    ExternalLink,
    FileText,
    ImagePlus,
    LocateFixed,
    MapPin,
    Send,
    Trash2,
} from 'lucide-react';
import {
    type BriefField,
    type BriefFile,
    type BriefMapsValue,
    type BriefResponses,
    getDesignStylePreview,
    groupBriefFields,
    isDesignStyleField,
    isImageUrl,
    mapsEmbedUrl,
    mapsOpenUrl,
} from '@/Components/client-brief/types';
import { type PageProps } from '@/types';
import { cn } from '@/lib/utils';

interface Props {
    token: string;
    project: {
        name: string;
        client_name: string;
        package_name?: string | null;
        building_type?: 'rumah_hunian' | 'komersial' | 'interior';
        template_title?: string;
    };
    studioInfo: {
        name: string;
        logo_url: string;
    };
    fields: BriefField[];
    responses: BriefResponses;
    compassOptions: string[];
    submittedAt?: string | null;
}

export default function ClientBriefForm({
    token,
    project,
    studioInfo,
    fields,
    responses: initialResponses,
    compassOptions,
    submittedAt,
}: Props) {
    const page = usePage<PageProps & { errors?: Record<string, string> }>();
    const flashSuccess = page.props.flash?.success;
    const errors = page.props.errors || {};

    const [answers, setAnswers] = useState<BriefResponses>(() => ({ ...(initialResponses || {}) }));
    const [newFiles, setNewFiles] = useState<Record<string, File[]>>({});
    const [submitting, setSubmitting] = useState(false);
    const [locatingKey, setLocatingKey] = useState<string | null>(null);
    const [geoError, setGeoError] = useState<string | null>(null);

    const sections = groupBriefFields(fields);

    const setAnswer = (key: string, value: unknown) => {
        setAnswers((prev) => ({ ...prev, [key]: value }));
    };

    const toggleMultiOption = (key: string, option: string) => {
        const current = Array.isArray(answers[key]) ? (answers[key] as string[]) : [];
        const next = current.includes(option)
            ? current.filter((o) => o !== option)
            : [...current, option];
        setAnswer(key, next);
    };

    const handleUseMyLocation = (key: string) => {
        if (!navigator.geolocation) {
            setGeoError('Browser Anda tidak mendukung akses lokasi GPS.');
            return;
        }
        setGeoError(null);
        setLocatingKey(key);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = Number(pos.coords.latitude.toFixed(6));
                const lng = Number(pos.coords.longitude.toFixed(6));
                const prev = (answers[key] as BriefMapsValue) || {};
                setAnswer(key, {
                    ...prev,
                    lat,
                    lng,
                    url: prev.url || `https://www.google.com/maps?q=${lat},${lng}`,
                });
                setLocatingKey(null);
            },
            () => {
                setGeoError('Gagal mengambil lokasi GPS. Pastikan izin lokasi diaktifkan atau tempel link Google Maps.');
                setLocatingKey(null);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const handleFileSelect = (key: string, fileList: FileList | null) => {
        if (!fileList) return;
        const added = Array.from(fileList);
        setNewFiles((prev) => ({
            ...prev,
            [key]: [...(prev[key] || []), ...added],
        }));
    };

    const removeNewFile = (key: string, index: number) => {
        setNewFiles((prev) => ({
            ...prev,
            [key]: (prev[key] || []).filter((_, i) => i !== index),
        }));
    };

    const removeExistingFile = (key: string, urlToRemove: string) => {
        const current = Array.isArray(answers[key]) ? (answers[key] as BriefFile[]) : [];
        setAnswer(
            key,
            current.filter((f) => f.url !== urlToRemove)
        );
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        const formData = new FormData();

        fields.forEach((field) => {
            const val = answers[field.key];

            if (field.type === 'files') {
                const existing = Array.isArray(val) ? (val as BriefFile[]) : [];
                existing.forEach((f) => {
                    formData.append(`existing[${field.key}][]`, f.url);
                });
                (newFiles[field.key] || []).forEach((file) => {
                    formData.append(`files[${field.key}][]`, file);
                });
                return;
            }

            if (field.type === 'maps') {
                const mapVal = (val as BriefMapsValue) || {};
                if (mapVal.url) formData.append(`answers[${field.key}][url]`, String(mapVal.url));
                if (mapVal.lat !== undefined && mapVal.lat !== null && mapVal.lat !== '') {
                    formData.append(`answers[${field.key}][lat]`, String(mapVal.lat));
                }
                if (mapVal.lng !== undefined && mapVal.lng !== null && mapVal.lng !== '') {
                    formData.append(`answers[${field.key}][lng]`, String(mapVal.lng));
                }
                return;
            }

            if (field.type === 'multiselect') {
                const arr = Array.isArray(val) ? (val as string[]) : [];
                arr.forEach((item) => {
                    formData.append(`answers[${field.key}][]`, item);
                });
                return;
            }

            if (val !== undefined && val !== null && val !== '') {
                formData.append(`answers[${field.key}]`, String(val));
            }
        });

        router.post(route('brief.submit', token), formData, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                setNewFiles({});
            },
            onFinish: () => setSubmitting(false),
        });
    };

    return (
        <div className="min-h-screen bg-[#eef2f3] py-8 px-4">
            <Head title={`${project.template_title || 'Formulir Informasi Klien'} — ${project.name}`} />

            <div className="mx-auto max-w-3xl">
                {/* Architectural Studio Cover Header */}
                <div className="overflow-hidden rounded-2xl border border-[#d4e2e3] bg-white shadow-sm">
                    <div className="relative bg-gradient-to-br from-[#1b2a2c] via-[#2f5456] to-[#46797b] px-6 py-6 text-white sm:px-8">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="inline-flex w-fit items-center gap-3 rounded-xl bg-white/95 px-3.5 py-2 shadow-xs">
                                <img
                                    src={studioInfo.logo_url}
                                    alt={studioInfo.name}
                                    className="h-8 w-auto object-contain"
                                />
                            </div>
                            <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#d6ecec]">
                                {project.template_title || 'Formulir Informasi Klien'}
                            </span>
                        </div>
                        <div className="mt-5">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#b9dddd]">
                                {project.building_type === 'interior'
                                    ? 'INTERIOR DESIGNER DOCUMENTS'
                                    : 'ARCHITECTURAL DESIGNER DOCUMENTS'}
                            </p>
                            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                                {project.name}
                            </h1>
                        </div>
                    </div>

                    <div className="p-6 sm:px-8">
                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#dce8e8] bg-[#f6fafa] px-4 py-3 text-xs text-slate-600">
                            <div>
                                Klien: <strong className="text-slate-900">{project.client_name}</strong>
                            </div>
                            {project.package_name && (
                                <div>
                                    Paket: <strong className="text-[#46797b]">{project.package_name}</strong>
                                </div>
                            )}
                        </div>

                    <p className="mt-4 text-xs leading-relaxed text-slate-600">
                        Halo Bapak/Ibu <strong>{project.client_name}</strong>, mohon lengkapi data kondisi lahan dan rencana kebutuhan desain berikut sebagai bahan brainstorming tim arsitek kami. Anda dapat memperbarui data ini kapan saja melalui link yang sama.
                    </p>

                        {submittedAt && (
                            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="size-3.5" />
                                <span>Terakhir dikirim: {submittedAt}</span>
                            </div>
                        )}
                    </div>
                </div>

                {flashSuccess && (
                    <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800">
                        <CheckCircle2 className="size-4 shrink-0" />
                        <span>{flashSuccess}</span>
                    </div>
                )}

                {Object.keys(errors).length > 0 && (
                    <div className="mt-4 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-xs text-rose-700">
                        Mohon periksa kembali kolom wajib yang belum diisi:
                        <ul className="mt-1 list-disc pl-4">
                            {Object.values(errors).map((msg, i) => (
                                <li key={i}>{msg}</li>
                            ))}
                        </ul>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-5">
                    {sections.map((group) => (
                        <section
                            key={group.section}
                            className="rounded-2xl border bg-white p-6 shadow-xs flex flex-col gap-4"
                        >
                            <h2 className="border-b pb-2.5 text-sm font-bold text-slate-900">
                                {group.section}
                            </h2>

                            {group.fields.map((field) => {
                                const val = answers[field.key];
                                const errMsg =
                                    errors[`answers.${field.key}`] ||
                                    errors[`answers.${field.key}.url`] ||
                                    errors[`files.${field.key}`];

                                return (
                                    <div key={field.key} className="flex flex-col gap-1.5">
                                        <label className="text-xs font-semibold text-slate-800">
                                            {field.label}{' '}
                                            {field.required && <span className="text-rose-500">*</span>}
                                        </label>

                                        {field.help && (
                                            <p className="text-[11px] text-slate-500">{field.help}</p>
                                        )}

                                        {(field.type === 'text' || field.type === 'url') && (
                                            <input
                                                type={field.type === 'url' ? 'url' : 'text'}
                                                required={field.required}
                                                value={typeof val === 'string' ? val : ''}
                                                onChange={(e) => setAnswer(field.key, e.target.value)}
                                                className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs text-slate-900 focus:border-[#46797b] focus:outline-none focus:ring-1 focus:ring-[#46797b]"
                                            />
                                        )}

                                        {field.type === 'number' && (
                                            <input
                                                type="number"
                                                min="0"
                                                step="any"
                                                required={field.required}
                                                value={
                                                    val !== undefined && val !== null ? String(val) : ''
                                                }
                                                onChange={(e) => setAnswer(field.key, e.target.value)}
                                                className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs text-slate-900 focus:border-[#46797b] focus:outline-none focus:ring-1 focus:ring-[#46797b]"
                                            />
                                        )}

                                        {field.type === 'textarea' && (
                                            <textarea
                                                rows={3}
                                                required={field.required}
                                                value={typeof val === 'string' ? val : ''}
                                                onChange={(e) => setAnswer(field.key, e.target.value)}
                                                className="rounded-xl border border-slate-300 bg-white p-3 text-xs text-slate-900 focus:border-[#46797b] focus:outline-none focus:ring-1 focus:ring-[#46797b]"
                                            />
                                        )}

                                        {field.type === 'select' && (
                                            <select
                                                required={field.required}
                                                value={typeof val === 'string' ? val : ''}
                                                onChange={(e) => setAnswer(field.key, e.target.value)}
                                                className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs text-slate-900 focus:border-[#46797b] focus:outline-none focus:ring-1 focus:ring-[#46797b]"
                                            >
                                                <option value="">-- Pilih --</option>
                                                {(field.options || []).map((opt) => (
                                                    <option key={opt} value={opt}>
                                                        {opt}
                                                    </option>
                                                ))}
                                            </select>
                                        )}

                                        {field.type === 'multiselect' &&
                                            (isDesignStyleField(field) ? (
                                                <div className="grid grid-cols-2 gap-3 pt-1 sm:grid-cols-3">
                                                    {(field.options || []).map((opt) => {
                                                        const selected =
                                                            Array.isArray(val) &&
                                                            (val as string[]).includes(opt);
                                                        const preview = getDesignStylePreview(
                                                            opt,
                                                            project.building_type
                                                        );
                                                        return (
                                                            <button
                                                                key={opt}
                                                                type="button"
                                                                onClick={() =>
                                                                    toggleMultiOption(field.key, opt)
                                                                }
                                                                className={cn(
                                                                    'group relative flex flex-col overflow-hidden rounded-xl border text-left transition-all',
                                                                    selected
                                                                        ? 'border-[#46797b] bg-[#46797b]/5 ring-2 ring-[#46797b]'
                                                                        : 'border-slate-200 bg-white hover:border-[#46797b]/50 hover:shadow-xs'
                                                                )}
                                                            >
                                                                {preview ? (
                                                                    <div className="relative h-28 w-full overflow-hidden bg-slate-100">
                                                                        <img
                                                                            src={preview.image}
                                                                            alt={`Contoh gaya ${opt}`}
                                                                            loading="lazy"
                                                                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                                                        />
                                                                        {selected && (
                                                                            <span className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full bg-[#46797b] text-white shadow-sm">
                                                                                <CheckCircle2 className="size-4" />
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <div className="relative flex h-28 w-full items-center justify-center bg-slate-50 text-xs font-semibold text-slate-400">
                                                                        Gaya Khusus / Lainnya
                                                                        {selected && (
                                                                            <span className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full bg-[#46797b] text-white shadow-sm">
                                                                                <CheckCircle2 className="size-4" />
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                )}
                                                                <div className="p-2.5">
                                                                    <p className="text-xs font-bold text-slate-900">
                                                                        {opt}
                                                                    </p>
                                                                    {preview && (
                                                                        <p className="mt-0.5 text-[10.5px] leading-snug text-slate-500 line-clamp-2">
                                                                            {preview.subtitle}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <div className="flex flex-wrap gap-2 pt-1">
                                                    {(field.options || []).map((opt) => {
                                                        const selected =
                                                            Array.isArray(val) &&
                                                            (val as string[]).includes(opt);
                                                        return (
                                                            <button
                                                                key={opt}
                                                                type="button"
                                                                onClick={() =>
                                                                    toggleMultiOption(field.key, opt)
                                                                }
                                                                className={cn(
                                                                    'rounded-full border px-3 py-1.5 text-xs font-medium transition',
                                                                    selected
                                                                        ? 'border-[#46797b] bg-[#46797b] text-white'
                                                                        : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                                                                )}
                                                            >
                                                                {opt}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            ))}

                                        {field.type === 'compass' && (
                                            <div className="flex flex-col gap-2 pt-1">
                                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                                    {compassOptions.map((dir) => {
                                                        const active = val === dir;
                                                        return (
                                                            <button
                                                                key={dir}
                                                                type="button"
                                                                onClick={() =>
                                                                    setAnswer(field.key, dir)
                                                                }
                                                                className={cn(
                                                                    'inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition',
                                                                    active
                                                                        ? 'border-[#46797b] bg-[#46797b] text-white'
                                                                        : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                                                                )}
                                                            >
                                                                <Compass className="size-3.5" />
                                                                <span>{dir}</span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {field.type === 'maps' && (() => {
                                            const mapVal = (val as BriefMapsValue) || {};
                                            const embedSrc = mapsEmbedUrl(mapVal);
                                            const openHref = mapsOpenUrl(mapVal);

                                            return (
                                                <div className="flex flex-col gap-2.5 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                                                    <div className="flex flex-col gap-2 sm:flex-row">
                                                        <input
                                                            type="text"
                                                            value={mapVal.url || ''}
                                                            onChange={(e) =>
                                                                setAnswer(field.key, {
                                                                    ...mapVal,
                                                                    url: e.target.value,
                                                                })
                                                            }
                                                            placeholder="Tempel link Google Maps (cth: https://maps.google.com/?q=-6.917,107.619)"
                                                            className="h-9 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-xs focus:border-[#46797b] focus:outline-none"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                handleUseMyLocation(field.key)
                                                            }
                                                            disabled={locatingKey === field.key}
                                                            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#46797b] px-3 text-xs font-semibold text-white hover:bg-[#3a6668] disabled:opacity-50"
                                                        >
                                                            <LocateFixed className="size-3.5" />
                                                            <span>
                                                                {locatingKey === field.key
                                                                    ? 'Mencari GPS...'
                                                                    : 'Gunakan Lokasi Saya'}
                                                            </span>
                                                        </button>
                                                    </div>

                                                    {geoError && (
                                                        <p className="text-[11px] text-rose-600">
                                                            {geoError}
                                                        </p>
                                                    )}

                                                    {(mapVal.lat || mapVal.lng) && (
                                                        <div className="flex items-center justify-between text-[11px] text-slate-600">
                                                            <span className="inline-flex items-center gap-1">
                                                                <MapPin className="size-3 text-[#46797b]" />
                                                                Koordinat: {mapVal.lat}, {mapVal.lng}
                                                            </span>
                                                            {openHref && (
                                                                <a
                                                                    href={openHref}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="inline-flex items-center gap-1 font-semibold text-[#46797b] hover:underline"
                                                                >
                                                                    <span>Buka Maps</span>
                                                                    <ExternalLink className="size-3" />
                                                                </a>
                                                            )}
                                                        </div>
                                                    )}

                                                    {embedSrc && (
                                                        <iframe
                                                            title="Pratinjau Lokasi"
                                                            src={embedSrc}
                                                            className="h-48 w-full rounded-lg border border-slate-200"
                                                            loading="lazy"
                                                        />
                                                    )}
                                                </div>
                                            );
                                        })()}

                                        {field.type === 'files' && (() => {
                                            const existing = Array.isArray(val)
                                                ? (val as BriefFile[])
                                                : [];
                                            const pending = newFiles[field.key] || [];

                                            return (
                                                <div className="flex flex-col gap-2">
                                                    <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-xs font-medium text-slate-600 hover:bg-slate-100">
                                                        <ImagePlus className="size-4 text-[#46797b]" />
                                                        <span>Pilih Foto / Dokumen PDF (maks. 10 MB per file)</span>
                                                        <input
                                                            type="file"
                                                            multiple
                                                            accept=".jpg,.jpeg,.png,.webp,.heic,.pdf"
                                                            onChange={(e) =>
                                                                handleFileSelect(
                                                                    field.key,
                                                                    e.target.files
                                                                )
                                                            }
                                                            className="hidden"
                                                        />
                                                    </label>

                                                    {existing.length > 0 && (
                                                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                                            {existing.map((f) => (
                                                                <div
                                                                    key={f.url}
                                                                    className="relative flex items-center gap-2 rounded-lg border bg-white p-2 text-[11px]"
                                                                >
                                                                    {isImageUrl(f.url) ? (
                                                                        <img
                                                                            src={f.url}
                                                                            alt={f.name}
                                                                            className="size-10 rounded object-cover shrink-0"
                                                                        />
                                                                    ) : (
                                                                        <FileText className="size-5 text-slate-400 shrink-0" />
                                                                    )}
                                                                    <a
                                                                        href={f.url}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        className="truncate font-medium text-slate-700 hover:underline flex-1"
                                                                    >
                                                                        {f.name}
                                                                    </a>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            removeExistingFile(
                                                                                field.key,
                                                                                f.url
                                                                            )
                                                                        }
                                                                        className="text-rose-500 hover:text-rose-700 p-0.5"
                                                                        title="Hapus file"
                                                                    >
                                                                        <Trash2 className="size-3.5" />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {pending.length > 0 && (
                                                        <div className="flex flex-col gap-1">
                                                            {pending.map((file, idx) => (
                                                                <div
                                                                    key={`${file.name}-${idx}`}
                                                                    className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-1.5 text-[11px] text-amber-900"
                                                                >
                                                                    <span className="truncate">
                                                                        Siap diunggah: {file.name}
                                                                    </span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            removeNewFile(
                                                                                field.key,
                                                                                idx
                                                                            )
                                                                        }
                                                                        className="text-rose-600 hover:underline ml-2 shrink-0"
                                                                    >
                                                                        Batal
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })()}

                                        {errMsg && (
                                            <p className="text-[11px] text-rose-600">{errMsg}</p>
                                        )}
                                    </div>
                                );
                            })}
                        </section>
                    ))}

                    <div className="flex justify-end pb-8">
                        <button
                            type="submit"
                            disabled={submitting}
                            className="inline-flex items-center gap-2 rounded-xl bg-[#46797b] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#3a6668] disabled:opacity-50"
                        >
                            <Send className="size-4" />
                            <span>
                                {submitting
                                    ? 'Mengirim Data...'
                                    : submittedAt
                                    ? 'Perbarui Data Eksisting'
                                    : 'Kirim Data ke Tim Arsitek'}
                            </span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
