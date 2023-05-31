import express from 'express';
import loadRoutes from './routes';

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
const PORT = process.env.PORT || 5000;
loadRoutes(app);

app.listen(PORT, () => {
  console.log('Server is running');
});
