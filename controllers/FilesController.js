import { ObjectId } from 'mongodb';
import mime from 'mime-types';
import fs from 'fs';
import { v4 } from 'uuid';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class FilesController {
  static async postUpload(req, res) {
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
    const fileCollection = dbClient.db.collection('files');
    const {
      name,
      type,
      parentId,
      isPublic,
      data,
    } = req.body;
    if (!name) {
      res.status(400).json({ error: 'Missing name' });
      return;
    }
    if (!type) {
      res.status(400).json({ error: 'Missing type' });
      return;
    }
    if (!data && type !== 'folder') {
      res.status(400).json({ error: 'Missing data' });
      return;
    }
    if (parentId) {
      const retrieveParentFile = await fileCollection.findOne({ _id: new ObjectId(parentId) });
      if (!retrieveParentFile) {
        res.status(400).json({ error: 'Parent not found' });
        return;
      }
      if (retrieveParentFile.type !== 'folder') {
        res.status(400).json({ error: 'Parent is not a folder' });
        return;
      }
    }
    if (type === 'folder') {
      await fileCollection.insertOne({
        userId: getUserId,
        name,
        type,
        isPublic: isPublic || false,
        parentId: parentId || '0',
      });
    } else {
      const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath);
      }
      const filePath = `${folderPath}/${v4()}`;
      const decodedData = Buffer.from(data, 'base64').toString('utf-8');
      fs.writeFile(filePath, decodedData, (err) => {
        if (err) {
          res.status(400).json({ error: 'Couldn\'t write to file' });
        }
      });
      await fileCollection.insertOne({
        userId: getUserId,
        name,
        type,
        isPublic: isPublic || false,
        parentId: parentId || '0',
        localPath: filePath,
      });
    }

    const newFile = await fileCollection.findOne({
      name,
      userId: getUserId,
      type,
    });
    if (!newFile) {
      res.status(400).json({ error: 'No such file in the db' });
      return;
    }
    res.status(201).json({
      id: newFile._id,
      userId: newFile.userId,
      name: newFile.name,
      type: newFile.type,
      isPublic: newFile.isPublic,
      parentId: newFile.parentId,
    });
  }

  static async getShow(req, res) {
    const { id } = req.params;
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
    const retrieveFile = await dbClient.db.collection('files').findOne({ _id: new ObjectId(id), userId: getUserId });
    if (!retrieveFile) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    res.status(200).json({
      id: retrieveFile._id,
      userId: retrieveFile.userId,
      name: retrieveFile.name,
      type: retrieveFile.type,
      isPublic: retrieveFile.isPublic,
      parentId: retrieveFile.parentId,
    });
  }

  static async getIndex(req, res) {
    const token = req.headers['x-token'];
    const { parentId, page } = req.query;
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
    const retrieveFiles = await dbClient.db.collection('files').find({ parentId: parentId || '0' }).skip((page || 0) * 20).limit(20)
      .toArray();
    // Using aggregate query to paginate
    // const retrieveFiles = await dbClient.db.collection('files').aggregate([
    //   { '$match': { parentId: parentId || '0' }},
    //   { '$skip': (page || 0) * 20 },
    //   { '$limit': 20 }
    // ]).toArray();
    res.status(200).json(
      retrieveFiles.map((item) => ({
        id: item._id,
        userId: item.userId,
        name: item.name,
        type: item.type,
        isPublic: item.isPublic,
        parentId: item.parentId,
      })),
    );
  }

  static async putPublish(req, res) {
    const { id } = req.params;
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
    const retrieveFile = await dbClient.db.collection('files').findOne({ _id: new ObjectId(id), userId: getUserId });
    if (!retrieveFile) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    await dbClient.db.collection('files').updateOne({ _id: new ObjectId(id), userId: getUserId }, { $set: { isPublic: true } });

    const updatedFile = await dbClient.db.collection('files').findOne({ _id: new ObjectId(id), userId: getUserId });
    res.status(200).json({
      id: updatedFile._id,
      userId: updatedFile.userId,
      name: updatedFile.name,
      type: updatedFile.type,
      isPublic: updatedFile.isPublic,
      parentId: updatedFile.parentId,
    });
  }

  static async putUnpublish(req, res) {
    const { id } = req.params;
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
    const retrieveFile = await dbClient.db.collection('files').findOne({ _id: new ObjectId(id), userId: getUserId });
    if (!retrieveFile) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    await dbClient.db.collection('files').updateOne({ _id: new ObjectId(id), userId: getUserId }, { $set: { isPublic: false } });

    const updatedFile = await dbClient.db.collection('files').findOne({ _id: new ObjectId(id), userId: getUserId });
    res.status(200).json({
      id: updatedFile._id,
      userId: updatedFile.userId,
      name: updatedFile.name,
      type: updatedFile.type,
      isPublic: updatedFile.isPublic,
      parentId: updatedFile.parentId,
    });
  }

  static async getFile(req, res) {
    const { id } = req.params;
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
    const retrieveFile = await dbClient.db.collection('files').findOne({ _id: new ObjectId(id) });
    if (!retrieveFile || !retrieveUser) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    if (retrieveFile.isPublic === false && retrieveUser) {
      if (retrieveUser._id != retrieveFile.userId) {
        res.status(404).json({ error: 'Not found' });
        return;
      }
    }

    if (retrieveFile.type === 'folder') {
      res.status(400).json({ error: 'A folder doesn\'t have content' });
      return;
    }
    if (!fs.existsSync(retrieveFile.localPath)) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    const contentType = mime.contentType(retrieveFile.localPath);;
    res.setHeader('content-type', contentType);
    const content = await fs.promises.readFile(retrieveFile.localPath);
    res.send(content);
  }
}
export default FilesController;
