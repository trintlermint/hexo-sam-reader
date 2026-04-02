/* global hexo */
'use strict';

const path = require('path');

// merge user config with defaults
hexo.config.sam_reader = Object.assign({
  // front matter key to enable SAM on a post
  front_matter_key: 'sam',
  // css selector for the post content container
  content_selector: '.mypage',
  // Asset path prefix (where sam.js is served)
  asset_path: '/js/hexo-sam-reader',
  // default voice settings, see example: https://discordier.github.io/sam/demos.html
  speed: 72,
  pitch: 64,
  mouth: 128,
  throat: 128,
  // pause duration in ms between sections
  pause_ms: 400,
  // max chunk length for SAM
  chunk_max_length: 200,
  // custom abbreviations: { 'ABBR': 'spoken form' }, see readme
  abbreviations: {},
  // css selectors to skip when extracting text
  skip_selectors: ''
}, hexo.config.sam_reader);

// Register EJS helper
hexo.extend.helper.register('sam_reader', require('./lib/helper')(hexo));

// Serve bundled sam.js as asset
hexo.extend.generator.register('sam_reader_assets', require('./lib/generator')(hexo));
