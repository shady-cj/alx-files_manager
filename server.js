import express from 'express';
import loadRoutes from './routes';

const app = express();
const PORT = process.env.PORT || 5110;
loadRoutes(app);

app.listen(PORT, () => {
  console.log('Server is running');
});
