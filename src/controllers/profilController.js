// src/controllers/profilController.js
const db = require('../config/database');

// ===================== MODIFIER PROFIL =====================
const modifierProfil = async (req, res) => {
  const { nom, prenom, adresse, telephone } = req.body;
  const id_user = req.user.id_user;

  // Validation
  if (!nom || !prenom || !adresse || !telephone) {
    return res.status(400).json({
      status: 'error',
      message: 'Tous les champs sont obligatoires.',
    });
  }

  const tel = parseInt(telephone);
  if (isNaN(tel) || String(telephone).length !== 9) {
    return res.status(400).json({
      status: 'error',
      message: 'Numéro de téléphone invalide (9 chiffres requis).',
    });
  }

  try {
    // Vérifier si le numéro est déjà pris par un AUTRE utilisateur
    const [existing] = await db.query(
      'SELECT id_user FROM user WHERE telephone = ? AND id_user != ?',
      [tel, id_user]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        status: 'error',
        message: 'Ce numéro de téléphone est déjà utilisé par un autre compte.',
      });
    }

    // Mettre à jour
    await db.query(
      `UPDATE user 
       SET nom_user = ?, prenom_user = ?, adresse_user = ?, telephone = ?
       WHERE id_user = ?`,
      [nom.trim(), prenom.trim(), adresse.trim(), tel, id_user]
    );

    // Récupérer l'utilisateur mis à jour
    const [rows] = await db.query(
      'SELECT id_user, nom_user, prenom_user, adresse_user, telephone FROM user WHERE id_user = ?',
      [id_user]
    );

    return res.json({
      status: 'success',
      message: 'Profil mis à jour avec succès !',
      user: rows[0],
    });
  } catch (err) {
    console.error('Erreur modifierProfil:', err);
    return res.status(500).json({
      status: 'error',
      message: 'Erreur serveur. Réessayez plus tard.',
    });
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

    if (rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Utilisateur introuvable.' });
    }

    return res.json({ status: 'success', user: rows[0] });
  } catch (err) {
    console.error('Erreur getProfil:', err);
    return res.status(500).json({ status: 'error', message: 'Erreur serveur.' });
  }
};

module.exports = { modifierProfil, getProfil };
