export interface Employee {
    id: number;
    user_id: number;
    employee_code: string;
    position: string;
    department?: string | null;
    join_date: string;
    base_salary: string | number;
    fixed_allowance: string | number;
    overtime_rate_per_hour: string | number;
    bank_name?: string | null;
    bank_account_number?: string | null;
    bank_account_holder?: string | null;
    annual_leave_quota: number;
    employment_status: 'tetap' | 'kontrak' | 'magang';
}

export interface User {
    id: number;
    name: string;
    email: string;
    email_verified_at?: string | null;
    role: 'super_admin' | 'admin' | 'employee';
    phone?: string | null;
    is_active: boolean;
    photo_url?: string | null;
    employee?: Employee | null;
}

export interface ProjectStage {
    id: number;
    project_id: number;
    name: string;
    order: number;
    status: 'pending' | 'active' | 'completed';
}

export interface ProjectMember {
    id: number;
    name: string;
    photo_url?: string | null;
    pivot?: {
        role_in_project?: string;
    };
}

export interface Project {
    id: number;
    name: string;
    client_name: string;
    client_phone?: string | null;
    location?: string | null;
    category?: string | null;
    cover_image_url?: string | null;
    drive_url?: string | null;
    description?: string | null;
    status: 'planning' | 'ongoing' | 'review' | 'done' | 'on_hold';
    progress_percent: number;
    start_date?: string | null;
    due_date?: string | null;
    days_left?: number;
    owner_id: number;
    stages?: ProjectStage[];
    members?: ProjectMember[];
}

export interface Attendance {
    id: number;
    user_id: number;
    date: string;
    mode: 'office' | 'site_visit' | 'wfh';
    is_weekend: boolean;
    check_in_at?: string | null;
    check_out_at?: string | null;
    check_in_distance_meters?: number | null;
    target_work_minutes: number;
    actual_work_minutes?: number | null;
    shortage_minutes: number;
    status: 'hadir' | 'kurang_jam' | 'izin' | 'sakit' | 'cuti' | 'alpha' | 'site_visit' | 'ganti_hari';
    site_visit_project_id?: number | null;
    site_visit_status?: 'none' | 'pending' | 'approved' | 'rejected';
}

export interface CalendarEventItem {
    id: number;
    title: string;
    description?: string | null;
    location?: string | null;
    type: 'meeting' | 'site_visit' | 'deadline' | 'milestone' | 'holiday' | 'other';
    start_at: string;
    end_at: string;
    is_all_day: boolean;
    time?: string;
    end?: string;
    people?: string[];
}

export interface ActivityLogItem {
    id: number;
    user_id?: number | null;
    action: string;
    description: string;
    created_at: string;
    user?: {
        id: number;
        name: string;
        photo_url?: string | null;
    } | null;
}

export interface OfficeSettingData {
    office_name: string;
    latitude: number;
    longitude: number;
    radius_meters: number;
    standard_work_hours: number;
    overtime_cooldown_minutes: number;
    overtime_rate_per_hour: number;
}

export interface DashboardMetrics {
    present_count: number;
    total_employees: number;
    site_visit_count: number;
    active_projects_count: number;
    urgent_projects_count: number;
}

export interface SiteVisitProjectOption {
    id: number;
    name: string;
    location?: string | null;
    client_name?: string | null;
    project_type: 'perencanaan' | 'pembangunan' | 'desain_bangun';
    group: 'lapangan' | 'perencanaan';
}

export type PageProps<
    T extends Record<string, unknown> = Record<string, unknown>,
> = T & {
    studio?: {
        name: string;
        logo_url: string;
    };
    siteVisitProjects?: SiteVisitProjectOption[];
    auth: {
        user: User;
        todayAttendance?: {
            id: number;
            mode: 'office' | 'site_visit' | 'wfh';
            is_weekend?: boolean;
            status: string;
            check_in_at?: string | null;
            check_out_at?: string | null;
            elapsed_seconds?: number;
            cooldown_remaining_seconds?: number;
            target_work_minutes?: number;
            site_visit_project_id?: number | null;
            site_visit_photo_url?: string | null;
            notes?: string | null;
        } | null;
        activeOvertime?: {
            id: number;
            project_id: number;
            project_name: string;
            task_description: string;
            start_at: string;
            elapsed_seconds: number;
            status: string;
        } | null;
        todayOvertime?: {
            id: number;
            project_id: number;
            project_name: string;
            task_description: string;
            start_time: string;
            end_time?: string | null;
            duration_minutes?: number | null;
            status: 'active' | 'pending' | 'approved' | 'rejected';
        } | null;
        hasLeaveToday?: boolean;
        approvedWfhToday?: {
            id: number;
            reason: string;
            start_date: string;
            end_date: string;
        } | null;
        pendingWfhToday?: boolean;
        workType?: 'kantor' | 'lapangan';
        targetWorkHours?: number;
        targetWorkMinutes?: number;
        unclosedPastAttendance?: {
            id: number;
            date: string;
            date_formatted: string;
            check_in_time?: string | null;
            target_time?: string | null;
        } | null;
    };
    notifications?: Array<{
        id: number;
        title: string;
        time: string;
        unread: boolean;
        url: string | null;
    }>;
    sidebarBadges?: {
        approvals: number;
        daily_reviews: number;
    };
    todayUnfinishedDailyTasks?: Array<{
        id: number;
        title: string;
        status: string;
        notes?: string | null;
        project_name?: string | null;
    }>;
    flash?: {
        success?: string | null;
        error?: string | null;
    };
};
