// src/controllers/commandeController.js
const db = require('../config/database');
const { notifierAdmins } = require('./notifController');

// ===================== PASSER UNE COMMANDE =====================
const passerCommande = async (req, res) => {
  const { produits, prixTotal, avec_livraison } = req.body;
  const id_user = req.user.id_user;

  if (!produits || !Array.isArray(produits) || produits.length === 0) {
    return res.status(400).json({ status: 'error', message: 'Panier vide ou données invalides.' });
  }
  if (!prixTotal || isNaN(parseFloat(prixTotal))) {
    return res.status(400).json({ status: 'error', message: 'Prix total invalide.' });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const date  = new Date().toISOString().slice(0, 10);
    const heure = new Date().toTimeString().slice(0, 8);
    const aLivraison = avec_livraison ? 1 : 0;

    const [result] = await conn.query(
      `INSERT INTO commande
        (prix_commande, id_user, date_commande, heure_commande, statut, avec_livraison)
       VALUES (?, ?, ?, ?, 'en_attente', ?)`,
      [parseFloat(prixTotal), id_user, date, heure, aLivraison]
    );
    const commande_id = result.insertId;

    for (const produit of produits) {
      const produit_id = parseInt(produit.id || produit.id_produit);
      const quantite   = parseInt(produit.quantite) || 1;
      if (isNaN(produit_id)) continue;
      await conn.query(
        'INSERT INTO commande_produit (id_commande, id_produit, quantite) VALUES (?, ?, ?)',
        [commande_id, produit_id, quantite]
      );
    }

    await conn.commit();

    // Nom du client pour la notification admin
    const [userRows] = await db.query(
      'SELECT nom_user, prenom_user FROM user WHERE id_user = ?',
      [id_user]
    );
    const nomClient = userRows.length > 0
      ? `${userRows[0].nom_user} ${userRows[0].prenom_user}`
      : 'Un client';

    // Notifier les admins en arrière-plan
    notifierAdmins(commande_id, nomClient, parseFloat(prixTotal), aLivraison).catch(err =>
      console.error('[NOTIF] Erreur notification admin:', err.message)
    );

    return res.json({ status: 'success', message: 'Commande enregistrée !', commande_id });
  } catch (err) {
    await conn.rollback();
    console.error('Erreur passerCommande:', err);
    return res.status(500).json({ status: 'error', message: 'Erreur lors de l\'enregistrement.' });
  } finally {
    conn.release();
  }
};

// ===================== MES COMMANDES (client) =====================
const getMesCommandes = async (req, res) => {
  const id_user = req.user.id_user;
  try {
    const [commandes] = await db.query(
      `SELECT c.id_commande, c.prix_commande, c.date_commande,
              c.heure_commande, c.statut, c.note_admin, c.avec_livraison,
              GROUP_CONCAT(p.nom_produit ORDER BY p.nom_produit SEPARATOR ', ') AS produits_noms
       FROM commande c
       LEFT JOIN commande_produit cp ON c.id_commande = cp.id_commande
       LEFT JOIN produit p ON cp.id_produit = p.id_produit
       WHERE c.id_user = ?
       GROUP BY c.id_commande
       ORDER BY c.date_commande DESC, c.heure_commande DESC`,
      [id_user]
    );
    return res.json({ status: 'success', commandes });
  } catch (err) {
    console.error('Erreur getMesCommandes:', err);
    return res.status(500).json({ status: 'error', message: 'Erreur serveur.' });
  }
};

module.exports = { passerCommande, getMesCommandes };
