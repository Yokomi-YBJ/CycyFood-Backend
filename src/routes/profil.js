// src/routes/profil.js
const express = require('express');
const router = express.Router();
const { modifierProfil, getProfil, changerMotDePasse } = require('../controllers/profilController');
const { savePushToken } = require('../controllers/notifController');
const authMiddleware = require('../middleware/auth');

router.get('/',                 authMiddleware, getProfil);
router.put('/',                 authMiddleware, modifierProfil);
router.put('/mot-de-passe',     authMiddleware, changerMotDePasse);  // ← NOUVEAU
router.post('/push-token',      authMiddleware, savePushToken);

module.exports = router;
