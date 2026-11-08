export default defineNuxtRouteMiddleware(async (to) => {
  const token = useToken();
  if (!token.value) return navigateTo('/login');
  const me = useMe();
  if (!me.value) {
    try {
      me.value = await useApi()<Me>('/auth/me');
    } catch {
      token.value = null;
      return navigateTo('/login');
    }
  }
  // 本社だけの画面（台帳の取込など）は、営業所の画面からは開けない
  if (to.meta.hqOnly && me.value?.scope === 'office') return navigateTo('/admin');
});
