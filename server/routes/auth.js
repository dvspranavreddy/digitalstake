const express = require('express');
const router = express.Router();
const authService = require('../services/authService');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

router.post('/register', validate({
  email: { required: true, type: 'string', pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  password: { required: true, type: 'string', minLength: 6 },
  full_name: { required: true, type: 'string', minLength: 2 },
}), async (req, res) => {
  try {
    const result = await authService.register(req.body);
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/login', validate({
  email: { required: true, type: 'string' },
  password: { required: true, type: 'string' },
}), async (req, res) => {
  try {
    const result = await authService.login(req.body);
    res.json(result);
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await authService.getProfile(req.user.id);
    res.json(user);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

router.put('/me', authenticate, validate({
  full_name: { required: false, type: 'string', minLength: 2 },
  nickname: { required: false, type: 'string', minLength: 1 },
  charity_id: { required: false, type: 'string' },
  charity_contribution_pct: { required: false, type: 'number' }
}), async (req, res) => {
  try {
    const updatedUser = await authService.updateProfile(req.user.id, req.body);
    res.json(updatedUser);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ─── FORGOT PASSWORD: Step 1 — Check email exists ───
router.post('/forgot-password', validate({
  email: { required: true, type: 'string', pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
}), async (req, res) => {
  try {
    const result = await authService.checkEmailExists(req.body.email);
    res.json(result);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// ─── FORGOT PASSWORD: Step 2 — Reset password ───
router.post('/reset-password', validate({
  email: { required: true, type: 'string', pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  password: { required: true, type: 'string', minLength: 6 },
}), async (req, res) => {
  try {
    const result = await authService.resetPassword(req.body.email, req.body.password);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ─── DELETE OWN ACCOUNT ───
router.delete('/me', authenticate, async (req, res) => {
  try {
    // Don't let admins delete themselves via this route
    if (req.user.role === 'admin') {
      return res.status(400).json({ error: 'Admins cannot delete their own account from here. Use the admin dashboard.' });
    }
    await authService.deleteOwnAccount(req.user.id);
    res.json({ success: true, message: 'Account deleted successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
