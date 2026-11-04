import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { plusMail, type Subscription } from '../src/index.js';
let sequence = 0;
let key: string;
const subscriptions: Subscription[] = [];
const start = (emails = ['sales@example.com'], options = {}) => {
  const result = plusMail(emails, { storageKey: key, ...options }); subscriptions.push(result); return result;
};
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
beforeEach(() => { key = `test-${++sequence}`; localStorage.clear(); document.body.innerHTML = ''; });
afterEach(() => { subscriptions.splice(0).forEach(s => s.stop()); vi.restoreAllMocks(); });
describe('plusMail', () => {
  it('rewrites text and mailto while preserving query parameters and handlers', () => {
    document.body.innerHTML = '<p>Contact SALES@example.com.</p><a href="mailto:sales@example.com?subject=Hello%20there">sales@example.com</a>';
    const link = document.querySelector('a')!; const clicked = vi.fn(); link.addEventListener('custom', clicked);
    const { id } = start(); const tagged = `sales+${id}@example.com`;
    expect(document.querySelector('p')?.textContent).toBe(`Contact ${tagged}.`);
    expect(link.getAttribute('href')).toBe(`mailto:${tagged}?subject=Hello%20there`);
    expect(link.textContent).toBe(tagged); link.dispatchEvent(new Event('custom')); expect(clicked).toHaveBeenCalledTimes(1);
  });
  it('persists a random id and reuses it on the next page', () => {
    const first = start(); expect(first.id).toMatch(/^[a-f0-9]{16}$/); first.stop();
    expect(localStorage.getItem(key)).toBe(first.id);
    document.body.innerHTML = '<p>sales@example.com</p>'; expect(start().id).toBe(first.id);
    expect(document.body.textContent).toBe(`sales+${first.id}@example.com`);
  });
  it('uses a valid stored id', () => {
    localStorage.setItem(key, '0123456789abcdef'); expect(start().id).toBe('0123456789abcdef');
  });
  it('rejects an unsafe stored id', () => {
    localStorage.setItem(key, '<script>'); expect(start().id).toMatch(/^[a-f0-9]{16}$/);
  });
  it('keeps an in-memory id if storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw Error('blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw Error('blocked'); });
    expect(start().id).toBe(start().id);
  });
  it('does not rewrite other addresses, substrings or already tagged addresses', () => {
    document.body.textContent = 'wholesales@example.com sales@example.com.au sales+old@example.com other@example.com';
    const before = document.body.textContent; start(); expect(document.body.textContent).toBe(before);
  });
  it('escapes regex characters and normalizes configured addresses', () => {
    document.body.textContent = 'a.b@example.com axb@example.com'; const { id } = start([' A.B@example.com ']);
    expect(document.body.textContent).toBe(`a.b+${id}@example.com axb@example.com`);
  });
  it('supports several recipients and encoded mailto addresses', () => {
    document.body.innerHTML = '<a href="MAILTO:sales%40example.com,info@example.com?body=sales@example.com">Email</a>';
    const { id } = start(['sales@example.com', 'info@example.com']);
    expect(document.querySelector('a')?.getAttribute('href')).toBe(`mailto:sales+${id}@example.com,info+${id}@example.com?body=sales@example.com`);
  });
  it('preserves code, form controls and editable content', () => {
    document.body.innerHTML = '<script>sales@example.com</script><style>sales@example.com</style><textarea>sales@example.com</textarea><div contenteditable="true"><b>sales@example.com</b></div>';
    const before = document.body.innerHTML; start(); expect(document.body.innerHTML).toBe(before);
  });
  it('does not double tag on repeated initialization', () => {
    document.body.textContent = 'sales@example.com'; const { id } = start(); start();
    expect(document.body.textContent).toBe(`sales+${id}@example.com`);
  });
  it('rewrites dynamically inserted and changed text and links', async () => {
    const { id } = start(); document.body.innerHTML = '<p>sales@example.com</p><a href="mailto:sales@example.com">Email</a>'; await tick();
    expect(document.querySelector('p')?.textContent).toBe(`sales+${id}@example.com`);
    document.querySelector('p')!.firstChild!.nodeValue = 'sales@example.com';
    document.querySelector('a')!.setAttribute('href', 'mailto:sales@example.com?subject=new'); await tick();
    expect(document.querySelector('p')?.textContent).toBe(`sales+${id}@example.com`);
    expect(document.querySelector('a')?.getAttribute('href')).toContain(`sales+${id}@example.com`);
  });
  it('limits changes to the configured root, including a root link', () => {
    document.body.innerHTML = '<a href="mailto:sales@example.com">sales@example.com</a><p>sales@example.com</p>';
    const root = document.querySelector('a')!; const { id } = start(undefined, { root });
    expect(root.getAttribute('href')).toBe(`mailto:sales+${id}@example.com`);
    expect(document.querySelector('p')?.textContent).toBe('sales@example.com');
  });
  it('disconnects on cleanup', async () => {
    const subscription = start(); subscription.stop(); subscription.stop(); document.body.textContent = 'sales@example.com'; await tick();
    expect(document.body.textContent).toBe('sales@example.com');
  });
  it('handles an empty address list', () => { expect(start([]).id).toMatch(/^[a-f0-9]{16}$/); });
  it.each(['invalid', 'sales+existing@example.com'])('rejects invalid base %s', email => {
    expect(() => start([email])).toThrow(TypeError);
  });
});
