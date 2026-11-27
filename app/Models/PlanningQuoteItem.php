<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'planning_quote_id', 'package_code', 'description',
    'unit_type', 'quantity', 'unit_price', 'total_price', 'notes', 'order',
])]
class PlanningQuoteItem extends Model
{
    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'quantity' => 'float',
            'unit_price' => 'integer',
            'total_price' => 'integer',
            'order' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<PlanningQuote, $this>
     */
    public function quote(): BelongsTo
    {
        return $this->belongsTo(PlanningQuote::class, 'planning_quote_id');
    }
}
