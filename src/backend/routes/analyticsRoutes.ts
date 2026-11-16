import { Router } from 'express';
import { getDeepAnalytics, getOverview } from '../controllers/analyticsController.ts';
import { requireAuth } from '../middleware/auth.ts';

const router = Router();

router.use(requireAuth);
router.get('/overview', getOverview);
router.get('/deep', getDeepAnalytics);

export default router;
