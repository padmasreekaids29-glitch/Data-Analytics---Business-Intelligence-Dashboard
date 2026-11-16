import { Router } from 'express';
import multer from 'multer';
import {
  deleteDataset,
  downloadTemplate,
  listDatasets,
  uploadDataset,
} from '../controllers/importController.ts';
import { requireAuth, requireRole } from '../middleware/auth.ts';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

router.use(requireAuth);
router.get('/', listDatasets);
router.get('/template', downloadTemplate);
router.post('/upload', requireRole('admin', 'analyst'), upload.single('file'), uploadDataset);
router.delete('/:id', requireRole('admin', 'analyst'), deleteDataset);

export default router;
