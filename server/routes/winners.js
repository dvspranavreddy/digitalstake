const express = require('express');
const router = express.Router();
const winnerService = require('../services/winnerService');
const { authenticate, requireAdmin } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

const supabase = require('../config/supabase');

// Configure multer for memory storage instead of disk (Stateless architecture for Render)
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const extOk = allowed.test(path.extname(file.originalname).toLowerCase());
    const mimeOk = allowed.test(file.mimetype);
    if (extOk && mimeOk) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const winners = await winnerService.getWinners(req.query);
    res.json(winners);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', authenticate, async (req, res) => {
  try {
    const winnings = await winnerService.getMyWinnings(req.user.id);
    res.json(winnings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/upload-proof', authenticate, upload.single('proof'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Proof file is required' });
    }
    
    // Generate a secure unique filename
    const uniqueName = `proof_${req.user.id}_${Date.now()}${path.extname(req.file.originalname).toLowerCase()}`;
    
    // Upload buffer directly to Supabase public bucket 'proofs'
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('proofs')
      .upload(uniqueName, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false
      });
      
    if (uploadError) {
      console.error('[STORAGE ERROR]', uploadError);
      throw new Error(`Cloud storage upload failed: ${uploadError.message}. Make sure the 'proofs' bucket exists and is public.`);
    }
    
    // Extract the highly available absolute public URL
    const { data: publicUrlData } = supabase.storage.from('proofs').getPublicUrl(uniqueName);
    const proofUrl = publicUrlData.publicUrl;

    const winner = await winnerService.uploadProof(req.params.id, req.user.id, proofUrl);
    res.json(winner);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id/verify', authenticate, requireAdmin, async (req, res) => {
  try {
    const winner = await winnerService.verifyWinner(req.params.id, req.body.status);
    res.json(winner);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id/mark-paid', authenticate, requireAdmin, async (req, res) => {
  try {
    const winner = await winnerService.markPaid(req.params.id);
    res.json(winner);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
