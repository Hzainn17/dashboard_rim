import defaultTheme from 'tailwindcss/defaultTheme';

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php',
        './storage/framework/views/*.php',
        './resources/views/**/*.blade.php',
        './resources/js/**/*.tsx',
        './resources/js/**/*.ts',
    ],

    theme: {
        extend: {
            fontFamily: {
                sans: ['Geist', ...defaultTheme.fontFamily.sans],
                mono: ['Geist Mono', ...defaultTheme.fontFamily.mono],
            },
            colors: {
                background: 'rgb(var(--background-rgb) / <alpha-value>)',
                foreground: 'rgb(var(--foreground-rgb) / <alpha-value>)',
                card: {
                    DEFAULT: 'rgb(var(--card-rgb) / <alpha-value>)',
                    foreground: 'rgb(var(--card-foreground-rgb) / <alpha-value>)',
                },
                popover: {
                    DEFAULT: 'rgb(var(--popover-rgb) / <alpha-value>)',
                    foreground: 'rgb(var(--popover-foreground-rgb) / <alpha-value>)',
                },
                primary: {
                    DEFAULT: 'rgb(var(--primary-rgb) / <alpha-value>)',
                    foreground: 'rgb(var(--primary-foreground-rgb) / <alpha-value>)',
                },
                secondary: {
                    DEFAULT: 'rgb(var(--secondary-rgb) / <alpha-value>)',
                    foreground: 'rgb(var(--secondary-foreground-rgb) / <alpha-value>)',
                },
                muted: {
                    DEFAULT: 'rgb(var(--muted-rgb) / <alpha-value>)',
                    foreground: 'rgb(var(--muted-foreground-rgb) / <alpha-value>)',
                },
                accent: {
                    DEFAULT: 'rgb(var(--accent-rgb) / <alpha-value>)',
                    foreground: 'rgb(var(--accent-foreground-rgb) / <alpha-value>)',
                },
                destructive: {
                    DEFAULT: 'rgb(var(--destructive-rgb) / <alpha-value>)',
                    foreground: 'rgb(var(--destructive-foreground-rgb) / <alpha-value>)',
                },
                success: {
                    DEFAULT: 'rgb(var(--success-rgb) / <alpha-value>)',
                    foreground: 'rgb(var(--success-foreground-rgb) / <alpha-value>)',
                },
                warning: {
                    DEFAULT: 'rgb(var(--warning-rgb) / <alpha-value>)',
                    foreground: 'rgb(var(--warning-foreground-rgb) / <alpha-value>)',
                },
                border: 'rgb(var(--border-rgb) / <alpha-value>)',
                input: 'rgb(var(--input-rgb) / <alpha-value>)',
                ring: 'rgb(var(--ring-rgb) / <alpha-value>)',
                sidebar: {
                    DEFAULT: 'rgb(var(--sidebar-rgb) / <alpha-value>)',
                    foreground: 'rgb(var(--sidebar-foreground-rgb) / <alpha-value>)',
                    primary: 'rgb(var(--sidebar-primary-rgb) / <alpha-value>)',
                    'primary-foreground': 'rgb(var(--sidebar-primary-foreground-rgb) / <alpha-value>)',
                    accent: 'rgb(var(--sidebar-accent-rgb) / <alpha-value>)',
                    'accent-foreground': 'rgb(var(--sidebar-accent-foreground-rgb) / <alpha-value>)',
                    border: 'rgb(var(--sidebar-border-rgb) / <alpha-value>)',
                    ring: 'rgb(var(--sidebar-ring-rgb) / <alpha-value>)',
                },
            },
            borderRadius: {
                xl: 'calc(var(--radius) * 1.4)',
                lg: 'var(--radius)',
                md: 'calc(var(--radius) * 0.8)',
                sm: 'calc(var(--radius) * 0.6)',
            },
            ringWidth: {
                3: '3px',
            },
            backdropBlur: {
                xs: '2px',
            },
        },
    },

    plugins: [],
};
