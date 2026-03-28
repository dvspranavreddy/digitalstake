const express = require('express');
const router = express.Router();
const adminService = require('../services/adminService');
const scoreService = require('../services/scoreService');
const campaignService = require('../services/campaignService');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

router.get('/analytics', authenticate, requireAdmin, async (req, res) => {
  try {
    const analytics = await adminService.getAnalytics();
    res.json(analytics);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/users', authenticate, requireAdmin, async (req, res) => {
  try {
    const users = await adminService.getAllUsers();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── CREATE USER ───
router.post('/users', authenticate, requireAdmin, validate({
  email: { required: true, type: 'string', pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  password: { required: true, type: 'string', minLength: 6 },
  full_name: { required: true, type: 'string', minLength: 1 },
  role: { required: true, type: 'string', enum: ['admin', 'user'] },
}), async (req, res) => {
  try {
    const user = await adminService.createUser(req.body);
    res.status(201).json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ─── UPDATE USER ───
router.put('/users/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const user = await adminService.updateUser(req.params.id, req.body);
    res.json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ─── CHANGE USER PASSWORD ───
router.put('/users/:id/password', authenticate, requireAdmin, validate({
  password: { required: true, type: 'string', minLength: 6 },
}), async (req, res) => {
  try {
    await adminService.changeUserPassword(req.params.id, req.body.password);
    res.json({ success: true, message: 'Password updated' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ─── SUSPEND USER ───
router.put('/users/:id/suspend', authenticate, requireAdmin, async (req, res) => {
  try {
    const user = await adminService.suspendUser(req.params.id);
    res.json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ─── UNSUSPEND USER ───
router.put('/users/:id/unsuspend', authenticate, requireAdmin, async (req, res) => {
  try {
    const user = await adminService.unsuspendUser(req.params.id);
    res.json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ─── DELETE USER ───
router.delete('/users/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    // Prevent admin from deleting themselves
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own admin account' });
    }
    await adminService.deleteUser(req.params.id);
    res.json({ success: true, message: 'User deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ─── SUBSCRIPTIONS ───
router.get('/subscriptions', authenticate, requireAdmin, async (req, res) => {
  try {
    const subs = await adminService.getAllSubscriptions();
    res.json(subs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/subscriptions/:id/cancel', authenticate, requireAdmin, async (req, res) => {
  try {
    await adminService.cancelSubscription(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/users/:id/scores', authenticate, requireAdmin, async (req, res) => {
  try {
    const scores = await scoreService.getScoresByUserId(req.params.id);
    res.json(scores);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── CAMPAIGNS ───
router.get('/campaigns', authenticate, requireAdmin, async (req, res) => {
  try {
    const campaigns = await campaignService.getAllCampaigns();
    res.json(campaigns);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/campaigns', authenticate, requireAdmin, validate({
  name: { required: true, type: 'string', minLength: 1 },
  code: { required: true, type: 'string', minLength: 3 },
  type: { required: true, type: 'string', enum: ['discount', 'corporate', 'referral'] },
  discount_pct: { required: false },
  target_charity_id: { required: false }
}), async (req, res) => {
  try {
    const campaign = await campaignService.createCampaign(req.body);
    res.status(201).json(campaign);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/campaigns/:id/toggle', authenticate, requireAdmin, async (req, res) => {
  try {
    const campaign = await campaignService.toggleCampaign(req.params.id, req.body.active);
    res.json(campaign);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/campaigns/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    await campaignService.deleteCampaign(req.params.id);
    res.json({ success: true, message: 'Campaign deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
