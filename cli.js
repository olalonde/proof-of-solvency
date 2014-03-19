#!/usr/bin/env node

var program = require('commander'),
  path = require('path'),
  fs = require('fs'),
  bsproof = require('./lib/');

function parse_list (str) {
  var arr = str.split(',');
  for (var i = 0; i < arr.length; i++) {
    arr[i] = arr[i].trim();
  }
  return arr;
}

program
  .version(JSON.parse(fs.readFileSync(__dirname + '/package.json', 'utf8')).version)
  .usage('<action>');

program
  .command('verify <domain>')
  .description('Verify solvency.')
  .option('--assets <assets>', 'Paths to asset proofs', parse_list)
  .option('--liabilities <liabilities>', 'Paths to liabilities', parse_list)
  .action(function (domain, opts) {
    bsproof.verify(domain, opts.assets, opts.liabilities, function (err, res) {
      console.log(res);
    });
  });

program.parse(process.argv);
