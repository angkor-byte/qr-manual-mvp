<script setup lang="ts">
definePageMeta({ layout: 'plain' });
const route = useRoute();
const api = useApi();
// QR 画面の「社員の方はこちら」から来たときは、社員のログインだけを出す
const next = typeof route.query.next === 'string' ? route.query.next : null;

const { data: masters } = await useAsyncData('login-offices', () => api<{ offices: Office[] }>('/admin/masters'));
const officeOptions = computed(() => (masters.value?.offices ?? []).map((o) => ({ value: o.id, label: `${o.branch}　${o.name}` })));
const officeId = ref<number>(1);
const loading = ref<'all' | 'office' | 'staff' | null>(null);

const enter = async (kind: 'all' | 'office' | 'staff') => {
  loading.value = kind;
  try {
    const r = await api<{ token: string; user: Me }>('/auth/login', { method: 'POST', body: { officeId: kind === 'office' ? officeId.value : null } });
    useToken().value = r.token;
    useMe().value = r.user;
    await navigateTo(kind === 'staff' && next ? next : '/admin');
  } finally {
    loading.value = null;
  }
};

// 社員ログイン（QR 画面から）
const email = ref('seibi@demo.jp');
const password = ref('demo1234');
</script>

<template>
  <div class="min-h-screen bg-navy px-4 py-10 flex items-center justify-center">
    <!-- 社員ログイン（QR 画面から来たとき） -->
    <form v-if="next" class="card w-full max-w-sm p-7 space-y-4" @submit.prevent="enter('staff')">
      <div>
        <p class="text-xs text-slate-500 font-bold tracking-widest">社員ログイン</p>
        <h1 class="text-xl font-extrabold text-navy mt-1">重機QR 安全マニュアル管理</h1>
      </div>
      <div class="space-y-1">
        <label class="text-sm font-bold" for="email">メールアドレス</label>
        <InputText id="email" v-model="email" type="email" class="w-full" autocomplete="username" />
      </div>
      <div class="space-y-1">
        <label class="text-sm font-bold" for="pw">パスワード</label>
        <Password v-model="password" input-id="pw" :feedback="false" toggle-mask class="w-full" input-class="w-full" autocomplete="current-password" />
      </div>
      <Button type="submit" label="ログイン" class="w-full" :loading="loading === 'staff'" />
      <Message severity="info" size="small">デモ版（モック）です。そのまま「ログイン」を押してください。</Message>
      <p class="text-xs text-slate-500 leading-relaxed">デモ：seibi@demo.jp（整備）／ front@demo.jp（フロント）／ kaiso@demo.jp（回送）　パスワードは共通 demo1234</p>
    </form>

    <!-- トップ：全体管理画面と営業所の画面の入口 -->
    <div v-else class="w-full max-w-4xl space-y-6">
      <div class="text-center text-white space-y-1">
        <p class="text-xs font-bold tracking-widest text-indigo-200">サンプル建機レンタル株式会社</p>
        <h1 class="text-2xl md:text-3xl font-extrabold">重機QR 安全マニュアル管理</h1>
        <p class="text-sm text-indigo-100">使う方に合わせて、2つの画面を用意しています。</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <section class="card p-6 flex flex-col gap-4">
          <div class="flex items-center gap-3">
            <span class="w-11 h-11 rounded-full bg-pale text-brand flex items-center justify-center"><i class="pi pi-building text-xl" /></span>
            <div>
              <p class="text-xs font-bold text-slate-500">本社・資産統括部</p>
              <h2 class="text-xl font-extrabold text-navy">全体管理画面</h2>
            </div>
          </div>
          <ul class="text-sm text-slate-700 space-y-1.5 flex-1">
            <li class="flex gap-2"><i class="pi pi-check text-brand text-xs mt-1.5" />全営業所の機械・安心ファイル・QRの読み取り状況を一覧</li>
            <li class="flex gap-2"><i class="pi pi-check text-brand text-xs mt-1.5" />営業所ごとの状況を並べて比べ、要対応をすぐ見つける</li>
            <li class="flex gap-2"><i class="pi pi-check text-brand text-xs mt-1.5" />書類の登録・改版、台帳の取込は本社だけが行う</li>
          </ul>
          <Button label="全体管理画面に入る" icon="pi pi-arrow-right" icon-pos="right" class="w-full" :loading="loading === 'all'" @click="enter('all')" />
        </section>

        <section class="card p-6 flex flex-col gap-4">
          <div class="flex items-center gap-3">
            <span class="w-11 h-11 rounded-full bg-pale text-brand flex items-center justify-center"><i class="pi pi-map-marker text-xl" /></span>
            <div>
              <p class="text-xs font-bold text-slate-500">各営業所</p>
              <h2 class="text-xl font-extrabold text-navy">営業所の画面</h2>
            </div>
          </div>
          <ul class="text-sm text-slate-700 space-y-1.5 flex-1">
            <li class="flex gap-2"><i class="pi pi-check text-brand text-xs mt-1.5" />自分の営業所の機械・書類・QRの読み取り状況だけを表示</li>
            <li class="flex gap-2"><i class="pi pi-check text-brand text-xs mt-1.5" />自分の営業所の機械のQRラベルを印刷</li>
            <li class="flex gap-2"><i class="pi pi-check text-brand text-xs mt-1.5" />ほかの営業所の機械は表示されない</li>
          </ul>
          <div class="space-y-1">
            <label class="text-xs font-bold text-slate-500" for="office">営業所を選ぶ（デモ用）</label>
            <Select v-model="officeId" input-id="office" :options="officeOptions" option-label="label" option-value="value" class="w-full" />
          </div>
          <Button label="営業所の画面に入る" icon="pi pi-arrow-right" icon-pos="right" class="w-full" :loading="loading === 'office'" @click="enter('office')" />
        </section>
      </div>

      <p class="text-center text-xs text-indigo-100 leading-relaxed">
        デモ版（モック）です。データはすべてサンプルで、操作しても保存されません。<br class="hidden sm:inline">
        本番では、ログインしたアカウントに応じて、どちらの画面かが自動で決まります。
      </p>
    </div>
  </div>
</template>
