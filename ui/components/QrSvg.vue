<script setup lang="ts">
import QRCode from 'qrcode';

/** QR 画面の URL（{siteUrl}/q/{code}）を QR にして表示する */
const props = defineProps<{ code: string }>();
const { siteUrl } = useRuntimeConfig().public;
const url = computed(() => `${siteUrl}/q/${props.code}`);
const svg = ref('');
watchEffect(async () => {
  svg.value = await QRCode.toString(url.value, { type: 'svg', margin: 0, errorCorrectionLevel: 'M' });
});
</script>

<template>
  <div class="qr-svg" v-html="svg" />
</template>

<style scoped>
.qr-svg :deep(svg) { width: 100%; height: 100%; display: block; }
</style>
