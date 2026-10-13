<script setup lang="ts">
definePageMeta({ middleware: 'auth', layout: 'plain' });

interface Label { machineId: number; machineNo: string; model: string; branch: string; company: string; code: string | null }
const route = useRoute();
const { data } = await useAsyncData('labels', () => useApi()<Label[]>('/admin/qr-labels', { query: { ids: route.query.ids } }));
const doPrint = () => window.print();
</script>

<template>
  <div class="p-6 print:p-0">
    <div class="no-print flex items-center gap-3 mb-4">
      <Button icon="pi pi-arrow-left" label="戻る" text @click="$router.back()" />
      <Button icon="pi pi-print" label="印刷する" @click="doPrint" />
      <span class="text-sm text-slate-500">A4 に 2列 × 4段（1枚 約90mm × 60mm）</span>
    </div>
    <div class="sheet">
      <div v-for="l in (data ?? []).filter((x) => x.code)" :key="l.machineId" class="label">
        <div class="lt">安全マニュアル・取扱説明書</div>
        <div class="lb">
          <QrSvg :code="l.code!" class="qr" />
          <div class="li">
            <b>{{ l.machineNo }}</b>
            <span>{{ l.model }}</span>
            <span>{{ l.branch }}</span>
            <span class="code">{{ l.code }}</span>
          </div>
        </div>
        <div class="lf">スマホのカメラで読み取ってください（アプリ不要）　{{ l.company }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@page { size: A4; margin: 12mm; }
.sheet { display: grid; grid-template-columns: repeat(2, 90mm); gap: 6mm; }
.label { width: 90mm; height: 60mm; border: 2px solid #152663; border-radius: 3mm; background: #fff; padding: 0 4mm 3mm; display: flex; flex-direction: column; break-inside: avoid; }
.lt { background: #152663; color: #fff; font-weight: 800; font-size: 9pt; letter-spacing: .05em; margin: 0 -4mm 3mm; padding: 1.5mm 4mm; }
.lb { display: flex; gap: 4mm; align-items: center; flex: 1; }
.qr { width: 36mm; height: 36mm; flex: 0 0 auto; }
.li { display: flex; flex-direction: column; font-size: 9pt; line-height: 1.6; color: #1f2a4d; }
.li b { font-size: 14pt; }
.li .code { color: #4a5b93; }
.lf { font-size: 7pt; color: #4a5b93; border-top: 1px dashed #b9c6ee; padding-top: 1.5mm; }
</style>
