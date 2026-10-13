<script setup lang="ts">
definePageMeta({ middleware: 'auth' });

interface Model { id: number; code: string; name: string }
interface Doc {
  id: number; typeLabel: string; title: string; scope: 'model' | 'common';
  versions: { id: number; version: number; status: string; publishedAt: string; note: string }[];
  paper: { machineId: number; machineNo: string; status: string; version: number | null; upToDate: boolean }[];
}

const api = useApi();
const toast = useToast();
const { data: masters } = await useAsyncData('masters', () => api<{ models: Model[]; docTypes: Record<string, string> }>('/admin/masters'));
const route = useRoute();
const modelId = ref<number | null>(Number(route.query.model) || (masters.value?.models[0]?.id ?? null));
const { data, refresh } = await useAsyncData('model-docs', () =>
  modelId.value ? api<{ model: Model; machineCount: number; documents: Doc[] }>(`/admin/models/${modelId.value}/documents`) : Promise.resolve(null),
  { watch: [modelId] });

// 新しい版の登録
const upload = reactive({ open: false, doc: null as Doc | null, note: '', file: null as File | null, busy: false });
const openUpload = (d: Doc) => Object.assign(upload, { open: true, doc: d, note: '', file: null });
const submitUpload = async () => {
  if (!upload.file || !upload.doc) return;
  upload.busy = true;
  const fd = new FormData();
  fd.append('file', upload.file);
  fd.append('note', upload.note);
  try {
    const r = await api<{ version: number }>(`/admin/documents/${upload.doc.id}/versions`, { method: 'POST', body: fd });
    toast.add({ severity: 'success', summary: `第${r.version}版を公開しました`, detail: 'QRはそのまま。同じ機種の全機体で新しい版が表示されます', life: 5000 });
    upload.open = false;
    refresh();
  } catch {
    toast.add({ severity: 'error', summary: 'PDFファイルを選択してください', life: 4000 });
  } finally {
    upload.busy = false;
  }
};

// 書類の追加
const add = reactive({ open: false, type: 'manual', title: '', common: false });
const submitAdd = async () => {
  await api('/admin/documents', { method: 'POST', body: { type: add.type, title: add.title, modelId: add.common ? null : modelId.value } });
  add.open = false;
  add.title = '';
  refresh();
};
const typeOptions = computed(() => Object.entries(masters.value?.docTypes ?? {}).map(([value, label]) => ({ value, label })));
const done = (d: Doc) => d.paper.filter((p) => p.upToDate).length;
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h1 class="text-2xl font-extrabold text-navy">安心ファイル書類</h1>
        <p class="text-sm text-slate-500">書類は機種に1回登録すれば、同じ機種の全機体に表示されます。改版してもQRの貼り替えは不要です。</p>
      </div>
      <div class="flex gap-2">
        <Select v-model="modelId" :options="masters?.models ?? []" :option-label="(m: Model) => `${m.code}（${m.name}）`" option-value="id" class="w-72" />
        <Button label="書類を追加" icon="pi pi-plus" @click="add.open = true" />
      </div>
    </div>

    <p v-if="data" class="text-sm text-slate-600">対象 <b>{{ data.machineCount }}台</b></p>

    <div v-for="d in data?.documents ?? []" :key="d.id" class="card p-4 space-y-3">
      <div class="flex items-center justify-between flex-wrap gap-2">
        <div>
          <span class="font-bold text-navy">{{ d.typeLabel }}</span>
          <span class="text-sm text-slate-500 ml-2">{{ d.title }}</span>
          <Tag class="ml-2" :value="d.scope === 'common' ? '全機種共通' : '機種'" severity="secondary" />
        </div>
        <Button label="新しい版を登録" icon="pi pi-upload" size="small" @click="openUpload(d)" />
      </div>
      <div class="grid lg:grid-cols-2 gap-4">
        <div>
          <p class="text-xs font-bold text-slate-500 mb-1">版の履歴</p>
          <DataTable :value="d.versions" size="small">
            <Column header="版"><template #body="{ data: v }"><b>第{{ v.version }}版</b></template></Column>
            <Column header="状態"><template #body="{ data: v }"><Tag :severity="v.status === 'published' ? 'success' : 'secondary'" :value="v.status === 'published' ? '公開中' : '保管'" /></template></Column>
            <Column header="公開日"><template #body="{ data: v }">{{ new Date(v.publishedAt).toLocaleDateString('ja-JP') }}</template></Column>
            <Column field="note" header="改版内容" />
          </DataTable>
          <p v-if="!d.versions.length" class="text-sm text-slate-500">まだ登録されていません</p>
        </div>
        <div v-if="d.paper.length">
          <p class="text-xs font-bold text-slate-500 mb-1">紙の差し替え状況（第{{ d.versions[0]?.version }}版）　{{ done(d) }} / {{ d.paper.length }}台 完了</p>
          <DataTable :value="d.paper" size="small" scrollable scroll-height="220px">
            <Column field="machineNo" header="機番" />
            <Column header="紙の版"><template #body="{ data: p }">{{ p.version ? `第${p.version}版` : '―' }}</template></Column>
            <Column header="状態"><template #body="{ data: p }"><Tag :value="STATUS[p.status]?.label" :severity="STATUS[p.status]?.severity" /></template></Column>
            <Column header="差し替え">
              <template #body="{ data: p }">
                <Tag v-if="p.upToDate" severity="success" value="済" />
                <Tag v-else-if="p.status === 'rented'" severity="warn" value="返却時に実施" />
                <Tag v-else severity="danger" value="未" />
              </template>
            </Column>
          </DataTable>
        </div>
      </div>
    </div>

    <Dialog v-model:visible="upload.open" modal :header="`${upload.doc?.typeLabel}：新しい版を登録`" class="w-[28rem]">
      <div class="space-y-3">
        <input type="file" accept="application/pdf" class="block w-full text-sm" @change="(e) => (upload.file = (e.target as HTMLInputElement).files?.[0] ?? null)">
        <InputText v-model="upload.note" placeholder="改版内容（例：注意事項の追記）" class="w-full" />
        <Message severity="info" size="small">公開すると、同じ機種の全機体のQRで新しい版が表示されます。旧版は削除せず履歴に残ります。</Message>
      </div>
      <template #footer>
        <Button label="キャンセル" text @click="upload.open = false" />
        <Button label="公開する" icon="pi pi-check" :disabled="!upload.file" :loading="upload.busy" @click="submitUpload" />
      </template>
    </Dialog>

    <Dialog v-model:visible="add.open" modal header="書類を追加" class="w-[26rem]">
      <div class="space-y-3">
        <Select v-model="add.type" :options="typeOptions" option-label="label" option-value="value" class="w-full" />
        <InputText v-model="add.title" placeholder="書類名" class="w-full" />
        <div class="flex items-center gap-2"><Checkbox v-model="add.common" binary input-id="common" /><label for="common" class="text-sm">全機種共通の書類にする</label></div>
      </div>
      <template #footer>
        <Button label="キャンセル" text @click="add.open = false" />
        <Button label="追加" :disabled="!add.title" @click="submitAdd" />
      </template>
    </Dialog>
  </div>
</template>
