// @ts-check

import os from 'os';
import { fileURLToPath } from 'url';
import path from 'path';
import nock from 'nock';
import { promises as fs } from 'fs';
import {
  test, expect, beforeEach,
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
const originHtmlFile = await fs.readFile(getFixturePath('origin.html'), 'utf-8');
const expected = await fs.readFile(getFixturePath('ru-hexlet-io-courses.html'), 'utf-8');
const fixtureImgPath = getFixturePath('ru-hexlet-io-courses_files/ru-hexlet-io-assets-professions-nodejs.png');
let tempDir;

beforeEach(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'page-loader-'));
  nock('https://ru.hexlet.io')
    .get('/courses')
    .reply(200, originHtmlFile)
    .get('/assets/professions/nodejs.png')
    .replyWithFile(200, fixtureImgPath);
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
