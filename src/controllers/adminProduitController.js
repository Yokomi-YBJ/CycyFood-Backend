// src/controllers/adminProduitController.js
const db = require('../config/database');
const path = require('path');
const fs = require('fs');

// ===================== LISTER TOUS LES PRODUITS (admin) =====================
const getProduits = async (req, res) => {
  try {
    const [produits] = await db.query(
      'SELECT * FROM produit ORDER BY id_produit DESC LIMIT 20'
    );
    const host = req.hostname;
    const port = process.env.PORT || 3000;
    const produitsAvecUrl = produits.map(p => ({
      ...p,
      img_url: `http://${host}:${port}/images/${p.img_produit.replace('produit_img/', '')}`,
    }));
    return res.json({ status: 'success', produits: produitsAvecUrl });
  } catch (err) {
    console.error('Erreur getProduits admin:', err);
    return res.status(500).json({ status: 'error', message: 'Impossible de charger les produits. Réessayez.' });
  }
};

// ===================== AJOUTER UN PRODUIT =====================
const ajouterProduit = async (req, res) => {
  const { nom_produit, description, Prix, stock, categorie } = req.body;

  if (!nom_produit || !description || !Prix) {
    return res.status(400).json({
      status: 'error',
      message: 'Nom, description et prix sont obligatoires.',
    });
  }

  if (!req.file) {
    return res.status(400).json({
      status: 'error',
      message: 'Veuillez télécharger une image pour le produit.',
    });
  }

  const img_produit = req.file.filename;

  try {
    const [result] = await db.query(
      `INSERT INTO produit (nom_produit, description, img_produit, Prix, stock, categorie, disponible)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [
        nom_produit.trim(),
        description.trim(),
        img_produit,
        parseInt(Prix),
        parseInt(stock) || 0,
        categorie || 'Plat',
      ]
    );

    const host = req.hostname;
    const port = process.env.PORT || 3000;

    return res.status(201).json({
      status: 'success',
      message: 'Produit ajouté avec succès !',
      produit: {
        id_produit: result.insertId,
        nom_produit, description,
        img_produit,
        img_url: `http://${host}:${port}/images/${img_produit}`,
        Prix: parseInt(Prix),
        stock: parseInt(stock) || 0,
        categorie: categorie || 'Plat',
        disponible: 1,
      },
    });
  } catch (err) {
    // Supprimer l'image uploadée si la DB échoue
    if (req.file) {
      const imgPath = path.join(__dirname, '../../public/images', req.file.filename);
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
    }
    console.error('Erreur ajouterProduit:', err);
    return res.status(500).json({ status: 'error', message: 'Impossible d\'ajouter le produit. Réessayez.' });
  }
};

// ===================== MODIFIER UN PRODUIT =====================
const modifierProduit = async (req, res) => {
  const { id } = req.params;
  const { nom_produit, description, Prix, stock, categorie, disponible } = req.body;

  if (!nom_produit || !description || !Prix) {
    return res.status(400).json({
      status: 'error',
      message: 'Le nom, description et prix sont obligatoires.',
    });
  }

  try {
    // Récupérer l'ancienne image
    const [existing] = await db.query('SELECT img_produit FROM produit WHERE id_produit = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Ce produit n\'existe pas.' });
    }

    let img_produit = existing[0].img_produit;

    // Nouvelle image uploadée ?
    if (req.file) {
      // Supprimer l'ancienne image (si elle existe dans public/images)
      const oldPath = path.join(__dirname, '../../public/images', img_produit.replace('produit_img/', ''));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      img_produit = req.file.filename;
    }

    await db.query(
      `UPDATE produit
       SET nom_produit = ?, description = ?, img_produit = ?,
           Prix = ?, stock = ?, categorie = ?, disponible = ?
       WHERE id_produit = ?`,
      [
        nom_produit.trim(),
        description.trim(),
        img_produit,
        parseInt(Prix),
        parseInt(stock) || 0,
        categorie || 'Plat',
        disponible !== undefined ? parseInt(disponible) : 1,
        id,
      ]
    );

    const host = req.hostname;
    const port = process.env.PORT || 3000;

    return res.json({
      status: 'success',
      message: 'Produit modifié avec succès !',
      img_url: `http://${host}:${port}/images/${img_produit.replace('produit_img/', '')}`,
    });
  } catch (err) {
    console.error('Erreur modifierProduit:', err);
    return res.status(500).json({ status: 'error', message: 'Impossible de modifier le produit. Réessayez.' });
  }
};

// ===================== SUPPRIMER UN PRODUIT =====================
const supprimerProduit = async (req, res) => {
  const { id } = req.params;

  try {
    const [existing] = await db.query('SELECT img_produit FROM produit WHERE id_produit = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Ce produit n\'existe pas.' });
    }

    await db.query('DELETE FROM produit WHERE id_produit = ?', [id]);

    // Supprimer l'image du disque
    const imgName = existing[0].img_produit.replace('produit_img/', '');
    const imgPath = path.join(__dirname, '../../public/images', imgName);
    if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);

    return res.json({ status: 'success', message: 'Produit supprimé.' });
  } catch (err) {
    console.error('Erreur supprimerProduit:', err);
    return res.status(500).json({ status: 'error', message: 'Impossible de supprimer le produit. Réessayez.' });
  }
};

// ===================== TOGGLE DISPONIBILITÉ =====================
const toggleDisponibilite = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query(
      'UPDATE produit SET disponible = NOT disponible WHERE id_produit = ?',
      [id]
    );
    const [rows] = await db.query('SELECT disponible FROM produit WHERE id_produit = ?', [id]);
    return res.json({
      status: 'success',
      disponible: rows[0].disponible,
      message: rows[0].disponible ? 'Produit disponible.' : 'Produit masqué.',
    });
  } catch (err) {
    console.error('Erreur toggleDisponibilite:', err);
    return res.status(500).json({ status: 'error', message: 'Impossible de modifier la disponibilité. Réessayez.' });
  }
};

module.exports = { getProduits, ajouterProduit, modifierProduit, supprimerProduit, toggleDisponibilite };
