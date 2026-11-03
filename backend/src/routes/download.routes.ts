import { Router } from 'express';
import { downloadZip } from '../controllers/download.controller';

const router = Router();

// The ticket in the path is the credential (see utils/jwt.util.ts signZipTicket).
router.get('/:ticket', downloadZip);

export default router;
