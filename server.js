const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Serve static files from the 'stitch_calendario_semanal_de_pistas' directory
app.use(express.static(path.join(__dirname, 'stitch_calendario_semanal_de_pistas')));

// Redirect the root URL to the login page
app.get('/', (req, res) => {
  res.redirect('/inicio_de_sesion/code.html');
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
