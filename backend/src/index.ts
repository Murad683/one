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
import deliverableCategoryRoutes from './routes/deliverableCategory.routes';
import uploadRoutes from './routes/upload.routes';
import swaggerRoutes from './routes/swagger.routes';
import dashboardRoutes from './routes/dashboard.routes';
import adminRoutes from './routes/admin.routes';

import { sendError } from './utils/response.util';
import { ensureUploadDirs } from './utils/ensureUploadDir';
import { globalRateLimiter } from './middleware/rateLimiter.middleware';
import { xssSanitize } from './middleware/xss.middleware';

// Bootstrap
ensureUploadDirs();

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Global Middleware ──────────────────────────
app.use(cors({ 
  origin: true, 
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], 
  credentials: true 
}));
app.use(globalRateLimiter);
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(xssSanitize);
// Static Files with Cross-Origin policy for all responses (including 404s)
app.use('/uploads', (req, res, next) => {
  res.set('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
});
// SECURITY FIX: Removed public static serving of /uploads directory to prevent unauthorized access.

// â”€â”€â”€ Health Check â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// â”€â”€â”€ API Router (v1) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
apiRouter.use('/deliverable-categories', deliverableCategoryRoutes);
apiRouter.use('/contact-submissions', contactSubmissionRoutes);
apiRouter.use('/contact', contactSubmissionRoutes); // Alias for convenience
apiRouter.use('/uploads', uploadRoutes);
apiRouter.use('/dashboard', dashboardRoutes);
apiRouter.use('/admin', adminRoutes);

app.use('/api/v1', apiRouter);

// â”€â”€â”€ Swagger UI â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.use('/api-docs', swaggerRoutes);

// â”€â”€â”€ 404 Handler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.originalUrl} not found` });
});

// â”€â”€â”€ Global Error Handler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  sendError(res, 'Internal Server Error', 500);
});

// â”€â”€â”€ Start Server â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.listen(PORT, () => {
  console.log(`ðŸš€ Server running on http://localhost:${PORT}`);
});

export default app;
