<?php

use App\Http\Controllers\AttendanceController;
use App\Http\Controllers\CalendarController;
use App\Http\Controllers\DailyTaskController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\EmployeeController;
use App\Http\Controllers\FieldProjectController;
use App\Http\Controllers\MyProfileController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\PayrollController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ProjectClientBriefController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\StudioSettingController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return redirect()->route('login');
});

// Public client brief form (shared to client via WhatsApp link)
Route::get('/brief/{token}', [ProjectClientBriefController::class, 'show'])
    ->middleware('throttle:brief-view')
    ->name('brief.show');
Route::post('/brief/{token}', [ProjectClientBriefController::class, 'submit'])
    ->middleware('throttle:10,1')
    ->name('brief.submit');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
    Route::post('/notifications/mark-read', [NotificationController::class, 'markRead'])->name('notifications.mark-read');

    Route::get('/attendance', [AttendanceController::class, 'index'])->name('attendance.index');
    Route::middleware('throttle:attendance-action')->group(function () {
        Route::post('/attendance/check-in', [AttendanceController::class, 'checkIn'])->name('attendance.check-in');
        Route::post('/attendance/check-out', [AttendanceController::class, 'checkOut'])->name('attendance.check-out');
        Route::post('/attendance/overtime/start', [AttendanceController::class, 'startOvertime'])->name('attendance.overtime.start');
        Route::post('/attendance/overtime/{overtime}/stop', [AttendanceController::class, 'stopOvertime'])->name('attendance.overtime.stop');
        Route::post('/attendance/leave-requests', [AttendanceController::class, 'storeLeaveRequest'])->name('attendance.leave.store');
        Route::post('/attendance/adjustment', [AttendanceController::class, 'requestAdjustment'])->name('attendance.adjustment');
        Route::post('/attendance/confirm-checkout', [AttendanceController::class, 'confirmCheckout'])->name('attendance.confirm-checkout');
        Route::post('/attendance/checkout-and-overtime', [AttendanceController::class, 'checkoutAndOvertime'])->name('attendance.checkout-and-overtime');
    });

    // Project Management & Notion-style Kanban (Perencanaan) + Simple Field Projects (Lapangan)
    Route::get('/projects', [ProjectController::class, 'index'])->name('projects.index');
    Route::get('/field-projects', [FieldProjectController::class, 'index'])->name('projects.field');
    Route::post('/field-projects', [FieldProjectController::class, 'store'])->name('projects.field.store');
    Route::get('/field-projects/{project}', [FieldProjectController::class, 'show'])->name('projects.field.show');
    Route::put('/field-projects/{project}', [FieldProjectController::class, 'update'])->name('projects.field.update');
    Route::delete('/field-projects/{project}', [FieldProjectController::class, 'destroy'])->name('projects.field.destroy');

    Route::post('/projects', [ProjectController::class, 'store'])->name('projects.store');
    Route::get('/projects/{project}', [ProjectController::class, 'show'])->name('projects.show');
    Route::put('/projects/{project}', [ProjectController::class, 'update'])->name('projects.update');
    Route::delete('/projects/{project}', [ProjectController::class, 'destroy'])->name('projects.destroy');

    // Project Tasks, Stages & Updates
    Route::post('/projects/{project}/tasks', [ProjectController::class, 'storeTask'])->name('projects.tasks.store');
    Route::put('/projects/{project}/tasks/{task}', [ProjectController::class, 'updateTask'])->name('projects.tasks.update');
    Route::patch('/projects/{project}/tasks/{task}/status', [ProjectController::class, 'updateTaskStatus'])->name('projects.tasks.update-status');
    Route::delete('/projects/{project}/tasks/{task}', [ProjectController::class, 'destroyTask'])->name('projects.tasks.destroy');
    Route::post('/projects/{project}/updates', [ProjectController::class, 'storeUpdate'])->name('projects.updates.store');
    Route::post('/projects/{project}/stages', [ProjectController::class, 'storeStage'])->name('projects.stages.store');
    Route::patch('/projects/{project}/stages/reorder', [ProjectController::class, 'reorderStages'])->name('projects.stages.reorder');
    Route::put('/projects/{project}/stages/{stage}', [ProjectController::class, 'updateStage'])->name('projects.stages.update');
    Route::delete('/projects/{project}/stages/{stage}', [ProjectController::class, 'destroyStage'])->name('projects.stages.destroy');
    Route::get('/projects/{project}/timeline/print', [ProjectController::class, 'printTimeline'])->name('projects.timeline.print');

    // Client Brief (Data Eksisting Klien)
    Route::put('/projects/{project}/brief', [ProjectClientBriefController::class, 'updateFields'])->name('projects.brief.update');
    Route::post('/projects/{project}/brief/responses', [ProjectClientBriefController::class, 'updateResponses'])->name('projects.brief.responses');
    Route::post('/projects/{project}/brief/send', [ProjectClientBriefController::class, 'markSent'])->name('projects.brief.send');
    Route::post('/projects/{project}/brief/regenerate', [ProjectClientBriefController::class, 'regenerate'])->name('projects.brief.regenerate');
    Route::post('/projects/{project}/brief/apply-template', [ProjectClientBriefController::class, 'applyTemplate'])->name('projects.brief.apply-template');
    Route::get('/projects/{project}/brief/print', [ProjectClientBriefController::class, 'print'])->name('projects.brief.print');

    // Studio & Team Calendar
    Route::get('/calendar', [CalendarController::class, 'index'])->name('calendar.index');
    Route::post('/calendar/events', [CalendarController::class, 'store'])->name('calendar.events.store');
    Route::delete('/calendar/events/{event}', [CalendarController::class, 'destroy'])->name('calendar.events.destroy');

    // Daily To-Do & Team Work Tracker (Kerja Tim / Kerja Hari Ini)
    Route::get('/daily-tasks', [DailyTaskController::class, 'index'])->name('daily-tasks.index');
    Route::post('/daily-tasks', [DailyTaskController::class, 'store'])->name('daily-tasks.store');
    Route::post('/daily-tasks/carry-over', [DailyTaskController::class, 'carryOverBatch'])->name('daily-tasks.carry-over');
    Route::patch('/daily-tasks/{dailyTask}', [DailyTaskController::class, 'updateStatus'])->name('daily-tasks.update');
    Route::delete('/daily-tasks/{dailyTask}', [DailyTaskController::class, 'destroy'])->name('daily-tasks.destroy');

    // Personal Profile, KPI & Private Payslips
    Route::get('/my-profile', [MyProfileController::class, 'index'])->name('my-profile.index');
    Route::post('/my-profile/photo', [MyProfileController::class, 'updatePhoto'])->name('my-profile.photo.update');
    Route::delete('/my-profile/photo', [MyProfileController::class, 'deletePhoto'])->name('my-profile.photo.delete');
    Route::patch('/my-profile/contact', [MyProfileController::class, 'updateContact'])->name('my-profile.contact.update');
    Route::put('/my-profile/password', [MyProfileController::class, 'updatePassword'])->name('my-profile.password.update');

    // Employee Payslips & Printable Slip PDF
    Route::get('/my-slips', [PayrollController::class, 'mySlips'])->name('payroll.my-slips');
    Route::get('/payroll/items/{item}/slip', [PayrollController::class, 'printSlip'])->name('payroll.slip');

    Route::middleware('super_admin')->group(function () {
        Route::get('/employees', [EmployeeController::class, 'index'])->name('employees.index');
        Route::post('/employees', [EmployeeController::class, 'store'])->name('employees.store');
        Route::put('/employees/{employee}', [EmployeeController::class, 'update'])->name('employees.update');
        Route::patch('/employees/{employee}/toggle-status', [EmployeeController::class, 'toggleStatus'])->name('employees.toggle-status');
        Route::delete('/employees/{employee}', [EmployeeController::class, 'destroy'])->name('employees.destroy');

        Route::get('/attendance/approvals', [AttendanceController::class, 'approvals'])->name('attendance.approvals');
        Route::patch('/attendance/approvals/site-visit/{attendance}', [AttendanceController::class, 'approveSiteVisit'])->name('attendance.approvals.site-visit');
        Route::patch('/attendance/approvals/leave/{leaveRequest}', [AttendanceController::class, 'approveLeave'])->name('attendance.approvals.leave');
        Route::patch('/attendance/approvals/overtime/{overtime}', [AttendanceController::class, 'approveOvertime'])->name('attendance.approvals.overtime');
        Route::patch('/attendance/approvals/adjustment/{attendance}', [AttendanceController::class, 'approveAdjustment'])->name('attendance.approvals.adjustment');

        Route::get('/attendance/monitoring', [AttendanceController::class, 'monitoring'])->name('attendance.monitoring');
        Route::post('/attendance/monitoring/adjust', [AttendanceController::class, 'manualAdjust'])->name('attendance.monitoring.adjust');
        Route::get('/attendance/monitoring/export', [AttendanceController::class, 'exportCsv'])->name('attendance.monitoring.export');

        // Payroll Management
        Route::get('/payroll', [PayrollController::class, 'index'])->name('payroll.index');
        Route::post('/payroll/generate', [PayrollController::class, 'generate'])
            ->middleware('throttle:payroll-generate')
            ->name('payroll.generate');
        Route::put('/payroll/items/{item}', [PayrollController::class, 'updateItem'])->name('payroll.items.update');
        Route::patch('/payroll/{payroll}/finalize', [PayrollController::class, 'finalize'])->name('payroll.finalize');
        Route::patch('/payroll/{payroll}/mark-paid', [PayrollController::class, 'markPaid'])->name('payroll.mark-paid');
        Route::delete('/payroll/{payroll}', [PayrollController::class, 'destroy'])->name('payroll.destroy');
        Route::get('/payroll/{payroll}/export-bank', [PayrollController::class, 'exportBankCsv'])->name('payroll.export-bank');

        Route::get('/settings', [StudioSettingController::class, 'index'])->name('settings.index');
        Route::put('/settings', [StudioSettingController::class, 'update'])->name('settings.update');
        Route::post('/settings/logo', [StudioSettingController::class, 'updateLogo'])->name('settings.logo.update');
        Route::delete('/settings/logo', [StudioSettingController::class, 'deleteLogo'])->name('settings.logo.delete');
        Route::post('/settings/portfolios', [StudioSettingController::class, 'storePortfolio'])->name('settings.portfolios.store');
        Route::post('/settings/portfolios/{portfolio}', [StudioSettingController::class, 'updatePortfolio'])->name('settings.portfolios.update');
        Route::delete('/settings/portfolios/{portfolio}', [StudioSettingController::class, 'destroyPortfolio'])->name('settings.portfolios.destroy');
    });
});

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';
