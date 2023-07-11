// @ts-check

import os from 'os';
import path from 'path';
import nock from 'nock';
import { promises as fs } from 'fs';
import {
  test, expect, beforeEach,
} from '@jest/globals';
import { getFileName, downloadPage } from '../src/index.js';

nock.disableNetConnect();

const url = 'https://ru.hexlet.io/courses';
const expectedFileName = getFileName(url);
const expected = '<!DOCTYPE html><html><head></head><body></body></html>';
let tempDir;

beforeEach(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'page-loader-'));
});

test('fetchData', async () => {
  nock('https://ru.hexlet.io')
    .get('/courses')
    .reply(200, expected);
  const filePath = await downloadPage(url, tempDir);
  // console.log('filePath', filePath);
  // const absolutePath = path.resolve(filePath);
  // console.log('absolutePath', absolutePath);
  // const files = await fs.readdir(tempDir);
  // console.log('files', files);
  const result = await fs.readFile(filePath, 'utf-8');
  expect(result).toEqual(expected);
});

test('saved file name', async () => {
  nock('https://ru.hexlet.io')
    .get('/courses')
    .reply(200, expected);
  const filePath = await downloadPage(url, tempDir);
  const fileName = path.basename(filePath);
  expect(fileName).toEqual(expectedFileName);
});
