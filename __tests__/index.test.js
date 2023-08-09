// @ts-check

import os from 'os';
import { fileURLToPath } from 'url';
import path from 'path';
import nock from 'nock';
import { promises as fs } from 'fs';
import {
  test, expect, beforeEach, beforeAll,
} from '@jest/globals';
import {
  getHtmlFileName, downloadPage, getFolderName, getAbsolutePath,
} from '../src/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const getFixturePath = (filename) => path.join(__dirname, '..', '__fixtures__', filename);

nock.disableNetConnect();

const url = 'https://ru.hexlet.io/courses';
const expectedFileName = getHtmlFileName(url);
const fixtureImgPath = getFixturePath('ru-hexlet-io-courses_files/ru-hexlet-io-assets-professions-nodejs.png');
const fixtureCssPath = getFixturePath('ru-hexlet-io-courses_files/ru-hexlet-io-assets-application.css');
const fixtureJsPath = getFixturePath('ru-hexlet-io-courses_files/ru-hexlet-io-packs-js-runtime.js');
const fixtureHtmlPath = getFixturePath('ru-hexlet-io-courses_files/ru-hexlet-io-courses.html');
let tempDir;
let originHtmlFile;
let expected;

beforeAll(async () => {
  originHtmlFile = await fs.readFile(getFixturePath('origin.html'), 'utf-8');
  expected = await fs.readFile(getFixturePath('ru-hexlet-io-courses.html'), 'utf-8');
});

beforeEach(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'page-loader-'));
  nock('https://ru.hexlet.io')
    .get('/courses')
    .reply(200, originHtmlFile)
    .get('/assets/professions/nodejs.png')
    .replyWithFile(200, fixtureImgPath)
    .get('/assets/application.css')
    .replyWithFile(200, fixtureCssPath)
    .get('/courses')
    .replyWithFile(200, fixtureHtmlPath)
    .get('/packs/js/runtime.js')
    .replyWithFile(200, fixtureJsPath);
});

test('download web page', async () => {
  const filePath = await downloadPage(url, tempDir);
  const result = await fs.readFile(filePath, 'utf-8');
  expect(result).toEqual(expected);
});

test('saved html file name', async () => {
  const filePath = await downloadPage(url, tempDir);
  const fileName = path.basename(filePath);
  expect(fileName).toEqual(expectedFileName);
});

test('created images folder', async () => {
  const resultPath = await downloadPage(url, tempDir);
  const filePath = getAbsolutePath(path.join(tempDir, getFolderName(resultPath)));
  const stat = await fs.stat(filePath);
  expect(stat.isDirectory()).toBe(true);
});

test('created css file', async () => {
  const expectedCssFileName = path.basename(fixtureCssPath);
  const resultPath = await downloadPage(url, tempDir);
  const filePath = getAbsolutePath(
    path.join(tempDir, getFolderName(resultPath), expectedCssFileName),
  );
  const resultCssFileName = path.basename(filePath);
  const stat = await fs.stat(filePath);
  const resultCssFile = await fs.readFile(filePath, 'utf-8');
  const expectedCssFile = await fs.readFile(fixtureCssPath, 'utf-8');

  expect(stat.isFile()).toBe(true);
  expect(resultCssFileName).toEqual(expectedCssFileName);
  expect(resultCssFile).toEqual(expectedCssFile);
});

test('created js file', async () => {
  const expectedJsFileName = path.basename(fixtureJsPath);
  const resultPath = await downloadPage(url, tempDir);
  const filePath = getAbsolutePath(
    path.join(tempDir, getFolderName(resultPath), expectedJsFileName),
  );
  const resultJsFileName = path.basename(filePath);
  const stat = await fs.stat(filePath);
  const resultJsFile = await fs.readFile(filePath, 'utf-8');
  const expectedJsFile = await fs.readFile(fixtureJsPath, 'utf-8');

  expect(stat.isFile()).toBe(true);
  expect(resultJsFileName).toEqual(expectedJsFileName);
  expect(resultJsFile).toEqual(expectedJsFile);
});

test('created html file', async () => {
  const expectedHtmlFileName = path.basename(fixtureHtmlPath);
  const resultPath = await downloadPage(url, tempDir);
  const filePath = getAbsolutePath(
    path.join(tempDir, getFolderName(resultPath), expectedHtmlFileName),
  );
  const resultHtmlFileName = path.basename(filePath);
  const stat = await fs.stat(filePath);
  const resultHtmlFile = await fs.readFile(filePath, 'utf-8');
  const expectedHtmlFile = await fs.readFile(fixtureHtmlPath, 'utf-8');

  expect(stat.isFile()).toBe(true);
  expect(resultHtmlFileName).toEqual(expectedHtmlFileName);
  expect(resultHtmlFile).toEqual(expectedHtmlFile);
});

test('error with wrong url', async () => {
  nock('https://ru.hexlet.io')
    .get('/404')
    .reply(404, '');
  const badUrl = 'https://ru.hexlet.io/404';
  await expect(downloadPage(badUrl, tempDir))
    .rejects.toThrow(`Request ${badUrl} failed, status code: 404`);
});

test('access directory error', async () => {
  const notAccessiblePath = '/var/backups';
  await expect(downloadPage(url, notAccessiblePath))
    .rejects.toThrow(`Directory: ${notAccessiblePath} not exists or has no access`);
});

test('not exists directory', async () => {
  const notExistDir = './test';
  await expect(downloadPage(url, notExistDir))
    .rejects.toThrow(`Directory: ${notExistDir} not exists or has no access`);
});
