import Queue from 'bull';
import ImageThumbnail from 'image-thumbnail';
import fs from 'fs';
import { ObjectId } from 'mongodb';
import dbClient from './utils/db';

const queue = new Queue('fileQueue');

queue.process(async (job, done) => {
  const { fileId, userId } = job.data;
  if (!fileId) throw new Error('Missing fileId');
  if (!userId) throw new Error('Missing userId');

  const getFile = await dbClient.db.collection('files').findOne({ _id: new ObjectId(fileId), userId });
  if (!getFile) throw new Error('File not found');
  try {
    const thumbnail500 = await ImageThumbnail(getFile.localPath, { width: 500 });
    const thumbnail250 = await ImageThumbnail(getFile.localPath, { width: 250 });
    const thumbnail100 = await ImageThumbnail(getFile.localPath, { width: 100 });
    const path500 = `${getFile.localPath}_500`;
    const path250 = `${getFile.localPath}_250`;
    const path100 = `${getFile.localPath}_100`;
    await fs.promises.writeFile(path500, thumbnail500);
    await fs.promises.writeFile(path250, thumbnail250);
    await fs.promises.writeFile(path100, thumbnail100);
    done();
  } catch (err) {
    console.log(err);
    done();
  }
});
