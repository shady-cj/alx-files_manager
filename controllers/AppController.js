import redisClient from '../utils/redis';
import dbClient from '../utils/db';

class AppController {
  static getStatus(req, res) {
    const redisIsAlive = redisClient.isAlive();
    const dbIsAlive = dbClient.isAlive();
    res.status(200).json({
      redis: redisIsAlive,
      db: dbIsAlive,
    });
  }

  static async getStats(req, res) {
    const numOfUsers = await dbClient.nbUsers();
    const numOfFiles = await dbClient.nbFiles();
    res.status(200).json({
      users: numOfUsers,
      files: numOfFiles,
    });
  }
}
export default AppController;
