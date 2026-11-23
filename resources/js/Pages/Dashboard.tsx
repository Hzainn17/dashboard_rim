import { AppShell } from '@/Components/dashboard/app-shell';
import { PageProps } from '@/types';
import { Head, usePage } from '@inertiajs/react';

export default function Dashboard() {
    const { auth } = usePage<PageProps>().props;
    const isAdmin = auth?.user?.role === 'super_admin' || auth?.user?.role === 'admin';
    const initialRole = isAdmin ? 'admin' : 'karyawan';

    return (
        <>
            <Head title="Dashboard" />
            <AppShell initialRole={initialRole} />
        </>
    );
}
