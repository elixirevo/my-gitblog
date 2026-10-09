import { extensions } from '$lib/extensions/registry';
import { validateExtensions } from './extension-runtime';

export const registeredExtensions = validateExtensions(extensions);
