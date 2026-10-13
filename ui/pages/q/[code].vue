<script setup lang="ts">
definePageMeta({ layout: 'plain' });

interface DocItem { id: number; typeLabel: string; title: string; current: { id: number; version: number; publishedAt: string } }
interface Lookup {
  status: 'active' | 'void'; code: string; message?: string; attached?: boolean; company?: string;
  machine?: { id: number; machineNo: string; modelCode: string; modelName: string; branch: string; storageLocation: string; status?: string; rentedTo?: string | null };
  documents?: DocItem[]; staff?: { name: string } | null;
}

const route = useRoute();
const code = String(route.params.code);
const api = useApi();
const toast = useToast();
const { data, refresh, error } = await useAsyncData(`q-${code}`, () => api<Lookup>(`/public/qr/${code}`));
const isStaff = computed(() => !!data.value?.staff);
const located = ref<boolean | null>(null);
// モックでは位置を取らない（保存しないので、許可の確認や警告も出さない）
// デモなので端末の位置情報は使わず、固定の位置で記録した体にする
const position = () => Promise.resolve({ lat: 35.17, lng: 136.88, accuracy: 10 });

// 画面を開いた＝1回の読み取り。社員のときだけ位置を取る（お客様には許可を求めない）
const logged = useState<boolean>(`scan-logged-${code}`, () => false);
onMounted(async () => {
  if (!data.value || data.value.status !== 'active' || logged.value) return;
  logged.value = true;
  const pos = isStaff.value ? await position() : null;
  if (isStaff.value) located.value = !!pos;
  const r = await api<{ purpose: string }>(`/public/qr/${code}/scan`, { method: 'POST', body: pos ?? {} }).catch(() => null);
  if (r?.purpose === 'attach') toast.add({ severity: 'success', summary: 'QRの貼付を確定しました', life: 3000 });
});

const toFile = useFileUrl();
const fileUrl = (d: DocItem) => toFile(d.current.id, code);

// 社員の操作
const ITEMS: Record<string, string> = {
  oil: 'エンジンオイル・作動油・冷却水', hose: '油圧ホース・配管の漏れ', brake: 'ブレーキ・旋回ロック',
  alarm: '警報装置・ライト・ミラー', track: '履帯・作業装置の亀裂', bucket: 'バケット・ツースの摩耗',
};
const insp = reactive({ open: false, items: Object.fromEntries(Object.keys(ITEMS).map((k) => [k, false])) as Record<string, boolean>, loaded: false });
const ship = reactive({ open: false, slipNo: '', customer: '' });
const busy = ref(false);

const act = async (path: string, body: Record<string, unknown>, done: string) => {
  busy.value = true;
  try {
    const pos = await position();
    await api(`/staff/qr/${code}/${path}`, { method: 'POST', body: { ...body, ...(pos ?? {}) } });
    toast.add({ severity: 'success', summary: done, detail: pos ? '位置と日時を記録しました' : '位置は取得できませんでした（日時のみ記録）', life: 3500 });
    insp.open = false;
    ship.open = false;
    refresh();
  } catch {
    toast.add({ severity: 'error', summary: '記録できませんでした', life: 3500 });
  } finally {
    busy.value = false;
  }
};
const paper = (d: DocItem) => act('paper', { documentId: d.id }, `${d.typeLabel}の紙を第${d.current.version}版に差し替えました`);
</script>

<template>
  <div class="max-w-md mx-auto min-h-screen bg-white">
    <header class="bg-navy text-white px-5 py-3">
      <p class="text-xs text-indigo-200 font-bold tracking-wider">安全マニュアル・取扱説明書</p>
      <p class="text-sm">{{ data?.company ?? '' }}</p>
    </header>

    <div v-if="error" class="p-6"><Message severity="error">このQRコードは登録されていません。</Message></div>

    <div v-else-if="data?.status === 'void'" class="p-6 space-y-3">
      <Message severity="warn">{{ data.message }}</Message>
      <p class="text-sm text-slate-500">QR番号 {{ data.code }}</p>
    </div>

    <div v-else-if="data?.machine" class="p-5 space-y-5">
      <div>
        <p class="text-3xl font-extrabold text-navy">{{ data.machine.machineNo }}</p>
        <p class="text-slate-600">{{ data.machine.modelName }}（{{ data.machine.modelCode }}）　{{ data.machine.branch }}</p>
        <p class="text-sm text-slate-500 mt-1"><i class="pi pi-box" /> 紙の安心ファイル：{{ data.machine.storageLocation || '出庫時にお渡し' }}</p>
      </div>

      <div class="space-y-2">
        <p class="text-xs font-bold text-slate-500">書類（いつでも最新版が表示されます）</p>
        <a v-for="d in data.documents" :key="d.id" :href="fileUrl(d)" target="_blank"
          class="flex items-center gap-3 border border-slate-200 rounded-lg px-4 py-3 active:bg-pale">
          <i class="pi pi-file-pdf text-2xl text-accent" />
          <span class="flex-1"><b class="text-navy">{{ d.typeLabel }}</b><br><span class="text-xs text-slate-500">第{{ d.current.version }}版　{{ new Date(d.current.publishedAt).toLocaleDateString('ja-JP') }}</span></span>
          <i class="pi pi-angle-right text-slate-400" />
        </a>
      </div>

      <!-- 社員の操作（ログイン中のみ） -->
      <div v-if="isStaff" class="border-t border-dashed border-slate-300 pt-4 space-y-3">
        <div class="flex items-center justify-between">
          <p class="text-xs font-bold text-slate-500">社員の操作（{{ data.staff!.name }}）</p>
          <Tag v-if="data.machine.status" :value="STATUS[data.machine.status]?.label" :severity="STATUS[data.machine.status]?.severity" />
        </div>
        <Message v-if="located === false" severity="warn" size="small">位置情報を取得できませんでした。ブラウザで位置情報を許可してください。</Message>
        <div class="grid grid-cols-2 gap-2">
          <Button label="出庫前点検" icon="pi pi-check-square" @click="insp.open = true" />
          <Button label="出庫・交付" icon="pi pi-sign-out" :disabled="data.machine.status === 'rented'" @click="ship.open = true" />
          <Button label="返却" icon="pi pi-sign-in" severity="secondary" :disabled="data.machine.status !== 'rented'" :loading="busy" @click="act('return', {}, '返却を記録しました')" />
          <Button label="回送" icon="pi pi-truck" severity="secondary" :loading="busy" @click="act('transfer', { placeLabel: '回送中' }, '回送を記録しました')" />
        </div>
        <div class="space-y-1">
          <p class="text-xs text-slate-500">紙の安心ファイルを最新版に差し替えたとき</p>
          <Button v-for="d in data.documents" :key="d.id" :label="`${d.typeLabel} 第${d.current.version}版に差し替えた`" size="small" severity="secondary" outlined class="w-full" @click="paper(d)" />
        </div>
      </div>
      <p v-else class="text-center text-xs text-slate-400 pt-6">
        <NuxtLink :to="`/login?next=/q/${code}`" class="underline">社員の方はこちら</NuxtLink>
      </p>
    </div>

    <Dialog v-model:visible="insp.open" modal header="出庫前点検" class="w-[22rem]">
      <div class="space-y-2">
        <div v-for="(label, k) in ITEMS" :key="k" class="flex items-center gap-2">
          <Checkbox v-model="insp.items[k]" binary :input-id="k" /><label :for="k" class="text-sm">{{ label }}</label>
        </div>
        <div class="flex items-center gap-2 pt-2 border-t border-slate-200">
          <Checkbox v-model="insp.loaded" binary input-id="loaded" /><label for="loaded" class="text-sm font-bold">安心ファイルを搭載した（{{ data?.machine?.storageLocation }}）</label>
        </div>
      </div>
      <template #footer>
        <Button label="記録する" icon="pi pi-check" :loading="busy" @click="act('inspection', { items: insp.items, safetyFileLoaded: insp.loaded }, '出庫前点検を記録しました')" />
      </template>
    </Dialog>

    <Dialog v-model:visible="ship.open" modal header="出庫・交付" class="w-[22rem]">
      <div class="space-y-2">
        <InputText v-model="ship.slipNo" placeholder="出庫伝票番号" class="w-full" />
        <InputText v-model="ship.customer" placeholder="お客様・現場名" class="w-full" />
        <p class="text-xs text-slate-500">交付した書類の版が、伝票番号と一緒に記録されます。</p>
      </div>
      <template #footer>
        <Button label="記録する" icon="pi pi-check" :disabled="!ship.slipNo || !ship.customer" :loading="busy" @click="act('shipment', { slipNo: ship.slipNo, customer: ship.customer }, '出庫・交付を記録しました')" />
      </template>
    </Dialog>
  </div>
</template>
