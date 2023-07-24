import axios from 'axios';
import path from 'path';
import prettier from 'prettier';
import { promises as fs } from 'fs';
import * as cheerio from 'cheerio';

export const getHtmlFileName = (url) => {
  const urlWithoutProtocol = url.replace(/(^\w+:|^)\/\//, '');
  return `${urlWithoutProtocol.replace(/[^\w]/g, '-')}.html`;
};

export const getImageFileName = (url) => {
  const formatName = (str) => str.replace(/\//g, '-');
  return url.pathname ? formatName(url.pathname) : formatName(url);
};

export const getFolderName = (pathFile) => {
  const { name } = path.parse(pathFile);
  return `${name}_files`;
};

export const getAbsolutePath = (pathFile) => path.resolve(pathFile);

export const downloadPage = async (url, dir) => {
  const sourceUrl = new URL(url);
  const htmlFileName = getHtmlFileName(url);
  const absolutePath = getAbsolutePath(path.join(dir, htmlFileName));
  const folderName = getFolderName(absolutePath);
  const pathFolder = getAbsolutePath(path.join(dir, folderName));
  let htmlResult;
  let imgTags;
  const imageLinks = [];
  return axios.get(url)
    .then(({ data }) => {
      const $ = cheerio.load(data);
      imgTags = $('img');
      imgTags.each(function getImageLinks() {
        imageLinks.push($(this).attr('src'));
      });
      htmlResult = $;
    })
    .then(() => fs.stat(pathFolder))
    .catch(() => fs.mkdir(pathFolder))
    .then(() => imageLinks.map((link) => {
      const imageUrl = link.startsWith('http') ? new URL(link) : link;
      const downloadImgUrl = link.startsWith('http')
        ? `${imageUrl.origin}${imageUrl.pathname}`
        : `${sourceUrl.origin}${imageUrl}`;
      const localImageLink = `${folderName}/${sourceUrl.hostname.replace(/\./g, '-')}${getImageFileName(imageUrl)}`;
      const absolutePathImage = getAbsolutePath(path.join(dir, localImageLink));
      axios({
        method: 'get',
        url: downloadImgUrl,
        responseType: 'stream',
      })
        .catch((error) => error)
        .then((response) => {
          fs.writeFile(absolutePathImage, response.data);
        });
      return localImageLink;
    }))
    .catch((error) => error)
    .then((localImageLinks) => {
      imgTags.each(function replaceImgLink(index) {
        return htmlResult(this).attr('src', localImageLinks[index]);
      });
      return htmlResult.html();
    })
    .then((data) => prettier.format(data, { parser: 'html' }))
    .then((formatedHtml) => fs.writeFile(absolutePath, formatedHtml))
    .catch((error) => error)
    .then(() => absolutePath);
};
