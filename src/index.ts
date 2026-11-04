export interface Options {
  storageKey?: string;
  root?: HTMLElement;
}
export interface Subscription { id: string | null; stop: () => void }
const memory = new Map<string, string>();

/** Personalize configured base addresses without replacing HTML or event handlers. */
export function plusMail(emails: readonly string[], { storageKey = 'plus-mail', root }: Options = {}): Subscription {
  if (typeof document === 'undefined') return { id: null, stop() {} };
  root ??= document.body;
  if (!root) throw new Error('Call plusMail after the DOM is available');
  const bases = [...new Set(emails.map(email => email.trim().toLowerCase()))];
  if (bases.some(email => !/^[^\s+@]+@[^\s@]+\.[^\s@]+$/.test(email))) throw new TypeError('Expected base email addresses without plus tags');
  let id = memory.get(storageKey) || '';
  try { id = localStorage.getItem(storageKey) || id; } catch {}
  if (!/^[a-f0-9]{16}$/.test(id)) {
    id = Array.from(crypto.getRandomValues(new Uint8Array(8)), byte => byte.toString(16).padStart(2, '0')).join('');
  }
  memory.set(storageKey, id);
  try { localStorage.setItem(storageKey, id); } catch {}
  if (!bases.length) return { id, stop() {} };
  const escaped = bases.map(email => email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const re = new RegExp('(^|[^+\\w.-])(' + escaped.join('|') + ')(?![\\w-]|\\.\\w)', 'gi');
  const replace = (text: string) => text.replace(re, (_, prefix: string, email: string) =>
    prefix + email.toLowerCase().replace('@', '+' + id + '@'));
  const decorate = () => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (node.parentElement?.closest('script,style,textarea,input,select,noscript,[contenteditable]')) continue;
      const next = replace(node.nodeValue || '');
      if (next !== node.nodeValue) node.nodeValue = next;
    }
    const links = [...root.querySelectorAll<HTMLAnchorElement>('a[href]')];
    if (root.matches('a[href]')) links.push(root as HTMLAnchorElement);
    for (const link of links) {
      const href = link.getAttribute('href')!;
      if (!/^mailto:/i.test(href)) continue;
      const query = href.indexOf('?');
      const end = query < 0 ? href.length : query;
      let address = href.slice(7, end);
      try { address = decodeURIComponent(address); } catch {}
      const next = replace(address);
      if (next !== address) link.setAttribute('href', 'mailto:' + next + href.slice(end));
    }
  };
  decorate();
  const observer = new MutationObserver(decorate);
  observer.observe(root, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['href'] });
  return { id, stop: () => observer.disconnect() };
}
