import fixtures from '~/mock/fixtures.json';

/**
 * UI モック：API もデータベースも持たず、mock/fixtures.json のデモデータで画面を動かす。
 * 登録系の操作は成功表示だけ返す（保存はしない）。デモデータを変えるときは fixtures.json を直接編集する。
 *
 * 見える範囲はログインの種類で分かれる（本番ではアカウントに営業所を持たせて API 側で絞る）。
 *   mock-token            … 全体管理画面（本社・資産統括部）。全営業所が見える
 *   mock-office-{営業所ID} … 営業所の画面。自分の営業所の機械だけが見える
 */
type Fx = { GET: Record<string, unknown>; public: Record<string, { customer: unknown; staff: unknown }> };
const fx = fixtures as unknown as Fx;

export interface Office { id: number; branchId: number; branch: string; name: string }
interface Row { id: number; officeId: number; status: string; safetyFile: { loaded: boolean } | null; qr: { attached: boolean } | null; monthReads: number; readSinceShipment: boolean | null }
interface Dash { kpi: Record<string, number>; alerts: { machineId: number }[]; rows: Row[] }
type Masters = { offices: Office[]; models: { id: number }[] } & Record<string, unknown>;

const notFound = () => Object.assign(new Error('Not Found'), { statusCode: 404, data: { message: 'Not Found' } });

const masters = fx.GET['/admin/masters'] as Masters;
const dash = fx.GET['/admin/dashboard'] as Dash;
const officeOfMachine = new Map(dash.rows.map((r) => [r.id, r.officeId]));

/** トークンから、見える営業所を返す（null＝全営業所） */
export const officeScope = (token: string | null | undefined): number | null => {
  const m = token?.match(/^mock-office-(\d+)$/);
  return m ? Number(m[1]) : null;
};

const meFor = (token: string) => {
  const officeId = officeScope(token);
  const base = fx.GET['/auth/me'] as Record<string, unknown>;
  if (!officeId) return { ...base, scope: 'all', office: null };
  const o = masters.offices.find((x) => x.id === officeId)!;
  return { ...base, id: 100 + o.id, name: `${o.name} 担当`, scope: 'office', office: o };
};

/** 機械の一覧と数字を、営業所で絞って計算し直す */
const dashboardFor = (officeIds: number[] | null): Dash => {
  const rows = officeIds ? dash.rows.filter((r) => officeIds.includes(r.officeId)) : dash.rows;
  const ids = new Set(rows.map((r) => r.id));
  const alerts = dash.alerts.filter((a) => ids.has(a.machineId));
  return {
    kpi: {
      total: rows.length,
      loaded: rows.filter((r) => r.safetyFile?.loaded).length,
      attached: rows.filter((r) => r.qr?.attached).length,
      monthReads: rows.reduce((s, r) => s + r.monthReads, 0),
      alerts: alerts.length,
    },
    alerts,
    rows,
  };
};

/** 全体管理画面用：営業所ごとの集計 */
const officeSummary = () => masters.offices.map((o) => {
  const d = dashboardFor([o.id]);
  return { ...o, ...d.kpi, rented: d.rows.filter((r) => r.status === 'rented').length, unreadAfterShipment: d.rows.filter((r) => r.readSinceShipment === false).length };
});

export const mockFetch = async <T>(path: string, opts: { method?: string; query?: Record<string, unknown>; body?: unknown } = {}, token: string | null = null): Promise<T> => {
  await new Promise((r) => setTimeout(r, 120)); // 通信している感じを出す
  const method = (opts.method ?? 'GET').toUpperCase();
  const q = opts.query ?? {};
  const scope = officeScope(token);
  const inScope = (machineId: number) => !scope || officeOfMachine.get(machineId) === scope;

  if (method !== 'GET') {
    if (path === '/auth/login') {
      const officeId = Number((opts.body as { officeId?: number } | undefined)?.officeId) || null;
      const t = officeId ? `mock-office-${officeId}` : 'mock-token';
      return { token: t, user: meFor(t) } as T;
    }
    if (/\/public\/qr\/[^/]+\/scan$/.test(path)) return { scanId: 0, purpose: 'view' } as T;
    if (path.startsWith('/staff/')) return { ok: true, id: 0, passed: true, version: 3 } as T;
    if (/\/admin\/documents\/\d+\/versions$/.test(path)) return { id: 0, version: 4 } as T;
    if (path === '/admin/documents') return { id: 0 } as T;
    if (path === '/admin/machines/import') return { created: 2, skipped: [] } as T;
    if (/\/qr\/reissue$/.test(path)) return { code: 'QR-000999' } as T;
    return { ok: true } as T;
  }

  if (path === '/auth/me') {
    if (!token) throw notFound();
    return meFor(token) as T;
  }

  const pub = path.match(/^\/public\/qr\/([^/?]+)$/);
  if (pub) {
    const v = fx.public[pub[1]];
    if (!v) throw notFound();
    return (token ? v.staff : v.customer) as T;
  }

  if (path === '/admin/masters') {
    if (!scope) return masters as T;
    const modelIds = new Set(dash.rows.filter((r) => r.officeId === scope).map((r) => (r as unknown as { modelCode: string }).modelCode));
    return { ...masters, offices: masters.offices.filter((o) => o.id === scope), models: (masters.models as { id: number; code: string }[]).filter((m) => modelIds.has(m.code)) } as T;
  }
  if (path === '/admin/dashboard') {
    const want = Number(q.officeId) || null;
    return dashboardFor(scope ? [scope] : want ? [want] : null) as T;
  }
  if (path === '/admin/offices') {
    if (scope) throw notFound();
    return officeSummary() as T;
  }
  if (path === '/admin/qr-labels') {
    const all = (fx.GET['/admin/qr-labels'] as { machineId: number }[]).filter((l) => inScope(l.machineId));
    const ids = String(q.ids ?? '').split(',').map(Number).filter(Boolean);
    return (ids.length ? all.filter((l) => ids.includes(l.machineId)) : all) as T;
  }
  if (path === '/admin/locations') {
    return (fx.GET[path] as { machineId: number }[]).filter((l) => inScope(l.machineId)) as T;
  }
  const machine = path.match(/^\/admin\/machines\/(\d+)$/);
  if (machine && !inScope(Number(machine[1]))) throw notFound();
  if (/^\/admin\/models\/\d+\/documents$/.test(path) && scope) {
    const v = fx.GET[path] as { machineCount: number; documents: { paper: { machineId: number }[] }[] } | undefined;
    if (!v) throw notFound();
    const documents = v.documents.map((d) => ({ ...d, paper: d.paper.filter((p) => inScope(p.machineId)) }));
    const count = dash.rows.filter((r) => r.officeId === scope && (r as unknown as { modelCode: string }).modelCode === (v as unknown as { model: { code: string } }).model.code).length;
    return { ...v, machineCount: count, documents } as T;
  }
  if (path in fx.GET) return fx.GET[path] as T;
  throw notFound();
};
