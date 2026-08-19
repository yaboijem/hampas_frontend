/** True when an element is scrolled to (near) the bottom. */
export function isScrolledToBottom(
  el: { scrollTop: number; clientHeight: number; scrollHeight: number },
  pad = 12,
): boolean {
  return el.scrollTop + el.clientHeight >= el.scrollHeight - pad;
}
