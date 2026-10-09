import { createHash } from 'node:crypto';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ulidPattern = /^[0-9A-HJKMNP-TV-Z]{26}$/;

export const isPostId = (value: unknown): value is string =>
	typeof value === 'string' && (uuidPattern.test(value.trim()) || ulidPattern.test(value.trim()));

export const createGiscusTerm = (postId: string) =>
	`giscus-post-${createHash('sha256').update(postId).digest('hex').slice(0, 16)}`;
