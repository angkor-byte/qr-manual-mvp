<script setup lang="ts">
definePageMeta({ middleware: 'auth' });

const toast = useToast();
const file = ref<File | null>(null);
const result = ref<{ created: number; skipped: string[] } | null>(null);
const busy = ref(false);
const submit = async () => {
  if (!file.value) return;
  busy.value = true;
  const fd = new FormData();
  fd.append('file', file.value);
  try {
    result.value = await useApi()<{ created: number; skipped: string[] }>('/admin/machines/import', { method: 'POST', body: fd });
    toast.add({ severity: 'success', summary: `${result.value.created}台を登録しQRを発行しました`, life: 4000 });
  } finally {
    busy.value = false;
  }
};
const sample = '機番,機種コード,機種名,支社\nSK200-0201,SK200,油圧ショベル 20tクラス,東海支社\nSK17SR-0301,SK17SR,ミニショベル,関西支社\n';
const download = () => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿' + sample], { type: 'text/csv' }));
  a.download = '機械台帳_取込見本.csv';
  a.click();
};
</script>

<template>
  <div class="space-y-4 max-w-2xl">
    <div>
      <h1 class="text-2xl font-extrabold text-navy">台帳の取込</h1>
      <p class="text-sm text-slate-500">今の機械台帳をCSVで一括登録します。登録と同時に、機番ごとにQRを発行します。</p>
    </div>
    <div class="card p-4 md:p-5 space-y-3">
      <p class="text-sm">列：<b>機番, 機種コード, 機種名, 支社</b>（1行目は見出し。未登録の機種・支社は自動で作ります。登録済みの機番は飛ばします）</p>
      <Button label="見本CSVをダウンロード" icon="pi pi-download" severity="secondary" outlined size="small" @click="download" />
      <input type="file" accept=".csv,text/csv" class="block w-full text-sm" @change="(e) => (file = (e.target as HTMLInputElement).files?.[0] ?? null)">
      <Button label="取り込む" icon="pi pi-upload" :disabled="!file" :loading="busy" @click="submit" />
      <Message v-if="result" severity="success">
        {{ result.created }}台を登録しました。<template v-if="result.skipped.length">飛ばした行：{{ result.skipped.join('、') }}</template>
      </Message>
    </div>
  </div>
</template>
