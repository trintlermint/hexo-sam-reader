'use strict';

const path = require('path');
const fs = require('fs');

/**
 * generator.js: serves the bundled sam.js library as a virtual asset.
 * the file is served at {asset_path}/sam.js (default: /js/hexo-sam-reader/sam.js).
 */
module.exports = function (hexo) {
  return function () {
    const config = hexo.config.sam_reader;
    const assetPath = config.asset_path.replace(/^\//, '').replace(/\/$/, '');
    const samFile = path.join(__dirname, '..', 'assets', 'sam.js');

    return {
      path: assetPath + '/sam.js',
      data: function () {
        return fs.createReadStream(samFile);
      }
    };
  };
};
