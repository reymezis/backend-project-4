import axios from 'axios';
import path from 'path';
import prettier from 'prettier';
import { promises as fs } from 'fs';
import * as cheerio from 'cheerio';
import debug from 'debug';
import 'axios-debug-log';

const logPageLoader = debug('page-loader');

const resourcesMap = new Map([
  [['img', 'src'], []],
  [['link', 'href'], []],
  [['script', 'src'], []],
]);

export const getHtmlFileName = (url) => {
  const urlWithoutProtocol = url.replace(/(^\w+:|^)\/\//, '');
  return `${urlWithoutProtocol.replace(/[^\w]/g, '-')}.html`;
};

const getLocalAssets = (html, tag, sourceAttr, url) => html(tag).filter(function filterAssets() {
  if (html(this).attr(sourceAttr)) {
    return html(this).attr(sourceAttr).startsWith(url.origin)
    || html(this).attr(sourceAttr).startsWith('/assets')
    || html(this).attr(sourceAttr).startsWith(url.pathname);
  }

  return false;
});

export const getAssetFileName = (url) => {
  const formatName = (str) => str.replace(/\//g, '-');
  return path.extname(url.pathname) ? formatName(url.pathname) : `${formatName(url.pathname)}.html`;
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
  logPageLoader(`execute axios http request to ${url}`);
  return axios.get(url)
    .then(({ data }) => {
      logPageLoader('start using cherio');
      const $ = cheerio.load(data);
      htmlResult = $;
      resourcesMap.forEach((value, key) => {
        const [tag, attr] = key;
        resourcesMap.set(key, getLocalAssets($, tag, attr, sourceUrl));
      });
    })
    .catch((e) => console.log('local assets process error', e))
    .then(() => fs.stat(pathFolder))
    .catch(() => fs.mkdir(pathFolder))
    .then(() => {
      const assetsPromises = [];
      resourcesMap.forEach((value, key) => {
        const [tag, source] = key;
        value.each(function processTag() {
          const src = htmlResult(this).attr(source);
          const assetUrl = new URL(src, sourceUrl.origin);
          const downloadAssetUrl = `${assetUrl.origin}${assetUrl.pathname}`;
          const localAssetLink = `${folderName}/${sourceUrl.hostname.replace(/\./g, '-')}${getAssetFileName(assetUrl)}`;
          const absoluteAssetPath = getAbsolutePath(path.join(dir, localAssetLink));
          assetsPromises.push(axios({
            method: 'get',
            url: downloadAssetUrl,
            responseType: tag === 'img' ? 'stream' : 'json',
          }).then((response) => {
            fs.writeFile(absoluteAssetPath, response.data)
              .catch((error) => console.log('error write asset file', error));
          }).catch((error) => console.log('axios error asset file', error)));
          htmlResult(this).attr(source, localAssetLink);
        });
      });
      return assetsPromises;
    })
    .catch((error) => console.log('error process local links', error))
    .then((data) => Promise.all(data))
    .catch((error) => console.log('error get all assets', error))
    .then(() => htmlResult.html())
    .then((data) => prettier.format(data, { parser: 'html' }))
    .catch((error) => console.log('error prettier', error))
    .then((formatedHtml) => fs.writeFile(absolutePath, formatedHtml))
    .catch((error) => console.log('error write main html file', error))
    .then(() => absolutePath);
};
