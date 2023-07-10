#!/usr/bin/env node

import { program } from 'commander';

program
  .version('0.0.1')
  .description('Page loader utility')
  .arguments('<url>')
  .option('-o, --output [dir]', 'output dir (default: "/home/user/current-dir")');

program.parse();
