#!/usr/bin/env node

import { program } from 'commander';
import { downloadPage } from '../src/index.js';

program
  .version('0.0.1')
  .description('Page loader utility')
  .arguments('<url>')
  .option('-o, --output [dir]', 'output dir', `${process.cwd()}`)
  .action((url) => {
    downloadPage(url, program.opts().output)
      .then((result) => console.log(result))
      .catch((e) => {
        console.error(`Error ${e.message}`);
        process.exit(1);
      });
  });

program.parse();
