const express = require('express');
const router = express.Router();
const charityService = require('../services/charityService');
const donationService = require('../services/donationService');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

router.get('/', async (req, res) => {
  try {
    const charities = await charityService.getAllCharities();
    res.json(charities);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/featured', async (req, res) => {
  try {
    const charities = await charityService.getFeaturedCharities();
    res.json(charities);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Independent Donations
router.post('/donate/create-order', authenticate, async (req, res) => {
  try {
    const { charityId, amount } = req.body;
    const result = await donationService.createDonationOrder(req.user.id, { charityId, amount });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/donate/verify-payment', authenticate, async (req, res) => {
  try {
    const result = await donationService.verifyDonationPayment(req.user.id, req.body);
    res.json({ success: true, donation: result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/:id/total-donations', async (req, res) => {
  try {
    const totalDonations = await charityService.getCharityTotalDonations(req.params.id);
    res.json(totalDonations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const charity = await charityService.getCharityById(req.params.id);
    res.json(charity);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

router.post('/', authenticate, requireAdmin, validate({
  name: { required: true, type: 'string', minLength: 2 },
  description: { required: true, type: 'string', minLength: 10 }
}), async (req, res) => {
  try {
    const charity = await charityService.createCharity(req.body);
    res.status(201).json(charity);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const charity = await charityService.updateCharity(req.params.id, req.body);
    res.json(charity);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const result = await charityService.deleteCharity(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});



module.exports = router;
