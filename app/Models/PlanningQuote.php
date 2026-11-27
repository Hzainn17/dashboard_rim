<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

#[Fillable([
    'client_number', 'project_id', 'parent_quote_id', 'document_kind',
    'client_name', 'client_phone', 'project_title', 'quote_date', 'actual_area', 'floor_breakdown',
    'discount_type', 'discount_value', 'discount_amount',
    'survey_fee', 'survey_mode', 'survey_paid_at', 'payment_scheme_mode',
    'dp_percent', 't1_percent', 't2_percent', 't3_percent', 't4_percent',
    'dp_amount', 't1_amount', 't2_amount', 't3_amount', 't4_amount',
    'dp_paid_at', 't1_paid_at', 't2_paid_at', 't3_paid_at', 't4_paid_at',
    'subtotal_amount', 'contract_value', 'agreed_contract_value', 'status', 'stage_label',
    'intro_notes', 'notes', 'created_by',
])]
class PlanningQuote extends Model
{
    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'client_number' => 'integer',
            'quote_date' => 'date',
            'actual_area' => 'float',
            'floor_breakdown' => 'array',
            'discount_value' => 'float',
            'discount_amount' => 'integer',
            'survey_fee' => 'integer',
            'survey_paid_at' => 'date',
            'dp_percent' => 'float',
            't1_percent' => 'float',
            't2_percent' => 'float',
            't3_percent' => 'float',
            't4_percent' => 'float',
            'dp_amount' => 'integer',
            't1_amount' => 'integer',
            't2_amount' => 'integer',
            't3_amount' => 'integer',
            't4_amount' => 'integer',
            'dp_paid_at' => 'date',
            't1_paid_at' => 'date',
            't2_paid_at' => 'date',
            't3_paid_at' => 'date',
            't4_paid_at' => 'date',
            'subtotal_amount' => 'integer',
            'contract_value' => 'integer',
            'agreed_contract_value' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<Project, $this>
     */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    /**
     * @return BelongsTo<PlanningQuote, $this>
     */
    public function parentQuote(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_quote_id');
    }

    /**
     * @return HasMany<PlanningQuote, $this>
     */
    public function addendums(): HasMany
    {
        return $this->hasMany(self::class, 'parent_quote_id')->orderBy('id');
    }

    /**
     * @return HasMany<PlanningQuoteItem, $this>
     */
    public function items(): HasMany
    {
        return $this->hasMany(PlanningQuoteItem::class)->orderBy('order')->orderBy('id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Convert month number (1..12) to Roman numeral for official RIM document numbering.
     */
    public static function romanMonth(int $month): string
    {
        $map = [
            1 => 'I', 2 => 'II', 3 => 'III', 4 => 'IV',
            5 => 'V', 6 => 'VI', 7 => 'VII', 8 => 'VIII',
            9 => 'IX', 10 => 'X', 11 => 'XI', 12 => 'XII',
        ];

        return $map[$month] ?? 'I';
    }

    /**
     * Format official document reference number:
     * - SP: 006/SP-RIM/XI/2026
     * - INV: 001/INV-RIM/XI/2026-T2 (or -DP, -SRV)
     * - KWI: 001/KWI-RIM/XI/2026-T1
     */
    public function documentNumber(string $prefix = 'SP', ?string $stageSuffix = null, ?Carbon $date = null): string
    {
        $refDate = $date ?? $this->quote_date ?? Carbon::today();
        $num = str_pad((string) $this->client_number, 3, '0', STR_PAD_LEFT);
        $roman = self::romanMonth((int) $refDate->month);
        $base = "{$num}/{$prefix}-RIM/{$roman}/{$refDate->year}";

        return $stageSuffix ? "{$base}-{$stageSuffix}" : $base;
    }

    /**
     * Effective final design/contract value (uses agreed_contract_value when negotiation deal price is set).
     */
    public function effectiveDesignValue(): int
    {
        if ($this->document_kind === 'survey_only') {
            return 0;
        }

        if ($this->agreed_contract_value !== null && $this->agreed_contract_value > 0) {
            return (int) $this->agreed_contract_value;
        }

        // Design value excludes survey_fee so DP & Termin percentages apply purely to design fee,
        // while survey_fee is paid upfront right after site survey!
        $rawDesign = max(0, (int) $this->subtotal_amount - (int) $this->discount_amount);

        return $rawDesign > 0 ? $rawDesign : (int) $this->contract_value;
    }

    /**
     * Build structured payment stages:
     * 1. Biaya Survey Lokasi (paid upfront right after survey, whether included in quotation or separate invoice)
     * 2. DP & Termin 1..4 calculated from effectiveDesignValue()
     *
     * @return list<array{key: string, suffix: string, label: string, percent: float, amount: int, paid_at: string|null, paid_at_formatted: string|null, is_paid: bool}>
     */
    public function paymentStages(): array
    {
        $stages = [];

        if ($this->survey_fee > 0 && ($this->document_kind === 'survey_only' || in_array($this->survey_mode, ['separate_invoice', 'included'], true))) {
            $stages[] = [
                'key' => 'survey',
                'suffix' => 'SRV',
                'label' => 'Biaya Survey Lokasi (Pas Selesai Survey)',
                'percent' => 100.0,
                'amount' => (int) $this->survey_fee,
                'paid_at' => $this->survey_paid_at?->format('Y-m-d'),
                'paid_at_formatted' => $this->survey_paid_at?->format('d-M-Y'),
                'is_paid' => $this->survey_paid_at !== null,
            ];
        }

        if ($this->document_kind === 'survey_only') {
            return $stages;
        }

        $designBase = $this->effectiveDesignValue();
        $isFixed = ($this->payment_scheme_mode ?? 'percent') === 'fixed';

        $definitions = [
            ['key' => 'dp', 'suffix' => 'DP', 'label' => 'Down Payment', 'percent' => (float) $this->dp_percent, 'fixed' => (int) ($this->dp_amount ?? 0), 'paid_at' => $this->dp_paid_at],
            ['key' => 't1', 'suffix' => 'T1', 'label' => 'Termin 1', 'percent' => (float) $this->t1_percent, 'fixed' => (int) ($this->t1_amount ?? 0), 'paid_at' => $this->t1_paid_at],
            ['key' => 't2', 'suffix' => 'T2', 'label' => 'Termin 2', 'percent' => (float) $this->t2_percent, 'fixed' => (int) ($this->t2_amount ?? 0), 'paid_at' => $this->t2_paid_at],
            ['key' => 't3', 'suffix' => 'T3', 'label' => 'Termin 3', 'percent' => (float) $this->t3_percent, 'fixed' => (int) ($this->t3_amount ?? 0), 'paid_at' => $this->t3_paid_at],
            ['key' => 't4', 'suffix' => 'T4', 'label' => 'Termin 4', 'percent' => (float) $this->t4_percent, 'fixed' => (int) ($this->t4_amount ?? 0), 'paid_at' => $this->t4_paid_at],
        ];

        foreach ($definitions as $def) {
            if ($isFixed) {
                if ($def['fixed'] <= 0) {
                    continue;
                }
                $amount = $def['fixed'];
                $pct = $designBase > 0 ? round(($amount / $designBase) * 100, 1) : 0.0;
                $label = $def['label'];
            } else {
                if ($def['percent'] <= 0) {
                    continue;
                }
                $amount = (int) round(($designBase * $def['percent']) / 100);
                $pct = $def['percent'];
                $pctStr = fmod($def['percent'], 1.0) === 0.0
                    ? (string) (int) $def['percent']
                    : rtrim(rtrim(number_format($def['percent'], 2, '.', ''), '0'), '.');
                $label = "{$def['label']} ({$pctStr}%)";
            }

            $stages[] = [
                'key' => $def['key'],
                'suffix' => $def['suffix'],
                'label' => $label,
                'percent' => $pct,
                'amount' => $amount,
                'paid_at' => $def['paid_at']?->format('Y-m-d'),
                'paid_at_formatted' => $def['paid_at']?->format('d-M-Y'),
                'is_paid' => $def['paid_at'] !== null,
            ];
        }

        return $stages;
    }

    /**
     * Calculate total amount already paid across all stages.
     */
    public function paidTotal(): int
    {
        return (int) collect($this->paymentStages())
            ->where('is_paid', true)
            ->sum('amount');
    }

    /**
     * Calculate grand total billable (effectiveDesignValue + survey_fee if included or separate_invoice).
     */
    public function totalBillable(): int
    {
        if ($this->document_kind === 'survey_only') {
            return (int) $this->survey_fee;
        }

        $surveyAdded = in_array($this->survey_mode, ['included', 'separate_invoice'], true)
            ? (int) $this->survey_fee
            : 0;

        return $this->effectiveDesignValue() + $surveyAdded;
    }

    /**
     * Convert an integer Rupiah amount to Indonesian Terbilang text.
     */
    public static function terbilang(int $number): string
    {
        if ($number <= 0) {
            return 'Nol Rupiah';
        }

        return trim(self::terbilangWords($number)).' Rupiah';
    }

    private static function terbilangWords(int $number): string
    {
        $words = [
            '', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima',
            'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas',
        ];

        if ($number < 12) {
            return $words[$number];
        }
        if ($number < 20) {
            return self::terbilangWords($number - 10).' Belas';
        }
        if ($number < 100) {
            return trim(self::terbilangWords(intdiv($number, 10)).' Puluh '.self::terbilangWords($number % 10));
        }
        if ($number < 200) {
            return trim('Seratus '.self::terbilangWords($number - 100));
        }
        if ($number < 1000) {
            return trim(self::terbilangWords(intdiv($number, 100)).' Ratus '.self::terbilangWords($number % 100));
        }
        if ($number < 2000) {
            return trim('Seribu '.self::terbilangWords($number - 1000));
        }
        if ($number < 1000000) {
            return trim(self::terbilangWords(intdiv($number, 1000)).' Ribu '.self::terbilangWords($number % 1000));
        }
        if ($number < 1000000000) {
            return trim(self::terbilangWords(intdiv($number, 1000000)).' Juta '.self::terbilangWords($number % 1000000));
        }

        return trim(self::terbilangWords(intdiv($number, 1000000000)).' Miliar '.self::terbilangWords($number % 1000000000));
    }
}
