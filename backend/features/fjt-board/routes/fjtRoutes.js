import express from 'express';
import multer from 'multer';
import { FjtController } from '../controllers/fjtController.js';
import { authenticate, authenticateUserOrService, requireAdmin } from '../../../middleware/auth.js';
import { taskBoardObjectName, verifyMediaSignature } from '../services/mediaAccess.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB max limit
  },
});

const router = express.Router();

// GCP Storage attachment upload (Images / Documents)
router.post('/upload', authenticate, upload.single('file'), FjtController.uploadAttachment);

// Task-board attachments from the private bucket. Plain <img>/<a> can't send the
// bearer token, so a signed-in user gets short-lived signed links from
// /media/sign; /media/* opens with such a signature or the bearer token itself.
const mediaAccess = (req, res, next) =>
  (verifyMediaSignature(taskBoardObjectName(req.params[0]), req.query.exp, req.query.sig)
    ? next()
    : authenticateUserOrService(req, res, next));

router.post('/media/sign', authenticateUserOrService, FjtController.signMedia);
router.get('/media/*', mediaAccess, FjtController.getMedia);

router.get('/board', authenticateUserOrService, FjtController.getBoard);
router.get('/issues', authenticateUserOrService, FjtController.listIssues);
router.get('/issues/:id', authenticateUserOrService, FjtController.getIssue);
router.post('/issues/:id/comments', authenticateUserOrService, FjtController.addComment);
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
