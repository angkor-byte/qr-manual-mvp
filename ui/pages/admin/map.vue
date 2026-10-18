<script setup lang="ts">
import type { Map as LMap, Marker } from 'leaflet';

definePageMeta({ middleware: 'auth' });

interface Loc { machineId: number; machineNo: string; model: string; status: string; lat: number; lng: number; place: string | null; at: string; purpose: string; by: string | null }
type Kind = 'site' | 'yard' | 'moving';

const PURPOSE: Record<string, string> = { inspection: '出庫前点検', shipment: '出庫', return: '返却', transfer: '回送', view: '読み取り', attach: '貼付確認' };
const KIND: Record<Kind, { label: string; color: string; icon: string }> = {
  site: { label: '現場', color: '#243f9b', icon: 'pi pi-building' },
  yard: { label: 'ヤード', color: '#64748b', icon: 'pi pi-warehouse' },
  moving: { label: '回送中', color: '#c2410c', icon: 'pi pi-truck' },
};
const STALE_DAYS = 7;

const { data } = await useAsyncData('locations', () => useApi()<Loc[]>('/admin/locations'));
const kindOf = (l: Loc): Kind => (l.purpose === 'transfer' ? 'moving' : l.status === 'rented' ? 'site' : 'yard');
const daysAgo = (v: string) => Math.floor((Date.now() - new Date(v).getTime()) / 86_400_000);
const ago = (v: string) => {
  const d = daysAgo(v);
  if (d >= 1) return `${d}日前`;
  const h = Math.floor((Date.now() - new Date(v).getTime()) / 3_600_000);
  return h >= 1 ? `${h}時間前` : 'たった今';
};
const stale = (l: Loc) => daysAgo(l.at) >= STALE_DAYS;

const filter = ref<Kind | 'stale' | 'all'>('all');
const q = ref('');
const selected = ref<number | null>(null);
const all = computed(() => data.value ?? []);
const counts = computed(() => ({
  all: all.value.length,
  site: all.value.filter((l) => kindOf(l) === 'site').length,
  yard: all.value.filter((l) => kindOf(l) === 'yard').length,
  moving: all.value.filter((l) => kindOf(l) === 'moving').length,
  stale: all.value.filter(stale).length,
}));
const shown = computed(() =>
  all.value
    .filter((l) => filter.value === 'all' || (filter.value === 'stale' ? stale(l) : kindOf(l) === filter.value))
    .filter((l) => !q.value || `${l.machineNo} ${l.model} ${l.place ?? ''}`.includes(q.value)),
);
const tiles = computed(() => [
  { key: 'all' as const, label: '位置を把握', value: counts.value.all, icon: 'pi pi-map-marker', color: '#152663' },
  { key: 'site' as const, label: KIND.site.label, value: counts.value.site, icon: KIND.site.icon, color: KIND.site.color },
  { key: 'yard' as const, label: KIND.yard.label, value: counts.value.yard, icon: KIND.yard.icon, color: KIND.yard.color },
  { key: 'moving' as const, label: KIND.moving.label, value: counts.value.moving, icon: KIND.moving.icon, color: KIND.moving.color },
  { key: 'stale' as const, label: `${STALE_DAYS}日以上 更新なし`, value: counts.value.stale, icon: 'pi pi-exclamation-triangle', color: '#b43a46' },
]);

// ---- 地図 ----
const el = ref<HTMLElement>();
let map: LMap | null = null;
let L: typeof import('leaflet') | null = null;
const markers = new Map<number, Marker>();

const base = useRuntimeConfig().app.baseURL;
const groupKey = (l: Loc) => `${l.lat.toFixed(4)},${l.lng.toFixed(4)}`;

const pin = (g: Loc[], active: boolean) => {
  const l = g[0];
  const label = g.length > 1 ? `${l.place ?? '同じ場所'}　${g.length}台` : l.machineNo;
  return L!.divIcon({
    className: '',
    iconSize: [0, 0],
    html: `<div class="mq-pin ${active ? 'is-active' : ''} ${g.some(stale) ? 'is-stale' : ''}" style="--c:${KIND[kindOf(l)].color}">
      <span class="mq-dot">${g.length > 1 ? g.length : ''}</span><span class="mq-label">${label}</span></div>`,
  });
};

const row = (l: Loc) => `
  <div class="mq-pop-m">
    <div class="mq-pop-h"><b>${l.machineNo}</b><span>${l.model}</span></div>
    <div class="mq-pop-r"><i class="pi pi-clock"></i>${fmtDate(l.at)}（${ago(l.at)}）・${l.by ?? ''}・${PURPOSE[l.purpose] ?? ''}</div>
    <a class="mq-pop-a" href="${base}admin/machines/${l.machineId}">詳細を開く →</a>
  </div>`;
const popup = (g: Loc[]) => `
  <div class="mq-pop">
    <div class="mq-pop-place"><i class="${KIND[kindOf(g[0])].icon}"></i>${g[0].place ?? '位置のみ'}${g.length > 1 ? `<span>${g.length}台</span>` : ''}</div>
    ${g.map(row).join('')}
  </div>`;

const draw = (fit = true) => {
  if (!map || !L) return;
  for (const m of new Set(markers.values())) m.remove();
  markers.clear();
  const groups = new Map<string, Loc[]>();
  for (const l of shown.value) groups.set(groupKey(l), [...(groups.get(groupKey(l)) ?? []), l]);
  for (const g of groups.values()) {
    const active = g.some((l) => l.machineId === selected.value);
    const m = L.marker([g[0].lat, g[0].lng], { icon: pin(g, active), zIndexOffset: active ? 1000 : 0 })
      .addTo(map)
      .bindPopup(popup(g), { closeButton: false, offset: [0, -6], className: 'mq-popup', maxWidth: 320 })
      .on('click', () => { selected.value = g[0].machineId; });
    for (const l of g) markers.set(l.machineId, m);
  }
  if (fit && shown.value.length) {
    map.fitBounds(shown.value.map((l) => [l.lat, l.lng] as [number, number]), { padding: [60, 60], maxZoom: 14 });
  }
};

const select = (l: Loc, fly = true) => {
  selected.value = l.machineId;
  draw(false);
  if (fly) map?.flyTo([l.lat, l.lng], 15, { duration: 0.6 });
  markers.get(l.machineId)?.openPopup();
};

onMounted(async () => {
  L = await import('leaflet');
  map = L.map(el.value!, { zoomControl: false }).setView([35.17, 136.88], 12);
  L.control.zoom({ position: 'bottomright' }).addTo(map);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors', maxZoom: 19,
  }).addTo(map);
  draw();
});
watch([filter, q], () => { selected.value = null; draw(); });
onBeforeUnmount(() => map?.remove());
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-end justify-between flex-wrap gap-3">
      <div>
        <h1 class="text-2xl font-extrabold text-navy">所在マップ</h1>
        <p class="text-sm text-slate-500">社員がQRを読んだ場所と日時から、機械の最新の所在を表示します。お客様が読んだときの位置は記録しません。</p>
      </div>
      <IconField class="w-full sm:w-auto">
        <InputIcon class="pi pi-search" />
        <InputText v-model="q" placeholder="機番・機種・場所で探す" class="w-full sm:w-64" />
      </IconField>
    </div>

    <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
      <button v-for="t in tiles" :key="t.key" type="button"
        class="card p-3 text-left transition border-2"
        :class="filter === t.key ? 'border-brand shadow-sm' : 'border-transparent hover:border-slate-200'"
        @click="filter = filter === t.key ? 'all' : t.key">
        <div class="flex items-center gap-2 text-xs text-slate-500"><i :class="t.icon" :style="{ color: t.color }" />{{ t.label }}</div>
        <div class="text-2xl font-extrabold tnum mt-1" :style="{ color: t.key === 'stale' && t.value ? t.color : '#152663' }">{{ t.value }}<span class="text-sm font-normal text-slate-500"> 台</span></div>
      </button>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-[1fr_22rem] gap-4">
      <div class="card overflow-hidden relative">
        <div ref="el" class="h-[22rem] md:h-[34rem] z-0" />
        <div class="absolute left-3 bottom-3 z-[500] bg-white/95 rounded-lg shadow px-3 py-2 text-xs space-y-1">
          <div v-for="(k, key) in KIND" :key="key" class="flex items-center gap-2"><span class="w-3 h-3 rounded-full inline-block" :style="{ background: k.color }" />{{ k.label }}</div>
          <div class="flex items-center gap-2"><span class="w-3 h-3 rounded-full inline-block border-2 border-dashed border-accent" />{{ STALE_DAYS }}日以上 更新なし</div>
        </div>
      </div>

      <div class="card flex flex-col h-[24rem] lg:h-[34rem]">
        <div class="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <span class="font-bold text-navy text-sm">機械 {{ shown.length }}台</span>
          <Button v-if="filter !== 'all' || q" label="絞り込みを解除" text size="small" @click="filter = 'all'; q = ''" />
        </div>
        <ul class="flex-1 overflow-y-auto divide-y divide-slate-100">
          <li v-for="l in shown" :key="l.machineId"
            class="px-4 py-3 cursor-pointer transition"
            :class="selected === l.machineId ? 'bg-pale' : 'hover:bg-slate-50'"
            @click="select(l)">
            <div class="flex items-center justify-between gap-2">
              <span class="font-bold text-navy">{{ l.machineNo }}</span>
              <span class="text-xs font-bold px-2 py-0.5 rounded-full text-white" :style="{ background: KIND[kindOf(l)].color }">{{ KIND[kindOf(l)].label }}</span>
            </div>
            <div class="text-xs text-slate-500">{{ l.model }}</div>
            <div class="text-sm mt-1 flex items-center gap-1.5"><i class="pi pi-map-marker text-slate-400 text-xs" />{{ l.place ?? '位置のみ' }}</div>
            <div class="text-xs mt-0.5 flex items-center gap-1.5" :class="stale(l) ? 'text-accent font-bold' : 'text-slate-500'">
              <i class="pi pi-clock text-xs" />{{ ago(l.at) }}　{{ PURPOSE[l.purpose] }}・{{ l.by }}
              <i v-if="stale(l)" class="pi pi-exclamation-triangle text-xs" />
            </div>
          </li>
          <li v-if="!shown.length" class="px-4 py-10 text-center text-sm text-slate-400">該当する機械はありません</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style>
.mq-pin { position: relative; transform: translate(-7px, -7px); display: flex; align-items: center; gap: 6px; white-space: nowrap; }
.mq-dot { min-width: 16px; height: 16px; border-radius: 999px; background: var(--c); border: 3px solid #fff; box-shadow: 0 1px 4px rgba(0,0,0,.35); flex: 0 0 auto;
  color: #fff; font: 800 10px/10px "Hiragino Sans", sans-serif; display: flex; align-items: center; justify-content: center; padding: 0 2px; box-sizing: content-box; }
.leaflet-tile-pane { filter: saturate(.35) brightness(1.04); }
.mq-label { background: #fff; color: #152663; font: 700 11px/1 "Hiragino Sans", sans-serif; padding: 4px 7px; border-radius: 6px; box-shadow: 0 1px 4px rgba(0,0,0,.2); border-left: 3px solid var(--c); }
.mq-pin.is-stale .mq-dot { border-style: dashed; border-color: #b43a46; }
.mq-pin.is-active .mq-dot { transform: scale(1.25); }
.mq-pin.is-active .mq-label { background: var(--c); color: #fff; }
.mq-popup .leaflet-popup-content-wrapper { border-radius: 10px; box-shadow: 0 6px 20px rgba(21,38,99,.18); }
.mq-popup .leaflet-popup-content { margin: 12px 14px; }
.mq-pop { font: 12px/1.6 "Hiragino Sans", sans-serif; color: #1f2a4d; min-width: 200px; }
.mq-pop-h { display: flex; align-items: baseline; gap: 8px; margin-bottom: 4px; }
.mq-pop-h b { font-size: 15px; color: #152663; }
.mq-pop-h span { color: #64748b; }
.mq-pop-r { display: flex; gap: 8px; align-items: center; }
.mq-pop-r i { color: #94a3b8; font-size: 11px; width: 12px; }
.mq-pop-a { display: inline-block; margin-top: 2px; color: #243f9b; font-weight: 700; text-decoration: none; }
.mq-pop-place { display: flex; align-items: center; gap: 6px; font-weight: 800; color: #152663; font-size: 13px; padding-bottom: 6px; border-bottom: 1px solid #e5e7eb; }
.mq-pop-place span { margin-left: auto; font-size: 11px; color: #64748b; font-weight: 700; }
.mq-pop-m { padding: 7px 0; border-bottom: 1px solid #f1f5f9; }
.mq-pop-m:last-child { border-bottom: none; padding-bottom: 0; }
</style>
