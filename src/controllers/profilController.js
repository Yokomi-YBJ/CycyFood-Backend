// src/controllers/profilController.js
const db = require('../config/database');
const bcrypt = require('bcryptjs');

// ===================== MODIFIER PROFIL =====================
const modifierProfil = async (req, res) => {
  const { nom, prenom, adresse, telephone } = req.body;
  const id_user = req.user.id_user;

  if (!nom || !prenom || !adresse || !telephone) {
    return res.status(400).json({ status: 'error', message: 'Tous les champs sont obligatoires.' });
  }

  const tel = parseInt(telephone);
  if (isNaN(tel) || String(telephone).length !== 9) {
    return res.status(400).json({ status: 'error', message: 'Numéro de téléphone invalide (9 chiffres requis).' });
  }

  try {
    const [existing] = await db.query(
      'SELECT id_user FROM user WHERE telephone = ? AND id_user != ?',
      [tel, id_user]
    );
    if (existing.length > 0) {
      return res.status(409).json({ status: 'error', message: 'Ce numéro est déjà utilisé par un autre compte.' });
    }

    await db.query(
      'UPDATE user SET nom_user = ?, prenom_user = ?, adresse_user = ?, telephone = ? WHERE id_user = ?',
      [nom.trim(), prenom.trim(), adresse.trim(), tel, id_user]
    );

    const [rows] = await db.query(
      'SELECT id_user, nom_user, prenom_user, adresse_user, telephone FROM user WHERE id_user = ?',
      [id_user]
    );

    return res.json({ status: 'success', message: 'Profil mis à jour !', user: rows[0] });
  } catch (err) {
    console.error('Erreur modifierProfil:', err);
    return res.status(500).json({ status: 'error', message: 'Erreur serveur.' });
  }
};

// ===================== OBTENIR SON PROFIL =====================
const getProfil = async (req, res) => {
  const id_user = req.user.id_user;
  try {
    const [rows] = await db.query(
      'SELECT id_user, nom_user, prenom_user, adresse_user, telephone FROM user WHERE id_user = ?',
      [id_user]
    );
    if (rows.length === 0) return res.status(404).json({ status: 'error', message: 'Utilisateur introuvable.' });
    return res.json({ status: 'success', user: rows[0] });
  } catch (err) {
    console.error('Erreur getProfil:', err);
    return res.status(500).json({ status: 'error', message: 'Erreur serveur.' });
  }
};

// ===================== CHANGER MOT DE PASSE =====================
const changerMotDePasse = async (req, res) => {
  const { ancienMotDePasse, nouveauMotDePasse } = req.body;
  const id_user = req.user.id_user;

  // Validation
  if (!ancienMotDePasse || !nouveauMotDePasse) {
    return res.status(400).json({ status: 'error', message: 'Ancien et nouveau mot de passe requis.' });
  }
  if (nouveauMotDePasse.length < 6) {
    return res.status(400).json({ status: 'error', message: 'Le nouveau mot de passe doit contenir au moins 6 caractères.' });
  }
  if (ancienMotDePasse === nouveauMotDePasse) {
    return res.status(400).json({ status: 'error', message: 'Le nouveau mot de passe doit être différent de l\'ancien.' });
  }

  try {
    // Récupérer le hash actuel
    const [rows] = await db.query('SELECT password FROM user WHERE id_user = ?', [id_user]);
    if (rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Utilisateur introuvable.' });
    }

    // Vérifier l'ancien mot de passe
    const isValid = await bcrypt.compare(ancienMotDePasse, rows[0].password);
    if (!isValid) {
      return res.status(401).json({ status: 'error', message: 'Ancien mot de passe incorrect.' });
    }

    // Hasher et sauvegarder le nouveau
    const hashedPassword = await bcrypt.hash(nouveauMotDePasse, 10);
    await db.query('UPDATE user SET password = ? WHERE id_user = ?', [hashedPassword, id_user]);

    return res.json({ status: 'success', message: 'Mot de passe mis à jour avec succès !' });
  } catch (err) {
    console.error('Erreur changerMotDePasse:', err);
    return res.status(500).json({ status: 'error', message: 'Erreur serveur.' });
  }
};

module.exports = { modifierProfil, getProfil, changerMotDePasse };
