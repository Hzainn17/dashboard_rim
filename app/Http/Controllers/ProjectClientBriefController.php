<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\OfficeSetting;
use App\Models\Project;
use App\Models\ProjectClientBrief;
use App\Services\ClientBriefTemplate;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Contracts\View\View;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ProjectClientBriefController extends Controller
{
    /**
     * Save the customised brief form questions (/projects/{project}/brief).
     */
    public function updateFields(Request $request, Project $project): RedirectResponse
    {
        $this->authorizeManage($request, $project);

        $validated = $request->validate([
            'fields' => ['required', 'array', 'min:1', 'max:80'],
            'fields.*.key' => ['required', 'string', 'max:60', 'distinct', 'regex:/^[a-z0-9_]+$/'],
            'fields.*.section' => ['required', 'string', 'max:80'],
            'fields.*.label' => ['required', 'string', 'max:200'],
            'fields.*.type' => ['required', Rule::in(ClientBriefTemplate::fieldTypes())],
            'fields.*.required' => ['boolean'],
            'fields.*.options' => ['nullable', 'array', 'max:30'],
            'fields.*.options.*' => ['string', 'max:100'],
            'fields.*.help' => ['nullable', 'string', 'max:300'],
        ]);

        $fields = collect($validated['fields'])->map(fn (array $field): array => array_filter([
            'key' => $field['key'],
            'section' => $field['section'],
            'label' => $field['label'],
            'type' => $field['type'],
            'required' => (bool) ($field['required'] ?? false),
            'options' => in_array($field['type'], ['select', 'multiselect'], true)
                ? array_values(array_filter($field['options'] ?? []))
                : null,
            'help' => $field['help'] ?? null,
        ], fn ($value) => $value !== null))->values()->all();

        ProjectClientBrief::forProject($project)->update(['fields' => $fields]);

        return redirect()->back()->with('success', 'Form data klien berhasil disimpan.');
    }

    /**
     * Mark the brief form as sent to the client (/projects/{project}/brief/send).
     */
    public function markSent(Request $request, Project $project): RedirectResponse
    {
        $this->authorizeManage($request, $project);

        $brief = ProjectClientBrief::forProject($project);
        $brief->update([
            'status' => $brief->status === 'submitted' ? 'submitted' : 'sent',
            'sent_at' => now(),
        ]);

        ActivityLog::record(
            action: 'project.brief_sent',
            description: "{$request->user()->name} mengirim form data eksisting ke klien {$project->client_name}",
            reference: $project,
            user: $request->user(),
        );

        return redirect()->back()->with('success', 'Form ditandai sudah dikirim ke klien.');
    }

    /**
     * Regenerate the public link token (/projects/{project}/brief/regenerate).
     */
    public function regenerate(Request $request, Project $project): RedirectResponse
    {
        $this->authorizeManage($request, $project);

        ProjectClientBrief::forProject($project)->update(['token' => Str::random(40)]);

        return redirect()->back()->with('success', 'Link form baru berhasil dibuat. Link lama tidak berlaku lagi.');
    }

    /**
     * Apply one of the 3 official brief templates (Rumah Hunian / Komersial / Interior).
     */
    public function applyTemplate(Request $request, Project $project): RedirectResponse
    {
        $this->authorizeManage($request, $project);

        $validated = $request->validate([
            'building_type' => ['required', Rule::in(array_keys(Project::BUILDING_TYPES))],
        ]);

        $templateType = $validated['building_type'];

        $project->update(['building_type' => $templateType]);
        ProjectClientBrief::forProject($project)->update([
            'fields' => ClientBriefTemplate::forBuildingType($templateType),
        ]);

        $label = Project::BUILDING_TYPES[$templateType] ?? $templateType;

        return redirect()->back()->with('success', "Template formulir berhasil diganti ke {$label}.");
    }

    /**
     * Allow Admin / Lead Architect to manually fill or edit brief responses
     * (e.g. from field survey interviews before/after dealing).
     */
    public function updateResponses(Request $request, Project $project): RedirectResponse
    {
        $this->authorizeManage($request, $project);

        $brief = ProjectClientBrief::forProject($project);
        $this->saveBriefResponses($request, $brief, false);

        ActivityLog::record(
            action: 'project.brief_updated',
            description: "{$request->user()->name} mengisi/memperbarui data eksisting proyek {$project->name}",
            reference: $project,
            user: $request->user(),
        );

        return redirect()->back()->with('success', 'Data eksisting / hasil survey berhasil disimpan.');
    }

    /**
     * Studio-branded A4 PDF download or printable preview of the Client Brief (blank survey form or filled answers).
     */
    public function print(Request $request, Project $project): View|HttpResponse
    {
        if (! $project->isAccessibleBy($request->user())) {
            abort(403);
        }

        $brief = ProjectClientBrief::forProject($project);
        $office = OfficeSetting::current();
        $buildingType = $project->resolvedBuildingType();
        $templateLabels = ClientBriefTemplate::templateLabels();
        $hasResponses = ! empty(array_filter((array) ($brief->responses ?? []), fn ($v) => $v !== null && $v !== '' && $v !== []));
        $mode = $request->query('mode', $hasResponses ? 'filled' : 'blank');
        if (! in_array($mode, ['blank', 'filled'], true)) {
            $mode = 'blank';
        }

        $sections = [];
        foreach (($brief->fields ?? []) as $field) {
            $sec = $field['section'] ?? 'Umum';
            if (! isset($sections[$sec])) {
                $sections[$sec] = [];
            }
            $sections[$sec][] = $field;
        }

        $logoRel = $office->company_logo_url ?: '/rim-projects-logo.png';
        $logoPath = public_path(ltrim($logoRel, '/'));
        $logoDataUri = is_file($logoPath)
            ? 'data:'.(mime_content_type($logoPath) ?: 'image/png').';base64,'.base64_encode((string) file_get_contents($logoPath))
            : null;

        $viewData = [
            'project' => $project,
            'brief' => $brief,
            'office' => $office,
            'buildingType' => $buildingType,
            'templateTitle' => $templateLabels[$buildingType] ?? 'Formulir Informasi Klien',
            'sections' => $sections,
            'responses' => $mode === 'filled' ? ($brief->responses ?? []) : [],
            'mode' => $mode,
            'hasResponses' => $hasResponses,
            'isInterior' => $buildingType === 'interior',
            'logoDataUri' => $logoDataUri,
        ];

        if ($request->boolean('download')) {
            $slugName = Str::slug($project->name) ?: 'proyek';
            $modeLabel = $mode === 'blank' ? 'blanko-survey' : 'data-eksisting';
            $filename = "Formulir-Klien-{$slugName}-{$modeLabel}.pdf";

            return Pdf::loadView('projects.brief-pdf', $viewData)
                ->setPaper('a4', 'portrait')
                ->download($filename);
        }

        return view('projects.brief-print', $viewData);
    }

    /**
     * Public client-facing brief form (/brief/{token}).
     */
    public function show(string $token): Response
    {
        $brief = ProjectClientBrief::query()->with('project')->where('token', $token)->firstOrFail();
        $office = OfficeSetting::current();
        $buildingType = $brief->project->resolvedBuildingType();
        $templateLabels = ClientBriefTemplate::templateLabels();

        return Inertia::render('ClientBrief/Form', [
            'token' => $brief->token,
            'project' => [
                'name' => $brief->project->name,
                'client_name' => $brief->project->client_name,
                'package_name' => $brief->project->package_name ?: $brief->project->category,
                'building_type' => $buildingType,
                'template_title' => $templateLabels[$buildingType] ?? 'Formulir Informasi Klien',
            ],
            'studioInfo' => [
                'name' => $office->office_name ?: config('app.name'),
                'logo_url' => $office->company_logo_url ?: '/rim-projects-logo.png',
            ],
            'fields' => $brief->fields ?? [],
            'responses' => (object) ($brief->responses ?? []),
            'compassOptions' => ClientBriefTemplate::compassOptions(),
            'submittedAt' => $brief->submitted_at?->translatedFormat('d F Y, H:i'),
        ]);
    }

    /**
     * Store the client's answers (/brief/{token}).
     */
    public function submit(Request $request, string $token): RedirectResponse
    {
        $brief = ProjectClientBrief::query()->with('project')->where('token', $token)->firstOrFail();
        $isFirstSubmission = $brief->submitted_at === null;

        $this->saveBriefResponses($request, $brief, true);

        ActivityLog::record(
            action: 'project.brief_submitted',
            description: "Klien {$brief->project->client_name} ".($isFirstSubmission ? 'mengisi' : 'memperbarui')." data eksisting proyek {$brief->project->name}",
            reference: $brief->project,
            user: $brief->project->owner,
        );

        return redirect()->back()->with('success', 'Terima kasih! Data Anda berhasil dikirim ke tim arsitek RIM.');
    }

    /**
     * Validate and persist brief answers + uploaded files.
     */
    private function saveBriefResponses(Request $request, ProjectClientBrief $brief, bool $strictRequired): void
    {
        $fields = collect($brief->fields ?? []);
        $previous = $brief->responses ?? [];

        $rules = [];
        foreach ($fields as $field) {
            $key = $field['key'];
            $required = $strictRequired && (bool) ($field['required'] ?? false);
            $base = "answers.{$key}";

            switch ($field['type']) {
                case 'files':
                    $hasExisting = ! empty($request->input("existing.{$key}")) || ! empty($previous[$key]);
                    $rules["files.{$key}"] = [($required && ! $hasExisting) ? 'required' : 'nullable', 'array', 'max:10'];
                    $rules["files.{$key}.*"] = ['file', 'mimes:jpg,jpeg,png,webp,heic,pdf', 'max:10240'];
                    $rules["existing.{$key}"] = ['nullable', 'array'];
                    $rules["existing.{$key}.*"] = ['string', 'max:500'];
                    break;
                case 'maps':
                    $rules["{$base}.url"] = [$required ? 'required_without:'.$base.'.lat' : 'nullable', 'nullable', 'string', 'max:1000'];
                    $rules["{$base}.lat"] = ['nullable', 'numeric', 'between:-90,90'];
                    $rules["{$base}.lng"] = ['nullable', 'numeric', 'between:-180,180'];
                    break;
                case 'multiselect':
                    $rules[$base] = [$required ? 'required' : 'nullable', 'array'];
                    $rules["{$base}.*"] = ['string', 'max:150'];
                    break;
                case 'number':
                    $rules[$base] = [$required ? 'required' : 'nullable', 'numeric', 'min:0'];
                    break;
                case 'compass':
                    $rules[$base] = [$required ? 'required' : 'nullable', Rule::in(ClientBriefTemplate::compassOptions())];
                    break;
                default:
                    $rules[$base] = [$required ? 'required' : 'nullable', 'string', 'max:5000'];
            }
        }

        $request->validate($rules, [], $fields->mapWithKeys(fn (array $f) => [
            "answers.{$f['key']}" => $f['label'],
            "answers.{$f['key']}.url" => $f['label'],
            "files.{$f['key']}" => $f['label'],
        ])->all());

        $responses = [];
        $uploadDir = public_path("uploads/client-briefs/{$brief->id}");

        foreach ($fields as $field) {
            $key = $field['key'];

            if ($field['type'] === 'files') {
                $previousUrls = collect($previous[$key] ?? [])->pluck('url')->all();
                $kept = collect($previous[$key] ?? [])
                    ->filter(fn (array $file) => in_array($file['url'], (array) $request->input("existing.{$key}", []), true))
                    ->values();

                foreach (array_diff($previousUrls, $kept->pluck('url')->all()) as $removedUrl) {
                    $path = public_path(ltrim($removedUrl, '/'));
                    if (File::exists($path)) {
                        File::delete($path);
                    }
                }

                /** @var array<int, UploadedFile> $uploads */
                $uploads = $request->file("files.{$key}", []);
                foreach ($uploads as $upload) {
                    File::ensureDirectoryExists($uploadDir);
                    $filename = $key.'-'.Str::random(12).'.'.($upload->guessExtension() ?: 'jpg');
                    $upload->move($uploadDir, $filename);
                    $kept->push([
                        'url' => "/uploads/client-briefs/{$brief->id}/{$filename}",
                        'name' => $upload->getClientOriginalName(),
                    ]);
                }

                $responses[$key] = $kept->values()->all();

                continue;
            }

            $responses[$key] = $request->input("answers.{$key}");
        }

        $brief->update([
            'responses' => $responses,
            'status' => 'submitted',
            'submitted_at' => now(),
        ]);
    }

    private function authorizeManage(Request $request, Project $project): void
    {
        $user = $request->user();
        $isLead = $project->members()
            ->where('users.id', $user->id)
            ->wherePivot('role_in_project', 'like', '%Lead%')
            ->exists();

        if (! $user->isAdmin() && $project->owner_id !== $user->id && ! $isLead) {
            abort(403);
        }
    }
}
