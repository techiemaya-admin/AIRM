import express from 'express';
import { FjtController } from '../controllers/fjtController.js';
import { authenticate, authenticateUserOrService, requireAdmin } from '../../../middleware/auth.js';

const router = express.Router();

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

export default router;
