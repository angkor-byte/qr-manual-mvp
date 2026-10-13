/** ログイン状態（モックなので中身は飾り。QR 画面ではこれがあると社員として扱う）。 */
export const useToken = () => useCookie<string | null>('qr_token', { maxAge: 60 * 60 * 24 * 7, sameSite: 'lax' });

/** データ取得。API は持たず、同梱のデモデータ（mock/fixtures.json）で返す。 */
export const useApi = () => {
  const token = useToken();
  return <T>(path: string, opts: { method?: string; query?: Record<string, unknown>; body?: unknown } = {}) => mockFetch<T>(path, opts, !!token.value);
};

/** 書類 PDF の URL（同梱の PDF を開く） */
export const useFileUrl = () => {
  const base = useRuntimeConfig().app.baseURL;
  return (versionId: number, _code: string) => `${base}mock-files/${versionId}.pdf`;
};

export interface Me { id: number; name: string; role: 'admin' | 'staff'; companyName: string }
export const useMe = () => useState<Me | null>('me', () => null);

export const fmtDate = (v?: string | Date | null, withTime = true) => {
  if (!v) return '―';
  const d = new Date(v);
  const md = `${d.getMonth() + 1}/${String(d.getDate()).padStart(2, '0')}`;
  return withTime ? `${md} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}` : md;
};

export const STATUS: Record<string, { label: string; severity: string }> = {
  in_stock: { label: '在庫', severity: 'secondary' },
  rented: { label: '出庫中', severity: 'info' },
  maintenance: { label: '整備中', severity: 'warn' },
  retired: { label: '除却', severity: 'contrast' },
};
