/** @type {import('next').NextConfig} */
const nextConfig = {
    // Enable server-side Node.js APIs in route handlers
    experimental: {
        serverActions: {
            bodySizeLimit: '2mb',
        },
    },
};

export default nextConfig;
