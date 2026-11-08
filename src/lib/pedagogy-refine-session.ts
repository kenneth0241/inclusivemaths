const THREAD_PREFIX = "inclusive-maths-pedagogy-thread-";

export function pedagogyThreadStorageKeys(threadKey: string) {
  return {
    conversation: `${THREAD_PREFIX}${threadKey}-conversation-id`,
    messages: `${THREAD_PREFIX}${threadKey}-messages`,
  };
}

export function clearPedagogyRefineSession(threadKey?: string) {
  if (typeof sessionStorage === "undefined") {
    return;
  }
  if (threadKey) {
    const { conversation, messages } = pedagogyThreadStorageKeys(threadKey);
    sessionStorage.removeItem(conversation);
    sessionStorage.removeItem(messages);
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
