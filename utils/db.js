import { MongoClient } from "mongodb";

class DBClient {
  constructor() {
    const host = process.env["DB_HOST"] || "localhost";
    const port = process.env["DB_PORT"] || 27017;
    const database = process.env["DB_DATABASE"] || 'files_manager';
    const url = `mongodb://${host}:${port}/${database}`;
    this.isConnected = false;
    this.db = null;
    MongoClient.connect(url, (err, db) => {
      if (err) console.log(err);
      this.isConnected = true;
      this.db = db.db();
    })
  }

  isAlive() {
    return this.isConnected;
  }

  async nbUsers() {
    if (this.db) {
      const users = this.db.collection('users')
      return await users.find().count();
    }
  }

  async nbFiles() {
    if (this.db) {
      const files = this.db.collection('files')
      return await files.find().count();
    }
  }
}

const dbClient = new DBClient();
export default dbClient;
