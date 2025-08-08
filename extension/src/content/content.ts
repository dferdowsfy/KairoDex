// Lightweight element selector overlay for capturing text fields.
// Functional style; no global classes.

type Selection = {
  text: string;
  xpath: string;
  label?: string;
};

let selecting = false;
let hoverEl: HTMLElement | null = null;
let highlight: HTMLDivElement | null = null;
let selections: Selection[] = [];

const ensureHighlight = (): HTMLDivElement => {
  if (highlight) return highlight;
  highlight = document.createElement('div');
  Object.assign(highlight.style, {
    position: 'absolute',
    pointerEvents: 'none',
    border: '2px solid #2563eb',
    background: 'rgba(37, 99, 235, 0.12)',
    zIndex: '2147483647',
  });
  document.documentElement.appendChild(highlight);
  return highlight;
};

const removeHighlight = () => {
  highlight?.remove();
  highlight = null;
};

const getXPath = (element: Element): string => {
  if (element.id) return `//*[@id="${element.id}"]`;
  const parts: string[] = [];
  let e: Element | null = element;
  while (e && e.nodeType === Node.ELEMENT_NODE) {
    let index = 1;
    let sibling = e.previousElementSibling;
    while (sibling) {
      if (sibling.nodeName === e.nodeName) index++;
      sibling = sibling.previousElementSibling as Element | null;
    }
    parts.unshift(`${e.nodeName.toLowerCase()}[${index}]`);
    e = e.parentElement;
  }
  return '/' + parts.join('/');
};

const onMouseMove = (ev: MouseEvent) => {
  if (!selecting) return;
  const el = document.elementFromPoint(ev.clientX, ev.clientY) as HTMLElement | null;
  if (!el || el === document.documentElement || el === document.body) return;
  hoverEl = el;
  const box = el.getBoundingClientRect();
  const h = ensureHighlight();
  Object.assign(h.style, {
    top: `${box.top + window.scrollY}px`,
    left: `${box.left + window.scrollX}px`,
    width: `${box.width}px`,
    height: `${box.height}px`,
  });
};

const onClick = (ev: MouseEvent) => {
  if (!selecting) return;
  ev.preventDefault();
  ev.stopPropagation();
  if (!hoverEl) return;

  const text = (hoverEl.innerText || '').trim();
  if (text) {
    selections.push({ text, xpath: getXPath(hoverEl) });
  }
};

const onKeyDown = (ev: KeyboardEvent) => {
  if (!selecting) return;
  if (ev.key === 'Escape') {
    stopSelecting();
  } else if (ev.key === 'Enter') {
    stopSelecting();
  }
};

const startSelecting = () => {
  if (selecting) return;
  selecting = true;
  selections = [];
  document.addEventListener('mousemove', onMouseMove, true);
  document.addEventListener('click', onClick, true);
  document.addEventListener('keydown', onKeyDown, true);
};

const stopSelecting = () => {
  selecting = false;
  document.removeEventListener('mousemove', onMouseMove, true);
  document.removeEventListener('click', onClick, true);
  document.removeEventListener('keydown', onKeyDown, true);
  removeHighlight();
  chrome.runtime.sendMessage({ type: 'ah:selectionUpdate', payload: selections });
};

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === 'ah:startSelecting') {
    startSelecting();
  }
});


