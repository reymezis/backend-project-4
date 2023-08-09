import axios from 'axios';
import path from 'path';
import prettier from 'prettier';
import { promises as fs } from 'fs';
import * as cheerio from 'cheerio';
import Listr from 'listr';
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

export const downloadPage = async (url, dir = process.cwd()) => {
  const sourceUrl = new URL(url);
  const htmlFileName = getHtmlFileName(url);
  const loadDirectory = getAbsolutePath(path.join(dir));
  const absolutePath = getAbsolutePath(path.join(loadDirectory, htmlFileName));
  const assetsFolderName = getFolderName(absolutePath);
  const assetsFolderPath = getAbsolutePath(path.join(loadDirectory, assetsFolderName));
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
    .catch((e) => {
      if (e.response.status !== 200) {
        throw new Error(`Request ${url} failed, status code: ${e.response.status}`);
      }
    })
    .then(() => fs.access(loadDirectory, fs.constants.W_OK)
      .catch(() => {
        throw new Error(`Directory: ${dir} not exists or has no access`);
      }))
    .then(() => fs.mkdir(assetsFolderPath))
    .then(() => {
      const assetsPromises = [];
      const tasks = [];
      resourcesMap.forEach((value, key) => {
        const [, source] = key;
        value.each(function processTag() {
          const src = htmlResult(this).attr(source);
          const assetUrl = new URL(src, sourceUrl.origin);
          const downloadAssetUrl = `${assetUrl.origin}${assetUrl.pathname}`;
          const localAssetLink = `${assetsFolderName}/${sourceUrl.hostname.replace(/\./g, '-')}${getAssetFileName(assetUrl)}`;
          const absoluteAssetPath = getAbsolutePath(path.join(loadDirectory, localAssetLink));
          const promise = axios({
            method: 'get',
            url: downloadAssetUrl,
            responseType: 'arraybuffer',
          }).then((response) => {
            fs.writeFile(absoluteAssetPath, response.data);
          });
          assetsPromises.push(promise);
          tasks.push({
            title: downloadAssetUrl,
            task: () => promise,
          });
          htmlResult(this).attr(source, localAssetLink);
        });
      });
      // return assetsPromises;
      return new Listr(tasks, { concurrent: true });
    })
    // .then((data) => Promise.all(data))
    .then((listr) => listr.run())
    .then(() => htmlResult.html())
    .then((data) => prettier.format(data, { parser: 'html' }))
    .then((formatedHtml) => fs.writeFile(absolutePath, formatedHtml))
    .then(() => absolutePath);
};
