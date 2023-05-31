import { ObjectId } from 'mongodb';
import { v4 } from 'uuid';
import dbClient from "../utils/db";
import redisClient from "../utils/redis";
import fs from 'fs';

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
    if (!data && type != 'folder') {
      res.status(400).json({ error: 'Missing data' });
      return;
    }
    if (parentId) {
      const retrieveParentFile = await fileCollection.findOne({ _id: new ObjectId(parentId) });
      if (!retrieveParentFile) {
        res.status(400).json({ error: 'Parent not found' });
        return;
      }
      if (retrieveParentFile.type != 'folder') {
        res.status(400).json({ error: 'Parent is not a folder'});
        return;
      }
    }

    const folderPath = process.env.FOLDER_PATH ||  '/tmp/files_manager';
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath);
    }
    const filePath = folderPath + `/${v4()}`;
    const decodedData = Buffer.from(data, 'base64').toString('utf-8');
    fs.writeFile(filePath, decodedData, (err) => {
      if (err) {
        console.log(err)
        res.status(400).json({ error: 'Couldn\'t write to file'});
      }
    });
    if (type === 'folder') {
      await fileCollection.insertOne({
        userId: getUserId,
        name,
        type,
        isPublic: isPublic || false,
        parentId: parentId || 0,
      });
    } else {
      await fileCollection.insertOne({
        userId: getUserId,
        name,
        type,
        isPublic: isPublic || false,
        parentId: parentId || 0,
        localPath: filePath
      });
    }
    const newFile = await fileCollection.findOne({
      name,
      userId: getUserId,
      type
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
}
export default FilesController;
