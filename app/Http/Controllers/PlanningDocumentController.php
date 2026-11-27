<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\OfficeSetting;
use App\Models\PlanningQuote;
use App\Models\Project;
use App\Services\ProjectPackageService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class PlanningDocumentController extends Controller
{
    /**
     * Authorize access strictly to Admin Perencanaan (Super Admin, Admin, or Admin Project).
     */
    private function authorizeAccess(Request $request): void
    {
        if (! $request->user()?->canManagePlanningDocuments()) {
            abort(403, 'Menu Penawaran, Invoice & Kwitansi hanya dapat diakses oleh Admin Perencanaan.');
        }
    }

    /**
     * Display the Planning Commercial Documents Hub (/planning-documents).
     */
    public function index(Request $request): Response
    {
        $this->authorizeAccess($request);

        $search = $request->string('search')->trim()->value();
        $status = $request->string('status')->trim()->value();
        $kind = $request->string('kind')->trim()->value();

        $query = PlanningQuote::query()
            ->with(['items', 'project:id,name,status,package_name,building_area', 'parentQuote:id,client_number,client_name,project_title', 'addendums:id,parent_quote_id,client_number,project_title,contract_value,status'])
            ->orderByDesc('client_number')
            ->orderByDesc('id');

        if ($search) {
            $query->where(function ($q) use ($search): void {
                $q->where('client_name', 'like', "%{$search}%")
                    ->orWhere('project_title', 'like', "%{$search}%")
                    ->orWhere('client_phone', 'like', "%{$search}%");
            });
        }

        if ($status && $status !== 'all') {
            $query->where('status', $status);
        }

        if ($kind && $kind !== 'all') {
            $query->where('document_kind', $kind);
        }

        $quotes = $query->get();
        $allQuotes = PlanningQuote::query()->with('items')->get();

        $totalContract = 0;
        $totalPaid = 0;
        $dealCount = 0;
        $followUpCount = 0;
        $followUpPotential = 0;

        foreach ($allQuotes as $q) {
            if (in_array($q->status, ['progress', 'done'], true)) {
                $totalContract += $q->totalBillable();
                $totalPaid += $q->paidTotal();
                $dealCount++;
            } elseif ($q->status === 'follow_up') {
                $followUpCount++;
                $followUpPotential += $q->totalBillable();
            }
        }

        $formattedQuotes = $quotes->map(fn (PlanningQuote $q): array => [
            'id' => $q->id,
            'client_number' => $q->client_number,
            'client_number_formatted' => str_pad((string) $q->client_number, 2, '0', STR_PAD_LEFT),
            'quote_ref_no' => $q->documentNumber('SP'),
            'project_id' => $q->project_id,
            'project_name' => $q->project?->name,
            'parent_quote_id' => $q->parent_quote_id,
            'parent_quote_label' => $q->parentQuote
                ? '#'.str_pad((string) $q->parentQuote->client_number, 2, '0', STR_PAD_LEFT).' · '.$q->parentQuote->client_name
                : null,
            'addendums_count' => $q->addendums->count(),
            'document_kind' => $q->document_kind,
            'client_name' => $q->client_name,
            'client_phone' => $q->client_phone,
            'project_title' => $q->project_title,
            'quote_date' => $q->quote_date->format('Y-m-d'),
            'quote_date_formatted' => $q->quote_date->format('d-M-Y'),
            'actual_area' => $q->actual_area,
            'floor_breakdown' => $q->floor_breakdown ?? [],
            'discount_type' => $q->discount_type,
            'discount_value' => $q->discount_value,
            'discount_amount' => $q->discount_amount,
            'survey_fee' => $q->survey_fee,
            'survey_mode' => $q->survey_mode,
            'survey_paid_at' => $q->survey_paid_at?->format('Y-m-d'),
            'payment_scheme_mode' => $q->payment_scheme_mode ?? 'percent',
            'dp_percent' => $q->dp_percent,
            't1_percent' => $q->t1_percent,
            't2_percent' => $q->t2_percent,
            't3_percent' => $q->t3_percent,
            't4_percent' => $q->t4_percent,
            'dp_amount' => $q->dp_amount ?? 0,
            't1_amount' => $q->t1_amount ?? 0,
            't2_amount' => $q->t2_amount ?? 0,
            't3_amount' => $q->t3_amount ?? 0,
            't4_amount' => $q->t4_amount ?? 0,
            'dp_paid_at' => $q->dp_paid_at?->format('Y-m-d'),
            't1_paid_at' => $q->t1_paid_at?->format('Y-m-d'),
            't2_paid_at' => $q->t2_paid_at?->format('Y-m-d'),
            't3_paid_at' => $q->t3_paid_at?->format('Y-m-d'),
            't4_paid_at' => $q->t4_paid_at?->format('Y-m-d'),
            'subtotal_amount' => $q->subtotal_amount,
            'contract_value' => $q->contract_value,
            'agreed_contract_value' => $q->agreed_contract_value,
            'effective_design_value' => $q->effectiveDesignValue(),
            'total_billable' => $q->totalBillable(),
            'paid_total' => $q->paidTotal(),
            'remaining_amount' => max(0, $q->totalBillable() - $q->paidTotal()),
            'status' => $q->status,
            'stage_label' => $q->stage_label,
            'intro_notes' => $q->intro_notes,
            'notes' => $q->notes,
            'payment_stages' => $q->paymentStages(),
            'items' => $q->items->map(fn ($item): array => [
                'id' => $item->id,
                'package_code' => $item->package_code,
                'description' => $item->description,
                'unit_type' => $item->unit_type,
                'quantity' => $item->quantity,
                'unit_price' => $item->unit_price,
                'total_price' => $item->total_price,
                'notes' => $item->notes,
            ])->values()->all(),
        ])->values();

        $planningProjects = Project::query()
            ->where('project_type', 'perencanaan')
            ->orderByDesc('updated_at')
            ->get(['id', 'name', 'client_name', 'client_phone', 'location', 'package_name', 'package_addons', 'building_area', 'estimated_budget', 'status']);

        return Inertia::render('PlanningDocuments/Index', [
            'quotes' => $formattedQuotes,
            'metrics' => [
                'total_contract' => $totalContract,
                'total_paid' => $totalPaid,
                'total_remaining' => max(0, $totalContract - $totalPaid),
                'deal_count' => $dealCount,
                'follow_up_count' => $followUpCount,
                'follow_up_potential' => $followUpPotential,
                'total_documents' => $allQuotes->count(),
            ],
            'pricelist' => ProjectPackageService::commercialPricelist(),
            'projects' => $planningProjects,
            'filters' => [
                'search' => $search,
                'status' => $status ?: 'all',
                'kind' => $kind ?: 'all',
            ],
        ]);
    }

    /**
     * Store a new Quotation, Addendum, or Separate Survey Invoice.
     */
    public function store(Request $request): RedirectResponse
    {
        $this->authorizeAccess($request);
        $user = $request->user();

        $validated = $this->validateQuotePayload($request);

        $quote = DB::transaction(function () use ($validated, $user): PlanningQuote {
            $nextNumber = ((int) PlanningQuote::query()->max('client_number')) + 1;
            $computed = $this->computeQuoteTotals($validated);

            $floorBreakdown = $this->normalizeFloorBreakdown($validated['floor_breakdown'] ?? []);
            $actualArea = ! empty($floorBreakdown)
                ? (float) collect($floorBreakdown)->sum('area')
                : ($validated['actual_area'] ?? null);

            $quote = PlanningQuote::query()->create([
                'client_number' => $nextNumber,
                'project_id' => $validated['project_id'] ?? null,
                'parent_quote_id' => $validated['parent_quote_id'] ?? null,
                'document_kind' => $validated['document_kind'],
                'client_name' => $validated['client_name'],
                'client_phone' => $validated['client_phone'] ?? null,
                'project_title' => $validated['project_title'],
                'quote_date' => $validated['quote_date'],
                'actual_area' => $actualArea,
                'floor_breakdown' => ! empty($floorBreakdown) ? $floorBreakdown : null,
                'discount_type' => $validated['discount_type'] ?? 'none',
                'discount_value' => $validated['discount_value'] ?? 0,
                'discount_amount' => $computed['discount_amount'],
                'survey_fee' => (int) ($validated['survey_fee'] ?? 0),
                'survey_mode' => $validated['document_kind'] === 'survey_only'
                    ? 'separate_invoice'
                    : ($validated['survey_mode'] ?? 'excluded'),
                'payment_scheme_mode' => $validated['payment_scheme_mode'] ?? 'percent',
                'dp_percent' => $validated['document_kind'] === 'survey_only' ? 0 : ($validated['dp_percent'] ?? 35),
                't1_percent' => $validated['document_kind'] === 'survey_only' ? 0 : ($validated['t1_percent'] ?? 35),
                't2_percent' => $validated['document_kind'] === 'survey_only' ? 0 : ($validated['t2_percent'] ?? 30),
                't3_percent' => $validated['document_kind'] === 'survey_only' ? 0 : ($validated['t3_percent'] ?? 0),
                't4_percent' => $validated['document_kind'] === 'survey_only' ? 0 : ($validated['t4_percent'] ?? 0),
                'dp_amount' => $validated['document_kind'] === 'survey_only' ? null : (isset($validated['dp_amount']) ? (int) $validated['dp_amount'] : null),
                't1_amount' => $validated['document_kind'] === 'survey_only' ? null : (isset($validated['t1_amount']) ? (int) $validated['t1_amount'] : null),
                't2_amount' => $validated['document_kind'] === 'survey_only' ? null : (isset($validated['t2_amount']) ? (int) $validated['t2_amount'] : null),
                't3_amount' => $validated['document_kind'] === 'survey_only' ? null : (isset($validated['t3_amount']) ? (int) $validated['t3_amount'] : null),
                't4_amount' => $validated['document_kind'] === 'survey_only' ? null : (isset($validated['t4_amount']) ? (int) $validated['t4_amount'] : null),
                'subtotal_amount' => $computed['subtotal'],
                'contract_value' => $computed['contract_value'],
                'agreed_contract_value' => ! empty($validated['agreed_contract_value']) ? (int) $validated['agreed_contract_value'] : null,
                'status' => $validated['status'] ?? 'follow_up',
                'stage_label' => $validated['document_kind'] === 'survey_only' ? 'SURVEY' : 'PENAWARAN',
                'intro_notes' => $validated['intro_notes'] ?? null,
                'notes' => $validated['notes'] ?? null,
                'created_by' => $user->id,
            ]);

            foreach ($computed['items'] as $idx => $item) {
                $quote->items()->create([
                    ...$item,
                    'order' => $idx + 1,
                ]);
            }

            return $quote;
        });

        ActivityLog::record(
            action: 'planning_document.created',
            description: "{$user->name} membuat dokumen {$quote->documentNumber('SP')} untuk {$quote->client_name}",
            reference: $quote,
            user: $user,
        );

        return redirect()->back()->with('success', "Dokumen untuk {$quote->client_name} berhasil disimpan.");
    }

    /**
     * Update an existing Quotation / Addendum / Survey Invoice.
     */
    public function update(Request $request, PlanningQuote $quote): RedirectResponse
    {
        $this->authorizeAccess($request);
        $validated = $this->validateQuotePayload($request);

        DB::transaction(function () use ($quote, $validated): void {
            $computed = $this->computeQuoteTotals($validated);
            $floorBreakdown = $this->normalizeFloorBreakdown($validated['floor_breakdown'] ?? []);
            $actualArea = ! empty($floorBreakdown)
                ? (float) collect($floorBreakdown)->sum('area')
                : ($validated['actual_area'] ?? null);

            $quote->update([
                'project_id' => $validated['project_id'] ?? null,
                'parent_quote_id' => $validated['parent_quote_id'] ?? $quote->parent_quote_id,
                'document_kind' => $validated['document_kind'],
                'client_name' => $validated['client_name'],
                'client_phone' => $validated['client_phone'] ?? null,
                'project_title' => $validated['project_title'],
                'quote_date' => $validated['quote_date'],
                'actual_area' => $actualArea,
                'floor_breakdown' => ! empty($floorBreakdown) ? $floorBreakdown : null,
                'discount_type' => $validated['discount_type'] ?? 'none',
                'discount_value' => $validated['discount_value'] ?? 0,
                'discount_amount' => $computed['discount_amount'],
                'survey_fee' => (int) ($validated['survey_fee'] ?? 0),
                'survey_mode' => $validated['document_kind'] === 'survey_only'
                    ? 'separate_invoice'
                    : ($validated['survey_mode'] ?? 'excluded'),
                'payment_scheme_mode' => $validated['payment_scheme_mode'] ?? 'percent',
                'dp_percent' => $validated['document_kind'] === 'survey_only' ? 0 : ($validated['dp_percent'] ?? 35),
                't1_percent' => $validated['document_kind'] === 'survey_only' ? 0 : ($validated['t1_percent'] ?? 35),
                't2_percent' => $validated['document_kind'] === 'survey_only' ? 0 : ($validated['t2_percent'] ?? 30),
                't3_percent' => $validated['document_kind'] === 'survey_only' ? 0 : ($validated['t3_percent'] ?? 0),
                't4_percent' => $validated['document_kind'] === 'survey_only' ? 0 : ($validated['t4_percent'] ?? 0),
                'dp_amount' => $validated['document_kind'] === 'survey_only' ? null : (isset($validated['dp_amount']) ? (int) $validated['dp_amount'] : null),
                't1_amount' => $validated['document_kind'] === 'survey_only' ? null : (isset($validated['t1_amount']) ? (int) $validated['t1_amount'] : null),
                't2_amount' => $validated['document_kind'] === 'survey_only' ? null : (isset($validated['t2_amount']) ? (int) $validated['t2_amount'] : null),
                't3_amount' => $validated['document_kind'] === 'survey_only' ? null : (isset($validated['t3_amount']) ? (int) $validated['t3_amount'] : null),
                't4_amount' => $validated['document_kind'] === 'survey_only' ? null : (isset($validated['t4_amount']) ? (int) $validated['t4_amount'] : null),
                'subtotal_amount' => $computed['subtotal'],
                'contract_value' => $computed['contract_value'],
                'agreed_contract_value' => ! empty($validated['agreed_contract_value']) ? (int) $validated['agreed_contract_value'] : null,
                'status' => $validated['status'] ?? $quote->status,
                'intro_notes' => $validated['intro_notes'] ?? null,
                'notes' => $validated['notes'] ?? null,
            ]);

            $quote->items()->delete();
            foreach ($computed['items'] as $idx => $item) {
                $quote->items()->create([
                    ...$item,
                    'order' => $idx + 1,
                ]);
            }

            $this->syncStageAndStatus($quote->fresh());
        });

        return redirect()->back()->with('success', "Dokumen {$quote->client_name} berhasil diperbarui.");
    }

    /**
     * Record or clear payment dates (Survey, DP, Termin 1..4) and automatically update stage & status.
     */
    public function updatePayments(Request $request, PlanningQuote $quote): RedirectResponse
    {
        $this->authorizeAccess($request);

        $validated = $request->validate([
            'survey_paid_at' => ['nullable', 'date'],
            'dp_paid_at' => ['nullable', 'date'],
            't1_paid_at' => ['nullable', 'date'],
            't2_paid_at' => ['nullable', 'date'],
            't3_paid_at' => ['nullable', 'date'],
            't4_paid_at' => ['nullable', 'date'],
            'status' => ['nullable', Rule::in(['follow_up', 'progress', 'done', 'cancelled'])],
        ]);

        $quote->update([
            'survey_paid_at' => $validated['survey_paid_at'] ?? null,
            'dp_paid_at' => $validated['dp_paid_at'] ?? null,
            't1_paid_at' => $validated['t1_paid_at'] ?? null,
            't2_paid_at' => $validated['t2_paid_at'] ?? null,
            't3_paid_at' => $validated['t3_paid_at'] ?? null,
            't4_paid_at' => $validated['t4_paid_at'] ?? null,
            'status' => $validated['status'] ?? $quote->status,
        ]);

        $this->syncStageAndStatus($quote->fresh());

        return redirect()->back()->with('success', "Status pembayaran {$quote->client_name} berhasil diperbarui.");
    }

    /**
     * 1-click convert a Quotation into a Planning Project (/projects) with synced package, area, and budget.
     */
    public function convertToProject(Request $request, PlanningQuote $quote): RedirectResponse
    {
        $this->authorizeAccess($request);
        $user = $request->user();

        if ($quote->project_id) {
            return redirect()->route('projects.show', $quote->project_id);
        }

        $quote->load('items');
        $primaryItem = $quote->items->first();
        $pricelist = collect(ProjectPackageService::commercialPricelist());
        $matchedPkg = $primaryItem?->package_code
            ? $pricelist->firstWhere('code', $primaryItem->package_code)
            : null;

        $packageName = $matchedPkg['project_package_id'] ?? 'Paket 2';
        $buildingType = ($primaryItem?->package_code === 'INT-01') ? 'interior' : 'rumah_hunian';
        $area = $quote->actual_area ?: ($primaryItem && $primaryItem->unit_type === 'm2' ? $primaryItem->quantity : null);
        $detectedAddons = $quote->items
            ->map(fn ($it) => $pricelist->firstWhere('code', $it->package_code)['addon_id'] ?? null)
            ->filter()
            ->unique()
            ->values()
            ->all();

        $project = DB::transaction(function () use ($quote, $packageName, $buildingType, $area, $detectedAddons, $user): Project {
            $project = Project::query()->create([
                'name' => "{$quote->project_title} - {$quote->client_name}",
                'client_name' => $quote->client_name,
                'client_phone' => $quote->client_phone,
                'location' => $quote->project_title,
                'category' => $packageName,
                'package_name' => $packageName,
                'package_addons' => ! empty($detectedAddons) ? $detectedAddons : null,
                'project_type' => 'perencanaan',
                'building_type' => $buildingType,
                'building_area' => $area,
                'estimated_budget' => $quote->effectiveDesignValue(),
                'status' => $quote->dp_paid_at ? 'ongoing' : 'planning',
                'start_date' => now()->format('Y-m-d'),
                'owner_id' => $user->id,
            ]);

            $pkgDef = collect(ProjectPackageService::packages())->firstWhere('id', $packageName);
            $stageNames = $pkgDef['default_stages'] ?? ['Tahap Konseptual V1', 'Tahap Konseptual V2', 'Tahap Pengembangan V1', 'Tahap Pengembangan V2'];
            $stages = ProjectPackageService::buildStagesWithTimeline(Carbon::today(), $stageNames);

            foreach ($stages as $st) {
                $project->stages()->create($st);
            }

            if (! empty($stages)) {
                $lastStage = end($stages);
                $project->update(['due_date' => $lastStage['client_response_date']]);
            }

            $quote->update(['project_id' => $project->id]);

            return $project;
        });

        ActivityLog::record(
            action: 'project.created',
            description: "{$user->name} mengonversi penawaran {$quote->client_name} menjadi proyek perencanaan '{$project->name}'",
            reference: $project,
            user: $user,
        );

        return redirect()
            ->route('projects.show', $project->id)
            ->with('success', "Proyek perencanaan '{$project->name}' berhasil dibuat & tersinkron dengan penawaran.");
    }

    /**
     * Delete a planning commercial document.
     */
    public function destroy(Request $request, PlanningQuote $quote): RedirectResponse
    {
        $this->authorizeAccess($request);
        $clientName = $quote->client_name;
        $quote->delete();

        return redirect()->back()->with('success', "Dokumen {$clientName} telah dihapus.");
    }

    /**
     * Download official Surat Penawaran PDF matching RIM Projects spreadsheet format.
     */
    public function pdfQuotation(Request $request, PlanningQuote $quote): HttpResponse
    {
        $this->authorizeAccess($request);
        $quote->load('items', 'project');

        $office = OfficeSetting::current();
        $logoDataUri = $this->resolveLogoDataUri($office);
        $stampDataUri = $this->resolvePublicImageDataUri('rim-stamp.png');
        $signatureDataUri = $this->resolvePublicImageDataUri('rim-signature.png');
        $refNo = $quote->documentNumber('SP');
        $slug = Str::slug($quote->client_name.'-'.$quote->project_title) ?: 'penawaran';

        return Pdf::loadView('planning-documents.quotation-pdf', [
            'quote' => $quote,
            'office' => $office,
            'logoDataUri' => $logoDataUri,
            'stampDataUri' => $stampDataUri,
            'signatureDataUri' => $signatureDataUri,
            'refNo' => $refNo,
            'stages' => $quote->survey_mode === 'included'
                ? $quote->paymentStages()
                : collect($quote->paymentStages())->where('key', '!=', 'survey')->values()->all(),
        ])
            ->setPaper('a4', 'portrait')
            ->download("Surat-Penawaran-{$slug}.pdf");
    }

    /**
     * Download official Invoice PDF for a specific stage (survey, dp, t1, t2, t3, t4).
     */
    public function pdfInvoice(Request $request, PlanningQuote $quote, string $stage): HttpResponse
    {
        $this->authorizeAccess($request);
        $quote->load('items', 'project');

        $allStages = $quote->paymentStages();
        $targetStage = collect($allStages)->firstWhere('key', $stage);
        if (! $targetStage) {
            abort(404, 'Tahap pembayaran tidak ditemukan pada dokumen ini.');
        }

        $office = OfficeSetting::current();
        $logoDataUri = $this->resolveLogoDataUri($office);
        $stampDataUri = $this->resolvePublicImageDataUri('rim-stamp.png');
        $signatureDataUri = $this->resolvePublicImageDataUri('rim-signature.png');
        $invoiceDate = Carbon::today();
        $refNo = $quote->documentNumber('INV', $targetStage['suffix'], $invoiceDate);
        $slug = Str::slug($quote->client_name.'-'.$targetStage['suffix']) ?: 'invoice';

        return Pdf::loadView('planning-documents.invoice-pdf', [
            'quote' => $quote,
            'office' => $office,
            'logoDataUri' => $logoDataUri,
            'stampDataUri' => $stampDataUri,
            'signatureDataUri' => $signatureDataUri,
            'refNo' => $refNo,
            'invoiceDate' => $invoiceDate,
            'targetStage' => $targetStage,
            'allStages' => $allStages,
        ])
            ->setPaper('a4', 'portrait')
            ->download("Invoice-{$slug}.pdf");
    }

    /**
     * Download official Kwitansi PDF with Indonesian Terbilang for a specific paid stage.
     */
    public function pdfReceipt(Request $request, PlanningQuote $quote, string $stage): HttpResponse
    {
        $this->authorizeAccess($request);
        $quote->load('items', 'project');

        $allStages = $quote->paymentStages();
        $targetStage = collect($allStages)->firstWhere('key', $stage);
        if (! $targetStage) {
            abort(404, 'Tahap pembayaran tidak ditemukan pada dokumen ini.');
        }

        $office = OfficeSetting::current();
        $logoDataUri = $this->resolveLogoDataUri($office);
        $stampDataUri = $this->resolvePublicImageDataUri('rim-stamp.png');
        $signatureDataUri = $this->resolvePublicImageDataUri('rim-signature.png');
        $paidDate = $targetStage['paid_at'] ? Carbon::parse($targetStage['paid_at']) : Carbon::today();
        $refNo = $quote->documentNumber('KWI', $targetStage['suffix'], $paidDate);
        $terbilang = PlanningQuote::terbilang((int) $targetStage['amount']);
        $slug = Str::slug($quote->client_name.'-'.$targetStage['suffix']) ?: 'kwitansi';

        return Pdf::loadView('planning-documents.receipt-pdf', [
            'quote' => $quote,
            'office' => $office,
            'logoDataUri' => $logoDataUri,
            'stampDataUri' => $stampDataUri,
            'signatureDataUri' => $signatureDataUri,
            'refNo' => $refNo,
            'paidDate' => $paidDate,
            'targetStage' => $targetStage,
            'terbilang' => $terbilang,
        ])
            ->setPaper('a4', 'portrait')
            ->download("Kwitansi-{$slug}.pdf");
    }

    /**
     * @return array<string, mixed>
     */
    private function validateQuotePayload(Request $request): array
    {
        return $request->validate([
            'project_id' => ['nullable', 'exists:projects,id'],
            'parent_quote_id' => ['nullable', 'exists:planning_quotes,id'],
            'document_kind' => ['required', Rule::in(['main', 'addendum', 'survey_only'])],
            'client_name' => ['required', 'string', 'max:180'],
            'client_phone' => ['nullable', 'string', 'max:30'],
            'project_title' => ['required', 'string', 'max:255'],
            'quote_date' => ['required', 'date'],
            'actual_area' => ['nullable', 'numeric', 'min:0'],
            'floor_breakdown' => ['nullable', 'array'],
            'floor_breakdown.*.label' => ['required_with:floor_breakdown', 'string', 'max:100'],
            'floor_breakdown.*.area' => ['required_with:floor_breakdown', 'numeric', 'min:0'],
            'discount_type' => ['nullable', Rule::in(['none', 'percent', 'fixed'])],
            'discount_value' => ['nullable', 'numeric', 'min:0'],
            'agreed_contract_value' => ['nullable', 'integer', 'min:0'],
            'survey_fee' => ['nullable', 'integer', 'min:0'],
            'survey_mode' => ['nullable', Rule::in(['excluded', 'separate_invoice', 'included'])],
            'payment_scheme_mode' => ['nullable', Rule::in(['percent', 'fixed'])],
            'dp_percent' => ['nullable', 'numeric', 'min:0', 'max:100'],
            't1_percent' => ['nullable', 'numeric', 'min:0', 'max:100'],
            't2_percent' => ['nullable', 'numeric', 'min:0', 'max:100'],
            't3_percent' => ['nullable', 'numeric', 'min:0', 'max:100'],
            't4_percent' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'dp_amount' => ['nullable', 'integer', 'min:0'],
            't1_amount' => ['nullable', 'integer', 'min:0'],
            't2_amount' => ['nullable', 'integer', 'min:0'],
            't3_amount' => ['nullable', 'integer', 'min:0'],
            't4_amount' => ['nullable', 'integer', 'min:0'],
            'status' => ['nullable', Rule::in(['follow_up', 'progress', 'done', 'cancelled'])],
            'intro_notes' => ['nullable', 'string', 'max:2000'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'items' => ['nullable', 'array'],
            'items.*.package_code' => ['nullable', 'string', 'max:30'],
            'items.*.description' => ['required_with:items', 'string', 'max:2000'],
            'items.*.unit_type' => ['required_with:items', Rule::in(['m2', 'ls'])],
            'items.*.quantity' => ['required_with:items', 'numeric', 'min:0'],
            'items.*.unit_price' => ['required_with:items', 'integer', 'min:0'],
            'items.*.notes' => ['nullable', 'string', 'max:255'],
        ]);
    }

    /**
     * Compute subtotal, discount, contract value, and normalized items.
     *
     * @param  array<string, mixed>  $validated
     * @return array{subtotal: int, discount_amount: int, contract_value: int, items: list<array<string, mixed>>}
     */
    private function computeQuoteTotals(array $validated): array
    {
        $items = [];
        $subtotal = 0;

        foreach (($validated['items'] ?? []) as $raw) {
            $unitType = $raw['unit_type'] ?? 'm2';
            $qty = $unitType === 'ls' ? 1.0 : (float) ($raw['quantity'] ?? 0);
            $unitPrice = (int) ($raw['unit_price'] ?? 0);
            $lineTotal = (int) round($qty * $unitPrice);

            $items[] = [
                'package_code' => $raw['package_code'] ?? null,
                'description' => trim((string) $raw['description']),
                'unit_type' => $unitType,
                'quantity' => $qty,
                'unit_price' => $unitPrice,
                'total_price' => $lineTotal,
                'notes' => $raw['notes'] ?? null,
            ];

            $subtotal += $lineTotal;
        }

        $discountType = $validated['discount_type'] ?? 'none';
        $discountVal = (float) ($validated['discount_value'] ?? 0);
        $discountAmount = 0;
        if ($discountType === 'percent' && $discountVal > 0) {
            $discountAmount = (int) round(($subtotal * min(100, $discountVal)) / 100);
        } elseif ($discountType === 'fixed' && $discountVal > 0) {
            $discountAmount = min($subtotal, (int) round($discountVal));
        }

        $surveyFee = (int) ($validated['survey_fee'] ?? 0);
        $surveyMode = $validated['survey_mode'] ?? 'excluded';

        if (($validated['document_kind'] ?? 'main') === 'survey_only') {
            return [
                'subtotal' => $surveyFee,
                'discount_amount' => 0,
                'contract_value' => $surveyFee,
                'items' => $items,
            ];
        }

        $contractValue = max(0, $subtotal - $discountAmount) + ($surveyMode === 'included' ? $surveyFee : 0);

        return [
            'subtotal' => $subtotal,
            'discount_amount' => $discountAmount,
            'contract_value' => $contractValue,
            'items' => $items,
        ];
    }

    /**
     * Automatically sync stage_label and status based on recorded payment dates.
     */
    private function syncStageAndStatus(PlanningQuote $quote): void
    {
        if ($quote->status === 'cancelled') {
            return;
        }

        if ($quote->document_kind === 'survey_only') {
            $quote->update([
                'stage_label' => $quote->survey_paid_at ? 'LUNAS' : 'SURVEY',
                'status' => $quote->survey_paid_at ? 'done' : 'follow_up',
            ]);

            return;
        }

        $stages = collect($quote->paymentStages())->where('key', '!=', 'survey');
        $paidStages = $stages->where('is_paid', true);

        if ($stages->isNotEmpty() && $paidStages->count() === $stages->count()) {
            $quote->update([
                'stage_label' => 'LUNAS',
                'status' => 'done',
            ]);

            return;
        }

        $lastPaid = $paidStages->last();
        if ($lastPaid) {
            $labelMap = [
                'dp' => 'DP',
                't1' => 'TERMIN 1',
                't2' => 'TERMIN 2',
                't3' => 'TERMIN 3',
                't4' => 'TERMIN 4',
            ];
            $quote->update([
                'stage_label' => $labelMap[$lastPaid['key']] ?? 'DP',
                'status' => 'progress',
            ]);

            return;
        }

        $quote->update([
            'stage_label' => 'PENAWARAN',
            'status' => $quote->status === 'done' ? 'follow_up' : $quote->status,
        ]);
    }

    /**
     * Normalize per-floor area breakdown rows.
     *
     * @param  array<int, array<string, mixed>>  $rows
     * @return list<array{label: string, area: float}>
     */
    private function normalizeFloorBreakdown(array $rows): array
    {
        return collect($rows)
            ->map(fn (array $r): array => [
                'label' => trim((string) ($r['label'] ?? '')),
                'area' => (float) ($r['area'] ?? 0),
            ])
            ->filter(fn (array $r): bool => $r['label'] !== '' && $r['area'] > 0)
            ->values()
            ->all();
    }

    /**
     * Resolve local logo image as base64 Data URI for DomPDF.
     */
    private function resolveLogoDataUri(OfficeSetting $office): ?string
    {
        $logoUrl = $office->company_logo_url ?: '/rim-projects-logo.png';
        $relative = ltrim($logoUrl, '/');
        $logoPath = public_path($relative);
        if (! is_file($logoPath)) {
            $logoPath = public_path('rim-projects-logo.png');
        }
        if (! is_file($logoPath)) {
            return null;
        }

        $ext = strtolower(pathinfo($logoPath, PATHINFO_EXTENSION)) ?: 'png';
        $mime = $ext === 'jpg' || $ext === 'jpeg' ? 'image/jpeg' : 'image/png';

        return "data:{$mime};base64,".base64_encode((string) file_get_contents($logoPath));
    }

    /**
     * Resolve a static image from public/ as a base64 Data URI for DomPDF.
     */
    private function resolvePublicImageDataUri(string $filename): ?string
    {
        $path = public_path(ltrim($filename, '/'));
        if (! is_file($path)) {
            return null;
        }

        $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION)) ?: 'png';
        $mime = $ext === 'jpg' || $ext === 'jpeg' ? 'image/jpeg' : 'image/png';

        return "data:{$mime};base64,".base64_encode((string) file_get_contents($path));
    }
}
