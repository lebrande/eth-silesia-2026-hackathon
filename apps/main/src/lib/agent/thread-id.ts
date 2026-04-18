/**
 * Thread-id dla backoffice-agenta. Prefiks "bo:" pozwala odróżnić wątki
 * asystenta pracownika od wątków klienckich zapisanych w chat_sessions.
 */
export const BACKOFFICE_THREAD_PREFIX = "bo:";

export function isBackofficeThreadId(id: string): boolean {
  return id.startsWith(BACKOFFICE_THREAD_PREFIX);
}

export function newBackofficeThreadId(userId: string): string {
  return `${BACKOFFICE_THREAD_PREFIX}${userId}:${crypto.randomUUID()}`;
}

/**
 * Weryfikuje że dany threadId należy do pracownika (zabezpieczenie przed
 * próbą wstrzyknięcia id innego użytkownika z klienta).
 */
export function threadIdBelongsToUser(
  threadId: string,
  userId: string,
): boolean {
  return threadId.startsWith(`${BACKOFFICE_THREAD_PREFIX}${userId}:`);
}
