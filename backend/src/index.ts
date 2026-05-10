import 'dotenv/config';
import express, { Request, Response, NextFunction, Router } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';

// Route Imports
import authRoutes from './routes/auth.routes';
import projectRoutes from './routes/project.routes';
import packageRoutes from './routes/package.routes';
import serviceRoutes from './routes/service.routes';
import teamMemberRoutes from './routes/teamMember.routes';
import deliverableRoutes from './routes/deliverable.routes';
import userRoutes from './routes/user.routes';
import siteSettingsRoutes from './routes/siteSettings.routes';
import categoryRoutes from './routes/category.routes';
import contactSubmissionRoutes from './routes/contactSubmission.routes';
import uploadRoutes from './routes/upload.routes';
import swaggerRoutes from './routes/swagger.routes';

import { sendError } from './utils/response.util';
import { ensureUploadDirs } from './utils/ensureUploadDir';

// Bootstrap
ensureUploadDirs();

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Global Middleware ──────────────────────────
app.use(helmet());
app.use(cors({ 
  origin: true, 
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], 
  credentials: true 
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads'), {
  setHeaders: (res) => {
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
  }
}));

// ─── Health Check ──────────────────────────────
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// ─── API Router (v1) ───────────────────────────
const apiRouter = Router();

apiRouter.use('/users', userRoutes);
apiRouter.use('/auth', authRoutes);
apiRouter.use('/projects', projectRoutes);
apiRouter.use('/packages', packageRoutes);
apiRouter.use('/services', serviceRoutes);
apiRouter.use('/team', teamMemberRoutes);
apiRouter.use('/deliverables', deliverableRoutes);
apiRouter.use('/site-settings', siteSettingsRoutes);
apiRouter.use('/categories', categoryRoutes);
apiRouter.use('/contact-submissions', contactSubmissionRoutes);
apiRouter.use('/uploads', uploadRoutes);

app.use('/api/v1', apiRouter);

// ─── Swagger UI ────────────────────────────────
app.use('/api-docs', swaggerRoutes);

// ─── 404 Handler ───────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.originalUrl} not found` });
});

// ─── Global Error Handler ──────────────────────
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  sendError(res, 'Internal Server Error', 500);
});

// ─── Start Server ──────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

export default app;
