import type { Config } from 'tailwindcss';

export default <Partial<Config>>{
  theme: {
    extend: {
      colors: { navy: '#152663', brand: '#243f9b', pale: '#eaf0ff', accent: '#b43a46' },
      fontFamily: { sans: ['"Hiragino Sans"', '"Hiragino Kaku Gothic ProN"', '"Noto Sans JP"', 'sans-serif'] },
    },
  },
};
