/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    // Enable server-side Node.js APIs in route handlers
    experimental: {
        serverActions: {
            bodySizeLimit: '2mb',
        },
    },
};

export default nextConfig;
