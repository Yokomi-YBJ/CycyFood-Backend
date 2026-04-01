// src/controllers/authController.js
const db = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ===================== INSCRIPTION =====================
const inscription = async (req, res) => {
  const { nom, prenom, adresse, telephone, password, copassword } = req.body;

  // Validation des champs
  if (!nom || !prenom || !adresse || !telephone || !password || !copassword) {
    return res.status(400).json({
      status: 'error',
      message: 'Veuillez remplir tous les champs.',
    });
  }

  if (password !== copassword) {
    return res.status(400).json({
      status: 'error',
      message: 'Les mots de passe ne correspondent pas.',
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      status: 'error',
      message: 'Le mot de passe doit contenir au moins 6 caractères.',
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
    // Vérifier si le téléphone existe déjà
    const [existing] = await db.query(
      'SELECT COUNT(*) as count FROM user WHERE telephone = ?',
      [tel]
    );

    if (existing[0].count > 0) {
      return res.status(409).json({
        status: 'error',
        message: 'Ce numéro de téléphone est déjà utilisé.',
      });
    }

    // Hacher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insérer l'utilisateur
    const [result] = await db.query(
      'INSERT INTO user (nom_user, prenom_user, adresse_user, telephone, password) VALUES (?, ?, ?, ?, ?)',
      [nom, prenom, adresse, tel, hashedPassword]
    );

    // Générer le token JWT
    const token = jwt.sign(
      { id_user: result.insertId, telephone: tel, nom_user: nom },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    return res.status(201).json({
      status: 'success',
      message: 'Inscription réussie !',
      token,
      user: {
        id_user: result.insertId,
        nom_user: nom,
        prenom_user: prenom,
        adresse_user: adresse,
        telephone: tel,
      },
    });
  } catch (err) {
    console.error('Erreur inscription:', err);
    return res.status(500).json({
      status: 'error',
      message: 'Erreur serveur. Réessayez plus tard.',
    });
  }
};

// ===================== CONNEXION =====================
const connexion = async (req, res) => {
  const { telephone, password } = req.body;

  if (!telephone || !password) {
    return res.status(400).json({
      status: 'error',
      message: 'Veuillez remplir tous les champs.',
    });
  }

  const tel = parseInt(telephone);

  try {
    // Chercher dans la table user
    const [users] = await db.query(
      'SELECT * FROM user WHERE telephone = ?',
      [tel]
    );

    if (users.length > 0) {
      const user = users[0];
      const isValid = await bcrypt.compare(password, user.password);

      if (!isValid) {
        return res.status(401).json({
          status: 'error',
          message: 'Numéro de téléphone ou mot de passe incorrect.',
        });
      }

      const token = jwt.sign(
        { id_user: user.id_user, telephone: user.telephone, nom_user: user.nom_user, role: 'user' },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
      );

      return res.json({
        status: 'success',
        message: 'Connexion réussie !',
        token,
        user: {
          id_user: user.id_user,
          nom_user: user.nom_user,
          prenom_user: user.prenom_user,
          adresse_user: user.adresse_user,
          telephone: user.telephone,
          role: 'user',
        },
      });
    }

    // Chercher dans la table admin
    const [admins] = await db.query(
      'SELECT * FROM admin WHERE telephone = ?',
      [tel]
    );

    if (admins.length > 0) {
      const admin = admins[0];
      const isValid = await bcrypt.compare(password, admin.password);

      if (!isValid) {
        return res.status(401).json({
          status: 'error',
          message: 'Numéro de téléphone ou mot de passe incorrect.',
        });
      }

      const token = jwt.sign(
        { id_admin: admin.id_admin, telephone: admin.telephone, nom_admin: admin.nom_admin, role: 'admin' },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
      );

      return res.json({
        status: 'success',
        message: 'Connexion admin réussie !',
        token,
        user: {
          id_user: admin.id_admin,
          nom_user: admin.nom_admin,
          telephone: admin.telephone,
          role: 'admin',
        },
      });
    }

    // Ni user ni admin trouvé
    return res.status(404).json({
      status: 'error',
      message: 'Aucun compte trouvé. Veuillez vous inscrire.',
    });
  } catch (err) {
    console.error('Erreur connexion:', err);
    return res.status(500).json({
      status: 'error',
      message: 'Erreur serveur. Réessayez plus tard.',
    });
  }
};

module.exports = { inscription, connexion };
