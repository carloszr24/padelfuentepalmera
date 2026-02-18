/**
 * Middleware de Next.js: protege /panel y /admin (auth, email confirmado, rol admin).
 * Reutiliza la lógica de src/proxy.ts.
 */
export { proxy as default, config } from './proxy';
