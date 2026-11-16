import { Router } from 'express';
import {
  createTeamInvite,
  getMe,
  listUsers,
  updateMyProfile,
  updateUserAccess,
} from '../controllers/usersController.ts';
import { requireAuth, requireRole } from '../middleware/auth.ts';

const router = Router();

router.use(requireAuth);
router.get('/me', getMe);
router.patch('/me', updateMyProfile);
router.get('/', listUsers);
router.post('/', requireRole('admin'), createTeamInvite);
router.patch('/:id', requireRole('admin'), updateUserAccess);

export default router;
