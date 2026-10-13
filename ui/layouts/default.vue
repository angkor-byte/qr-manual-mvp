<script setup lang="ts">
const me = useMe();
const route = useRoute();
const menu = [
  { to: '/admin', label: '機械一覧', icon: 'pi pi-list' },
  { to: '/admin/documents', label: '安心ファイル書類', icon: 'pi pi-file-pdf' },
  { to: '/admin/qr', label: 'QR発行・印刷', icon: 'pi pi-qrcode' },
  { to: '/admin/map', label: '所在マップ', icon: 'pi pi-map-marker' },
  { to: '/admin/import', label: '台帳の取込', icon: 'pi pi-upload' },
];
const active = (to: string) => (to === '/admin' ? route.path === '/admin' || route.path.startsWith('/admin/machines') : route.path.startsWith(to));
const logout = () => {
  useToken().value = null;
  me.value = null;
  navigateTo('/login');
};
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <header class="no-print bg-navy text-white flex items-center justify-between px-5 h-14">
      <NuxtLink to="/admin" class="font-bold tracking-wide">重機QR 安全マニュアル管理</NuxtLink>
      <div v-if="me" class="flex items-center gap-4 text-sm text-indigo-100">
        <span>{{ me.companyName }}　{{ me.name }}</span>
        <Button label="ログアウト" icon="pi pi-sign-out" size="small" severity="secondary" text class="!text-indigo-100" @click="logout" />
      </div>
    </header>
    <div class="flex flex-1">
      <nav class="no-print w-52 shrink-0 bg-white border-r border-slate-200 py-3">
        <NuxtLink
          v-for="m in menu" :key="m.to" :to="m.to"
          class="flex items-center gap-2 px-5 py-2.5 text-sm"
          :class="active(m.to) ? 'bg-pale text-navy font-bold border-l-4 border-brand' : 'text-slate-600 hover:bg-slate-50 border-l-4 border-transparent'"
        >
          <i :class="m.icon" />{{ m.label }}
        </NuxtLink>
      </nav>
      <main class="flex-1 p-6 min-w-0"><slot /></main>
    </div>
  </div>
</template>
