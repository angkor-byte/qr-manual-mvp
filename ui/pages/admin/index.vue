<script setup lang="ts">
definePageMeta({ middleware: 'auth' });

interface Row {
  id: number; machineNo: string; model: string; modelCode: string; branch: string; status: string; rentedTo: string | null;
  safetyFile: { loaded: boolean; at: string } | null; qr: { code: string; attached: boolean } | null;
  lastRead: string | null; monthReads: number; readSinceShipment: boolean | null;
}
interface Dash {
  kpi: { total: number; loaded: number; attached: number; monthReads: number; alerts: number };
  alerts: { machineId: number; machineNo: string; kind: string; label: string }[];
  rows: Row[];
}

const api = useApi();
const branchId = ref<number | null>(null);
const { data: masters } = await useAsyncData('masters', () => api<{ branches: { id: number; name: string }[] }>('/admin/masters'));
const { data, refresh, pending } = await useAsyncData('dash', () =>
  api<Dash>('/admin/dashboard', { query: branchId.value ? { branchId: branchId.value } : {} }), { watch: [branchId] });
const q = ref('');
const statuses = ref<string[]>([]);
const model = ref<string | null>(null);
const checks = ref<string[]>([]);
const STATUS_OPTIONS = ['rented', 'in_stock', 'maintenance'].map((v) => ({ value: v, label: STATUS[v].label }));
const CHECK_OPTIONS = [
  { value: 'alert', label: '要対応のみ' },
  { value: 'notLoaded', label: '安心ファイル未確認' },
  { value: 'notAttached', label: 'QR未貼付' },
  { value: 'unread', label: '出庫後 未読取' },
];
const modelOptions = computed(() => [...new Set((data.value?.rows ?? []).map((r) => r.model))].sort().map((m) => ({ value: m, label: m })));
const flagged = computed(() => new Set(data.value?.alerts.map((a) => a.machineId)));
const rows = computed(() => (data.value?.rows ?? []).filter((r) =>
  (!q.value || `${r.machineNo} ${r.model} ${r.rentedTo ?? ''}`.includes(q.value))
  && (!statuses.value.length || statuses.value.includes(r.status))
  && (!model.value || r.model === model.value)
  && (!checks.value.includes('alert') || flagged.value.has(r.id))
  && (!checks.value.includes('notLoaded') || !r.safetyFile?.loaded)
  && (!checks.value.includes('notAttached') || !r.qr?.attached)
  && (!checks.value.includes('unread') || r.readSinceShipment === false)));
const filtering = computed(() => !!(q.value || statuses.value.length || model.value || checks.value.length));
const reset = () => { q.value = ''; statuses.value = []; model.value = null; checks.value = []; };
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between gap-4 flex-wrap">
      <div>
        <h1 class="text-2xl font-extrabold text-navy">機械一覧</h1>
        <p class="text-sm text-slate-500">安心ファイルが積まれているか・QRが読まれたかを、全支社で確認できます。</p>
      </div>
      <div class="flex gap-2 items-center flex-wrap w-full sm:w-auto">
        <Select v-model="branchId" :options="[{ id: null, name: 'すべての支社' }, ...(masters?.branches ?? [])]" option-label="name" option-value="id" placeholder="支社" class="w-full sm:w-44" />
        <IconField class="flex-1 sm:flex-none">
          <InputIcon class="pi pi-search" />
          <InputText v-model="q" placeholder="機番・機種・出庫先" class="w-full" />
        </IconField>
        <Button icon="pi pi-refresh" severity="secondary" outlined :loading="pending" @click="refresh()" />
      </div>
    </div>

    <div v-if="data" class="grid grid-cols-2 lg:grid-cols-5 gap-3">
      <div class="card p-4"><p class="text-xs text-slate-500">対象機械</p><p class="text-3xl font-extrabold text-navy tnum">{{ data.kpi.total }}<span class="text-sm font-normal text-slate-500"> 台</span></p></div>
      <div class="card p-4"><p class="text-xs text-slate-500">安心ファイル 搭載確認済み</p><p class="text-3xl font-extrabold text-navy tnum">{{ data.kpi.loaded }}<span class="text-sm font-normal text-slate-500"> / {{ data.kpi.total }} 台</span></p></div>
      <div class="card p-4"><p class="text-xs text-slate-500">QR 貼付済み</p><p class="text-3xl font-extrabold text-navy tnum">{{ data.kpi.attached }}<span class="text-sm font-normal text-slate-500"> / {{ data.kpi.total }} 台</span></p></div>
      <div class="card p-4"><p class="text-xs text-slate-500">今月の読み取り</p><p class="text-3xl font-extrabold text-navy tnum">{{ data.kpi.monthReads }}<span class="text-sm font-normal text-slate-500"> 回</span></p></div>
      <div class="card p-4"><p class="text-xs text-slate-500">要対応</p><p class="text-3xl font-extrabold tnum" :class="data.kpi.alerts ? 'text-accent' : 'text-navy'">{{ data.kpi.alerts }}<span class="text-sm font-normal text-slate-500"> 件</span></p></div>
    </div>

    <Message v-if="data?.alerts.length" severity="error" :closable="false">
      <div class="space-y-0.5">
        <p class="font-bold">要対応</p>
        <p v-for="a in data.alerts" :key="a.kind + a.machineId" class="text-sm">
          <NuxtLink :to="`/admin/machines/${a.machineId}`" class="underline font-bold">{{ a.machineNo }}</NuxtLink>　{{ a.label }}
        </p>
      </div>
    </Message>

    <div class="card px-4 py-3 flex items-center gap-3 flex-wrap">
      <span class="text-xs font-bold text-slate-500"><i class="pi pi-filter" /> 絞り込み</span>
      <SelectButton v-model="statuses" :options="STATUS_OPTIONS" option-label="label" option-value="value" multiple size="small" />
      <Select v-model="model" :options="modelOptions" option-label="label" option-value="value" placeholder="機種" show-clear class="w-full sm:w-44" size="small" />
      <div class="flex items-center gap-3 flex-wrap">
        <label v-for="c in CHECK_OPTIONS" :key="c.value" class="flex items-center gap-1.5 text-sm cursor-pointer">
          <Checkbox v-model="checks" :value="c.value" :input-id="`chk-${c.value}`" />{{ c.label }}
        </label>
      </div>
      <span class="ml-auto text-sm text-slate-600">表示 <b class="text-navy">{{ rows.length }}</b> / {{ data?.rows.length ?? 0 }}台</span>
      <Button v-if="filtering" label="解除" icon="pi pi-times" text size="small" @click="reset" />
    </div>

    <div class="card overflow-x-auto">
      <DataTable :value="rows" :table-style="{ minWidth: '60rem' }" :loading="pending" size="small" striped-rows sort-field="machineNo" :sort-order="1"
        :row-class="(r: Row) => (flagged.has(r.id) ? '!bg-rose-50' : '')" @row-click="(e) => navigateTo(`/admin/machines/${e.data.id}`)" class="cursor-pointer">
        <Column field="machineNo" header="機番" sortable><template #body="{ data: r }"><span class="font-bold text-navy whitespace-nowrap">{{ r.machineNo }}</span></template></Column>
        <Column field="model" header="機種" sortable />
        <Column field="branch" header="支社" sortable />
        <Column field="status" header="状態" sortable><template #body="{ data: r }"><Tag :value="STATUS[r.status]?.label" :severity="STATUS[r.status]?.severity" /></template></Column>
        <Column field="rentedTo" header="出庫先"><template #body="{ data: r }">{{ r.rentedTo ?? '―' }}</template></Column>
        <Column header="安心ファイル搭載">
          <template #body="{ data: r }">
            <Tag v-if="r.safetyFile?.loaded" severity="success" value="確認済" /><Tag v-else-if="r.status === 'rented'" severity="danger" value="未確認" /><Tag v-else-if="r.status !== 'maintenance'" severity="secondary" value="未確認" /><span v-else>―</span>
            <span v-if="r.safetyFile?.loaded" class="text-xs text-slate-500 ml-1">{{ fmtDate(r.safetyFile.at) }}</span>
          </template>
        </Column>
        <Column header="QR">
          <template #body="{ data: r }">
            <Tag v-if="r.qr?.attached" severity="success" value="貼付済" /><Tag v-else severity="danger" value="未貼付" />
          </template>
        </Column>
        <Column field="lastRead" header="最終読み取り" sortable>
          <template #body="{ data: r }">
            <Tag v-if="r.readSinceShipment === false" severity="danger" value="出庫後 未読取" />
            <span v-else class="tnum">{{ fmtDate(r.lastRead) }}</span>
          </template>
        </Column>
        <Column field="monthReads" header="今月の読取" sortable class="text-right"><template #body="{ data: r }"><span class="tnum">{{ r.monthReads }}</span></template></Column>
        <template #empty><div class="py-8 text-center text-slate-400">条件に合う機械はありません</div></template>
      </DataTable>
    </div>
  </div>
</template>
