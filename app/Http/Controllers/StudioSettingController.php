<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\LoginPortfolio;
use App\Models\OfficeSetting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class StudioSettingController extends Controller
{
    /**
     * Display the Studio Settings & GPS Geofencing page (/settings).
     */
    public function index(): Response
    {
        $setting = OfficeSetting::current();

        return Inertia::render('Settings/Index', [
            'setting' => [
                'office_name' => $setting->office_name,
                'company_logo_url' => $setting->company_logo_url,
                'latitude' => (float) $setting->latitude,
                'longitude' => (float) $setting->longitude,
                'radius_meters' => $setting->radius_meters,
                'standard_work_hours' => $setting->standard_work_hours,
                'overtime_cooldown_minutes' => $setting->overtime_cooldown_minutes,
                'overtime_rate_per_hour' => (float) $setting->overtime_rate_per_hour,
            ],
            'portfolios' => LoginPortfolio::query()
                ->orderBy('sort_order')
                ->orderBy('id')
                ->get()
                ->map(fn (LoginPortfolio $p) => [
                    'id' => $p->id,
                    'title' => $p->title,
                    'category' => $p->category ?? '',
                    'location' => $p->location ?? '',
                    'caption' => $p->caption ?? '',
                    'image_url' => $p->image_url,
                    'sort_order' => $p->sort_order,
                ])
                ->values(),
        ]);
    }

    /**
     * Update the Studio Settings & GPS Geofencing configuration (/settings).
     */
    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'office_name' => ['required', 'string', 'max:255'],
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
            'radius_meters' => ['required', 'integer', 'min:10', 'max:10000'],
            'standard_work_hours' => ['required', 'integer', 'min:1', 'max:16'],
            'overtime_cooldown_minutes' => ['required', 'integer', 'min:0', 'max:240'],
            'overtime_rate_per_hour' => ['required', 'numeric', 'min:0'],
        ]);

        $setting = OfficeSetting::current();
        $setting->update($validated);

        ActivityLog::record(
            action: 'settings.updated',
            description: "{$request->user()->name} memperbarui Pengaturan Studio & koordinat GPS ({$setting->radius_meters}m)",
            reference: $setting,
            user: $request->user(),
        );

        return redirect()->back()->with('success', 'Pengaturan Studio & lokasi GPS absensi berhasil disimpan.');
    }

    /**
     * Upload or update the company/studio logo (/settings/logo).
     */
    public function updateLogo(Request $request): RedirectResponse
    {
        $request->validate([
            'logo' => ['required', 'image', 'max:2048'],
        ]);

        $setting = OfficeSetting::current();
        $dir = public_path('uploads/company');
        if (! File::isDirectory($dir)) {
            File::makeDirectory($dir, 0755, true);
        }

        if ($setting->company_logo_url && str_starts_with($setting->company_logo_url, '/uploads/company/')) {
            $oldPath = public_path(ltrim($setting->company_logo_url, '/'));
            if (File::exists($oldPath)) {
                File::delete($oldPath);
            }
        }

        $file = $request->file('logo');
        $filename = 'company_logo_'.time().'.'.($file->guessExtension() ?: 'png');
        $file->move($dir, $filename);

        $setting->update(['company_logo_url' => "/uploads/company/{$filename}"]);

        ActivityLog::record(
            action: 'settings.logo_updated',
            description: "{$request->user()->name} memperbarui foto/logo perusahaan",
            reference: $setting,
            user: $request->user(),
        );

        return redirect()->back()->with('success', 'Foto perusahaan berhasil diperbarui.');
    }

    /**
     * Reset the company/studio logo back to default (/settings/logo).
     */
    public function deleteLogo(Request $request): RedirectResponse
    {
        $setting = OfficeSetting::current();

        if ($setting->company_logo_url && str_starts_with($setting->company_logo_url, '/uploads/company/')) {
            $oldPath = public_path(ltrim($setting->company_logo_url, '/'));
            if (File::exists($oldPath)) {
                File::delete($oldPath);
            }
        }

        $setting->update(['company_logo_url' => null]);

        return redirect()->back()->with('success', 'Foto perusahaan dikembalikan ke logo default.');
    }

    /**
     * Store a new login page portfolio slide (/settings/portfolios).
     */
    public function storePortfolio(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:150'],
            'category' => ['nullable', 'string', 'max:100'],
            'location' => ['nullable', 'string', 'max:150'],
            'caption' => ['nullable', 'string', 'max:500'],
            'image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'image_url' => ['nullable', 'string', 'max:500'],
        ]);

        $imageUrl = $validated['image_url'] ?? '/project-covers/rumah-tropis.png';
        if ($request->hasFile('image')) {
            $dir = public_path('uploads/portfolios');
            File::ensureDirectoryExists($dir);
            $file = $request->file('image');
            $filename = 'portfolio-'.Str::random(12).'.'.($file->guessExtension() ?: 'jpg');
            $file->move($dir, $filename);
            $imageUrl = "/uploads/portfolios/{$filename}";
        }

        $maxOrder = (int) LoginPortfolio::query()->max('sort_order');

        LoginPortfolio::query()->create([
            'title' => $validated['title'],
            'category' => $validated['category'] ?? null,
            'location' => $validated['location'] ?? null,
            'caption' => $validated['caption'] ?? null,
            'image_url' => $imageUrl,
            'sort_order' => $maxOrder + 1,
        ]);

        return redirect()->back()->with('success', 'Portofolio halaman login berhasil ditambahkan.');
    }

    /**
     * Update an existing login page portfolio slide (/settings/portfolios/{portfolio}).
     */
    public function updatePortfolio(Request $request, LoginPortfolio $portfolio): RedirectResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:150'],
            'category' => ['nullable', 'string', 'max:100'],
            'location' => ['nullable', 'string', 'max:150'],
            'caption' => ['nullable', 'string', 'max:500'],
            'image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'image_url' => ['nullable', 'string', 'max:500'],
        ]);

        $imageUrl = ! empty($validated['image_url']) ? $validated['image_url'] : $portfolio->image_url;
        if ($request->hasFile('image')) {
            if ($portfolio->image_url && str_starts_with($portfolio->image_url, '/uploads/portfolios/')) {
                $oldPath = public_path(ltrim($portfolio->image_url, '/'));
                if (File::exists($oldPath)) {
                    File::delete($oldPath);
                }
            }
            $dir = public_path('uploads/portfolios');
            File::ensureDirectoryExists($dir);
            $file = $request->file('image');
            $filename = 'portfolio-'.Str::random(12).'.'.($file->guessExtension() ?: 'jpg');
            $file->move($dir, $filename);
            $imageUrl = "/uploads/portfolios/{$filename}";
        }

        $portfolio->update([
            'title' => $validated['title'],
            'category' => $validated['category'] ?? null,
            'location' => $validated['location'] ?? null,
            'caption' => $validated['caption'] ?? null,
            'image_url' => $imageUrl,
        ]);

        return redirect()->back()->with('success', 'Portofolio halaman login berhasil diperbarui.');
    }

    /**
     * Delete a login page portfolio slide (/settings/portfolios/{portfolio}).
     */
    public function destroyPortfolio(LoginPortfolio $portfolio): RedirectResponse
    {
        if ($portfolio->image_url && str_starts_with($portfolio->image_url, '/uploads/portfolios/')) {
            $oldPath = public_path(ltrim($portfolio->image_url, '/'));
            if (File::exists($oldPath)) {
                File::delete($oldPath);
            }
        }

        $portfolio->delete();

        return redirect()->back()->with('success', 'Portofolio halaman login berhasil dihapus.');
    }
}
