import { writable } from "svelte/store";

// Open state of the keyboard shortcuts overlay, toggled by `?` and the header user menu
export const shortcutsOpen = writable(false);

// Single-key shortcuts must not fire while the user is typing
export function isTextInput(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  return (
    target.isContentEditable ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    (target instanceof HTMLInputElement &&
      !["checkbox", "radio", "button", "submit", "reset"].includes(target.type))
  );
}
