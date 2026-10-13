export default defineNuxtRouteMiddleware(async () => {
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
});
