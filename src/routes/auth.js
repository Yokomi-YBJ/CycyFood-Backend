const express = require('express');
const router = express.Router();
const { inscription, connexion } = require('../controllers/authController');
router.post('/inscription', inscription);
router.post('/connexion', connexion);
module.exports = router;
