import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import Icons from 'unplugin-icons/vite';

export default defineConfig({
	plugins: [sveltekit(), Icons({ compiler: 'svelte', scale: 1.2 })],
	// Must match the port in REDIRECT_URI registered with the Spotify app
	server: { port: 5175, strictPort: true }
});
