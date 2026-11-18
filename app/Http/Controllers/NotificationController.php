<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    /**
     * Mark all studio notifications as read for the authenticated user.
     */
    public function markRead(Request $request): RedirectResponse
    {
        $request->user()->update([
            'notifications_read_at' => now(),
        ]);

        return redirect()->back();
    }
}
