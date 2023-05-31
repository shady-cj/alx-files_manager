import sha1 from 'sha1';
import dbClient from '../utils/db';

class UsersController {
  static async postNew(req, res) {
    const { email, password } = req.body;
    if (!email) res.status(400).json({ error: 'Email missing' });
    if (!password) res.status(400).json({ error: 'Password missing' });
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
}
export default UsersController;
