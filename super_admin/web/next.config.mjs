/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  basePath: "/superadmin",
  assetPrefix: "/superadmin",

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;