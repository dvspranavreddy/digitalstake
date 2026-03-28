const express = require('express');
const router = express.Router();
const drawService = require('../services/drawService');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.get('/', authenticate, async (req, res) => {
  try {
    const draws = await drawService.getDraws();
    res.json(draws);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me/count', authenticate, async (req, res) => {
  try {
    const count = await drawService.getMyDrawsCount(req.user.id);
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const draw = await drawService.getDrawById(req.params.id);
    res.json(draw);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

router.post('/simulate', authenticate, requireAdmin, async (req, res) => {
  try {
    const { logicOption } = req.body;
    const result = await drawService.simulateDraw(logicOption);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/:id/publish', authenticate, requireAdmin, async (req, res) => {
  try {
    const result = await drawService.publishDraw(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
