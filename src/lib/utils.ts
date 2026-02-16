const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Valida que una cadena sea un UUID v4 válido.
 */
export function isValidUUID(id: string): boolean {
  return typeof id === 'string' && UUID_V4_REGEX.test(id.trim());
}
