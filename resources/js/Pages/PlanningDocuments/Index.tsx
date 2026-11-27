import * as React from 'react';
import { useMemo, useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    ArrowUpRight,
    CheckCircle2,
    Download,
    Edit3,
    FilePlus2,
    FileSpreadsheet,
    FileText,
    FolderPlus,
    Plus,
    Receipt,
    Search,
    Trash2,
    Wallet,
    X,
} from 'lucide-react';
import { AppShell } from '@/Components/dashboard/app-shell';
import { cn } from '@/lib/utils';
import { PageProps } from '@/types';

interface PricelistItem {
    code: string;
    project_package_id: string;
    name: string;
    default_description: string;
    unit_type: 'm2' | 'ls';
    price_per_m2: number;
    min_area: number;
}

interface ProjectOption {
    id: number;
    name: string;
    client_name: string;
    client_phone?: string | null;
    location?: string | null;
    package_name?: string | null;
    building_area?: number | null;
    estimated_budget?: number | null;
    status: string;
}

interface FloorRow {
    label: string;
    area: number;
}

interface QuoteLineItem {
    id?: number;
    package_code: string;
    description: string;
    unit_type: 'm2' | 'ls';
    quantity: number;
    unit_price: number;
    total_price?: number;
    notes?: string | null;
}

interface PaymentStageItem {
    key: 'survey' | 'dp' | 't1' | 't2' | 't3' | 't4' | string;
    suffix: string;
    label: string;
    percent: number;
    amount: number;
    paid_at: string | null;
    paid_at_formatted: string | null;
    is_paid: boolean;
}

interface QuoteRecord {
    id: number;
    client_number: number;
    client_number_formatted: string;
    quote_ref_no: string;
    project_id: number | null;
    project_name: string | null;
    parent_quote_id: number | null;
    parent_quote_label: string | null;
    addendums_count: number;
    document_kind: 'main' | 'addendum' | 'survey_only';
    client_name: string;
    client_phone?: string | null;
    project_title: string;
    quote_date: string;
    quote_date_formatted: string;
    actual_area?: number | null;
    floor_breakdown?: FloorRow[];
    agreed_contract_value?: number | null;
    effective_design_value?: number;
    discount_type: 'none' | 'percent' | 'fixed';
    discount_value: number;
    discount_amount: number;
    survey_fee: number;
    survey_mode: 'excluded' | 'separate_invoice' | 'included';
    survey_paid_at?: string | null;
    dp_percent: number;
    t1_percent: number;
    t2_percent: number;
    t3_percent: number;
    t4_percent: number;
    dp_paid_at?: string | null;
    t1_paid_at?: string | null;
    t2_paid_at?: string | null;
    t3_paid_at?: string | null;
    t4_paid_at?: string | null;
    subtotal_amount: number;
    contract_value: number;
    total_billable: number;
    paid_total: number;
    remaining_amount: number;
    status: 'follow_up' | 'progress' | 'done' | 'cancelled';
    stage_label: string;
    intro_notes?: string | null;
    notes?: string | null;
    payment_stages: PaymentStageItem[];
    items: QuoteLineItem[];
}

interface Props extends PageProps {
    quotes: QuoteRecord[];
    metrics: {
        total_contract: number;
        total_paid: number;
        total_remaining: number;
        deal_count: number;
        follow_up_count: number;
        follow_up_potential: number;
        total_documents: number;
    };
    pricelist: PricelistItem[];
    projects: ProjectOption[];
    filters: {
        search: string;
        status: string;
        kind: string;
    };
}

function formatRp(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(amount || 0);
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
    follow_up: { label: 'Penawaran (Belum Deal)', cls: 'bg-amber-50 text-amber-800 ring-amber-200' },
    progress: { label: 'Deal · Progress', cls: 'bg-sky-50 text-sky-800 ring-sky-200' },
    done: { label: 'Lunas / Selesai', cls: 'bg-emerald-50 text-emerald-800 ring-emerald-200' },
    cancelled: { label: 'Tidak Deal / Batal', cls: 'bg-rose-50 text-rose-700 ring-rose-200' },
};

const KIND_BADGE: Record<string, { label: string; cls: string }> = {
    main: { label: 'Utama', cls: 'bg-slate-100 text-slate-700' },
    addendum: { label: 'Adendum', cls: 'bg-purple-100 text-purple-800' },
    survey_only: { label: 'Survey', cls: 'bg-teal-100 text-teal-800' },
};

export default function PlanningDocumentsIndex({
    quotes,
    metrics,
    pricelist,
    projects,
    filters,
}: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || 'all');
    const [kindFilter, setKindFilter] = useState(filters.kind || 'all');

    const [formModalOpen, setFormModalOpen] = useState(false);
    const [editingQuote, setEditingQuote] = useState<QuoteRecord | null>(null);
    const [paymentModalQuoteId, setPaymentModalQuoteId] = useState<number | null>(null);

    const paymentModalQuote = useMemo(
        () => quotes.find((q) => q.id === paymentModalQuoteId) ?? null,
        [quotes, paymentModalQuoteId],
    );

    const todayStr = new Date().toISOString().slice(0, 10);

    const defaultItem = (): QuoteLineItem => {
        const first = pricelist[0];
        return {
            package_code: first?.code ?? 'PKG-2',
            description: first?.default_description ?? 'Paket 2',
            unit_type: first?.unit_type ?? 'm2',
            quantity: first?.min_area || 80,
            unit_price: first?.price_per_m2 || 110000,
            notes: 'Paket Utama',
        };
    };

    const form = useForm({
        project_id: '' as string | number,
        parent_quote_id: '' as string | number,
        document_kind: 'main' as 'main' | 'addendum' | 'survey_only',
        client_name: '',
        client_phone: '',
        project_title: '',
        quote_date: todayStr,
        actual_area: '' as string | number,
        floor_breakdown: [] as FloorRow[],
        agreed_contract_value: '' as string | number,
        discount_type: 'none' as 'none' | 'percent' | 'fixed',
        discount_value: 0,
        survey_fee: 0,
        survey_mode: 'excluded' as 'excluded' | 'separate_invoice' | 'included',
        dp_percent: 35,
        t1_percent: 35,
        t2_percent: 30,
        t3_percent: 0,
        t4_percent: 0,
        status: 'follow_up' as 'follow_up' | 'progress' | 'done' | 'cancelled',
        intro_notes: '',
        notes: '',
        items: [defaultItem()] as QuoteLineItem[],
    });

    const paymentForm = useForm({
        survey_paid_at: '',
        dp_paid_at: '',
        t1_paid_at: '',
        t2_paid_at: '',
        t3_paid_at: '',
        t4_paid_at: '',
    });

    const applyFilters = (next: { search?: string; status?: string; kind?: string }) => {
        router.get(
            route('planning-documents.index'),
            {
                search: next.search !== undefined ? next.search : search,
                status: next.status !== undefined ? next.status : statusFilter,
                kind: next.kind !== undefined ? next.kind : kindFilter,
            },
            { preserveState: true, preserveScroll: true },
        );
    };

    const openCreateModal = (kind: 'main' | 'survey_only' = 'main') => {
        setEditingQuote(null);
        form.clearErrors();
        form.setData({
            project_id: '',
            parent_quote_id: '',
            document_kind: kind,
            client_name: '',
            client_phone: '',
            project_title: '',
            quote_date: todayStr,
            actual_area: '',
            floor_breakdown: [],
            agreed_contract_value: '',
            discount_type: 'none',
            discount_value: 0,
            survey_fee: kind === 'survey_only' ? 500000 : 0,
            survey_mode: kind === 'survey_only' ? 'separate_invoice' : 'excluded',
            dp_percent: kind === 'survey_only' ? 0 : 35,
            t1_percent: kind === 'survey_only' ? 0 : 35,
            t2_percent: kind === 'survey_only' ? 0 : 30,
            t3_percent: 0,
            t4_percent: 0,
            status: 'follow_up',
            intro_notes: '',
            notes: '',
            items: kind === 'survey_only' ? [] : [defaultItem()],
        });
        setFormModalOpen(true);
    };

    const openAddendumModal = (parent: QuoteRecord) => {
        setEditingQuote(null);
        form.clearErrors();
        const adnPkg = pricelist.find((p) => p.code === 'ADN-01');
        form.setData({
            project_id: parent.project_id ?? '',
            parent_quote_id: parent.id,
            document_kind: 'addendum',
            client_name: parent.client_name,
            client_phone: parent.client_phone ?? '',
            project_title: `${parent.project_title} (Adendum)`,
            quote_date: todayStr,
            actual_area: '',
            floor_breakdown: [],
            agreed_contract_value: '',
            discount_type: 'none',
            discount_value: 0,
            survey_fee: 0,
            survey_mode: 'excluded',
            dp_percent: 100,
            t1_percent: 0,
            t2_percent: 0,
            t3_percent: 0,
            t4_percent: 0,
            status: 'follow_up',
            intro_notes: '',
            notes: `Adendum dari penawaran #${parent.client_number_formatted}`,
            items: [
                {
                    package_code: adnPkg?.code ?? 'ADN-01',
                    description:
                        adnPkg?.default_description ??
                        'Pengerjaan Adendum Desain (Perubahan / Tambahan Kerja)',
                    unit_type: 'ls',
                    quantity: 1,
                    unit_price: 2000000,
                    notes: 'Adendum Perubahan Kerja',
                },
            ],
        });
        setFormModalOpen(true);
    };

    const openEditModal = (q: QuoteRecord) => {
        setEditingQuote(q);
        form.clearErrors();
        form.setData({
            project_id: q.project_id ?? '',
            parent_quote_id: q.parent_quote_id ?? '',
            document_kind: q.document_kind,
            client_name: q.client_name,
            client_phone: q.client_phone ?? '',
            project_title: q.project_title,
            quote_date: q.quote_date,
            actual_area: q.actual_area ?? '',
            floor_breakdown: q.floor_breakdown ?? [],
            agreed_contract_value: q.agreed_contract_value ?? '',
            discount_type: q.discount_type,
            discount_value: q.discount_value,
            survey_fee: q.survey_fee,
            survey_mode: q.survey_mode,
            dp_percent: q.dp_percent,
            t1_percent: q.t1_percent,
            t2_percent: q.t2_percent,
            t3_percent: q.t3_percent,
            t4_percent: q.t4_percent,
            status: q.status,
            intro_notes: q.intro_notes ?? '',
            notes: q.notes ?? '',
            items:
                q.items.length > 0
                    ? q.items.map((it) => ({
                          package_code: it.package_code || 'CUSTOM',
                          description: it.description,
                          unit_type: it.unit_type,
                          quantity: it.quantity,
                          unit_price: it.unit_price,
                          notes: it.notes ?? '',
                      }))
                    : [],
        });
        setFormModalOpen(true);
    };

    const openPaymentModal = (q: QuoteRecord) => {
        setPaymentModalQuoteId(q.id);
        paymentForm.setData({
            survey_paid_at: q.survey_paid_at ?? '',
            dp_paid_at: q.dp_paid_at ?? '',
            t1_paid_at: q.t1_paid_at ?? '',
            t2_paid_at: q.t2_paid_at ?? '',
            t3_paid_at: q.t3_paid_at ?? '',
            t4_paid_at: q.t4_paid_at ?? '',
        });
    };

    const handleSyncProjectSelect = (projId: string) => {
        form.setData('project_id', projId);
        const found = projects.find((p) => String(p.id) === projId);
        if (!found) return;

        const matchedPkg = pricelist.find((pl) => pl.project_package_id === found.package_name);
        const nextItems =
            form.data.document_kind === 'main' && matchedPkg
                ? [
                      {
                          package_code: matchedPkg.code,
                          description: matchedPkg.default_description,
                          unit_type: matchedPkg.unit_type,
                          quantity: Math.max(
                              Number(found.building_area || 0),
                              matchedPkg.min_area || 0,
                          ) || 80,
                          unit_price: matchedPkg.price_per_m2,
                          notes: 'Sinkron Proyek Perencanaan',
                      },
                  ]
                : form.data.items;

        form.setData((prev) => ({
            ...prev,
            project_id: projId,
            client_name: prev.client_name || found.client_name,
            client_phone: prev.client_phone || found.client_phone || '',
            project_title: prev.project_title || found.name,
            actual_area: prev.actual_area || found.building_area || '',
            items: nextItems,
        }));
    };

    const updateLineItem = (idx: number, patch: Partial<QuoteLineItem>) => {
        const next = [...form.data.items];
        next[idx] = { ...next[idx], ...patch };
        form.setData('items', next);
    };

    const getMinAreaForItem = (item: QuoteLineItem): number => {
        if (item.unit_type !== 'm2') return 0;
        const pkg = pricelist.find((p) => p.code === item.package_code);
        if (pkg) return pkg.min_area || 0;
        return 80;
    };

    const syncBillableArea = (actualAreaVal: number, items: QuoteLineItem[]): QuoteLineItem[] => {
        return items.map((item) => {
            if (item.unit_type !== 'm2') return item;
            const minArea = getMinAreaForItem(item);
            const billable =
                actualAreaVal > 0
                    ? Math.max(actualAreaVal, minArea)
                    : minArea || item.quantity;
            return { ...item, quantity: Number(billable.toFixed(2)) };
        });
    };

    const handleActualAreaChange = (val: string) => {
        const num = val === '' ? 0 : Number(val) || 0;
        form.setData((prev) => ({
            ...prev,
            actual_area: val,
            items: syncBillableArea(num, prev.items),
        }));
    };

    const updateFloors = (nextFloors: FloorRow[]) => {
        const totalArea = Number(
            nextFloors.reduce((sum, f) => sum + (Number(f.area) || 0), 0).toFixed(2),
        );
        form.setData((prev) => ({
            ...prev,
            floor_breakdown: nextFloors,
            actual_area: nextFloors.length > 0 ? totalArea : prev.actual_area,
            items: nextFloors.length > 0 ? syncBillableArea(totalArea, prev.items) : prev.items,
        }));
    };

    const handleSelectPackageCode = (idx: number, code: string) => {
        const pkg = pricelist.find((p) => p.code === code);
        if (!pkg) {
            updateLineItem(idx, { package_code: code });
            return;
        }
        const actualAreaNum = Number(form.data.actual_area) || 0;
        const minArea = pkg.min_area || 0;
        const nextQty =
            pkg.unit_type === 'ls'
                ? 1
                : actualAreaNum > 0
                  ? Math.max(actualAreaNum, minArea)
                  : minArea || 80;
        updateLineItem(idx, {
            package_code: pkg.code,
            description: pkg.default_description,
            unit_type: pkg.unit_type,
            quantity: Number(nextQty.toFixed(2)),
            unit_price: pkg.price_per_m2,
        });
    };

    const liveTotals = useMemo(() => {
        if (form.data.document_kind === 'survey_only') {
            const fee = Number(form.data.survey_fee) || 0;
            return {
                subtotal: fee,
                discount: 0,
                designCalculated: 0,
                effectiveDesign: 0,
                hasDealOverride: false,
                surveyAmount: fee,
                contract: fee,
                totalPercent: 100,
            };
        }
        const subtotal = form.data.items.reduce((sum, item) => {
            const qty = item.unit_type === 'ls' ? 1 : Number(item.quantity) || 0;
            return sum + Math.round(qty * (Number(item.unit_price) || 0));
        }, 0);

        let discount = 0;
        if (form.data.discount_type === 'percent') {
            discount = Math.round(
                (subtotal * Math.min(100, Number(form.data.discount_value) || 0)) / 100,
            );
        } else if (form.data.discount_type === 'fixed') {
            discount = Math.min(subtotal, Math.round(Number(form.data.discount_value) || 0));
        }

        const designCalculated = Math.max(0, subtotal - discount);
        const agreedVal =
            form.data.agreed_contract_value !== ''
                ? Math.max(0, Math.round(Number(form.data.agreed_contract_value) || 0))
                : 0;
        const hasDealOverride = agreedVal > 0;
        const effectiveDesign = hasDealOverride ? agreedVal : designCalculated;

        const surveyAmount =
            form.data.survey_mode === 'included' || form.data.survey_mode === 'separate_invoice'
                ? Number(form.data.survey_fee) || 0
                : 0;
        const contract = effectiveDesign + surveyAmount;
        const totalPercent =
            (Number(form.data.dp_percent) || 0) +
            (Number(form.data.t1_percent) || 0) +
            (Number(form.data.t2_percent) || 0) +
            (Number(form.data.t3_percent) || 0) +
            (Number(form.data.t4_percent) || 0);

        return {
            subtotal,
            discount,
            designCalculated,
            effectiveDesign,
            hasDealOverride,
            surveyAmount,
            contract,
            totalPercent,
        };
    }, [form.data]);

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.transform((data) => ({
            ...data,
            project_id: data.project_id ? Number(data.project_id) : null,
            parent_quote_id: data.parent_quote_id ? Number(data.parent_quote_id) : null,
            actual_area: data.actual_area !== '' ? Number(data.actual_area) : null,
            agreed_contract_value:
                data.agreed_contract_value !== '' && Number(data.agreed_contract_value) > 0
                    ? Math.round(Number(data.agreed_contract_value))
                    : null,
            floor_breakdown: data.floor_breakdown
                .filter((f) => f.label.trim() !== '' || Number(f.area) > 0)
                .map((f, idx) => ({
                    label: f.label.trim() || `Lantai ${idx + 1}`,
                    area: Number(f.area) || 0,
                })),
        }));

        if (editingQuote) {
            form.put(route('planning-documents.update', editingQuote.id), {
                preserveScroll: true,
                onSuccess: () => setFormModalOpen(false),
            });
        } else {
            form.post(route('planning-documents.store'), {
                preserveScroll: true,
                onSuccess: () => setFormModalOpen(false),
            });
        }
    };

    const handleSavePayments = (e: React.FormEvent) => {
        e.preventDefault();
        if (!paymentModalQuote) return;
        paymentForm.patch(route('planning-documents.payments', paymentModalQuote.id), {
            preserveScroll: true,
        });
    };

    const handleConvertToProject = (q: QuoteRecord) => {
        if (
            !window.confirm(
                `Buat Proyek Perencanaan baru untuk ${q.client_name} (${q.project_title}) berdasarkan data penawaran ini?`,
            )
        ) {
            return;
        }
        router.post(route('planning-documents.convert-project', q.id));
    };

    const handleDelete = (q: QuoteRecord) => {
        if (!window.confirm(`Hapus dokumen #${q.client_number_formatted} (${q.client_name})?`)) {
            return;
        }
        router.delete(route('planning-documents.destroy', q.id), { preserveScroll: true });
    };

    return (
        <AppShell initialActive="planning-documents">
            <Head title="Penawaran, Invoice & Kwitansi" />

            <div className="mx-auto max-w-[1400px] space-y-6">
                {/* Header */}
                <div className="flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                        <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                            <FileSpreadsheet className="size-3.5" />
                            Administrasi Komersial Perencanaan
                        </div>
                        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                            Penawaran, Invoice &amp; Kwitansi
                        </h1>
                        <p className="text-xs text-muted-foreground sm:text-sm">
                            Tersinkron dengan Pricelist &amp; Proyek Perencanaan — mendukung Survey Terpisah, Adendum Perubahan Kerja, dan cetak PDF resmi.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={() => openCreateModal('survey_only')}
                            className="inline-flex items-center gap-1.5 rounded-xl border bg-background px-3.5 py-2 text-xs font-semibold text-foreground shadow-2xs transition hover:bg-muted"
                        >
                            <Receipt className="size-4 text-teal-600" />
                            + Invoice Survey Terpisah
                        </button>
                        <button
                            type="button"
                            onClick={() => openCreateModal('main')}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-xs transition hover:bg-primary/90"
                        >
                            <Plus className="size-4" />
                            Buat Penawaran Baru
                        </button>
                    </div>
                </div>

                {/* 4 KPI Cards */}
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-xl border bg-card p-4 shadow-2xs">
                        <p className="text-xs font-medium text-muted-foreground">
                            Total Nilai Kontrak (Deal)
                        </p>
                        <p className="mt-1 text-xl font-bold tabular-nums text-foreground">
                            {formatRp(metrics.total_contract)}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                            Hanya {metrics.deal_count} kontrak berstatus Deal / Lunas
                        </p>
                    </div>
                    <div className="rounded-xl border bg-card p-4 shadow-2xs">
                        <p className="text-xs font-medium text-muted-foreground">Dana Masuk (Terbayar)</p>
                        <p className="mt-1 text-xl font-bold tabular-nums text-emerald-700">
                            {formatRp(metrics.total_paid)}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                            Total DP, Termin &amp; Survey lunas
                        </p>
                    </div>
                    <div className="rounded-xl border bg-card p-4 shadow-2xs">
                        <p className="text-xs font-medium text-muted-foreground">Sisa Tagihan (Piutang)</p>
                        <p className="mt-1 text-xl font-bold tabular-nums text-amber-700">
                            {formatRp(metrics.total_remaining)}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                            Piutang dari kontrak yang sudah deal
                        </p>
                    </div>
                    <div className="rounded-xl border bg-card p-4 shadow-2xs">
                        <p className="text-xs font-medium text-muted-foreground">
                            Tahap Penawaran (Belum Deal)
                        </p>
                        <p className="mt-1 text-xl font-bold tabular-nums text-foreground">
                            {metrics.follow_up_count} Klien
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                            Potensi {formatRp(metrics.follow_up_potential)} · tidak masuk kontrak
                        </p>
                    </div>
                </div>

                {/* Search & Filter */}
                <div className="flex flex-col gap-3 rounded-xl border bg-card p-3.5 lg:flex-row lg:items-center lg:justify-between">
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            applyFilters({ search });
                        }}
                        className="relative flex-1 lg:max-w-sm"
                    >
                        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Cari nama klien, proyek, atau WhatsApp..."
                            className="h-9 w-full rounded-lg border bg-background pr-8 pl-9 text-xs outline-none focus:border-primary"
                        />
                    </form>

                    <div className="flex flex-wrap items-center gap-2">
                        <select
                            value={kindFilter}
                            onChange={(e) => {
                                setKindFilter(e.target.value);
                                applyFilters({ kind: e.target.value });
                            }}
                            className="h-8 rounded-lg border bg-background px-2.5 text-xs font-medium outline-none"
                        >
                            <option value="all">Semua Jenis</option>
                            <option value="main">Penawaran Utama</option>
                            <option value="addendum">Adendum / Tambahan</option>
                            <option value="survey_only">Invoice Survey Terpisah</option>
                        </select>

                        <div className="flex flex-wrap gap-1">
                            {[
                                { id: 'all', label: 'Semua' },
                                { id: 'follow_up', label: 'Penawaran (Belum Deal)' },
                                { id: 'progress', label: 'Deal / Progress' },
                                { id: 'done', label: 'Lunas' },
                                { id: 'cancelled', label: 'Tidak Deal' },
                            ].map((st) => (
                                <button
                                    key={st.id}
                                    type="button"
                                    onClick={() => {
                                        setStatusFilter(st.id);
                                        applyFilters({ status: st.id });
                                    }}
                                    className={cn(
                                        'rounded-lg px-2.5 py-1 text-xs font-medium transition',
                                        statusFilter === st.id
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground',
                                    )}
                                >
                                    {st.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Documents Table */}
                <div className="overflow-hidden rounded-xl border bg-card shadow-2xs">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="border-b bg-muted/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                    <th className="px-4 py-3">No / Klien</th>
                                    <th className="px-4 py-3">Proyek &amp; Sinkronisasi</th>
                                    <th className="px-4 py-3">Status &amp; Tahap</th>
                                    <th className="px-4 py-3 text-right">Nilai &amp; Pembayaran</th>
                                    <th className="px-4 py-3 text-right">Dokumen PDF &amp; Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {quotes.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                                            Belum ada data penawaran/invoice yang cocok dengan filter.
                                        </td>
                                    </tr>
                                ) : (
                                    quotes.map((q) => {
                                        const stBadge = STATUS_BADGE[q.status] ?? STATUS_BADGE.follow_up;
                                        const kindBadge = KIND_BADGE[q.document_kind] ?? KIND_BADGE.main;
                                        const paidPct =
                                            q.total_billable > 0
                                                ? Math.min(100, Math.round((q.paid_total / q.total_billable) * 100))
                                                : 0;

                                        return (
                                            <tr key={q.id} className="hover:bg-muted/20">
                                                <td className="px-4 py-3.5 align-top">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-mono font-bold text-primary">
                                                            #{q.client_number_formatted}
                                                        </span>
                                                        <span
                                                            className={cn(
                                                                'rounded px-1.5 py-0.5 text-[10px] font-semibold',
                                                                kindBadge.cls,
                                                            )}
                                                        >
                                                            {kindBadge.label}
                                                        </span>
                                                    </div>
                                                    <p className="mt-1 text-sm font-bold text-foreground">
                                                        {q.client_name}
                                                    </p>
                                                    <p className="text-[11px] text-muted-foreground">
                                                        {q.client_phone || 'Tanpa WA'} · {q.quote_date_formatted}
                                                    </p>
                                                </td>

                                                <td className="px-4 py-3.5 align-top">
                                                    <p className="font-semibold text-foreground">{q.project_title}</p>
                                                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                                        {q.items.slice(0, 2).map((it, i) => (
                                                            <span
                                                                key={i}
                                                                className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
                                                            >
                                                                {it.package_code || 'ITEM'} (
                                                                {it.unit_type === 'ls'
                                                                    ? 'Ls'
                                                                    : `${it.quantity} m²`}
                                                                )
                                                            </span>
                                                        ))}
                                                        {q.floor_breakdown && q.floor_breakdown.length > 0 && (
                                                            <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                                                                {q.floor_breakdown.length} Lantai · {q.actual_area ?? 0} m²
                                                            </span>
                                                        )}
                                                        {q.parent_quote_label && (
                                                            <span className="rounded bg-purple-50 px-1.5 py-0.5 text-[10px] font-medium text-purple-800">
                                                                Induk: {q.parent_quote_label}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="mt-1.5">
                                                        {q.project_id ? (
                                                            <Link
                                                                href={route('projects.show', q.project_id)}
                                                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                                                            >
                                                                Sinkron: {q.project_name}
                                                                <ArrowUpRight className="size-3" />
                                                            </Link>
                                                        ) : (
                                                            q.document_kind !== 'survey_only' && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleConvertToProject(q)}
                                                                    className="inline-flex items-center gap-1 rounded-md border border-dashed border-primary/40 bg-primary/5 px-2 py-0.5 text-[10px] font-semibold text-primary hover:bg-primary/10"
                                                                >
                                                                    <FolderPlus className="size-3" />
                                                                    Jadikan Proyek Perencanaan
                                                                </button>
                                                            )
                                                        )}
                                                    </div>
                                                </td>

                                                <td className="px-4 py-3.5 align-top">
                                                    <span
                                                        className={cn(
                                                            'inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold ring-1',
                                                            stBadge.cls,
                                                        )}
                                                    >
                                                        {stBadge.label}
                                                    </span>
                                                    <p className="mt-1 font-mono text-[11px] font-semibold text-foreground">
                                                        Tahap: {q.stage_label}
                                                    </p>
                                                    {q.survey_fee > 0 && q.survey_mode !== 'excluded' && (
                                                        <p className="mt-0.5 text-[10px] text-teal-700">
                                                            {q.survey_mode === 'included' ? 'Survey (Awal):' : 'Survey Terpisah:'}{' '}
                                                            {formatRp(q.survey_fee)}{' '}
                                                            {q.survey_paid_at ? '✓ Lunas' : '(Belum)'}
                                                        </p>
                                                    )}
                                                </td>

                                                <td className="px-4 py-3.5 text-right align-top">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        {q.agreed_contract_value && q.agreed_contract_value > 0 ? (
                                                            <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-800">
                                                                Harga Deal
                                                            </span>
                                                        ) : null}
                                                        <p className="font-mono text-sm font-bold text-foreground">
                                                            {formatRp(q.total_billable)}
                                                        </p>
                                                    </div>
                                                    <p className="mt-0.5 text-[11px] text-emerald-700">
                                                        Masuk: {formatRp(q.paid_total)} ({paidPct}%)
                                                    </p>
                                                    <div className="mt-1 ml-auto h-1.5 w-28 overflow-hidden rounded-full bg-muted">
                                                        <div
                                                            className="h-full rounded-full bg-emerald-600"
                                                            style={{ width: `${paidPct}%` }}
                                                        />
                                                    </div>
                                                </td>

                                                <td className="px-4 py-3.5 text-right align-top">
                                                    <div className="flex flex-wrap justify-end gap-1.5">
                                                        {q.document_kind !== 'survey_only' && (
                                                            <a
                                                                href={route(
                                                                    'planning-documents.pdf.quotation',
                                                                    q.id,
                                                                )}
                                                                className="inline-flex h-7 items-center gap-1 rounded-md border bg-background px-2 text-[11px] font-semibold text-foreground hover:bg-muted"
                                                                title="Download Surat Penawaran PDF"
                                                            >
                                                                <FileText className="size-3 text-primary" />
                                                                SP PDF
                                                            </a>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() => openPaymentModal(q)}
                                                            className="inline-flex h-7 items-center gap-1 rounded-md bg-primary px-2.5 text-[11px] font-semibold text-primary-foreground hover:bg-primary/90"
                                                        >
                                                            <Wallet className="size-3" />
                                                            Invoice &amp; Kwitansi
                                                        </button>
                                                        {q.document_kind === 'main' && (
                                                            <button
                                                                type="button"
                                                                onClick={() => openAddendumModal(q)}
                                                                className="inline-flex h-7 items-center gap-1 rounded-md border border-purple-200 bg-purple-50 px-2 text-[11px] font-semibold text-purple-800 hover:bg-purple-100"
                                                                title="Buat Adendum / Pekerjaan Tambahan"
                                                            >
                                                                <FilePlus2 className="size-3" />
                                                                + Adendum
                                                            </button>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() => openEditModal(q)}
                                                            className="inline-flex h-7 items-center rounded-md border bg-background px-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                                                            title="Edit Dokumen"
                                                        >
                                                            <Edit3 className="size-3.5" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDelete(q)}
                                                            className="inline-flex h-7 items-center rounded-md border bg-background px-2 text-muted-foreground hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                                                            title="Hapus Dokumen"
                                                        >
                                                            <Trash2 className="size-3.5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* MODAL 1: PUSAT PEMBAYARAN, INVOICE & KWITANSI PDF */}
            {paymentModalQuote && (
                <div
                    onClick={() => setPaymentModalQuoteId(null)}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border bg-card shadow-2xl"
                    >
                        <div className="flex items-start justify-between border-b px-5 py-4">
                            <div>
                                <p className="font-mono text-xs font-bold text-primary">
                                    {paymentModalQuote.quote_ref_no}
                                </p>
                                <h2 className="text-base font-bold text-foreground">
                                    Invoice, Kwitansi &amp; Pembayaran — {paymentModalQuote.client_name}
                                </h2>
                                <p className="text-xs text-muted-foreground">
                                    {paymentModalQuote.project_title} · Total:{' '}
                                    <strong className="text-foreground">
                                        {formatRp(paymentModalQuote.total_billable)}
                                    </strong>
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setPaymentModalQuoteId(null)}
                                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
                            >
                                <X className="size-4" />
                            </button>
                        </div>

                        <form
                            onSubmit={handleSavePayments}
                            className="flex-1 space-y-4 overflow-y-auto px-5 py-4"
                        >
                            <div className="space-y-2.5">
                                {paymentModalQuote.payment_stages.map((st) => {
                                    const fieldKey = `${st.key}_paid_at` as keyof typeof paymentForm.data;
                                    const currentDateVal = paymentForm.data[fieldKey] || '';

                                    return (
                                        <div
                                            key={st.key}
                                            className={cn(
                                                'flex flex-col gap-3 rounded-xl border p-3.5 sm:flex-row sm:items-center sm:justify-between',
                                                st.is_paid
                                                    ? 'border-emerald-200 bg-emerald-50/50'
                                                    : 'bg-background',
                                            )}
                                        >
                                            <div className="space-y-0.5">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-foreground">
                                                        {st.label}
                                                    </span>
                                                    {st.is_paid && (
                                                        <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                                                            <CheckCircle2 className="size-3" />
                                                            PAID
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="font-mono text-sm font-bold text-foreground">
                                                    {formatRp(st.amount)}
                                                </p>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-2">
                                                <div className="flex items-center gap-1.5">
                                                    <label className="text-[11px] text-muted-foreground">
                                                        Tgl Bayar:
                                                    </label>
                                                    <input
                                                        type="date"
                                                        value={currentDateVal}
                                                        onChange={(e) =>
                                                            paymentForm.setData(fieldKey, e.target.value)
                                                        }
                                                        className="h-8 rounded-lg border bg-background px-2 text-xs outline-none focus:border-primary"
                                                    />
                                                </div>

                                                <a
                                                    href={route('planning-documents.pdf.invoice', [
                                                        paymentModalQuote.id,
                                                        st.key,
                                                    ])}
                                                    className="inline-flex h-8 items-center gap-1 rounded-lg border bg-background px-2.5 text-[11px] font-semibold text-foreground hover:bg-muted"
                                                >
                                                    <Download className="size-3 text-sky-600" />
                                                    Invoice PDF
                                                </a>

                                                <a
                                                    href={route('planning-documents.pdf.receipt', [
                                                        paymentModalQuote.id,
                                                        st.key,
                                                    ])}
                                                    className={cn(
                                                        'inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-[11px] font-semibold',
                                                        st.is_paid
                                                            ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                                            : 'border bg-muted/40 text-muted-foreground hover:bg-muted',
                                                    )}
                                                >
                                                    <Receipt className="size-3" />
                                                    Kwitansi PDF
                                                </a>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="flex items-center justify-between border-t pt-3">
                                <p className="text-[11px] text-muted-foreground">
                                    Isi tanggal bayar lalu klik <strong>Simpan Tanggal Bayar</strong> untuk mengaktifkan badge [PAID].
                                </p>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setPaymentModalQuoteId(null)}
                                        className="rounded-lg border px-3.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
                                    >
                                        Tutup
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={paymentForm.processing}
                                        className="rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                                    >
                                        {paymentForm.processing ? 'Menyimpan...' : 'Simpan Tanggal Bayar'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL 2: BUAT / EDIT PENAWARAN, ADENDUM, ATAU INVOICE SURVEY TERPISAH */}
            {formModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
                    <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border bg-card shadow-2xl">
                        <div className="flex items-center justify-between border-b px-5 py-4">
                            <div>
                                <h2 className="text-base font-bold text-foreground">
                                    {editingQuote
                                        ? `Edit Dokumen #${editingQuote.client_number_formatted}`
                                        : form.data.document_kind === 'survey_only'
                                          ? 'Buat Invoice Survey Terpisah'
                                          : form.data.document_kind === 'addendum'
                                            ? 'Buat Penawaran Adendum / Pekerjaan Tambahan'
                                            : 'Buat Surat Penawaran Baru'}
                                </h2>
                                <p className="text-xs text-muted-foreground">
                                    Paket &amp; harga otomatis disinkronkan dengan Pricelist Proyek Perencanaan
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setFormModalOpen(false)}
                                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
                            >
                                <X className="size-4" />
                            </button>
                        </div>

                        <form
                            onSubmit={handleFormSubmit}
                            className="flex-1 space-y-4 overflow-y-auto px-5 py-4 text-xs"
                        >
                            {/* Sync with existing Planning Project */}
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div className="sm:col-span-2">
                                    <label className="mb-1 block font-semibold text-foreground">
                                        Tautkan ke Proyek Perencanaan (Opsional — otomatis isi data klien &amp; paket)
                                    </label>
                                    <select
                                        value={form.data.project_id}
                                        onChange={(e) => handleSyncProjectSelect(e.target.value)}
                                        className="h-9 w-full rounded-lg border bg-background px-2.5 text-xs outline-none focus:border-primary"
                                    >
                                        <option value="">— Klien Baru / Belum Jadi Proyek —</option>
                                        {projects.map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.name} ({p.client_name})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-1 block font-semibold text-foreground">
                                        Nama Klien <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={form.data.client_name}
                                        onChange={(e) => form.setData('client_name', e.target.value)}
                                        placeholder="Contoh: PAK RUDI / IBU ALIFIA"
                                        className="h-9 w-full rounded-lg border bg-background px-3 outline-none focus:border-primary"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1 block font-semibold text-foreground">
                                        No. WhatsApp
                                    </label>
                                    <input
                                        type="text"
                                        value={form.data.client_phone}
                                        onChange={(e) => form.setData('client_phone', e.target.value)}
                                        placeholder="62812..."
                                        className="h-9 w-full rounded-lg border bg-background px-3 outline-none focus:border-primary"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1 block font-semibold text-foreground">
                                        Nama Proyek / Alamat <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={form.data.project_title}
                                        onChange={(e) => form.setData('project_title', e.target.value)}
                                        placeholder="Contoh: Home Design, Kota Bandung"
                                        className="h-9 w-full rounded-lg border bg-background px-3 outline-none focus:border-primary"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="mb-1 block font-semibold text-foreground">
                                            Tanggal <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="date"
                                            required
                                            value={form.data.quote_date}
                                            onChange={(e) => form.setData('quote_date', e.target.value)}
                                            className="h-9 w-full rounded-lg border bg-background px-2.5 outline-none focus:border-primary"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block font-semibold text-foreground">
                                            Luas Aktual (m²)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            readOnly={form.data.floor_breakdown.length > 0}
                                            value={form.data.actual_area}
                                            onChange={(e) => handleActualAreaChange(e.target.value)}
                                            placeholder="misal: 120"
                                            className={cn(
                                                'h-9 w-full rounded-lg border bg-background px-2.5 outline-none focus:border-primary',
                                                form.data.floor_breakdown.length > 0 &&
                                                    'bg-muted/50 font-semibold text-primary',
                                            )}
                                        />
                                    </div>
                                </div>

                                {/* Rincian Kebutuhan Lantai / Luasan per Lantai */}
                                {form.data.document_kind !== 'survey_only' && (
                                    <div className="space-y-2 rounded-xl border bg-muted/20 p-3 sm:col-span-2">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <div>
                                                <span className="font-semibold text-foreground">
                                                    Rincian Kebutuhan Lantai / Luasan per Lantai
                                                </span>
                                                <p className="text-[11px] text-muted-foreground">
                                                    Otomatis menjumlahkan total luas aktual &amp; mengisi Luas/Qty item (min. order 80 m²; di atas 80 m² ikut luas aktual).
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {form.data.floor_breakdown.length > 0 && (
                                                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary">
                                                        {form.data.floor_breakdown.length} Lantai · Total{' '}
                                                        {form.data.actual_area || 0} m²
                                                    </span>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        updateFloors([
                                                            ...form.data.floor_breakdown,
                                                            {
                                                                label: `Lantai ${form.data.floor_breakdown.length + 1}`,
                                                                area: 0,
                                                            },
                                                        ])
                                                    }
                                                    className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary/20"
                                                >
                                                    <Plus className="size-3" />
                                                    Tambah Lantai
                                                </button>
                                            </div>
                                        </div>

                                        {form.data.floor_breakdown.length > 0 && (
                                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                                {form.data.floor_breakdown.map((fl, fIdx) => (
                                                    <div
                                                        key={fIdx}
                                                        className="flex items-center gap-1.5 rounded-lg border bg-card p-2"
                                                    >
                                                        <input
                                                            type="text"
                                                            value={fl.label}
                                                            onChange={(e) => {
                                                                const next = [...form.data.floor_breakdown];
                                                                next[fIdx] = { ...next[fIdx], label: e.target.value };
                                                                updateFloors(next);
                                                            }}
                                                            placeholder={`Lantai ${fIdx + 1}`}
                                                            className="h-8 flex-1 rounded-md border bg-background px-2 text-xs outline-none focus:border-primary"
                                                        />
                                                        <div className="relative w-24">
                                                            <input
                                                                type="number"
                                                                step="0.01"
                                                                min={0}
                                                                value={fl.area || ''}
                                                                onChange={(e) => {
                                                                    const next = [...form.data.floor_breakdown];
                                                                    next[fIdx] = {
                                                                        ...next[fIdx],
                                                                        area: Number(e.target.value) || 0,
                                                                    };
                                                                    updateFloors(next);
                                                                }}
                                                                placeholder="0"
                                                                className="h-8 w-full rounded-md border bg-background pr-7 pl-2 text-xs outline-none focus:border-primary"
                                                            />
                                                            <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-[10px] text-muted-foreground">
                                                                m²
                                                            </span>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                updateFloors(
                                                                    form.data.floor_breakdown.filter(
                                                                        (_, i) => i !== fIdx,
                                                                    ),
                                                                )
                                                            }
                                                            className="rounded-md p-1.5 text-rose-600 hover:bg-rose-50"
                                                            title="Hapus Lantai"
                                                        >
                                                            <Trash2 className="size-3.5" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="sm:col-span-2">
                                    <label className="mb-1 block font-semibold text-foreground">
                                        Status Penawaran / Dealing
                                    </label>
                                    <select
                                        value={form.data.status}
                                        onChange={(e) =>
                                            form.setData(
                                                'status',
                                                e.target.value as
                                                    | 'follow_up'
                                                    | 'progress'
                                                    | 'done'
                                                    | 'cancelled',
                                            )
                                        }
                                        className="h-9 w-full rounded-lg border bg-background px-2.5 text-xs outline-none focus:border-primary"
                                    >
                                        <option value="follow_up">
                                            Penawaran / Follow Up (Belum Deal — tidak masuk Total Nilai Kontrak)
                                        </option>
                                        <option value="progress">
                                            Deal · Progress (Masuk perhitungan Total Nilai Kontrak)
                                        </option>
                                        <option value="done">
                                            Lunas / Selesai (Masuk perhitungan Total Nilai Kontrak)
                                        </option>
                                        <option value="cancelled">
                                            Tidak Deal / Dibatalkan
                                        </option>
                                    </select>
                                </div>
                            </div>

                            {/* Line Items (hidden for survey_only) */}
                            {form.data.document_kind !== 'survey_only' && (
                                <div className="space-y-2.5 rounded-xl border bg-muted/20 p-3.5">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-bold text-foreground">
                                            Rincian Paket / Item Pekerjaan
                                        </h3>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                form.setData('items', [...form.data.items, defaultItem()])
                                            }
                                            className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary/20"
                                        >
                                            <Plus className="size-3" />
                                            Tambah Baris Item
                                        </button>
                                    </div>

                                    {form.data.items.map((item, idx) => (
                                        <div
                                            key={idx}
                                            className="space-y-2 rounded-lg border bg-card p-3"
                                        >
                                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-12">
                                                <div className="sm:col-span-4">
                                                    <label className="mb-0.5 block text-[10px] font-semibold text-muted-foreground">
                                                        Pilih Paket (Sinkron Pricelist)
                                                    </label>
                                                    <select
                                                        value={item.package_code}
                                                        onChange={(e) =>
                                                            handleSelectPackageCode(idx, e.target.value)
                                                        }
                                                        className="h-8 w-full rounded-md border bg-background px-2 text-xs"
                                                    >
                                                        {pricelist.map((pl) => (
                                                            <option key={pl.code} value={pl.code}>
                                                                {pl.code} — {pl.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="sm:col-span-2">
                                                    <label className="mb-0.5 block text-[10px] font-semibold text-muted-foreground">
                                                        Satuan
                                                    </label>
                                                    <select
                                                        value={item.unit_type}
                                                        onChange={(e) =>
                                                            updateLineItem(idx, {
                                                                unit_type: e.target.value as 'm2' | 'ls',
                                                                quantity:
                                                                    e.target.value === 'ls'
                                                                        ? 1
                                                                        : item.quantity,
                                                            })
                                                        }
                                                        className="h-8 w-full rounded-md border bg-background px-2 text-xs"
                                                    >
                                                        <option value="m2">m²</option>
                                                        <option value="ls">Ls (Lumpsum)</option>
                                                    </select>
                                                </div>
                                                <div className="sm:col-span-2">
                                                    <label className="mb-0.5 block text-[10px] font-semibold text-muted-foreground">
                                                        Luas / Qty
                                                    </label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        disabled={item.unit_type === 'ls'}
                                                        value={item.unit_type === 'ls' ? 1 : item.quantity}
                                                        onChange={(e) =>
                                                            updateLineItem(idx, {
                                                                quantity: Number(e.target.value) || 0,
                                                            })
                                                        }
                                                        className="h-8 w-full rounded-md border bg-background px-2 text-xs disabled:opacity-50"
                                                    />
                                                    {item.unit_type === 'm2' &&
                                                        Number(form.data.actual_area) > 0 && (() => {
                                                            const minA = getMinAreaForItem(item);
                                                            const actA = Number(form.data.actual_area);
                                                            if (minA > 0 && actA < minA) {
                                                                return (
                                                                    <p className="mt-0.5 text-[9px] font-medium text-amber-700">
                                                                        Min. order {minA} m²
                                                                    </p>
                                                                );
                                                            }
                                                            return (
                                                                <p className="mt-0.5 text-[9px] font-medium text-emerald-700">
                                                                    Ikut luas aktual
                                                                </p>
                                                            );
                                                        })()}
                                                </div>
                                                <div className="sm:col-span-3">
                                                    <label className="mb-0.5 block text-[10px] font-semibold text-muted-foreground">
                                                        Harga Satuan (Rp)
                                                    </label>
                                                    <input
                                                        type="number"
                                                        value={item.unit_price}
                                                        onChange={(e) =>
                                                            updateLineItem(idx, {
                                                                unit_price: Number(e.target.value) || 0,
                                                            })
                                                        }
                                                        className="h-8 w-full rounded-md border bg-background px-2 text-xs"
                                                    />
                                                </div>
                                                <div className="flex items-end justify-end sm:col-span-1">
                                                    {form.data.items.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                form.setData(
                                                                    'items',
                                                                    form.data.items.filter(
                                                                        (_, i) => i !== idx,
                                                                    ),
                                                                )
                                                            }
                                                            className="rounded-md p-1.5 text-rose-600 hover:bg-rose-50"
                                                        >
                                                            <Trash2 className="size-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            <textarea
                                                rows={3}
                                                required
                                                value={item.description}
                                                onChange={(e) =>
                                                    updateLineItem(idx, { description: e.target.value })
                                                }
                                                placeholder="Deskripsi lengkap layanan & rincian deliverables..."
                                                className="w-full rounded-md border bg-background px-2.5 py-1.5 text-xs"
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Biaya Survey, Diskon & Harga Deal */}
                            <div className="grid grid-cols-1 gap-3 rounded-xl border bg-muted/20 p-3.5 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <label className="block font-semibold text-foreground">
                                        Biaya Survey Lokasi (Rp)
                                    </label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={form.data.survey_fee}
                                        onChange={(e) => {
                                            const fee = Number(e.target.value) || 0;
                                            form.setData((prev) => ({
                                                ...prev,
                                                survey_fee: fee,
                                                survey_mode:
                                                    fee > 0 && prev.survey_mode === 'excluded'
                                                        ? 'included'
                                                        : fee === 0 && prev.document_kind !== 'survey_only'
                                                          ? 'excluded'
                                                          : prev.survey_mode,
                                            }));
                                        }}
                                        className="h-9 w-full rounded-lg border bg-background px-3 outline-none"
                                    />
                                    {form.data.document_kind !== 'survey_only' && (
                                        <select
                                            value={form.data.survey_mode}
                                            onChange={(e) =>
                                                form.setData(
                                                    'survey_mode',
                                                    e.target.value as
                                                        | 'excluded'
                                                        | 'separate_invoice'
                                                        | 'included',
                                                )
                                            }
                                            className="h-8 w-full rounded-lg border bg-background px-2 text-xs"
                                        >
                                            <option value="excluded">Tanpa Biaya Survey</option>
                                            <option value="included">
                                                Gabungkan ke Surat Penawaran (Masuk Tabel &amp; Bayar Pas Selesai Survey sebelum DP)
                                            </option>
                                            <option value="separate_invoice">
                                                Tagih Terpisah (Cetak Invoice Survey Sendiri)
                                            </option>
                                        </select>
                                    )}
                                </div>

                                {form.data.document_kind !== 'survey_only' && (
                                    <div className="space-y-2">
                                        <label className="block font-semibold text-foreground">
                                            Diskon
                                        </label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <select
                                                value={form.data.discount_type}
                                                onChange={(e) =>
                                                    form.setData(
                                                        'discount_type',
                                                        e.target.value as 'none' | 'percent' | 'fixed',
                                                    )
                                                }
                                                className="h-9 rounded-lg border bg-background px-2 text-xs"
                                            >
                                                <option value="none">Tanpa Diskon</option>
                                                <option value="percent">Persen (%)</option>
                                                <option value="fixed">Nominal (Rp)</option>
                                            </select>
                                            <input
                                                type="number"
                                                min={0}
                                                disabled={form.data.discount_type === 'none'}
                                                value={form.data.discount_value}
                                                onChange={(e) =>
                                                    form.setData(
                                                        'discount_value',
                                                        Number(e.target.value) || 0,
                                                    )
                                                }
                                                className="h-9 rounded-lg border bg-background px-2.5 text-xs disabled:opacity-50"
                                            />
                                        </div>
                                    </div>
                                )}

                                {form.data.document_kind !== 'survey_only' && (
                                    <div className="space-y-1.5 border-t pt-3 sm:col-span-2">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <label className="font-semibold text-foreground">
                                                Nilai Kontrak Jadi / Harga Deal Desain (Rp — Opsional)
                                            </label>
                                            {liveTotals.hasDealOverride && (
                                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                                                    Aktif · DP &amp; Termin ikut Harga Deal ini
                                                </span>
                                            )}
                                        </div>
                                        <input
                                            type="number"
                                            min={0}
                                            value={form.data.agreed_contract_value}
                                            onChange={(e) =>
                                                form.setData('agreed_contract_value', e.target.value)
                                            }
                                            placeholder={`Kosongkan jika ikut hitungan otomatis (${formatRp(liveTotals.designCalculated)})`}
                                            className="h-9 w-full rounded-lg border bg-background px-3 outline-none focus:border-primary"
                                        />
                                        <p className="text-[11px] text-muted-foreground">
                                            Isi kolom ini jika ada perubahan harga hasil negosiasi/dealing dengan klien (di luar Biaya Survey).
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Skema Termin */}
                            {form.data.document_kind !== 'survey_only' && (
                                <div className="space-y-2 rounded-xl border bg-muted/20 p-3.5">
                                    <div className="flex items-center justify-between">
                                        <span className="font-semibold text-foreground">
                                            Skema Termin Pembayaran (%)
                                        </span>
                                        <span
                                            className={cn(
                                                'font-mono text-[11px] font-bold',
                                                liveTotals.totalPercent === 100
                                                    ? 'text-emerald-700'
                                                    : 'text-rose-600',
                                            )}
                                        >
                                            Total: {liveTotals.totalPercent}%
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-5 gap-2">
                                        {[
                                            { k: 'dp_percent' as const, label: 'DP %' },
                                            { k: 't1_percent' as const, label: 'Termin 1 %' },
                                            { k: 't2_percent' as const, label: 'Termin 2 %' },
                                            { k: 't3_percent' as const, label: 'Termin 3 %' },
                                            { k: 't4_percent' as const, label: 'Termin 4 %' },
                                        ].map((f) => (
                                            <div key={f.k}>
                                                <label className="mb-0.5 block text-[10px] text-muted-foreground">
                                                    {f.label}
                                                </label>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    max={100}
                                                    value={form.data[f.k]}
                                                    onChange={(e) =>
                                                        form.setData(f.k, Number(e.target.value) || 0)
                                                    }
                                                    className="h-8 w-full rounded-md border bg-background px-2 text-xs"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Live Total Banner */}
                            <div className="space-y-2 rounded-xl bg-primary/10 px-4 py-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                        <span className="font-semibold text-primary">
                                            Estimasi Total Tagihan Keseluruhan:
                                        </span>
                                        {form.data.document_kind !== 'survey_only' && (
                                            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-primary/80">
                                                <span>
                                                    Desain:{' '}
                                                    {liveTotals.hasDealOverride ? (
                                                        <>
                                                            <span className="line-through opacity-60">
                                                                {formatRp(liveTotals.designCalculated)}
                                                            </span>{' '}
                                                            <strong className="text-emerald-800">
                                                                {formatRp(liveTotals.effectiveDesign)} (Harga Deal)
                                                            </strong>
                                                        </>
                                                    ) : (
                                                        <strong>{formatRp(liveTotals.effectiveDesign)}</strong>
                                                    )}
                                                </span>
                                                {liveTotals.surveyAmount > 0 && (
                                                    <span>
                                                        + Survey (Pas Selesai Survey):{' '}
                                                        <strong>{formatRp(liveTotals.surveyAmount)}</strong>
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <span className="font-mono text-base font-bold text-primary">
                                        {formatRp(liveTotals.contract)}
                                    </span>
                                </div>

                                {form.data.document_kind !== 'survey_only' && (
                                    <div className="flex flex-wrap gap-1.5 border-t border-primary/15 pt-2 text-[10px] font-medium text-primary/90">
                                        {liveTotals.surveyAmount > 0 && (
                                            <span className="rounded bg-white/80 px-2 py-0.5 font-semibold text-teal-800">
                                                1. Survey (Awal): {formatRp(liveTotals.surveyAmount)}
                                            </span>
                                        )}
                                        {Number(form.data.dp_percent) > 0 && (
                                            <span className="rounded bg-white/70 px-2 py-0.5">
                                                DP ({form.data.dp_percent}%):{' '}
                                                {formatRp(
                                                    Math.round(
                                                        (liveTotals.effectiveDesign * Number(form.data.dp_percent)) /
                                                            100,
                                                    ),
                                                )}
                                            </span>
                                        )}
                                        {Number(form.data.t1_percent) > 0 && (
                                            <span className="rounded bg-white/70 px-2 py-0.5">
                                                T1 ({form.data.t1_percent}%):{' '}
                                                {formatRp(
                                                    Math.round(
                                                        (liveTotals.effectiveDesign * Number(form.data.t1_percent)) /
                                                            100,
                                                    ),
                                                )}
                                            </span>
                                        )}
                                        {Number(form.data.t2_percent) > 0 && (
                                            <span className="rounded bg-white/70 px-2 py-0.5">
                                                T2 ({form.data.t2_percent}%):{' '}
                                                {formatRp(
                                                    Math.round(
                                                        (liveTotals.effectiveDesign * Number(form.data.t2_percent)) /
                                                            100,
                                                    ),
                                                )}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-end gap-2 border-t pt-3">
                                <button
                                    type="button"
                                    onClick={() => setFormModalOpen(false)}
                                    className="rounded-lg border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={form.processing}
                                    className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                                >
                                    {form.processing ? 'Menyimpan...' : 'Simpan Dokumen'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppShell>
    );
}
