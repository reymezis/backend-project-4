#!/usr/bin/env node

import { program } from 'commander';
import { downloadPage } from '../src/index.js';

program
  .version('0.0.1')
  .description('Page loader utility')
  .arguments('<url>')
  .option('-o, --output [dir]', 'output dir', '/home/user/current-dir')
  .action((url) => {
    downloadPage(url, program.opts().output)
      .then((result) => console.log(result));
  });

program.parse();
