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
    Edit3,
    ExternalLink,
    FileText,
    ImagePlus,
    MapPin,
    MessageCircle,
    Plus,
    Printer,
    RefreshCw,
    Save,
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
    getDesignStylePreview,
    groupBriefFields,
    isDesignStyleField,
    isImageUrl,
    mapsEmbedUrl,
    mapsOpenUrl,
} from '@/Components/client-brief/types';
import { cn } from '@/lib/utils';

export interface ProjectBriefData {
    status: 'draft' | 'sent' | 'submitted' | string;
    building_type?: 'rumah_hunian' | 'komersial' | 'interior';
    template_title?: string;
    public_url: string;
    print_url?: string;
    compass_options?: string[];
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

    // Manual response editor state (for Admin / Survey team interview entry)
    const [isEditingResponses, setIsEditingResponses] = useState(false);
    const [manualAnswers, setManualAnswers] = useState<BriefResponses>(() => ({
        ...(brief.responses || {}),
    }));
    const [manualNewFiles, setManualNewFiles] = useState<Record<string, File[]>>({});
    const [savingResponses, setSavingResponses] = useState(false);

    const compassOptions = brief.compass_options || [
        'Utara',
        'Timur Laut',
        'Timur',
        'Tenggara',
        'Selatan',
        'Barat Daya',
        'Barat',
        'Barat Laut',
    ];

    const openManualEditor = () => {
        setManualAnswers({ ...(brief.responses || {}) });
        setManualNewFiles({});
        setIsEditingResponses(true);
    };

    const setManualAnswer = (key: string, value: unknown) => {
        setManualAnswers((prev) => ({ ...prev, [key]: value }));
    };

    const toggleManualMultiOption = (key: string, option: string) => {
        const current = Array.isArray(manualAnswers[key]) ? (manualAnswers[key] as string[]) : [];
        const next = current.includes(option)
            ? current.filter((o) => o !== option)
            : [...current, option];
        setManualAnswer(key, next);
    };

    const handleManualFileSelect = (key: string, fileList: FileList | null) => {
        if (!fileList) return;
        const added = Array.from(fileList);
        setManualNewFiles((prev) => ({
            ...prev,
            [key]: [...(prev[key] || []), ...added],
        }));
    };

    const handleSaveManualResponses = (e: React.FormEvent) => {
        e.preventDefault();
        setSavingResponses(true);

        const formData = new FormData();
        brief.fields.forEach((field) => {
            const val = manualAnswers[field.key];

            if (field.type === 'files') {
                const existing = Array.isArray(val) ? (val as BriefFile[]) : [];
                existing.forEach((file) => {
                    formData.append(`existing[${field.key}][]`, file.url);
                });
                const added = manualNewFiles[field.key] || [];
                added.forEach((file) => {
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

        router.post(route('projects.brief.responses', projectId), formData, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                setIsEditingResponses(false);
                setManualNewFiles({});
            },
            onFinish: () => setSavingResponses(false),
        });
    };

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

    const handleApplyTemplate = (templateType: 'rumah_hunian' | 'komersial' | 'interior') => {
        const labels = {
            rumah_hunian: 'Rumah Hunian',
            komersial: 'Komersial',
            interior: 'Interior',
        };
        if (
            !confirm(
                `Ganti seluruh daftar pertanyaan form ini ke template resmi "${labels[templateType]}"?`
            )
        ) {
            return;
        }
        router.post(
            route('projects.brief.apply-template', projectId),
            { building_type: templateType },
            { preserveScroll: true }
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
            {/* Share & Custom Form Header Card — Clean 2-Row Layout */}
            <div className="rounded-2xl border bg-card p-5 shadow-2xs">
                {/* Row 1: Title, Status Badges, and Primary Actions */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-bold text-foreground">
                                Data Eksisting &amp; Brief Desain
                            </h3>
                            <span
                                className={cn(
                                    'rounded-full border px-2.5 py-0.5 text-[11px] font-semibold',
                                    statusBadge.classes
                                )}
                            >
                                {statusBadge.label}
                            </span>
                            {brief.template_title && (
                                <span className="rounded-full border border-[#46797b]/30 bg-[#46797b]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#46797b]">
                                    {brief.template_title.replace('Formulir Informasi Klien — ', '')}
                                </span>
                            )}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Kirim link form ke <strong>{clientName}</strong>, cetak blanko untuk survey lapangan, atau input hasil wawancara langsung di sini.
                        </p>
                        {(brief.sent_at || brief.submitted_at) && (
                            <div className="mt-1.5 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                                {brief.sent_at && <span>Dikirim: {brief.sent_at}</span>}
                                {brief.submitted_at && (
                                    <span className="font-semibold text-emerald-700">
                                        Terakhir diperbarui: {brief.submitted_at}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    {isOwnerOrLead && (
                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                            <button
                                type="button"
                                onClick={() =>
                                    isEditingResponses
                                        ? setIsEditingResponses(false)
                                        : openManualEditor()
                                }
                                className={cn(
                                    'inline-flex h-9 items-center gap-1.5 rounded-lg border px-3.5 text-xs font-semibold transition-colors',
                                    isEditingResponses
                                        ? 'border-foreground bg-foreground text-background'
                                        : 'border-[#46797b]/40 bg-[#46797b]/10 text-[#46797b] hover:bg-[#46797b]/15'
                                )}
                            >
                                <Edit3 className="size-3.5" />
                                <span>
                                    {isEditingResponses ? 'Tutup Input Manual' : 'Isi / Edit Manual'}
                                </span>
                            </button>
                            <button
                                type="button"
                                onClick={handleSendWhatsApp}
                                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#46797b] px-3.5 text-xs font-semibold text-white hover:bg-[#3a6668]"
                            >
                                <MessageCircle className="size-3.5" />
                                <span>Kirim WhatsApp</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* Row 2: Organized 3-Column Utility Bar */}
                <div className="mt-4 grid grid-cols-1 gap-3 border-t pt-4 lg:grid-cols-12">
                    {/* Col 1: Template Switcher & Customizer */}
                    {isOwnerOrLead && (
                        <div className="flex flex-col gap-1.5 rounded-xl border bg-muted/20 p-3 lg:col-span-5">
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                    Template Formulir Resmi
                                </span>
                                <button
                                    type="button"
                                    onClick={openBuilder}
                                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#46797b] hover:underline"
                                >
                                    <Settings2 className="size-3" />
                                    <span>Custom Pertanyaan</span>
                                </button>
                            </div>
                            <div className="grid grid-cols-3 gap-1 rounded-lg bg-background p-1 border">
                                {(
                                    [
                                        { key: 'rumah_hunian', label: 'Rumah Hunian' },
                                        { key: 'komersial', label: 'Komersial' },
                                        { key: 'interior', label: 'Interior' },
                                    ] as const
                                ).map((tpl) => {
                                    const active = (brief.building_type || 'rumah_hunian') === tpl.key;
                                    return (
                                        <button
                                            key={tpl.key}
                                            type="button"
                                            onClick={() => handleApplyTemplate(tpl.key)}
                                            className={cn(
                                                'rounded-md px-2 py-1 text-[11px] font-semibold transition-colors text-center truncate',
                                                active
                                                    ? 'bg-[#46797b] text-white shadow-2xs'
                                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                                            )}
                                        >
                                            {tpl.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Col 2: PDF Survey Export */}
                    {brief.print_url && (
                        <div
                            className={cn(
                                'flex flex-col gap-1.5 rounded-xl border bg-muted/20 p-3',
                                isOwnerOrLead ? 'lg:col-span-3' : 'lg:col-span-5'
                            )}
                        >
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                Cetak / Download PDF
                            </span>
                            <div className="grid grid-cols-2 gap-1.5">
                                <a
                                    href={`${brief.print_url}?mode=blank`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex h-8 items-center justify-center gap-1 rounded-lg border bg-background px-2 text-[11px] font-semibold text-foreground hover:bg-muted"
                                    title="Blanko kosong untuk wawancara survey lapangan"
                                >
                                    <Printer className="size-3.5 text-[#46797b] shrink-0" />
                                    <span className="truncate">Blanko</span>
                                </a>
                                <a
                                    href={`${brief.print_url}?mode=filled`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex h-8 items-center justify-center gap-1 rounded-lg border bg-background px-2 text-[11px] font-semibold text-foreground hover:bg-muted"
                                    title="PDF berisi jawaban klien / hasil survey"
                                >
                                    <FileText className="size-3.5 text-[#46797b] shrink-0" />
                                    <span className="truncate">Terisi</span>
                                </a>
                            </div>
                        </div>
                    )}

                    {/* Col 3: Public Client Form Link */}
                    <div
                        className={cn(
                            'flex flex-col gap-1.5 rounded-xl border bg-muted/20 p-3',
                            isOwnerOrLead ? 'lg:col-span-4' : 'lg:col-span-7'
                        )}
                    >
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            Link Form Online Klien
                        </span>
                        <div className="flex items-center gap-1.5">
                            <input
                                type="text"
                                readOnly
                                value={brief.public_url}
                                onClick={(e) => e.currentTarget.select()}
                                className="h-8 min-w-0 flex-1 rounded-lg border bg-background px-2.5 text-[11px] text-foreground focus:outline-none"
                            />
                            <button
                                type="button"
                                onClick={handleCopyLink}
                                className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border bg-background px-2.5 text-[11px] font-semibold hover:bg-muted"
                                title="Salin link form"
                            >
                                {copied ? (
                                    <Check className="size-3.5 text-emerald-600" />
                                ) : (
                                    <Copy className="size-3.5" />
                                )}
                                <span className="hidden sm:inline">{copied ? 'Tersalin' : 'Salin'}</span>
                            </button>
                            <a
                                href={brief.public_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                                title="Buka pratinjau form klien"
                            >
                                <ExternalLink className="size-3.5" />
                            </a>
                            {isOwnerOrLead && (
                                <button
                                    type="button"
                                    onClick={handleRegenerateToken}
                                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                                    title="Buat ulang link token baru"
                                >
                                    <RefreshCw className="size-3.5" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Manual Admin / Survey Interview Entry Form */}
            {isEditingResponses ? (
                <form onSubmit={handleSaveManualResponses} className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#46797b]/30 bg-[#46797b]/5 px-4 py-3">
                        <p className="text-xs text-foreground">
                            <strong>Mode Input Manual Admin / Tim Survey:</strong> Isi atau lengkapi hasil wawancara survey lapangan, lalu simpan ke data proyek.
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setIsEditingResponses(false)}
                                className="rounded-lg border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-muted"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                disabled={savingResponses}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-[#46797b] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#3a6668] disabled:opacity-50"
                            >
                                <Save className="size-3.5" />
                                <span>{savingResponses ? 'Menyimpan...' : 'Simpan Jawaban'}</span>
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        {sections.map((group) => (
                            <section
                                key={group.section}
                                className="rounded-2xl border bg-card p-5 flex flex-col gap-3.5"
                            >
                                <div className="flex items-center justify-between border-b pb-2.5">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#46797b]">
                                        {group.section}
                                    </h4>
                                    <span className="text-[11px] text-muted-foreground">
                                        {group.fields.length} item
                                    </span>
                                </div>

                                {group.fields.map((field) => {
                                    const val = manualAnswers[field.key];
                                    return (
                                        <div key={field.key} className="flex flex-col gap-1">
                                            <label className="text-xs font-semibold text-foreground">
                                                {field.label}
                                            </label>
                                            {field.help && (
                                                <p className="text-[11px] text-muted-foreground">
                                                    {field.help}
                                                </p>
                                            )}

                                            {field.type === 'textarea' && (
                                                <textarea
                                                    rows={3}
                                                    value={typeof val === 'string' ? val : ''}
                                                    onChange={(e) =>
                                                        setManualAnswer(field.key, e.target.value)
                                                    }
                                                    className="w-full rounded-lg border bg-background p-2.5 text-xs focus:border-[#46797b] focus:outline-none"
                                                />
                                            )}

                                            {(field.type === 'text' ||
                                                field.type === 'url' ||
                                                field.type === 'number') && (
                                                <input
                                                    type={field.type === 'number' ? 'number' : 'text'}
                                                    value={
                                                        val !== undefined && val !== null
                                                            ? String(val)
                                                            : ''
                                                    }
                                                    onChange={(e) =>
                                                        setManualAnswer(field.key, e.target.value)
                                                    }
                                                    className="h-9 w-full rounded-lg border bg-background px-3 text-xs focus:border-[#46797b] focus:outline-none"
                                                />
                                            )}

                                            {field.type === 'select' && (
                                                <select
                                                    value={typeof val === 'string' ? val : ''}
                                                    onChange={(e) =>
                                                        setManualAnswer(field.key, e.target.value)
                                                    }
                                                    className="h-9 w-full rounded-lg border bg-background px-3 text-xs focus:border-[#46797b] focus:outline-none"
                                                >
                                                    <option value="">-- Pilih --</option>
                                                    {(field.options || []).map((opt) => (
                                                        <option key={opt} value={opt}>
                                                            {opt}
                                                        </option>
                                                    ))}
                                                </select>
                                            )}

                                            {field.type === 'compass' && (
                                                <select
                                                    value={typeof val === 'string' ? val : ''}
                                                    onChange={(e) =>
                                                        setManualAnswer(field.key, e.target.value)
                                                    }
                                                    className="h-9 w-full rounded-lg border bg-background px-3 text-xs focus:border-[#46797b] focus:outline-none"
                                                >
                                                    <option value="">-- Pilih Arah Mata Angin --</option>
                                                    {compassOptions.map((dir) => (
                                                        <option key={dir} value={dir}>
                                                            {dir}
                                                        </option>
                                                    ))}
                                                </select>
                                            )}

                                            {field.type === 'multiselect' &&
                                                (isDesignStyleField(field) ? (
                                                    <div className="grid grid-cols-2 gap-2 pt-1 sm:grid-cols-3">
                                                        {(field.options || []).map((opt) => {
                                                            const checked =
                                                                Array.isArray(val) &&
                                                                (val as string[]).includes(opt);
                                                            const preview = getDesignStylePreview(
                                                                opt,
                                                                brief.building_type
                                                            );
                                                            return (
                                                                <button
                                                                    key={opt}
                                                                    type="button"
                                                                    onClick={() =>
                                                                        toggleManualMultiOption(
                                                                            field.key,
                                                                            opt
                                                                        )
                                                                    }
                                                                    className={cn(
                                                                        'group relative flex flex-col overflow-hidden rounded-lg border text-left transition-all',
                                                                        checked
                                                                            ? 'border-[#46797b] bg-[#46797b]/5 ring-1 ring-[#46797b]'
                                                                            : 'bg-background hover:border-[#46797b]/50'
                                                                    )}
                                                                >
                                                                    {preview ? (
                                                                        <div className="relative h-20 w-full overflow-hidden bg-muted">
                                                                            <img
                                                                                src={preview.image}
                                                                                alt={opt}
                                                                                loading="lazy"
                                                                                className="h-full w-full object-cover"
                                                                            />
                                                                            {checked && (
                                                                                <span className="absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full bg-[#46797b] text-white">
                                                                                    <Check className="size-3" />
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    ) : (
                                                                        <div className="flex h-20 w-full items-center justify-center bg-muted/40 text-[10px] font-medium text-muted-foreground">
                                                                            Lainnya
                                                                        </div>
                                                                    )}
                                                                    <div className="p-2">
                                                                        <p className="text-[11px] font-bold text-foreground truncate">
                                                                            {opt}
                                                                        </p>
                                                                    </div>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                                                        {(field.options || []).map((opt) => {
                                                            const checked =
                                                                Array.isArray(val) &&
                                                                (val as string[]).includes(opt);
                                                            return (
                                                                <button
                                                                    key={opt}
                                                                    type="button"
                                                                    onClick={() =>
                                                                        toggleManualMultiOption(
                                                                            field.key,
                                                                            opt
                                                                        )
                                                                    }
                                                                    className={cn(
                                                                        'rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors',
                                                                        checked
                                                                            ? 'border-[#46797b] bg-[#46797b] text-white'
                                                                            : 'bg-background text-muted-foreground hover:bg-muted'
                                                                    )}
                                                                >
                                                                    {opt}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                ))}

                                            {field.type === 'maps' && (() => {
                                                const mapVal = (val as BriefMapsValue) || {};
                                                return (
                                                    <input
                                                        type="text"
                                                        placeholder="Tempel link Google Maps atau koordinat (lat, lng)"
                                                        value={mapVal.url || ''}
                                                        onChange={(e) =>
                                                            setManualAnswer(field.key, {
                                                                ...mapVal,
                                                                url: e.target.value,
                                                            })
                                                        }
                                                        className="h-9 w-full rounded-lg border bg-background px-3 text-xs focus:border-[#46797b] focus:outline-none"
                                                    />
                                                );
                                            })()}

                                            {field.type === 'files' && (() => {
                                                const existingFiles = Array.isArray(val)
                                                    ? (val as BriefFile[])
                                                    : [];
                                                const addedFiles = manualNewFiles[field.key] || [];
                                                return (
                                                    <div className="flex flex-col gap-2">
                                                        <label className="inline-flex w-fit cursor-pointer items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-muted">
                                                            <ImagePlus className="size-3.5 text-[#46797b]" />
                                                            <span>Unggah Foto / Dokumen</span>
                                                            <input
                                                                type="file"
                                                                multiple
                                                                accept="image/*,.pdf"
                                                                onChange={(e) =>
                                                                    handleManualFileSelect(
                                                                        field.key,
                                                                        e.target.files
                                                                    )
                                                                }
                                                                className="hidden"
                                                            />
                                                        </label>
                                                        {(existingFiles.length > 0 ||
                                                            addedFiles.length > 0) && (
                                                            <div className="flex flex-wrap gap-1.5 text-[11px]">
                                                                {existingFiles.map((f, idx) => (
                                                                    <span
                                                                        key={idx}
                                                                        className="inline-flex items-center gap-1 rounded-md border bg-muted/40 px-2 py-0.5"
                                                                    >
                                                                        <span className="max-w-[140px] truncate">
                                                                            {f.name}
                                                                        </span>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() =>
                                                                                setManualAnswer(
                                                                                    field.key,
                                                                                    existingFiles.filter(
                                                                                        (ef) =>
                                                                                            ef.url !==
                                                                                            f.url
                                                                                    )
                                                                                )
                                                                            }
                                                                            className="text-rose-600 hover:text-rose-800"
                                                                        >
                                                                            <X className="size-3" />
                                                                        </button>
                                                                    </span>
                                                                ))}
                                                                {addedFiles.map((f, idx) => (
                                                                    <span
                                                                        key={`new-${idx}`}
                                                                        className="inline-flex items-center gap-1 rounded-md border border-[#46797b]/40 bg-[#46797b]/10 px-2 py-0.5 text-[#46797b]"
                                                                    >
                                                                        <span className="max-w-[140px] truncate">
                                                                            {f.name}
                                                                        </span>
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    );
                                })}
                            </section>
                        ))}
                    </div>

                    <div className="flex items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setIsEditingResponses(false)}
                            className="rounded-lg border bg-background px-4 py-2 text-xs font-semibold hover:bg-muted"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={savingResponses}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#46797b] px-5 py-2 text-xs font-semibold text-white hover:bg-[#3a6668] disabled:opacity-50"
                        >
                            <Save className="size-3.5" />
                            <span>{savingResponses ? 'Menyimpan...' : 'Simpan Semua Jawaban'}</span>
                        </button>
                    </div>
                </form>
            ) : (
            /* Client Responses Grouped by Section */
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
                                                isDesignStyleField(field) ? (
                                                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                                        {(val as string[]).map((item) => {
                                                            const preview = getDesignStylePreview(item);
                                                            return (
                                                                <div
                                                                    key={item}
                                                                    className="flex items-center gap-2 overflow-hidden rounded-lg border bg-muted/30 pr-2.5"
                                                                >
                                                                    {preview && (
                                                                        <img
                                                                            src={preview.image}
                                                                            alt={item}
                                                                            className="h-10 w-12 shrink-0 object-cover"
                                                                        />
                                                                    )}
                                                                    <span className="truncate py-1.5 pl-1 text-[11px] font-semibold text-foreground">
                                                                        {item}
                                                                    </span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                ) : (
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
                                                )
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
            )}

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
