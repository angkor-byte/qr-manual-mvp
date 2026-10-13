<script setup lang="ts">
definePageMeta({ middleware: 'auth' });

interface Label { machineId: number; machineNo: string; model: string; branch: string; code: string | null }
const api = useApi();
const { data } = await useAsyncData('labels-all', () => api<Label[]>('/admin/qr-labels'));
const selected = ref<Label[]>([]);
const print = () => navigateTo(`/admin/qr/print?ids=${selected.value.map((l) => l.machineId).join(',')}`);
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h1 class="text-2xl font-extrabold text-navy">QR発行・印刷</h1>
        <p class="text-sm text-slate-500">機番ごとにQRが1枚発行されています。選んだ機械のQRラベルを印刷し、機体に貼り付けます。</p>
      </div>
      <Button :label="`選んだ ${selected.length} 台のラベルを印刷`" icon="pi pi-print" :disabled="!selected.length" @click="print" />
    </div>
    <div class="card overflow-hidden">
      <DataTable v-model:selection="selected" :value="data ?? []" data-key="machineId" size="small">
        <Column selection-mode="multiple" header-style="width: 3rem" />
        <Column field="machineNo" header="機番"><template #body="{ data: l }"><b class="text-navy">{{ l.machineNo }}</b></template></Column>
        <Column field="model" header="機種" />
        <Column field="branch" header="支社" />
        <Column field="code" header="QR番号" />
      </DataTable>
    </div>
    <Message severity="info" size="small">屋外用の耐候ラベルに印刷してください。汚損・剥がれた場合は、機械の詳細画面から再発行すると旧QRは自動で無効になります。</Message>
  </div>
</template>
