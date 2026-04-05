#!/usr/bin/env node

import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execSync } from 'node:child_process';

const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

const log = (msg: string) => console.log(msg);
const success = (msg: string) => log(`${GREEN}${msg}${RESET}`);
const info = (msg: string) => log(`${CYAN}${msg}${RESET}`);

/**
 * Scaffolds a new ServerlessKit project.
 * Usage: npx create-serverlesskit my-project
 */
const main = () => {
	const projectName = process.argv[2];

	if (!projectName) {
		log(`\n${BOLD}Usage:${RESET} npx create-serverlesskit <project-name>\n`);
		log('Example: npx create-serverlesskit my-cms\n');
		process.exit(1);
	}

	const projectDir = resolve(process.cwd(), projectName);

	if (existsSync(projectDir)) {
		log(`\nError: Directory "${projectName}" already exists.\n`);
		process.exit(1);
	}

	log(`\n${BOLD}Creating ServerlessKit project: ${projectName}${RESET}\n`);

	mkdirSync(projectDir, { recursive: true });

	// package.json
	writeFileSync(join(projectDir, 'package.json'), JSON.stringify({
		name: projectName,
		version: '0.1.0',
		private: true,
		type: 'module',
		scripts: {
			dev: 'next dev --turbopack',
			build: 'next build',
			start: 'next start',
		},
		dependencies: {
			'@serverlesskit/core': '^0.1.0',
			'@serverlesskit/db': '^0.1.0',
			'@serverlesskit/auth': '^0.1.0',
			'@serverlesskit/api': '^0.1.0',
			'@serverlesskit/shared': '^0.1.0',
			'@libsql/client': '^0.14.0',
			next: '^16.0.0',
			react: '^19.0.0',
			'react-dom': '^19.0.0',
		},
		devDependencies: {
			typescript: '^5.7.0',
			'@types/node': '^20',
			'@types/react': '^19',
		},
	}, null, 2));

	// .env
	writeFileSync(join(projectDir, '.env'), [
		'# Database — local SQLite for development',
		'DATABASE_URL=file:./local.db',
		'',
		'# For production with Turso:',
		'# TURSO_URL=libsql://your-db.turso.io',
		'# TURSO_AUTH_TOKEN=your-token',
		'',
		'# Auth',
		'AUTH_SECRET=change-me-in-production',
		'',
	].join('\n'));

	// .gitignore
	writeFileSync(join(projectDir, '.gitignore'), [
		'node_modules', '.next', '*.db', '*.db-journal',
		'.env', '.env.local', '.turbo',
	].join('\n'));

	// serverlesskit.config.ts
	writeFileSync(join(projectDir, 'serverlesskit.config.ts'), [
		'/** ServerlessKit configuration */',
		'export default {',
		"  adapter: 'node',",
		'  database: {',
		"    provider: 'turso',",
		'    url: process.env.TURSO_URL ?? process.env.DATABASE_URL,',
		'    authToken: process.env.TURSO_AUTH_TOKEN,',
		'  },',
		'};',
		'',
	].join('\n'));

	// Example schema
	mkdirSync(join(projectDir, 'collections'), { recursive: true });
	writeFileSync(join(projectDir, 'collections', 'blog-posts.ts'), [
		"import { defineCollection, field } from '@serverlesskit/core/schema';",
		'',
		'export const blogPosts = defineCollection({',
		"  name: 'Blog Posts',",
		'  fields: {',
		"    title: field.text({ required: true, min: 3, max: 200 }),",
		"    slug: field.slug({ unique: true }),",
		'    content: field.richtext(),',
		"    status: field.select({ options: ['draft', 'published'], default: 'draft' }),",
		'    coverImage: field.media(),',
		'    publishedAt: field.datetime({ required: false }),',
		'  },',
		'  timestamps: true,',
		'  softDelete: true,',
		'});',
		'',
	].join('\n'));

	// tsconfig.json
	writeFileSync(join(projectDir, 'tsconfig.json'), JSON.stringify({
		compilerOptions: {
			target: 'ES2022',
			module: 'ESNext',
			moduleResolution: 'bundler',
			strict: true,
			esModuleInterop: true,
			skipLibCheck: true,
			jsx: 'preserve',
		},
		include: ['**/*.ts', '**/*.tsx'],
		exclude: ['node_modules'],
	}, null, 2));

	// README
	writeFileSync(join(projectDir, 'README.md'), [
		`# ${projectName}`,
		'',
		'Built with [ServerlessKit](https://github.com/mdnishath/serverlesskit).',
		'',
		'## Getting Started',
		'',
		'```bash',
		'npm install',
		'npm run dev',
		'```',
		'',
		'Open http://localhost:3000 and register your admin account.',
		'',
	].join('\n'));

	info('Installing dependencies...');

	try {
		execSync('npm install', { cwd: projectDir, stdio: 'inherit' });
	} catch {
		log('\nCould not install dependencies automatically.');
		log(`Run "cd ${projectName} && npm install" manually.\n`);
	}

	log('');
	success('Project created successfully!');
	log('');
	log(`  ${BOLD}cd ${projectName}${RESET}`);
	log(`  ${BOLD}npm run dev${RESET}`);
	log('');
	log('Then open http://localhost:3000 and register your admin account.');
	log('');
};

main();
