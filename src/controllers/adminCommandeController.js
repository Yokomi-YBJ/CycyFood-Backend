// src/controllers/adminCommandeController.js
const db = require('../config/database');
const { envoyerNotification, MESSAGES_STATUT } = require('./notifController');

// ===================== TOUTES LES COMMANDES =====================
const getToutesCommandes = async (req, res) => {
  const { statut } = req.query;

  try {
    let query = `
      SELECT
        c.id_commande, c.prix_commande, c.date_commande,
        c.heure_commande, c.statut, c.note_admin,
        u.id_user, u.nom_user, u.prenom_user,
        u.telephone AS telephone_client, u.adresse_user,
        GROUP_CONCAT(
          CONCAT(p.nom_produit, ' x', IFNULL(cp.quantite,1))
          ORDER BY p.nom_produit SEPARATOR ' | '
        ) AS produits_detail,
        COUNT(DISTINCT cp.id_produit) AS nb_produits
      FROM commande c
      INNER JOIN user u ON c.id_user = u.id_user
      LEFT JOIN commande_produit cp ON c.id_commande = cp.id_commande
      LEFT JOIN produit p ON cp.id_produit = p.id_produit
    `;

    const params = [];
    if (statut) {
      query += ' WHERE c.statut = ?';
      params.push(statut);
    }

    query += ' GROUP BY c.id_commande ORDER BY c.date_commande DESC, c.heure_commande DESC';
    query += ' LIMIT 50';
    const [commandes] = await db.query(query, params);
    return res.json({ status: 'success', commandes });
  } catch (err) {
    console.error('Erreur getToutesCommandes:', err);
    return res.status(500).json({ status: 'error', message: 'Impossible de charger les commandes. Réessayez.' });
  }
};

// ===================== CHANGER STATUT + ENVOYER NOTIFICATION =====================
const changerStatut = async (req, res) => {
  const { id } = req.params;
  const { statut, note_admin } = req.body;
  const statutsValides = ['en_attente', 'confirmee', 'en_livraison', 'livree', 'annulee'];
  if (!statutsValides.includes(statut)) {
    return res.status(400).json({ status: 'error', message: 'Le statut de la commande n\'est pas valide.' });
  }

  try {
    // Mettre à jour le statut
    await db.query(
      'UPDATE commande SET statut = ?, note_admin = ? WHERE id_commande = ?',
      [statut, note_admin || null, id]
    );

    // Récupérer les infos du client + son push token
    const [rows] = await db.query(
      `SELECT c.statut, c.prix_commande,
              u.nom_user, u.prenom_user, u.telephone, u.push_token
       FROM commande c
       INNER JOIN user u ON c.id_user = u.id_user
       WHERE c.id_commande = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Cette commande n\'existe pas.' });
    }

    const client = rows[0];

    // Envoyer la notification push si un message est défini pour ce statut
    if (MESSAGES_STATUT[statut] && client.push_token) {
      await envoyerNotification(
        client.push_token,
        MESSAGES_STATUT[statut].titre,
        MESSAGES_STATUT[statut].corps,
        { commande_id: parseInt(id), statut }
      );
    }

    const msgs = {
      confirmee:    '✅ Commande confirmée — client notifié.',
      en_livraison: '🛵 Commande en livraison — client notifié.',
      livree:       '📦 Commande livrée — client notifié.',
      annulee:      '❌ Commande annulée — client notifié.',
      en_attente:   '⏳ Remise en attente.',
    };

    return res.json({
      status: 'success',
      message: msgs[statut],
      notification_envoyee: !!(MESSAGES_STATUT[statut] && client.push_token),
      commande: {
        statut: client.statut,
        nom_user: client.nom_user,
        prenom_user: client.prenom_user,
        telephone: client.telephone,
      },
    });
  } catch (err) {
    console.error('Erreur changerStatut:', err);
    return res.status(500).json({ status: 'error', message: 'Erreur serveur.' });
  }
};

// ===================== STATISTIQUES TABLEAU DE BORD =====================
const getStats = async (req, res) => {
  try {
    const [[{ total_commandes }]] = await db.query('SELECT COUNT(*) AS total_commandes FROM commande');
    const [[{ en_attente }]] = await db.query("SELECT COUNT(*) AS en_attente FROM commande WHERE statut = 'en_attente'");
    const [[{ confirmees }]] = await db.query("SELECT COUNT(*) AS confirmees FROM commande WHERE statut IN ('confirmee','en_livraison')");
    const [[{ chiffre_affaires }]] = await db.query("SELECT IFNULL(SUM(prix_commande),0) AS chiffre_affaires FROM commande WHERE statut != 'annulee'");
    const [[{ total_clients }]] = await db.query('SELECT COUNT(*) AS total_clients FROM user');
    const [[{ total_produits }]] = await db.query('SELECT COUNT(*) AS total_produits FROM produit');
    const [[{ produits_dispo }]] = await db.query('SELECT COUNT(*) AS produits_dispo FROM produit WHERE disponible = 1');
    const [commandes_recentes] = await db.query(
      `SELECT c.id_commande, c.prix_commande, c.statut, c.heure_commande,
              u.nom_user, u.prenom_user
       FROM commande c
       INNER JOIN user u ON c.id_user = u.id_user
       ORDER BY c.date_commande DESC, c.heure_commande DESC
       LIMIT 5`
    );

    return res.json({
      status: 'success',
      stats: { total_commandes, en_attente, confirmees, chiffre_affaires, total_clients, total_produits, produits_dispo },
      commandes_recentes,
    });
  } catch (err) {
    console.error('Erreur getStats:', err);
    return res.status(500).json({ status: 'error', message: 'Erreur serveur.' });
  }
};

// ===================== LISTE DES CLIENTS =====================
const getClients = async (req, res) => {
  try {
    const [clients] = await db.query(
      `SELECT u.id_user, u.nom_user, u.prenom_user, u.adresse_user, u.telephone,
              COUNT(c.id_commande) AS nb_commandes,
              IFNULL(SUM(c.prix_commande), 0) AS total_depense
       FROM user u
       LEFT JOIN commande c ON u.id_user = c.id_user AND c.statut != 'annulee'
       GROUP BY u.id_user
       ORDER BY total_depense DESC`
    );
    return res.json({ status: 'success', clients });
  } catch (err) {
    console.error('Erreur getClients:', err);
    return res.status(500).json({ status: 'error', message: 'Impossible de charger la liste des clients. Réessayez.' });
  }
};

//================================ DEBUG EXPO NOTIFICATIONS ================================



module.exports = { getToutesCommandes, changerStatut, getStats, getClients };
