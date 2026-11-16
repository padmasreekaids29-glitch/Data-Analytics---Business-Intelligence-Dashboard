import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import analyticsRoutes from './src/backend/routes/analyticsRoutes.ts';
import importRoutes from './src/backend/routes/importRoutes.ts';
import reportsRoutes from './src/backend/routes/reportsRoutes.ts';
import usersRoutes from './src/backend/routes/usersRoutes.ts';
import notificationsRoutes from './src/backend/routes/notificationsRoutes.ts';
import crudRoutes from './src/backend/routes/crudRoutes.ts';
import { errorHandler } from './src/backend/middleware/errorHandler.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const port = process.env.NODE_ENV === 'production' ? Number(process.env.PORT) || 3000 : 3000;

  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'insight-pro-bi' });
  });

  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/datasets', importRoutes);
  app.use('/api/reports', reportsRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/notifications', notificationsRoutes);
  app.use('/api/crud', crudRoutes);

  app.use(errorHandler);

  if (process.env.NODE_ENV === 'production') {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else if (process.env.SEPARATE_BACKEND !== 'true') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    app.use('*', async (req, res, next) => {
      if (req.originalUrl.startsWith('/api')) {
        next();
        return;
      }
      try {
        const indexPath = path.resolve(__dirname, 'index.html');
        let template = fs.readFileSync(indexPath, 'utf-8');
        template = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (err) {
        next(err);
      }
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`INSIGHT PRO server listening on http://0.0.0.0:${port}`);
  });
}

startServer();
