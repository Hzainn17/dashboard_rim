import '../css/app.css';
import './bootstrap';

import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';

const appName = 'RIM Project';

createInertiaApp({
    title: (title) => {
        const cleanTitle = title
            .replace(/\s*[—-]\s*RIM Studio Arsitektur/gi, '')
            .replace(/\s*[—-]\s*Studio Arsitektur/gi, '')
            .replace(/\s*[—-]\s*Dashboard Studio/gi, '')
            .replace(/\s*[—-]\s*RIM Studio/gi, '')
            .replace(/\s*[—-]\s*RIM Project/gi, '')
            .trim();
        return cleanTitle ? `${cleanTitle} - ${appName}` : appName;
    },
    resolve: (name) =>
        resolvePageComponent(
            `./Pages/${name}.tsx`,
            import.meta.glob('./Pages/**/*.tsx'),
        ),
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(<App {...props} />);
    },
    progress: {
        color: '#4B5563',
    },
});
