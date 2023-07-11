import axios from 'axios';
import path from 'path';
import { promises as fs } from 'fs';

export const getFileName = (url) => {
  const urlWithoutProtocol = url.replace(/(^\w+:|^)\/\//, '');
  return `${urlWithoutProtocol.replace(/[^\w]/g, '-')}.html`;
};

export const downloadPage = async (url, dir) => {
  const filePath = path.join(dir, getFileName(url));
  const absolutePath = path.resolve(filePath);
  return axios.get(url)
    .then((response) => fs.writeFile(absolutePath, response.data))
    .catch((error) => error)
    .then(() => absolutePath);
};
