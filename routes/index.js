import AppController from '../controllers/AppController';

const loadRoutes = (app) => {
  app.get('/status', AppController.getStatus);
  app.get('/stats', AppController.getStats);
};
export default loadRoutes;
