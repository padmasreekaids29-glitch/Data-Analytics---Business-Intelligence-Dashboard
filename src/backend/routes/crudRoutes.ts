import { Router } from 'express';
import {
  createCategory,
  createCustomer,
  createOrder,
  createProduct,
  deleteOrder,
  listCategories,
  listCustomers,
  listOrders,
  listProducts,
  updateOrderStatus,
} from '../controllers/crudController.ts';
import { requireAuth, requireRole } from '../middleware/auth.ts';

const router = Router();

router.use(requireAuth);

router.get('/categories', listCategories);
router.post('/categories', requireRole('admin', 'analyst'), createCategory);

router.get('/products', listProducts);
router.post('/products', requireRole('admin', 'analyst'), createProduct);

router.get('/customers', listCustomers);
router.post('/customers', requireRole('admin', 'analyst'), createCustomer);

router.get('/orders', listOrders);
router.post('/orders', requireRole('admin', 'analyst'), createOrder);
router.patch('/orders/:id', requireRole('admin', 'analyst'), updateOrderStatus);
router.delete('/orders/:id', requireRole('admin'), deleteOrder);

export default router;
