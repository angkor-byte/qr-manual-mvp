<script setup lang="ts">
definePageMeta({ layout: 'plain' });
const route = useRoute();
const email = ref('admin@demo.jp');
const password = ref('demo1234');
const error = ref('');
const loading = ref(false);

const submit = async () => {
  loading.value = true;
  error.value = '';
  try {
    const r = await useApi()<{ token: string; user: Me }>('/auth/login', { method: 'POST', body: { email: email.value, password: password.value } });
    useToken().value = r.token;
    useMe().value = r.user;
    // QR 画面から来た社員は、その QR 画面に戻す
    await navigateTo(typeof route.query.next === 'string' ? route.query.next : '/admin');
  } catch {
    error.value = 'メールアドレスまたはパスワードが違います';
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-navy px-4">
    <form class="card w-full max-w-sm p-7 space-y-4" @submit.prevent="submit">
      <div>
        <p class="text-xs text-slate-500 font-bold tracking-widest">ログイン</p>
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
      <Message v-if="error" severity="error" size="small">{{ error }}</Message>
      <Button type="submit" label="ログイン" class="w-full" :loading="loading" />
      <Message severity="info" size="small">デモ版（モック）です。そのまま「ログイン」を押してください。</Message>
      <p class="text-xs text-slate-500 leading-relaxed">デモ：admin@demo.jp（資産統括部）／ seibi@demo.jp（整備）／ front@demo.jp（フロント）／ kaiso@demo.jp（回送）　パスワードは共通 demo1234</p>
    </form>
  </div>
</template>
