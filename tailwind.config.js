/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './app/**/*.{js,ts,jsx,tsx,mdx}',
        './components/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            colors: {
                'brand-beige': '#F5F5F0',
                'brand-green': '#10B981',
                'brand-green-dark': '#0D9488',
                'brand-dark': '#1F2937',
            },
        },
    },
    plugins: [],
};
