<script setup lang="ts">
definePageMeta({ middleware: 'auth' });

interface Detail {
  machine: { id: number; machineNo: string; model: string; modelCode: string; branch: string; status: string; rentedTo: string | null; storageLocation: string };
  qr: { code: string; status: string; issuedAt: string; attachedAt: string | null }[];
  documents: { id: number; typeLabel: string; title: string; scope: string; current: { id: number; version: number; publishedAt: string; note: string } | null; paperVersion: number | null }[];
  safetyFile: { loaded: boolean; at: string; by: string } | null;
  reads: { days: { date: string; count: number }[]; sinceShipment: number | null; total: number };
  location: { lat: number; lng: number; place: string | null; at: string } | null;
  timeline: { at: string; kind: string; label: string; place: string | null }[];
}

const route = useRoute();
const api = useApi();
const toast = useToast();
const { data, refresh } = await useAsyncData(`m-${route.params.id}`, () => api<Detail>(`/admin/machines/${route.params.id}`));
const active = computed(() => data.value?.qr.find((q) => q.status === 'active'));
const maxDay = computed(() => Math.max(1, ...(data.value?.reads.days.map((d) => d.count) ?? [1])));
const SCOPE: Record<string, string> = { model: '機種', common: '全機種共通', machine: 'この機体' };
const fileUrl = useFileUrl();

const reissue = async () => {
  if (!confirm('QRを再発行します。今のQRは無効になります。よろしいですか？')) return;
  const r = await api<{ code: string }>(`/admin/machines/${route.params.id}/qr/reissue`, { method: 'POST' });
  toast.add({ severity: 'success', summary: `新しいQR ${r.code} を発行しました`, detail: '印刷して貼り替えてください', life: 4000 });
  refresh();
};
</script>

<template>
  <div v-if="data" class="space-y-4">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div class="flex items-center gap-x-3 gap-y-1 flex-wrap">
        <Button icon="pi pi-arrow-left" text rounded @click="navigateTo('/admin')" />
        <h1 class="text-2xl font-extrabold text-navy">{{ data.machine.machineNo }}</h1>
        <span class="text-slate-600">{{ data.machine.model }}</span>
        <Tag :value="STATUS[data.machine.status]?.label" :severity="STATUS[data.machine.status]?.severity" />
      </div>
      <div class="flex gap-2 flex-wrap">
        <Button v-if="active" label="QR画面を開く" icon="pi pi-external-link" severity="secondary" outlined @click="navigateTo(`/q/${active.code}`, { open: { target: '_blank' } })" />
        <Button label="QRラベルを印刷" icon="pi pi-print" severity="secondary" outlined @click="navigateTo(`/admin/qr/print?ids=${data.machine.id}`)" />
        <Button label="QRを再発行" icon="pi pi-refresh" severity="danger" outlined @click="reissue" />
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div class="space-y-4">
        <div class="card p-4">
          <h2 class="font-bold text-navy mb-3">機械とQR</h2>
          <div class="flex flex-col sm:flex-row gap-4 items-start">
            <QrSvg v-if="active" :code="active.code" class="w-28 h-28 shrink-0" />
            <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              <dt class="text-slate-500">QR番号</dt><dd class="font-bold">{{ active?.code ?? '―' }}（有効）</dd>
              <dt class="text-slate-500">発行・貼付</dt><dd>{{ fmtDate(active?.issuedAt, false) }} 発行 ／ <span :class="!active?.attachedAt && 'text-accent font-bold'">{{ active?.attachedAt ? fmtDate(active.attachedAt, false) + ' 貼付' : '未貼付' }}</span></dd>
              <dt class="text-slate-500">所属</dt><dd>{{ data.machine.branch }}</dd>
              <dt class="text-slate-500">出庫先</dt><dd>{{ data.machine.rentedTo ?? '―' }}</dd>
              <dt class="text-slate-500">最終所在</dt><dd>{{ data.location ? `${data.location.place ?? '位置あり'}（${fmtDate(data.location.at)}）` : '―' }}</dd>
              <dt class="text-slate-500">安心ファイル保管場所</dt><dd>{{ data.machine.storageLocation || '―' }}</dd>
            </dl>
          </div>
          <p v-if="data.qr.length > 1" class="text-xs text-slate-500 mt-3">無効にしたQR：{{ data.qr.filter((q) => q.status === 'void').map((q) => q.code).join('、') }}</p>
        </div>

        <div class="card p-4">
          <div class="flex items-center gap-2 mb-3">
            <h2 class="font-bold text-navy">安心ファイル</h2>
            <Tag v-if="data.safetyFile?.loaded" severity="success" :value="`搭載確認済 ${fmtDate(data.safetyFile.at)}`" />
            <Tag v-else severity="danger" value="搭載未確認" />
          </div>
          <div class="overflow-x-auto -mx-4 px-4"><DataTable :value="data.documents" size="small" :table-style="{ minWidth: '34rem' }">
            <Column header="書類"><template #body="{ data: d }"><span class="font-bold">{{ d.typeLabel }}</span><br><span class="text-xs text-slate-500">{{ d.title }}</span></template></Column>
            <Column header="単位"><template #body="{ data: d }">{{ SCOPE[d.scope] }}</template></Column>
            <Column header="公開中の版"><template #body="{ data: d }">{{ d.current ? `第${d.current.version}版` : '未登録' }}</template></Column>
            <Column header="紙の版">
              <template #body="{ data: d }">
                <span v-if="!d.current">―</span>
                <Tag v-else-if="d.paperVersion === d.current.version" severity="success" :value="`第${d.paperVersion}版`" />
                <Tag v-else severity="warn" :value="d.paperVersion ? `第${d.paperVersion}版（差し替え待ち）` : '未確認'" />
              </template>
            </Column>
            <Column header=""><template #body="{ data: d }"><a v-if="d.current && active" :href="fileUrl(d.current.id, active.code)" target="_blank" class="text-brand text-sm"><i class="pi pi-file-pdf" /> 表示</a></template></Column>
          </DataTable></div>
          <p v-if="data.safetyFile" class="text-xs text-slate-500 mt-2">確認者：{{ data.safetyFile.by }}（出庫前点検）</p>
        </div>
      </div>

      <div class="space-y-4">
        <div class="card p-4">
          <h2 class="font-bold text-navy mb-1">読み取り回数（直近7日）</h2>
          <p class="text-sm text-slate-500 mb-3">
            <template v-if="data.reads.sinceShipment !== null">出庫後の現場 <b class="text-navy">{{ data.reads.sinceShipment }}回</b> ／ </template>累計 {{ data.reads.total }}回
          </p>
          <div class="flex items-end gap-2 h-28 border-b border-slate-200">
            <div v-for="d in data.reads.days" :key="d.date" class="flex-1 flex flex-col items-center justify-end h-full">
              <span class="text-xs text-slate-500 tnum">{{ d.count }}</span>
              <div class="w-full bg-brand/70 rounded-t" :style="{ height: `${Math.max(4, (d.count / maxDay) * 80)}%` }" />
            </div>
          </div>
          <div class="flex gap-2 mt-1"><span v-for="d in data.reads.days" :key="d.date" class="flex-1 text-center text-xs text-slate-500">{{ +d.date.slice(5, 7) }}/{{ +d.date.slice(8) }}</span></div>
        </div>

        <div class="card p-4">
          <h2 class="font-bold text-navy mb-3">履歴</h2>
          <Timeline :value="data.timeline" class="text-sm">
            <template #marker="{ item }">
              <span class="w-3 h-3 rounded-full block" :class="{ 'bg-emerald-600': ['inspection', 'shipment'].includes(item.kind), 'bg-brand': !['inspection', 'shipment'].includes(item.kind) }" />
            </template>
            <template #opposite="{ item }"><span class="text-slate-500 tnum whitespace-nowrap">{{ fmtDate(item.at) }}</span></template>
            <template #content="{ item }">{{ item.label }}<span v-if="item.place" class="text-slate-500">　{{ item.place }}</span></template>
          </Timeline>
        </div>
      </div>
    </div>
  </div>
</template>
