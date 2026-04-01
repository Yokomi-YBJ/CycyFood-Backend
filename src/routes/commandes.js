const express = require('express');
const router = express.Router();
const { passerCommande, getMesCommandes } = require('../controllers/commandeController');
const authMiddleware = require('../middleware/auth');
router.post('/', authMiddleware, passerCommande);
router.get('/mes-commandes', authMiddleware, getMesCommandes);
module.exports = router;
