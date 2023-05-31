import sha1 from 'sha1';
import { ObjectId } from 'mongodb';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class UsersController {
  static async postNew(req, res) {
    const { email, password } = req.body;
    if (!email) {
      res.status(400).json({ error: 'Email missing' });
      return;
    }
    if (!password) {
      res.status(400).json({ error: 'Password missing' });
      return;
    }
    const userCollection = dbClient.db.collection('users');
    const userCount = await userCollection.find({ email }).count();
    if (userCount > 0) {
      res.status(400).json({ error: 'Already exists' });
      return;
    }
    const passwordsha1 = sha1(password);
    await userCollection.insertOne({ email, password: passwordsha1 });
    const newUser = await userCollection.findOne({ email });
    res.status(201).json({ id: newUser._id, email: newUser.email });
  }

  static async getMe(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const getUserId = await redisClient.get(`auth_${token}`);
    if (!getUserId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const retrieveUser = await dbClient.db.collection('users').findOne({ _id: new ObjectId(getUserId) });
    if (!retrieveUser) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    res.status(200).json({ id: retrieveUser._id, email: retrieveUser.email });
  }
}
export default UsersController;
