// server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT;

app.use(cors({ origin: '*', methods: ['GET','POST','PUT','PATCH','DELETE'], allowedHeaders: ['Content-Type','Authorization'] }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Images servies statiquement
app.use('/images', express.static(path.join(__dirname, 'public', 'images')));

// Routes
app.use('/api/auth',      require('./src/routes/auth'));
app.use('/api/produits',  require('./src/routes/produits'));
app.use('/api/commandes', require('./src/routes/commandes'));
app.use('/api/profil',    require('./src/routes/profil'));
app.use('/api/admin',     require('./src/routes/admin'));   // ← ADMIN

app.get('/', (req, res) => {
  res.json({ status: 'success', message: 'API Cycy Food v1.1' });
});

app.use((req, res) => res.status(404).json({ status: 'error', message: 'Demande invalide.' }));

app.listen(PORT, '0.0.0.0', () => {
  console.log('\nCYCY FOOD API v1.1 - Démarré !');
  
});
