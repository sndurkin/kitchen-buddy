import axios from 'axios';
import fs from 'fs-extra';
import path from 'path';

const CACHE_DIR = './cache';

fs.ensureDirSync(CACHE_DIR);

const getCachedFilePath = (url) => {
  const hashedUrl = Buffer.from(url).toString('base64');
  return path.join(CACHE_DIR, hashedUrl);
};

const fetchAndCache = async (url) => {
  const filePath = getCachedFilePath(url);

  try {
    if (await fs.pathExists(filePath)) {
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    }
  }
  catch (e) { /* Ignore */ }

  const response = await axios.get(url);
  try {
    await fs.writeFile(filePath, JSON.stringify(response.data));
  }
  catch (e) { /* Ignore */ }

  return response.data;
};

export {
  fetchAndCache,
};
