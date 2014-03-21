var debug = require('debug')('bsproof'),
  async = require('async'),
  path = require('path'),
  // @TODO: only use browser-request when doing browserify command. use
  // request otherwise
  request = require('browser-request'),
  baproof = require('aproof'),
  blproof = require('lproof');

// @TODO: consider TIMESTAMPS!

var SOLVENCY_SERVER = process.env.SOLVENCY_SERVER || 'http://solvency.syskall.com/domain/';

function verify (domain, asset_paths, liability_paths, cb) {
  console.log('Solvency proof verification started...');
  console.log(domain);
  console.log(asset_paths);
  console.log(liability_paths);

  var errors = [];
  var res = {};
  var files = [];

  asset_paths.forEach(function (path) {
    files.push({ type: 'asset', path: path });
  });

  liability_paths.forEach(function (path) {
    files.push({ type: 'liability', path: path });
  });

  function get (url, cb) {
    debug('Fetching ' + url + '...');
    request(url, function (err, response, body) {
      if (!err && response.statusCode === 200) {
        var obj;
        try {
          obj = JSON.parse(body);
        }
        catch (err_) {
          errors.push('Error parsing ' + url);
          errors.push(err_);
        }
        finally {
          cb(obj);
        }
      }
      else {
        errors.push(err || (url + ' return code is not 200'));
        cb();
      }
    });
  }

  function read_files (files, cb) {
    async.each(files, function (file, cb) {
      get('http://' + path.join(domain, file.path), function (res) {
        file.content = res;
        cb();
      });
    }, cb);
  }

  async.series([
    // Read assets/liabilities files
    async.apply(read_files, files),
    // Fetch liability roots using solvency server
    // The server is used as a proxy to make sure we don't get served
    // custom root.
    function (cb) {
      get(SOLVENCY_SERVER + domain, function (roots) {
        roots = roots || [];
        roots.forEach(function (root) {
          files.push({ path: 'root', type: 'root', content: root });
        });
        cb();
      });
    },
    // Group files by ID and set on result
    function (cb) {
      files.forEach(function (file) {
        var proof = file.content;
        if (!proof) return;
        if (!proof.id) {
          errors.push(file.path + ' has no ID property.');
          return;
        }
        res[proof.id] = res[proof.id] || {};
        res[proof.id][file.type] = proof;
      });
      cb();
    },
    // Verify proofs!
    function (cb) {
      async.each(Object.keys(res), function (key, cb) {
        verify_solvency_proof(res[key], function (errors, success) {
          res[key].errors = errors;
          res[key].success = success;
          cb();
        });
      }, cb);
    }
  ], function () {
    cb(errors, res);
  });
}

function verify_solvency_proof (proof, cb) {
  //cb(null, { success: true });
  var errors = [];

  /**
   * Liability proof verification
   */
  if (!proof.liability) {
    errors.push('No liability proof found.');
  }
  else if (!proof.root) {
    errors.push('No liability proof root found.');
  }
  else {
    // @todo stringify inefficient...
    var ptree = blproof.deserializePartialTree(JSON.stringify(proof.liability));
    var expected_root = proof.root.root;
    try {
      var user_data = blproof.verifyTree(ptree, expected_root);
      proof.liability.success = user_data;
    }
    catch (err) {
      proof.liability.error = err;
    }
  }

  /**
   * Asset proof verification
   */
  if (!proof.asset) {
    errors.push('No asset proof found');
  }
  else {
    if (baproof.verifySignatures(proof.asset)) {
      proof.asset.success = true;
    }
    else {
      proof.asset.error = true;
    }

  }

  /**
   * Solvency verification
   */
  if (proof.asset.success && proof.liability.success) {
    var addresses = baproof.getAddresses(proof.asset);
    baproof.getBalance(addresses, function (err, total) {
      var success = false;
      if (err) {
        errors.push(err);
      }
      else {
        proof.asset.success = { balance: total };
        proof.delta = total - proof.root.root.value;
        success = (proof.delta >= 0);
      }
      errors = (errors.length) ? errors : null;
      cb(errors, success);
    });
  }
  else {
    errors = (errors.length) ? errors : null;
    cb(errors, false);
  }
}

module.exports.verify = verify;
