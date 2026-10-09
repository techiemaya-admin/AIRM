import express from 'express';
import multer from 'multer';
import { FjtController } from '../controllers/fjtController.js';
import { authenticate, authenticateUserOrService, requireAdmin } from '../../../middleware/auth.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB max limit
  },
});

const router = express.Router();

// GCP Storage attachment upload (Images / Documents)
router.post('/upload', authenticate, upload.single('file'), FjtController.uploadAttachment);

// GCP Storage media stream proxy (secure direct viewing for images)
router.get('/media/*', FjtController.getMedia);

router.get('/board', authenticateUserOrService, FjtController.getBoard);
router.post('/issues', authenticate, FjtController.createIssue);
router.put('/issues/:id', authenticateUserOrService, FjtController.updateIssue);
router.delete('/issues/:id', authenticate, FjtController.deleteIssue);

router.post('/epics', authenticate, FjtController.createEpic);
router.put('/epics/:id', authenticate, FjtController.updateEpic);

router.post('/sprints', authenticate, FjtController.createSprint);
router.put('/sprints/:id', authenticate, FjtController.updateSprint);

router.post('/projects', authenticate, FjtController.createProject);

// Migration endpoint using existing backend connection pool
router.post('/migrate', authenticate, requireAdmin, FjtController.migrateAndSeed);

export default router;
