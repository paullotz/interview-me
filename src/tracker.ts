import type { SessionEvent } from "./types";

export function getCleanSelector(target: Element): string {
  // 1. Highlight flag
  const highlightEl = target.closest("[data-interview-highlight]");
  if (highlightEl) {
    const val = highlightEl.getAttribute("data-interview-highlight");
    const tag = highlightEl.tagName.toLowerCase();
    return val && val !== "true" ? `${tag}[data-interview-highlight="${val}"]` : `${tag}[data-interview-highlight]`;
  }

  // Find closest interactive element or use target
  const interactive = (target.closest("button, a, input, select, textarea, [role='button'], form") as HTMLElement) || target;

  // 2. data-testid
  const testId = interactive.getAttribute("data-testid") || target.getAttribute("data-testid");
  if (testId) {
    return `${interactive.tagName.toLowerCase()}[data-testid="${testId}"]`;
  }

  // 3. ID
  if (interactive.id) {
    return `#${interactive.id}`;
  }

  // 4. Name (useful for form fields)
  const name = interactive.getAttribute("name");
  if (name) {
    return `${interactive.tagName.toLowerCase()}[name="${name}"]`;
  }

  // 5. aria-label
  const ariaLabel = interactive.getAttribute("aria-label");
  if (ariaLabel) {
    return `${interactive.tagName.toLowerCase()}[aria-label="${ariaLabel.slice(0, 30)}"]`;
  }

  // 6. Role
  const role = interactive.getAttribute("role");
  if (role) {
    return `${interactive.tagName.toLowerCase()}[role="${role}"]`;
  }

  // 7. Tag with meaningful classes or parent
  const tagName = interactive.tagName.toLowerCase();
  const classList = Array.from(interactive.classList)
    .filter((c) => !c.includes(":") && !c.startsWith("hover") && !c.startsWith("focus") && c.length < 24)
    .slice(0, 2);

  if (classList.length > 0) {
    return `${tagName}.${classList.join(".")}`;
  }

  const parent = interactive.parentElement;
  if (parent && parent !== document.body) {
    const parentTag = parent.tagName.toLowerCase();
    const parentId = parent.id ? `#${parent.id}` : "";
    return `${parentTag}${parentId} > ${tagName}`;
  }

  return tagName;
}

export function getCleanText(target: Element): string | undefined {
  const interactive = (target.closest("button, a, input, select, textarea, [role='button']") as HTMLElement) || target;

  const tag = interactive.tagName ? interactive.tagName.toLowerCase() : "";
  if (tag === "input" || tag === "textarea") {
    const el = interactive as any;
    if (el.type === "password") return undefined;
    return el.placeholder || el.value || undefined;
  }

  const aria = interactive.getAttribute("aria-label");
  if (aria) return aria.trim();

  const text = interactive.innerText || interactive.textContent || "";
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return undefined;
  return cleaned.length > 60 ? `${cleaned.slice(0, 57)}...` : cleaned;
}

export function setupClickTracker(onEvent: (event: SessionEvent) => void): () => void {
  if (typeof window === "undefined") return () => {};

  const handleClick = (e: MouseEvent) => {
    const target = e.target;
    if (!(target instanceof Element)) return;

    // Ignore clicks inside interview tool UI
    if (target.closest("[data-interview-ui='true']") || target.closest(".interview-me-root")) {
      return;
    }

    const selector = getCleanSelector(target);
    const text = getCleanText(target);

    onEvent({
      type: "click",
      selector,
      text,
      timestamp: Date.now(),
    });
  };

  document.addEventListener("click", handleClick, true);

  return () => {
    document.removeEventListener("click", handleClick, true);
  };
}

export function setupRouteTracker(onEvent: (event: SessionEvent) => void): () => void {
  if (typeof window === "undefined") return () => {};

  let lastPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;

  const checkPathChange = () => {
    const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (currentPath !== lastPath) {
      lastPath = currentPath;
      onEvent({
        type: "route",
        path: currentPath,
        timestamp: Date.now(),
      });
    }
  };

  const handlePopState = () => {
    checkPathChange();
  };

  const handleHashChange = () => {
    checkPathChange();
  };

  // Monkey-patch history pushState / replaceState for client side routing
  const origPushState = window.history.pushState;
  const origReplaceState = window.history.replaceState;

  window.history.pushState = function (...args) {
    const result = origPushState.apply(this, args);
    checkPathChange();
    return result;
  };

  window.history.replaceState = function (...args) {
    const result = origReplaceState.apply(this, args);
    checkPathChange();
    return result;
  };

  window.addEventListener("popstate", handlePopState);
  window.addEventListener("hashchange", handleHashChange);

  // Initial route logging when tracker starts
  onEvent({
    type: "route",
    path: lastPath,
    timestamp: Date.now(),
  });

  return () => {
    window.history.pushState = origPushState;
    window.history.replaceState = origReplaceState;
    window.removeEventListener("popstate", handlePopState);
    window.removeEventListener("hashchange", handleHashChange);
  };
}
