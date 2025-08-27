// routes/projectRoutes.js
import { Router } from 'express';
import { 
  createProject, 
  listProjects, 
  getProject, 
  updateProject, 
  deleteProject 
} from '../controllers/projectController.js';
import { protect } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';

const router = Router();

// Public routes
router.get('/', listProjects);
router.get('/:id', getProject);

// Protected routes (perlu token)
router.post('/', protect, upload.single('image'), createProject);
router.put('/:id', protect, upload.single('image'), updateProject);
router.delete('/:id', protect, deleteProject);

export default router;