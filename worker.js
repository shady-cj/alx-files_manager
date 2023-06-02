import Queue from 'bull';
import ImageThumbnail from 'image-thumbnail';
import fs from 'fs';
import dbClient from './utils/db';
import { ObjectId } from 'mongodb'

const queue = new Queue('fileQueue');


queue.process(async (job, done) => {
  const { fileId, userId } = job.data;
  if (!fileId) throw new Error('Missing fileId');
  if (!userId) throw new Error('Missing userId');

  const getFile = await dbClient.db.collection('files').findOne({ _id: new ObjectId(fileId), userId });
  if (!getFile) throw new Error('File not found');
  try {
    console.log(getFile.localPath)
    const thumbnail_500 = await ImageThumbnail(getFile.localPath, { width: 500 });
    const thumbnail_250 = await ImageThumbnail(getFile.localPath, { width: 250 });
    const thumbnail_100 = await ImageThumbnail(getFile.localPath, { width: 100 });
    const path_500 = `${getFile.localPath}_500`;
    const path_250 = `${getFile.localPath}_250`;
    const path_100 = `${getFile.localPath}_100`;
    await fs.promises.writeFile(path_500, thumbnail_500);
    await fs.promises.writeFile(path_250, thumbnail_250);
    await fs.promises.writeFile(path_100, thumbnail_100);
    done();
  } catch (err) {
    console.log(err)
    done();
  }

})