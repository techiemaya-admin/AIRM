import express from 'express';
import { FjtController } from '../controllers/fjtController.js';
import { optionalAuth } from '../../../middleware/auth.js';

const router = express.Router();

router.get('/board', optionalAuth, FjtController.getBoard);
router.post('/issues', optionalAuth, FjtController.createIssue);
router.put('/issues/:id', optionalAuth, FjtController.updateIssue);
router.delete('/issues/:id', optionalAuth, FjtController.deleteIssue);

router.post('/epics', optionalAuth, FjtController.createEpic);
router.put('/epics/:id', optionalAuth, FjtController.updateEpic);

router.post('/sprints', optionalAuth, FjtController.createSprint);
router.put('/sprints/:id', optionalAuth, FjtController.updateSprint);

router.post('/projects', optionalAuth, FjtController.createProject);

// Migration endpoint using existing backend connection pool
router.all('/migrate', FjtController.migrateAndSeed);

export default router;
