// src/controllers/produitController.js
const db = require('../config/database');

// ===================== LISTER LES PRODUITS (client - filtre disponible) =====================
const getProduits = async (req, res) => {
  try {
    // Si la colonne disponible existe, on filtre, sinon on retourne tout
    const [produits] = await db.query(
      'SELECT * FROM produit WHERE disponible = 1 OR disponible IS NULL ORDER BY id_produit DESC'
    );

    const host = req.hostname;
    /*const port = process.env.PORT || 3000;*/

    const produitsAvecImage = produits.map(p => ({
      ...p,
      img_url: `${host}/images/${p.img_produit.replace('produit_img/', '')}`,
    }));

    return res.json({ status: 'success', produits: produitsAvecImage });
  } catch (err) {
    console.error('Erreur getProduits:', err);
    return res.status(500).json({ status: 'error', message: 'Erreur serveur.' });
  }
};

module.exports = { getProduits };
