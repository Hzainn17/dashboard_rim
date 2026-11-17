import { AppShell } from '@/Components/dashboard/app-shell';
import {
    EmployeeManagement,
    type EmployeeRecord,
    type EmployeeStats,
} from '@/Components/dashboard/employee-management';
import { PageProps } from '@/types';
import { Head, usePage } from '@inertiajs/react';

export default function EmployeesIndex({
    employees,
    stats,
    nextEmployeeCode,
}: {
    employees: EmployeeRecord[];
    stats: EmployeeStats;
    nextEmployeeCode: string;
}) {
    const { auth } = usePage<PageProps>().props;
    const initialRole = auth?.user?.role === 'admin' ? 'admin' : 'karyawan';

    return (
        <>
            <Head title="Data Karyawan — RIM Studio Arsitektur" />
            <AppShell initialRole={initialRole} initialActive="karyawan">
                <EmployeeManagement
                    employees={employees}
                    stats={stats}
                    nextEmployeeCode={nextEmployeeCode}
                />
            </AppShell>
        </>
    );
}
