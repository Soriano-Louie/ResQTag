import express from 'express';
import {
  getContacts,
  createContact,
  updateContact,
  deleteContact
} from '../controllers/contactController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getContacts);
router.post('/', createContact);
router.put('/:id', updateContact);
router.delete('/:id', deleteContact);

export default router;
