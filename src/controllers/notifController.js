// src/controllers/notifController.js
const db = require('../config/database');

// ===================== SAUVEGARDER LE PUSH TOKEN =====================
const savePushToken = async (req, res) => {
  const { push_token } = req.body;
  const id_user = req.user.id_user;

  if (!push_token) {
    return res.status(400).json({ status: 'error', message: 'Une erreur est survenue. Veuillez réessayer.' });
  }

  try {
    await db.query(
      'UPDATE user SET push_token = ? WHERE id_user = ?',
      [push_token, id_user]
    );
    return res.json({ status: 'success', message: 'Token enregistré.' });
  } catch (err) {
    console.error('Erreur savePushToken:', err);
    return res.status(500).json({ status: 'error', message: 'Impossible d\'enregistrer votre appareil. Réessayez.' });
  }
};

// ===================== ENVOYER UNE NOTIFICATION EXPO PUSH =====================
const envoyerNotification = async (pushToken, titre, corps, data = {}) => {
  if (!pushToken || !pushToken.startsWith('ExponentPushToken')) {
    console.log('Token invalide ou absent, notif ignorée:', pushToken);
    return;
  }

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: pushToken,
        title: titre,
        body: corps,
        sound: 'default',
        priority: 'high',
        channelId: 'default',
        data: { type: 'commande', ...data },
        badge: 1,
      }),
    });

    const result = await response.json();
    console.log('[NOTIF] Réponse Expo:', JSON.stringify(result));

    if (result.data?.status === 'error') {
      console.error('Expo Push erreur:', result.data.message);
    } else {
      console.log('Notification envoyée ');
    }
  } catch (err) {
    // Ne jamais faire échouer la requête principale si la notif échoue
    console.error('Erreur envoi notification:', err.message);
  }
};

// ===================== MESSAGES PAR STATUT =====================
const MESSAGES_STATUT = {
  confirmee: {
    titre: 'Commande confirmée !',
    corps: 'Votre commande est en cours de préparation. Merci pour votre confiance !',
  },
  en_livraison: {
    titre: 'En route vers vous !',
    corps: 'Votre commande est en livraison. Préparez-vous !',
  },
  livree: {
    titre: 'Commande livrée !',
    corps: 'Votre commande a bien été livrée. Bon appétit ! 🍽️',
  },
  annulee: {
    titre: 'Commande annulée',
    corps: 'Votre commande a été annulée. Contactez-nous sur WhatsApp pour plus d\'info.',
  },
};

module.exports = { savePushToken, envoyerNotification, MESSAGES_STATUT };
