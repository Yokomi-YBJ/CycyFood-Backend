const express = require('express');
const router = express.Router();
const { getProduits } = require('../controllers/produitController');
router.get('/', getProduits);
module.exports = router;
