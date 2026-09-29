const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// health check route
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Express backend is running with Postgres/Redis/S3 support!' });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});