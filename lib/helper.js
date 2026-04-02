'use strict';

/**
 * SAM Voice Reader — Hexo helper
 *
 * Renders a SAM speech player widget in the sidebar for posts with
 * the configured front matter key (default: `sam: true`).
 */

module.exports = function (hexo) {
  return function () {
    var page = this.page;
    var config = hexo.config.sam_reader;
    var key = config.front_matter_key;

    if (!page || !page[key]) return '';

    var safeTitle = (page.title || '').replace(/"/g, '&quot;').replace(/</g, '&lt;');

    // abbreviations from cfg
    var abbreviations = config.abbreviations || {};

    // serialize abbreviations for client-side use
    var abbrJson = JSON.stringify(abbreviations)
      .replace(/</g, '\\u003c')
      .replace(/>/g, '\\u003e')
      .replace(/&/g, '\\u0026');

    // serialize extra skip
    var extraSkip = (config.skip_selectors || '').replace(/"/g, '\\"');

    var contentSel = (config.content_selector || '.mypage').replace(/"/g, '\\"');
    var assetPath = config.asset_path.replace(/\/$/, '');
    var pauseMs = config.pause_ms || 400;
    var chunkMax = config.chunk_max_length || 200;

    // styling from config
    var s = config.style;

    return `
<div class="meta-widget sam-reader-widget" id="sam-reader" data-post-title="${safeTitle}">
  <style>
    .sam-reader-widget {
      margin: 10px 0;
      padding: 10px 8px;
      background: ${s.background};
      border: 1px dashed ${s.border_color};
      border-radius: 3px;
      font-family: ${s.font_family};
      font-size: .9em;
    }
    .sam-reader-widget .sam-title {
      font-size: 13px;
      font-weight: bold;
      margin-bottom: 8px;
      color: ${s.text_color};
    }
    .sam-reader-widget .sam-title i {
      margin-right: 4px;
    }
    .sam-reader-widget .sam-controls {
      display: flex;
      gap: 4px;
      margin-bottom: 8px;
    }
    .sam-reader-widget .sam-controls button {
      flex: 1;
      padding: 4px 0;
      font-size: 11px;
      font-family: inherit;
      background: ${s.button_bg};
      color: ${s.text_color};
      border: 1px dashed ${s.border_color};
      border-radius: 3px;
      cursor: pointer;
      transition: background 0.15s;
    }
    .sam-reader-widget .sam-controls button:hover:not(:disabled) {
      background: ${s.button_hover_bg};
      color: ${s.text_color};
    }
    .sam-reader-widget .sam-controls button:disabled {
      opacity: 0.35;
      cursor: default;
    }
    .sam-reader-widget .sam-controls button.active {
      background: ${s.button_active_bg};
      border-color: ${s.button_active_border};
      color: #fff;
    }
    .sam-reader-widget .sam-progress-wrap {
      background: ${s.progress_bg};
      border-radius: 3px;
      height: 8px;
      overflow: hidden;
      margin-bottom: 4px;
      border: 1px solid ${s.progress_border};
    }
    .sam-reader-widget .sam-progress-bar {
      height: 100%;
      width: 0%;
      background: ${s.progress_bar};
      border-radius: 2px;
      transition: width 0.3s;
    }
    .sam-reader-widget .sam-status {
      font-size: 10px;
      color: ${s.status_color};
      text-align: center;
    }
    .sam-reader-widget .sam-config {
      margin-top: 8px;
      border-top: 1px dashed ${s.border_color};
      padding-top: 8px;
    }
    .sam-reader-widget .sam-config summary {
      font-size: 11px;
      color: ${s.config_accent};
      cursor: pointer;
      font-family: inherit;
    }
    .sam-reader-widget .sam-config label {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 11px;
      color: ${s.status_color};
      margin-top: 4px;
    }
    .sam-reader-widget .sam-config input[type=range] {
      width: 80px;
      accent-color: ${s.config_accent};
      background: transparent;
    }
  </style>

  <div class="sam-title"><i class="fa fa-volume-up"></i> SAM Reader</div>
  <div class="sam-controls">
    <button id="sam-play" title="Play" disabled>&#9654; Play</button>
    <button id="sam-pause" title="Pause" disabled>&#10074;&#10074;</button>
    <button id="sam-stop" title="Stop" disabled>&#9632;</button>
  </div>
  <div class="sam-progress-wrap">
    <div class="sam-progress-bar" id="sam-progress"></div>
  </div>
  <div class="sam-status" id="sam-status">Loading SAM...</div>

  <div class="sam-config">
    <details>
      <summary>Voice settings</summary>
      <label>Speed <input type="range" id="sam-speed" min="20" max="200" value="${config.speed}"></label>
      <label>Pitch <input type="range" id="sam-pitch" min="0" max="255" value="${config.pitch}"></label>
      <label>Mouth <input type="range" id="sam-mouth" min="0" max="255" value="${config.mouth}"></label>
      <label>Throat <input type="range" id="sam-throat" min="0" max="255" value="${config.throat}"></label>
    </details>
  </div>
</div>

<script>
(function() {
  var PAUSE_MS = ${pauseMs};
  var CHUNK_MAX = ${chunkMax};
  var CONTENT_SEL = "${contentSel}";
  var EXTRA_SKIP = "${extraSkip}";
  var ABBREVIATIONS = ${abbrJson};

  var script = document.createElement('script');
  script.src = '${assetPath}/sam.js';
  script.async = true;
  script.onload = function() { initSamReader(); };
  script.onerror = function() {
    var s = document.getElementById('sam-status');
    if (s) s.textContent = 'Failed to load SAM';
  };
  document.head.appendChild(script);

  function initSamReader() {
    if (typeof SamJs === 'undefined') return;

    var btnPlay = document.getElementById('sam-play');
    var btnPause = document.getElementById('sam-pause');
    var btnStop = document.getElementById('sam-stop');
    var progressBar = document.getElementById('sam-progress');
    var statusEl = document.getElementById('sam-status');
    var speedInput = document.getElementById('sam-speed');
    var pitchInput = document.getElementById('sam-pitch');
    var mouthInput = document.getElementById('sam-mouth');
    var throatInput = document.getElementById('sam-throat');
    var widget = document.getElementById('sam-reader');

    btnPlay.disabled = false;
    statusEl.textContent = 'Ready';

    var chunks = [];
    var currentChunk = 0;
    var playing = false;
    var paused = false;
    var stopped = false;
    var audioCtx = null;
    var currentSource = null;
    var pauseTimer = null;

    // text regex for sam
    function cleanForSam(text) {
      text = text.replace(/https?:\\/\\/[^\\s]+/g, '');
      text = text.replace(/[a-zA-Z0-9_-]*:\\/\\/[^\\s]*/g, '');
      text = text.replace(/[\\w.-]+@[\\w.-]+/g, '');
      text = text.replace(/\\([^)]*=>\\s*\\{[^}]*\\}[^)]*\\)/g, '');

      text = text.replace(/>=/g, ' greater than or equal to ');
      text = text.replace(/<=/g, ' less than or equal to ');
      text = text.replace(/!=/g, ' not equal to ');
      text = text.replace(/===/g, ' strictly equals ');
      text = text.replace(/==/g, ' equals ');
      text = text.replace(/(?<![<>])>(?![<>])/g, ' greater than ');
      text = text.replace(/(?<![<>])<(?![<>])/g, ' less than ');

      text = text.replace(/ \\/ /g, ' OR ');
      text = text.replace(/\\//g, ' slash ');

      text = text.replace(/[{}()\\[\\]<>]/g, ' ');
      text = text.replace(/[*_~#]+/g, '');
      text = text.replace(new RegExp(String.fromCharCode(96) + '+', 'g'), '');
      text = text.replace(/\\[\\^\\w+\\]/g, '');

      // apply abbreviations from config
      var keys = Object.keys(ABBREVIATIONS);
      for (var a = 0; a < keys.length; a++) {
        var k = keys[a];
        var flags = (k === k.toUpperCase()) ? 'g' : 'gi';
        text = text.replace(new RegExp('\\\\b' + k.replace(/[.*+?^\\/\\\\|()[\\]{}]/g, '\\\\$&') + '\\\\b', flags), ABBREVIATIONS[k]);
      }

      text = text.replace(/[\\x80-\\xFF]/g, ' ');
      text = text.replace(/[\\u0100-\\uFFFF]/g, ' ');
      text = text.replace(/[\\xA0-\\xFF]/g, ' ');
      text = text.replace(/[€£¥©®™°±×÷=+|\\\\^~&]/g, ' ');
      text = text.replace(/[^\\x20-\\x7E]/g, ' ');

      text = text.replace(/\\s+/g, ' ');
      return text.trim();
    }

    // table reading
    function readTable(table) {
      var headers = [];
      var ths = table.querySelectorAll('thead th, thead td, tr:first-child th');
      for (var i = 0; i < ths.length; i++) {
        headers.push(ths[i].textContent.trim());
      }
      if (headers.length === 0) {
        var firstRow = table.querySelector('tr');
        if (firstRow) {
          var cells = firstRow.querySelectorAll('th, td');
          for (var j = 0; j < cells.length; j++) {
            headers.push(cells[j].textContent.trim());
          }
        }
      }
      var rows = table.querySelectorAll('tbody tr, tr');
      var text = '';
      for (var r = 0; r < rows.length; r++) {
        var cells = rows[r].querySelectorAll('td');
        if (cells.length === 0) continue;
        var rowParts = [];
        for (var c = 0; c < cells.length; c++) {
          var label = (c < headers.length) ? headers[c] : '';
          var val = cells[c].textContent.trim();
          if (label && val) {
            rowParts.push(label + ' ' + val);
          } else if (val) {
            rowParts.push(val);
          }
        }
        if (rowParts.length > 0) {
          text += rowParts.join(', ') + '. ';
        }
      }
      return text;
    }

    // text extraction
    function getPostSegments() {
      var segments = [];

      var postTitle = widget.getAttribute('data-post-title') || '';
      if (postTitle) {
        segments.push(cleanForSam(postTitle) + '.');
        segments.push(null);
      }

      var el = document.querySelector(CONTENT_SEL);
      if (!el) return segments;
      var clone = el.cloneNode(true);

      var baseSel = 'pre, script, style, .highlight, img, svg, ' +
        '.sam-reader-widget, .alert, figure, .article-footer-copyright, ' +
        'noscript, iframe, video, audio, canvas, .gist';
      var skipSel = EXTRA_SKIP ? (baseSel + ', ' + EXTRA_SKIP) : baseSel;

      var remove = clone.querySelectorAll(skipSel);
      for (var i = 0; i < remove.length; i++) {
        remove[i].parentNode.removeChild(remove[i]);
      }

      function walk(node) {
        if (node.nodeType === 3) {
          var t = node.textContent;
          if (t && t.trim()) {
            segments.push(cleanForSam(t));
          }
          return;
        }
        if (node.nodeType !== 1) return;
        var tag = node.tagName;

        if (tag === 'TABLE') {
          var tableText = readTable(node);
          if (tableText) segments.push(cleanForSam(tableText));
          return;
        }

        if (/^H[1-6]$/.test(tag)) {
          segments.push(null);
          var hText = node.textContent.trim();
          if (hText) segments.push(cleanForSam(hText) + '.');
          segments.push(null);
          return;
        }

        var children = node.childNodes;
        for (var c = 0; c < children.length; c++) {
          walk(children[c]);
        }

        if (/^(P|DIV|BLOCKQUOTE|LI|SECTION|ARTICLE|HR)$/.test(tag)) {
          segments.push(null);
        }
      }

      walk(clone);
      return segments;
    }

    // chunking
    function buildChunks(segments, maxLen) {
      var result = [];
      for (var s = 0; s < segments.length; s++) {
        if (segments[s] === null) {
          if (result.length === 0 || result[result.length - 1] !== null) {
            result.push(null);
          }
          continue;
        }
        var text = segments[s];
        if (!text) continue;

        var parts = text.split(/(?<=[.!?])\\s+/);
        var current = '';
        for (var i = 0; i < parts.length; i++) {
          var p = parts[i].trim();
          if (!p) continue;
          if (current.length + p.length + 1 > maxLen && current.length > 0) {
            result.push(current.trim());
            current = p;
          } else {
            current += (current ? ' ' : '') + p;
          }
        }
        if (current.trim()) result.push(current.trim());
      }

      var final = [];
      for (var j = 0; j < result.length; j++) {
        if (result[j] === null) {
          if (final.length === 0 || final[final.length - 1] !== null) {
            final.push(null);
          }
          continue;
        }
        if (result[j].length <= maxLen) {
          final.push(result[j]);
        } else {
          var subparts = result[j].split(/,\\s*/);
          var sub = '';
          for (var k = 0; k < subparts.length; k++) {
            if (sub.length + subparts[k].length + 2 > maxLen && sub.length > 0) {
              final.push(sub.trim());
              sub = subparts[k];
            } else {
              sub += (sub ? ', ' : '') + subparts[k];
            }
          }
          if (sub.trim()) final.push(sub.trim());
        }
      }

      while (final.length > 0 && final[0] === null) final.shift();
      while (final.length > 0 && final[final.length - 1] === null) final.pop();

      return final;
    }

    // progress
    function countSpeakable() {
      var n = 0;
      for (var i = 0; i < chunks.length; i++) {
        if (chunks[i] !== null) n++;
      }
      return n;
    }
    function countSpoken() {
      var n = 0;
      for (var i = 0; i < currentChunk; i++) {
        if (chunks[i] !== null) n++;
      }
      return n;
    }

    function updateProgress() {
      var total = countSpeakable();
      var done = countSpoken();
      var pct = total > 0 ? (done / total) * 100 : 0;
      progressBar.style.width = pct + '%';
      statusEl.textContent = done + ' / ' + total;
    }

    function setButtons(state) {
      btnPlay.disabled = (state === 'playing');
      btnPause.disabled = (state !== 'playing');
      btnStop.disabled = (state === 'ready');
      btnPlay.classList.toggle('active', state === 'playing');
      btnPause.classList.toggle('active', state === 'paused');
    }

    function stopAudio() {
      if (pauseTimer) { clearTimeout(pauseTimer); pauseTimer = null; }
      if (currentSource) {
        try { currentSource.stop(); } catch(e) {}
        currentSource = null;
      }
    }

    function playChunk(index) {
      if (stopped || index >= chunks.length) {
        progressBar.style.width = stopped ? '0%' : '100%';
        statusEl.textContent = stopped ? 'Stopped' : 'Done!';
        setButtons('ready');
        playing = false;
        paused = false;
        stopped = false;
        currentChunk = 0;
        return;
      }
      if (paused) return;

      currentChunk = index;
      updateProgress();

      if (chunks[index] === null) {
        pauseTimer = setTimeout(function() {
          pauseTimer = null;
          if (!stopped && !paused) playChunk(index + 1);
        }, PAUSE_MS);
        return;
      }

      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();

      var sam = new SamJs({
        speed: parseInt(speedInput.value, 10),
        pitch: parseInt(pitchInput.value, 10),
        mouth: parseInt(mouthInput.value, 10),
        throat: parseInt(throatInput.value, 10)
      });

      var buf32;
      try {
        buf32 = sam.buf32(chunks[index]);
      } catch(e) {
        playChunk(index + 1);
        return;
      }
      if (!buf32 || buf32.length === 0) {
        playChunk(index + 1);
        return;
      }

      var audioBuffer = audioCtx.createBuffer(1, buf32.length, 22050);
      audioBuffer.getChannelData(0).set(buf32);

      var source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioCtx.destination);
      currentSource = source;

      source.onended = function() {
        currentSource = null;
        if (!stopped && !paused) {
          playChunk(index + 1);
        }
      };
      source.start();
    }

    btnPlay.addEventListener('click', function() {
      if (paused) {
        paused = false;
        setButtons('playing');
        playChunk(currentChunk);
        return;
      }
      var segments = getPostSegments();
      chunks = buildChunks(segments, CHUNK_MAX);
      if (countSpeakable() === 0) {
        statusEl.textContent = 'No text found';
        return;
      }
      stopped = false;
      playing = true;
      paused = false;
      currentChunk = 0;
      setButtons('playing');
      playChunk(0);
    });

    btnPause.addEventListener('click', function() {
      paused = true;
      stopAudio();
      setButtons('paused');
      var total = countSpeakable();
      var done = countSpoken();
      statusEl.textContent = 'Paused ' + done + ' / ' + total;
    });

    btnStop.addEventListener('click', function() {
      stopped = true;
      paused = false;
      playing = false;
      stopAudio();
      currentChunk = 0;
      setButtons('ready');
      progressBar.style.width = '0%';
      statusEl.textContent = 'Ready';
    });
  }
})();
<\/script>
`;
  };
};
