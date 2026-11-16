const THREAD_PREFIX = "inclusive-maths-pedagogy-thread-";

export function pedagogyThreadStorageKeys(threadKey: string) {
  return {
    conversation: `${THREAD_PREFIX}${threadKey}-conversation-id`,
    messages: `${THREAD_PREFIX}${threadKey}-messages`,
    /** Survives React Strict Mode remounts — avoids duplicate opening API calls. */
    openingSent: `${THREAD_PREFIX}${threadKey}-opening-sent`,
  };
}

export function clearPedagogyRefineSession(threadKey?: string) {
  if (typeof sessionStorage === "undefined") {
    return;
  }
  if (threadKey) {
    const { conversation, messages, openingSent } =
      pedagogyThreadStorageKeys(threadKey);
    sessionStorage.removeItem(conversation);
    sessionStorage.removeItem(messages);
    sessionStorage.removeItem(openingSent);
    return;
  }
  const remove: string[] = [];
  for (let index = 0; index < sessionStorage.length; index += 1) {
    const key = sessionStorage.key(index);
    if (key?.startsWith(THREAD_PREFIX)) {
      remove.push(key);
    }
  }
  for (const key of remove) {
    sessionStorage.removeItem(key);
  }
}
