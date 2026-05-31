import { useCallback, useEffect, useRef } from "react";

function scrollContainerToBottom(container: HTMLElement | null) {
  if (!container) return;
  container.scrollTop = container.scrollHeight;
}

export function useChatScrollToBottom(chatId: string | null, loading: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollOnLoadRef = useRef(false);
  const sawLoadingRef = useRef(false);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      scrollContainerToBottom(containerRef.current);
      requestAnimationFrame(() => scrollContainerToBottom(containerRef.current));
    });
  }, []);

  useEffect(() => {
    if (!chatId) return;
    scrollOnLoadRef.current = true;
    sawLoadingRef.current = false;
  }, [chatId]);

  useEffect(() => {
    if (!chatId) return;
    if (loading) {
      sawLoadingRef.current = true;
      return;
    }
    if (!scrollOnLoadRef.current || !sawLoadingRef.current) return;
    scrollOnLoadRef.current = false;
    scrollToBottom();
  }, [chatId, loading, scrollToBottom]);

  return { containerRef, scrollToBottom };
}
