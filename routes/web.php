<?php

use App\Http\Controllers\AttendanceController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\EmployeeController;
use App\Http\Controllers\ProfileController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return redirect()->route('login');
});

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

    Route::get('/attendance', [AttendanceController::class, 'index'])->name('attendance.index');
    Route::post('/attendance/check-in', [AttendanceController::class, 'checkIn'])->name('attendance.check-in');
    Route::post('/attendance/check-out', [AttendanceController::class, 'checkOut'])->name('attendance.check-out');
    Route::post('/attendance/overtime/start', [AttendanceController::class, 'startOvertime'])->name('attendance.overtime.start');
    Route::post('/attendance/overtime/{overtime}/stop', [AttendanceController::class, 'stopOvertime'])->name('attendance.overtime.stop');
    Route::post('/attendance/leave-requests', [AttendanceController::class, 'storeLeaveRequest'])->name('attendance.leave.store');

    Route::middleware('admin')->group(function () {
        Route::get('/employees', [EmployeeController::class, 'index'])->name('employees.index');
        Route::post('/employees', [EmployeeController::class, 'store'])->name('employees.store');
        Route::put('/employees/{employee}', [EmployeeController::class, 'update'])->name('employees.update');
        Route::patch('/employees/{employee}/toggle-status', [EmployeeController::class, 'toggleStatus'])->name('employees.toggle-status');

        Route::get('/attendance/approvals', [AttendanceController::class, 'approvals'])->name('attendance.approvals');
        Route::patch('/attendance/approvals/site-visit/{attendance}', [AttendanceController::class, 'approveSiteVisit'])->name('attendance.approvals.site-visit');
        Route::patch('/attendance/approvals/leave/{leaveRequest}', [AttendanceController::class, 'approveLeave'])->name('attendance.approvals.leave');
        Route::patch('/attendance/approvals/overtime/{overtime}', [AttendanceController::class, 'approveOvertime'])->name('attendance.approvals.overtime');

        Route::get('/attendance/monitoring', [AttendanceController::class, 'monitoring'])->name('attendance.monitoring');
        Route::post('/attendance/monitoring/adjust', [AttendanceController::class, 'manualAdjust'])->name('attendance.monitoring.adjust');
        Route::get('/attendance/monitoring/export', [AttendanceController::class, 'exportCsv'])->name('attendance.monitoring.export');
    });
});

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';
