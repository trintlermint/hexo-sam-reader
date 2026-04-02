/* global hexo */
'use strict';

const path = require('path');

var defaultStyle = {
  background: '#000',
  border_color: '#924a41',
  text_color: '#c08179',
  button_bg: '#352b42',
  button_hover_bg: '#924a41',
  button_active_bg: '#493aa5',
  button_active_border: '#867ade',
  progress_bg: '#252525',
  progress_bar: '#867ade',
  progress_border: '#3a3a3a',
  status_color: '#bbb',
  config_accent: '#867ade',
  font_family: "DOS, SimHei, Monaco, Menlo, Consolas, 'Courier New', monospace"
};

// merge user config
hexo.config.sam_reader = Object.assign({
  front_matter_key: 'sam',
  content_selector: '.mypage',
  asset_path: '/js/hexo-sam-reader',
  speed: 72,
  pitch: 64,
  mouth: 128,
  throat: 128,
  pause_ms: 400,
  chunk_max_length: 200,
  abbreviations: {},
  skip_selectors: '',
  style: {}
}, hexo.config.sam_reader);

hexo.config.sam_reader.style = Object.assign({}, defaultStyle, hexo.config.sam_reader.style || {});

// Register EJS helper
hexo.extend.helper.register('sam_reader', require('./lib/helper')(hexo));

// Serve bundled sam.js as asset
hexo.extend.generator.register('sam_reader_assets', require('./lib/generator')(hexo));
