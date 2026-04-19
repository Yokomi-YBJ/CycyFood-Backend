// src/routes/profil.js
const express = require('express');
const router  = express.Router();
const { modifierProfil, getProfil, changerMotDePasse } = require('../controllers/profilController');
const { savePushToken } = require('../controllers/notifController');
const authMiddleware = require('../middleware/auth');

router.get('/',              authMiddleware, getProfil);
router.put('/',              authMiddleware, modifierProfil);
router.put('/mot-de-passe',  authMiddleware, changerMotDePasse);
router.post('/push-token',   authMiddleware, savePushTokenUniversel);

// savePushToken universel : fonctionne pour user ET admin
async function savePushTokenUniversel(req, res) {
  const { push_token } = req.body;
  const db = require('../config/database');

  if (!push_token) {
    return res.status(400).json({ status: 'error', message: 'Token manquant.' });
  }

  try {
    if (req.user.role === 'admin') {
      // Sauvegarder dans la table admin
      await db.query(
        'UPDATE admin SET push_token = ? WHERE id_admin = ?',
        [push_token, req.user.id_admin || req.user.id_user]
      );
    } else {
      // Sauvegarder dans la table user
      await db.query(
        'UPDATE user SET push_token = ? WHERE id_user = ?',
        [push_token, req.user.id_user]
      );
    }
    return res.json({ status: 'success', message: 'Token enregistré.' });
  } catch (err) {
    console.error('Erreur savePushToken:', err);
    return res.status(500).json({ status: 'error', message: 'Erreur serveur.' });
  }
}

module.exports = router;
