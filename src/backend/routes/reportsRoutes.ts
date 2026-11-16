import { Router } from 'express';
import { exportCsvReport, generateReportData } from '../controllers/reportsController.ts';
import { requireAuth } from '../middleware/auth.ts';

const router = Router();

router.use(requireAuth);
router.get('/generate', generateReportData);
router.get('/export/csv', exportCsvReport);

export default router;
