import * as React from 'react';
import { useState } from 'react';
import { router } from '@inertiajs/react';
import {
    ArrowDown,
    ArrowUp,
    Check,
    CheckCircle2,
    Compass,
    Copy,
    ExternalLink,
    FileText,
    MapPin,
    MessageCircle,
    Plus,
    RefreshCw,
    Settings2,
    Trash2,
    X,
} from 'lucide-react';
import {
    type BriefField,
    type BriefFieldType,
    type BriefFile,
    type BriefMapsValue,
    type BriefResponses,
    briefFieldTypeLabels,
    groupBriefFields,
    isImageUrl,
    mapsEmbedUrl,
    mapsOpenUrl,
} from '@/Components/client-brief/types';
import { cn } from '@/lib/utils';

export interface ProjectBriefData {
    status: 'draft' | 'sent' | 'submitted' | string;
    public_url: string;
    fields: BriefField[];
    responses: BriefResponses;
    sent_at?: string | null;
    submitted_at?: string | null;
    field_types: BriefFieldType[];
}

interface Props {
    projectId: number;
    projectName: string;
    clientName: string;
    clientPhone?: string | null;
    isOwnerOrLead: boolean;
    brief: ProjectBriefData;
}

function formatWaPhone(raw?: string | null): string {
    if (!raw) return '';
    const digits = raw.replace(/\D/g, '');
    if (digits.startsWith('0')) return '62' + digits.slice(1);
    return digits;
}

function slugifyKey(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 48);
}

export function ProjectBriefTab({
    projectId,
    projectName,
    clientName,
    clientPhone,
    isOwnerOrLead,
    brief,
}: Props) {
    const [copied, setCopied] = useState(false);
    const [isBuilderOpen, setIsBuilderOpen] = useState(false);
    const [draftFields, setDraftFields] = useState<BriefField[]>(brief.fields);
    const [savingFields, setSavingFields] = useState(false);

    const sections = groupBriefFields(brief.fields);

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(brief.public_url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // fallback ignored
        }
    };

    const handleSendWhatsApp = () => {
        router.post(
            route('projects.brief.send', projectId),
            {},
            { preserveScroll: true }
        );

        const waNumber = formatWaPhone(clientPhone);
        const text = encodeURIComponent(
            `Halo Bapak/Ibu ${clientName},\n\nBerikut link Form Data Eksisting & Brief Desain untuk proyek *${projectName}* di RIM Projects:\n${brief.public_url}\n\nMohon dapat dilengkapi (termasuk titik Google Maps, arah hadap, serta referensi desain) agar tim arsitek kami bisa segera melakukan brainstorming. Terima kasih!`
        );
        const url = waNumber
            ? `https://wa.me/${waNumber}?text=${text}`
            : `https://wa.me/?text=${text}`;
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    const handleRegenerateToken = () => {
        if (
            !confirm(
                'Buat link form baru? Link lama tidak akan bisa diakses lagi oleh klien.'
            )
        ) {
            return;
        }
        router.post(
            route('projects.brief.regenerate', projectId),
            {},
            { preserveScroll: true }
        );
    };

    const openBuilder = () => {
        setDraftFields(brief.fields.map((f) => ({ ...f, options: f.options ? [...f.options] : [] })));
        setIsBuilderOpen(true);
    };

    const updateDraftField = (index: number, patch: Partial<BriefField>) => {
        setDraftFields((prev) =>
            prev.map((item, idx) => (idx === index ? { ...item, ...patch } : item))
        );
    };

    const moveDraftField = (index: number, dir: 'up' | 'down') => {
        const target = dir === 'up' ? index - 1 : index + 1;
        if (target < 0 || target >= draftFields.length) return;
        const copy = [...draftFields];
        const [moved] = copy.splice(index, 1);
        copy.splice(target, 0, moved);
        setDraftFields(copy);
    };

    const removeDraftField = (index: number) => {
        setDraftFields((prev) => prev.filter((_, i) => i !== index));
    };

    const addCustomField = () => {
        const uniqueSuffix = Math.floor(100 + Math.random() * 900);
        setDraftFields((prev) => [
            ...prev,
            {
                key: `custom_${uniqueSuffix}`,
                section: 'Pertanyaan Tambahan',
                label: 'Pertanyaan Baru',
                type: 'text',
                required: false,
                options: [],
                help: '',
            },
        ]);
    };

    const handleSaveFields = (e: React.FormEvent) => {
        e.preventDefault();
        setSavingFields(true);

        const usedKeys = new Set<string>();
        const normalized = draftFields.map((f, idx) => {
            let k = slugifyKey(f.key || f.label) || `field_${idx + 1}`;
            while (usedKeys.has(k)) {
                k = `${k}_${idx + 1}`;
            }
            usedKeys.add(k);

            return {
                key: k,
                section: f.section.trim() || 'Umum',
                label: f.label.trim() || 'Pertanyaan',
                type: f.type,
                required: Boolean(f.required),
                options:
                    f.type === 'select' || f.type === 'multiselect'
                        ? (f.options || []).map((o) => o.trim()).filter(Boolean)
                        : [],
                help: f.help?.trim() || '',
            };
        });

        router.put(
            route('projects.brief.update', projectId),
            { fields: normalized },
            {
                preserveScroll: true,
                onSuccess: () => setIsBuilderOpen(false),
                onFinish: () => setSavingFields(false),
            }
        );
    };

    const statusBadge =
        brief.status === 'submitted'
            ? {
                  label: 'Sudah Diisi Klien',
                  classes: 'bg-emerald-100 text-emerald-800 border-emerald-300',
              }
            : brief.status === 'sent'
            ? {
                  label: 'Menunggu Pengisian Klien',
                  classes: 'bg-amber-100 text-amber-800 border-amber-300',
              }
            : {
                  label: 'Draft (Belum Dikirim)',
                  classes: 'bg-slate-100 text-slate-700 border-slate-300',
              };

    return (
        <div className="flex flex-col gap-5">
            {/* Share & Custom Form Header Card */}
            <div className="rounded-2xl border bg-card p-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-bold text-foreground">
                                Data Eksisting &amp; Brief Desain dari Klien
                            </h3>
                            <span
                                className={cn(
                                    'rounded-full border px-2.5 py-0.5 text-[11px] font-semibold',
                                    statusBadge.classes
                                )}
                            >
                                {statusBadge.label}
                            </span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Kirimkan link form custom ini ke klien ({clientName}) agar data lokasi, maps, arah mata angin, kebutuhan ruang, dan referensi desain langsung masuk ke ruang kerja arsitek.
                        </p>
                        {(brief.sent_at || brief.submitted_at) && (
                            <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                                {brief.sent_at && <span>Dikirim: {brief.sent_at}</span>}
                                {brief.submitted_at && (
                                    <span className="font-semibold text-emerald-700">
                                        Diisi klien: {brief.submitted_at}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {isOwnerOrLead && (
                            <button
                                type="button"
                                onClick={openBuilder}
                                className="inline-flex items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
                            >
                                <Settings2 className="size-3.5" />
                                <span>Atur / Custom Form</span>
                            </button>
                        )}
                        <a
                            href={brief.public_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
                        >
                            <ExternalLink className="size-3.5" />
                            <span>Pratinjau Form</span>
                        </a>
                        {isOwnerOrLead && (
                            <button
                                type="button"
                                onClick={handleSendWhatsApp}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-[#46797b] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#3a6668]"
                            >
                                <MessageCircle className="size-3.5" />
                                <span>Kirim via WhatsApp</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Public Link Copy Bar */}
                <div className="mt-4 flex flex-col gap-2 rounded-xl border bg-muted/30 p-3 sm:flex-row sm:items-center">
                    <span className="text-[11px] font-semibold text-muted-foreground shrink-0">
                        Link Form Klien:
                    </span>
                    <input
                        type="text"
                        readOnly
                        value={brief.public_url}
                        onClick={(e) => e.currentTarget.select()}
                        className="h-8 flex-1 rounded-lg border bg-background px-2.5 text-xs text-foreground focus:outline-none"
                    />
                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={handleCopyLink}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg border bg-background px-3 text-xs font-semibold hover:bg-muted"
                        >
                            {copied ? (
                                <>
                                    <Check className="size-3.5 text-emerald-600" />
                                    <span className="text-emerald-700">Tersalin</span>
                                </>
                            ) : (
                                <>
                                    <Copy className="size-3.5" />
                                    <span>Salin Link</span>
                                </>
                            )}
                        </button>
                        {isOwnerOrLead && (
                            <button
                                type="button"
                                onClick={handleRegenerateToken}
                                className="inline-flex h-8 items-center gap-1 rounded-lg border bg-background px-2.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                                title="Buat link token baru"
                            >
                                <RefreshCw className="size-3.5" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Client Responses Grouped by Section */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {sections.map((group) => (
                    <section
                        key={group.section}
                        className="rounded-2xl border bg-card p-5 flex flex-col gap-4"
                    >
                        <div className="flex items-center justify-between border-b pb-2.5">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-[#46797b]">
                                {group.section}
                            </h4>
                            <span className="text-[11px] text-muted-foreground">
                                {group.fields.length} item
                            </span>
                        </div>

                        <div className="flex flex-col gap-3.5">
                            {group.fields.map((field) => {
                                const val = brief.responses?.[field.key];

                                return (
                                    <div key={field.key} className="flex flex-col gap-1">
                                        <span className="text-[11px] font-semibold text-muted-foreground">
                                            {field.label}
                                        </span>

                                        {field.type === 'maps' ? (() => {
                                            const mapVal = val as BriefMapsValue | undefined;
                                            const embed = mapsEmbedUrl(mapVal);
                                            const openHref = mapsOpenUrl(mapVal);

                                            if (!mapVal || (!mapVal.url && !mapVal.lat)) {
                                                return (
                                                    <span className="text-xs italic text-muted-foreground">
                                                        Belum diisi klien
                                                    </span>
                                                );
                                            }

                                            return (
                                                <div className="flex flex-col gap-2 rounded-xl border bg-muted/20 p-2.5">
                                                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                                                        <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                                                            <MapPin className="size-3.5 text-[#46797b]" />
                                                            {mapVal.lat && mapVal.lng
                                                                ? `${mapVal.lat}, ${mapVal.lng}`
                                                                : 'Link Google Maps tersedia'}
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
                                                    {embed && (
                                                        <iframe
                                                            title={`Peta ${field.label}`}
                                                            src={embed}
                                                            className="h-44 w-full rounded-lg border"
                                                            loading="lazy"
                                                        />
                                                    )}
                                                </div>
                                            );
                                        })() : field.type === 'compass' ? (
                                            val ? (
                                                <span className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-[#46797b]/30 bg-[#46797b]/10 px-2.5 py-1 text-xs font-bold text-[#46797b]">
                                                    <Compass className="size-3.5" />
                                                    <span>Menghadap {String(val)}</span>
                                                </span>
                                            ) : (
                                                <span className="text-xs italic text-muted-foreground">
                                                    Belum diisi klien
                                                </span>
                                            )
                                        ) : field.type === 'multiselect' ? (
                                            Array.isArray(val) && val.length > 0 ? (
                                                <div className="flex flex-wrap gap-1.5">
                                                    {(val as string[]).map((item) => (
                                                        <span
                                                            key={item}
                                                            className="rounded-full border bg-muted/50 px-2.5 py-0.5 text-[11px] font-medium text-foreground"
                                                        >
                                                            {item}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-xs italic text-muted-foreground">
                                                    Belum diisi klien
                                                </span>
                                            )
                                        ) : field.type === 'files' ? (
                                            Array.isArray(val) && val.length > 0 ? (
                                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                                    {(val as BriefFile[]).map((f) => (
                                                        <a
                                                            key={f.url}
                                                            href={f.url}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="group flex items-center gap-2 rounded-lg border bg-background p-2 text-[11px] hover:border-[#46797b]"
                                                        >
                                                            {isImageUrl(f.url) ? (
                                                                <img
                                                                    src={f.url}
                                                                    alt={f.name}
                                                                    className="size-10 rounded object-cover shrink-0"
                                                                />
                                                            ) : (
                                                                <FileText className="size-5 text-muted-foreground shrink-0" />
                                                            )}
                                                            <span className="truncate font-medium text-foreground group-hover:underline">
                                                                {f.name}
                                                            </span>
                                                        </a>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-xs italic text-muted-foreground">
                                                    Belum ada lampiran
                                                </span>
                                            )
                                        ) : val !== undefined && val !== null && String(val).trim() !== '' ? (
                                            <p className="text-xs font-medium text-foreground whitespace-pre-line">
                                                {String(val)}
                                            </p>
                                        ) : (
                                            <span className="text-xs italic text-muted-foreground">
                                                Belum diisi klien
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                ))}
            </div>

            {/* MODAL CUSTOM FORM BUILDER */}
            {isBuilderOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
                    <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl border bg-card shadow-2xl">
                        <div className="flex items-start justify-between border-b p-5">
                            <div>
                                <h3 className="text-base font-bold text-foreground">
                                    Atur Pertanyaan Form Data Eksisting Klien
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                    Tambahkan, ubah, atau susun pertanyaan sesuai kebutuhan proyek ini sebelum dikirim ke klien.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsBuilderOpen(false)}
                                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
                            >
                                <X className="size-4" />
                            </button>
                        </div>

                        <form
                            onSubmit={handleSaveFields}
                            className="flex flex-1 flex-col overflow-hidden"
                        >
                            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-3">
                                {draftFields.map((field, idx) => (
                                    <div
                                        key={`${field.key}-${idx}`}
                                        className="rounded-xl border bg-background p-3.5 flex flex-col gap-2.5"
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-[11px] font-bold text-muted-foreground">
                                                Pertanyaan #{idx + 1}
                                            </span>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    type="button"
                                                    disabled={idx === 0}
                                                    onClick={() => moveDraftField(idx, 'up')}
                                                    className="rounded p-1 text-muted-foreground hover:bg-muted disabled:opacity-30"
                                                    title="Naik"
                                                >
                                                    <ArrowUp className="size-3.5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={idx === draftFields.length - 1}
                                                    onClick={() => moveDraftField(idx, 'down')}
                                                    className="rounded p-1 text-muted-foreground hover:bg-muted disabled:opacity-30"
                                                    title="Turun"
                                                >
                                                    <ArrowDown className="size-3.5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => removeDraftField(idx)}
                                                    className="rounded p-1 text-muted-foreground hover:bg-rose-50 hover:text-rose-600"
                                                    title="Hapus pertanyaan"
                                                >
                                                    <Trash2 className="size-3.5" />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                                            <div className="sm:col-span-2">
                                                <label className="text-[11px] font-semibold text-foreground">
                                                    Label Pertanyaan
                                                </label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={field.label}
                                                    onChange={(e) =>
                                                        updateDraftField(idx, { label: e.target.value })
                                                    }
                                                    className="mt-1 h-8 w-full rounded-lg border bg-background px-2.5 text-xs focus:border-foreground focus:outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[11px] font-semibold text-foreground">
                                                    Bagian / Section
                                                </label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={field.section}
                                                    onChange={(e) =>
                                                        updateDraftField(idx, { section: e.target.value })
                                                    }
                                                    className="mt-1 h-8 w-full rounded-lg border bg-background px-2.5 text-xs focus:border-foreground focus:outline-none"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 items-end">
                                            <div>
                                                <label className="text-[11px] font-semibold text-foreground">
                                                    Tipe Input
                                                </label>
                                                <select
                                                    value={field.type}
                                                    onChange={(e) =>
                                                        updateDraftField(idx, {
                                                            type: e.target.value as BriefFieldType,
                                                        })
                                                    }
                                                    className="mt-1 h-8 w-full rounded-lg border bg-background px-2 text-xs focus:border-foreground focus:outline-none"
                                                >
                                                    {brief.field_types.map((t) => (
                                                        <option key={t} value={t}>
                                                            {briefFieldTypeLabels[t] || t}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="text-[11px] font-semibold text-foreground">
                                                    Catatan Bantuan (Opsional)
                                                </label>
                                                <input
                                                    type="text"
                                                    value={field.help || ''}
                                                    onChange={(e) =>
                                                        updateDraftField(idx, { help: e.target.value })
                                                    }
                                                    placeholder="Contoh: Isi dalam m²"
                                                    className="mt-1 h-8 w-full rounded-lg border bg-background px-2.5 text-xs focus:border-foreground focus:outline-none"
                                                />
                                            </div>

                                            <label className="flex h-8 cursor-pointer items-center gap-2 rounded-lg border bg-muted/20 px-3 text-xs font-medium">
                                                <input
                                                    type="checkbox"
                                                    checked={field.required}
                                                    onChange={(e) =>
                                                        updateDraftField(idx, {
                                                            required: e.target.checked,
                                                        })
                                                    }
                                                    className="rounded border-gray-300 text-[#46797b] focus:ring-[#46797b]"
                                                />
                                                <span>Wajib diisi klien</span>
                                            </label>
                                        </div>

                                        {(field.type === 'select' || field.type === 'multiselect') && (
                                            <div>
                                                <label className="text-[11px] font-semibold text-foreground">
                                                    Pilihan Jawaban (pisahkan dengan koma)
                                                </label>
                                                <input
                                                    type="text"
                                                    value={(field.options || []).join(', ')}
                                                    onChange={(e) =>
                                                        updateDraftField(idx, {
                                                            options: e.target.value
                                                                .split(',')
                                                                .map((s) => s.trim()),
                                                        })
                                                    }
                                                    placeholder="Pilihan 1, Pilihan 2, Pilihan 3"
                                                    className="mt-1 h-8 w-full rounded-lg border bg-background px-2.5 text-xs focus:border-foreground focus:outline-none"
                                                />
                                            </div>
                                        )}
                                    </div>
                                ))}

                                <button
                                    type="button"
                                    onClick={addCustomField}
                                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-dashed py-2.5 text-xs font-semibold text-foreground hover:bg-muted"
                                >
                                    <Plus className="size-4" />
                                    <span>Tambah Pertanyaan Custom</span>
                                </button>
                            </div>

                            <div className="flex items-center justify-end gap-2 border-t p-4">
                                <button
                                    type="button"
                                    onClick={() => setIsBuilderOpen(false)}
                                    className="rounded-lg border px-4 py-1.5 text-xs font-semibold hover:bg-muted"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingFields}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#46797b] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#3a6668] disabled:opacity-50"
                                >
                                    <CheckCircle2 className="size-3.5" />
                                    <span>{savingFields ? 'Menyimpan...' : 'Simpan Form'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
