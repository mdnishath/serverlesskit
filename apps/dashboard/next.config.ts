import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
	transpilePackages: [
		'@serverlesskit/shared',
		'@serverlesskit/core',
		'@serverlesskit/auth',
		'@serverlesskit/api',
		'@serverlesskit/db',
		'@serverlesskit/plugin-sdk',
	],
	/** Allow images from uploads path */
	images: {
		unoptimized: true,
	},
	/** Vercel serverless compatibility */
	serverExternalPackages: ['@libsql/client'],
};

export default nextConfig;
