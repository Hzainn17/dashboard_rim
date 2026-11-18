import { AppShell } from '@/Components/dashboard/app-shell';
import { PageProps } from '@/types';
import { Head, usePage } from '@inertiajs/react';

export default function Dashboard() {
    const { auth } = usePage<PageProps>().props;
    const initialRole = auth?.user?.role === 'admin' ? 'admin' : 'karyawan';

    return (
        <>
            <Head title="Dashboard" />
            <AppShell initialRole={initialRole} />
        </>
    );
}
