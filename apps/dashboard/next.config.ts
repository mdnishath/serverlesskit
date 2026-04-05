import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
	transpilePackages: [
		'@serverlesskit/shared',
		'@serverlesskit/core',
		'@serverlesskit/auth',
		'@serverlesskit/api',
		'@serverlesskit/db',
	],
};

export default nextConfig;
