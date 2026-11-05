import { defineConfig } from 'vite';
import glsl from 'vite-plugin-glsl';

export default defineConfig({
  base: './', // relative, so the build works from any path or domain
  plugins: [glsl()],
});
