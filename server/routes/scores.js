const express = require('express');
const router = express.Router();
const scoreService = require('../services/scoreService');
const { authenticate, requireActiveSubscription } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

router.get('/', authenticate, async (req, res) => {
  try {
    const scores = await scoreService.getScores(req.user.id);
    res.json(scores);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticate, requireActiveSubscription, validate({
  score: { required: true, type: 'number', min: 1, max: 45 },
  played_date: { required: true, type: 'string' },
}), async (req, res) => {
  try {
    const score = await scoreService.addScore(req.user.id, req.body);
    res.status(201).json(score);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', authenticate, requireActiveSubscription, validate({
  score: { required: true, type: 'number', min: 1, max: 45 },
  played_date: { required: true, type: 'string' },
}), async (req, res) => {
  try {
    const updated = await scoreService.updateScore(req.user.id, req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    const result = await scoreService.deleteScore(req.user.id, req.params.id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
