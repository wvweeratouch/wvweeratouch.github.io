/**
 * Portfolio.js — Shared library for Wave Pongruengkiat's portfolio
 * Fetches data from Google Sheets, builds image URLs, renders content
 */
var Portfolio = (function() {
  'use strict';

  var SHEET_ID = '1OpPXBFGI8v8u7fNN7ZChY0PNXhpKvT8ol6tFNYVpsu0';
  var IMG_BASE = 'assets/img/works/';

  var PALETTE = [
    ['#0a1628', '#0d2847', '#22d3ee'],
    ['#1a0a1e', '#2d1035', '#f472b6'],
    ['#1a1008', '#2d1d0a', '#fb923c'],
    ['#0f0a1e', '#1a1035', '#a78bfa'],
    ['#0a1428', '#0d2040', '#60a5fa'],
    ['#0a1a10', '#0d2d18', '#4ade80'],
    ['#1a1010', '#2d1a1a', '#f87171'],
    ['#1a1508', '#2d260a', '#fbbf24']
  ];

  // Known featured works (legacy support during transition)
  var KNOWN_WORKS = [
    { match: 'ceing', slug: 'ceing-experiment' },
    { match: 'khwan', slug: 'khwan-dance' },
    { match: 'kong', slug: 'kong-interactive' },
    { match: 'zer01ne', slug: 'zer0ne-korea' },
    { match: 'zer0ne', slug: 'zer0ne-korea' },
    { match: 'technobiological', slug: 'technobiological-futures' },
    { match: 'data mask', slug: 'data-mask' },
    { match: 'posthuman', slug: 'data-mask' }
  ];

  var _cache = {};

  // === CSV Parsing ===

  function parseCSV(text) {
    var rows = [], row = [], field = '', inQuotes = false;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (inQuotes) {
        if (c === '"') {
          if (i + 1 < text.length && text[i + 1] === '"') { field += '"'; i++; }
          else inQuotes = false;
        } else field += c;
      } else {
        if (c === '"') inQuotes = true;
        else if (c === ',') { row.push(field.trim()); field = ''; }
        else if (c === '\n' || (c === '\r' && text[i + 1] === '\n')) {
          row.push(field.trim()); field = '';
          if (row.length > 1 || row[0] !== '') rows.push(row);
          row = [];
          if (c === '\r') i++;
        } else field += c;
      }
    }
    row.push(field.trim());
    if (row.length > 1 || row[0] !== '') rows.push(row);
    return rows;
  }

  function findCol(headers, patterns) {
    for (var p = 0; p < patterns.length; p++) {
      var pat = patterns[p].toLowerCase();
      for (var i = 0; i < headers.length; i++) {
        if (headers[i].toLowerCase().indexOf(pat) !== -1) return i;
      }
    }
    return -1;
  }

  // === Utilities ===

  function hashStr(s) {
    var h = 0;
    for (var i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    return Math.abs(h);
  }

  function escHtml(s) {
    if (!s) return '';
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function toSlug(str) {
    if (!str) return '';
    return str.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  function matchKnownSlug(title) {
    if (!title) return '';
    var t = title.toLowerCase();
    for (var i = 0; i < KNOWN_WORKS.length; i++) {
      if (t.indexOf(KNOWN_WORKS[i].match) !== -1) return KNOWN_WORKS[i].slug;
    }
    return '';
  }

  function isTruthy(val) {
    if (!val) return false;
    var v = val.toLowerCase().trim();
    return v === 'yes' || v === 'true' || v === '1' || v === 'x';
  }

  // === Colors & Gradients ===

  function gradientFor(title, type) {
    var idx = hashStr((title || '') + (type || '')) % PALETTE.length;
    var c = PALETTE[idx];
    return 'linear-gradient(135deg, ' + c[0] + ' 0%, ' + c[1] + ' 30%, ' + c[2] + ' 100%)';
  }

  function accentFor(title, type) {
    return PALETTE[hashStr((title || '') + (type || '')) % PALETTE.length][2];
  }

  // === Image Resolution ===

  function imgUrl(slug, filename) {
    if (!slug || !filename) return '';
    return IMG_BASE + slug + '/' + filename;
  }

  function driveToImage(url) {
    if (!url) return '';
    var m = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (m) return 'https://lh3.googleusercontent.com/d/' + m[1] + '=s800';
    if (url.match(/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)/i)) return url;
    return url;
  }

  function resolveImage(slug, value) {
    if (!value) return '';
    if (value.match(/^https?:\/\//)) return driveToImage(value);
    return imgUrl(slug, value);
  }

  // === Content Rendering ===

  function renderDescription(text) {
    if (!text) return '';
    var html = escHtml(text);
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    var parts = html.split(/\n\n+/);
    var result = '';
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i].trim();
      if (p) result += '<p>' + p.replace(/\n/g, '<br>') + '</p>';
    }
    return result;
  }

  // === Data Fetching ===

  function fetchSheet(tab) {
    if (_cache[tab]) return Promise.resolve(_cache[tab]);
    var url = 'https://docs.google.com/spreadsheets/d/' + SHEET_ID +
      '/gviz/tq?tqx=out:csv&sheet=' + encodeURIComponent(tab);
    return fetch(url).then(function(r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.text();
    }).then(function(text) {
      var rows = parseCSV(text);
      if (rows.length < 2) throw new Error('No data');
      var headers = rows[0];
      var data = [];
      for (var i = 1; i < rows.length; i++) {
        var obj = {};
        for (var j = 0; j < headers.length; j++) {
          var key = headers[j].toLowerCase()
            .replace(/[^a-z0-9]/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '');
          obj[key] = rows[i][j] || '';
        }
        data.push(obj);
      }
      var result = { headers: headers, data: data };
      _cache[tab] = result;
      return result;
    });
  }

  function fetchWorks() {
    return fetchSheet('works').catch(function() {
      return fetchSheet('projects');
    });
  }

  // === Work Normalization ===

  function normalizeWork(obj) {
    var title = obj.title || obj.project_name || obj.name || '';
    var slug = obj.slug || matchKnownSlug(title) || toSlug(title);
    var type = obj.type || obj.type_of_work || '';

    // Find venue from various possible column names
    var venue = obj.venue || obj.platform_event_venue || obj.platform || obj.event || '';
    if (!venue) {
      // Handle long column names like "Platform/Event/Festival/Group exh."
      for (var k in obj) {
        if (k.indexOf('platform') === 0 && obj[k]) { venue = obj[k]; break; }
      }
    }

    return {
      slug: slug,
      title: title,
      year: obj.year || '',
      type: type,
      medium: obj.medium || obj.tech || '',
      description: obj.description || obj.brief_description || '',
      statement: obj.statement || '',
      venue: venue,
      city: obj.city || '',
      country: obj.country || '',
      collaborators: obj.collaborators || obj.collaborator || '',
      featured: isTruthy(obj.featured || obj.highlight || ''),
      featured_order: parseInt(obj.featured_order) || 999,
      thumb: resolveImage(slug, obj.thumb || '') || driveToImage(obj.image_url || obj.image || obj.thumbnail || ''),
      hero: resolveImage(slug, obj.hero || ''),
      gallery: obj.gallery || '',
      video: obj.video || '',
      demo_url: obj.demo_url || '',
      status: obj.status || 'published',
      tags: obj.tags || ''
    };
  }

  function hasDetailPage(work) {
    if (work.description) return true;
    var t = work.title.toLowerCase();
    for (var i = 0; i < KNOWN_WORKS.length; i++) {
      if (t.indexOf(KNOWN_WORKS[i].match) !== -1) return true;
    }
    return false;
  }

  function workUrl(work) {
    return 'work.html?slug=' + encodeURIComponent(work.slug);
  }

  function primaryCategory(type) {
    if (!type) return '';
    return type.split('/')[0].trim();
  }

  // === Public API ===

  return {
    PALETTE: PALETTE,
    SHEET_ID: SHEET_ID,
    KNOWN_WORKS: KNOWN_WORKS,
    fetchSheet: fetchSheet,
    fetchWorks: fetchWorks,
    parseCSV: parseCSV,
    findCol: findCol,
    hashStr: hashStr,
    escHtml: escHtml,
    toSlug: toSlug,
    isTruthy: isTruthy,
    gradientFor: gradientFor,
    accentFor: accentFor,
    imgUrl: imgUrl,
    driveToImage: driveToImage,
    resolveImage: resolveImage,
    renderDescription: renderDescription,
    normalizeWork: normalizeWork,
    hasDetailPage: hasDetailPage,
    workUrl: workUrl,
    primaryCategory: primaryCategory
  };
})();
