import sha1 from 'sha1';
import { v4 } from 'uuid';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class AuthController {
  static async getConnect(req, res) {
    const basicToken = req.headers.authorization;
    const encodedCred = basicToken.slice(6);
    const cred = Buffer.from(encodedCred, 'base64').toString('utf-8');
    const arrayOfCreds = cred.split(':');
    const email = arrayOfCreds[0];
    const password = arrayOfCreds.slice(1).join('');
    const userCollection = dbClient.db.collection('users');
    const retrieveUser = await userCollection.findOne({ email, password: sha1(password) });
    if (!retrieveUser) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const token = v4();
    const strKey = `auth_${token}`;
    await redisClient.set(strKey, retrieveUser._id, 24 * 60 * 60);
    res.status(200).json({ token });
  }

  static async getDisconnect(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    await redisClient.del(`auth_${token}`);
    res.status(204).json();
  }
}
export default AuthController;
