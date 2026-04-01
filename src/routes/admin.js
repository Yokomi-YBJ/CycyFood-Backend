// src/routes/admin.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const adminMiddleware = require('../middleware/adminMiddleware');
const {
  getProduits, ajouterProduit, modifierProduit,
  supprimerProduit, toggleDisponibilite,
} = require('../controllers/adminProduitController');
const {
  getToutesCommandes, changerStatut, getStats, getClients,
} = require('../controllers/adminCommandeController');

// ===== CONFIGURATION MULTER (upload images) =====
const uploadDir = path.join(__dirname, '../../public/images');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    // Nom unique : timestamp + nom nettoyé
    const ext = path.extname(file.originalname).toLowerCase();
    const nom = path.basename(file.originalname, ext)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_');
    cb(null, `${nom}_${Date.now()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Seuls les fichiers JPG, PNG et WEBP sont acceptés.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
});

// ===== ROUTES PRODUITS =====
router.get('/produits',                       adminMiddleware, getProduits);
router.post('/produits',                      adminMiddleware, upload.single('image'), ajouterProduit);
router.put('/produits/:id',                   adminMiddleware, upload.single('image'), modifierProduit);
router.delete('/produits/:id',                adminMiddleware, supprimerProduit);
router.patch('/produits/:id/disponibilite',   adminMiddleware, toggleDisponibilite);

// ===== ROUTES COMMANDES =====
router.get('/commandes',                      adminMiddleware, getToutesCommandes);
router.patch('/commandes/:id/statut',         adminMiddleware, changerStatut);

// ===== TABLEAU DE BORD =====
router.get('/stats',                          adminMiddleware, getStats);

// ===== CLIENTS =====
router.get('/clients',                        adminMiddleware, getClients);

module.exports = router;
