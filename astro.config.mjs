// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { loadEnv } from 'vite';
import { createContactHandler } from './server/contact.js';

// Serve the same Vercel API handler locally while keeping the site static.
const contactDevApi = {
  name: 'twms-contact-dev-api',
  configureServer(server) {
    const env = { ...process.env, ...loadEnv('development', process.cwd(), ''), CONTACT_ALLOWED_ORIGINS: 'http://127.0.0.1:4321,http://localhost:4321' };
    const handler = createContactHandler({ env });
    server.middlewares.use('/api/contact', async (req, res) => {
      try {
        const chunks = []; let length = 0;
        for await (const chunk of req) { length += chunk.length; if (length > 24000) { res.statusCode = 413; res.end(); return; } chunks.push(chunk); }
        const headers = new Headers();
        for (const [key, value] of Object.entries(req.headers)) if (value) headers.set(key, Array.isArray(value) ? value.join(',') : value);
        const request = new Request('http://localhost:4321/api/contact', { method: req.method, headers, ...(req.method === 'GET' || req.method === 'HEAD' ? {} : { body: Buffer.concat(chunks) }) });
        const response = await handler(request);
        res.statusCode = response.status;
        response.headers.forEach((value, key) => res.setHeader(key, value));
        res.end(await response.text());
      } catch { res.statusCode = 500; res.end(JSON.stringify({ ok: false, code: 'unavailable' })); }
    });
  },
};

// https://astro.build/config
export default defineConfig({
  site: 'https://www.twms.ai',
  integrations: [sitemap()],
  vite: {
    plugins: [tailwindcss(), contactDevApi]
  }
});
