import fixtures from '~/mock/fixtures.json';

/**
 * UI モック：API もデータベースも持たず、mock/fixtures.json のデモデータで画面を動かす。
 * 登録系の操作は成功表示だけ返す（保存はしない）。デモデータを変えるときは fixtures.json を直接編集する。
 */
type Fx = { GET: Record<string, unknown>; public: Record<string, { customer: unknown; staff: unknown }> };
const fx = fixtures as unknown as Fx;

const notFound = () => Object.assign(new Error('Not Found'), { statusCode: 404, data: { message: 'Not Found' } });

export const mockFetch = async <T>(path: string, opts: { method?: string; query?: Record<string, unknown>; body?: unknown } = {}, hasToken = false): Promise<T> => {
  await new Promise((r) => setTimeout(r, 120)); // 通信している感じを出す
  const method = (opts.method ?? 'GET').toUpperCase();
  const q = opts.query ?? {};

  if (method !== 'GET') {
    if (path === '/auth/login') return { token: 'mock-token', user: fx.GET['/auth/me'] } as T;
    if (/\/public\/qr\/[^/]+\/scan$/.test(path)) return { scanId: 0, purpose: 'view' } as T;
    if (path.startsWith('/staff/')) return { ok: true, id: 0, passed: true, version: 3 } as T;
    if (/\/admin\/documents\/\d+\/versions$/.test(path)) return { id: 0, version: 4 } as T;
    if (path === '/admin/documents') return { id: 0 } as T;
    if (path === '/admin/machines/import') return { created: 2, skipped: [] } as T;
    if (/\/qr\/reissue$/.test(path)) return { code: 'QR-000999' } as T;
    return { ok: true } as T;
  }

  const pub = path.match(/^\/public\/qr\/([^/?]+)$/);
  if (pub) {
    const v = fx.public[pub[1]];
    if (!v) throw notFound();
    return (hasToken ? v.staff : v.customer) as T;
  }
  if (path === '/admin/qr-labels') {
    const all = fx.GET['/admin/qr-labels'] as { machineId: number }[];
    const ids = String(q.ids ?? '').split(',').map(Number).filter(Boolean);
    return (ids.length ? all.filter((l) => ids.includes(l.machineId)) : all) as T;
  }
  const key = path === '/admin/dashboard' && q.branchId ? `${path}?branchId=${q.branchId}` : path;
  if (key in fx.GET) return fx.GET[key] as T;
  throw notFound();
};
