(function () {
  'use strict';

  // ─── State ─────────────────────────────────────────────────
  var token = localStorage.getItem('billwise_token');
  var currentUser = null;
  var currentPage = 'overview';

  // ─── Constants ─────────────────────────────────────────────
  var STATES = [
    '01-Jammu & Kashmir','02-Himachal Pradesh','03-Punjab','04-Chandigarh',
    '05-Uttarakhand','06-Haryana','07-Delhi','08-Rajasthan','09-Uttar Pradesh',
    '10-Bihar','11-Sikkim','12-Arunachal Pradesh','13-Nagaland','14-Manipur',
    '15-Mizoram','16-Tripura','17-Meghalaya','18-Assam','19-West Bengal',
    '20-Jharkhand','21-Odisha','22-Chhattisgarh','23-Madhya Pradesh','24-Gujarat',
    '25-Daman & Diu','26-Dadra & Nagar Haveli','27-Maharashtra','29-Karnataka',
    '30-Goa','31-Lakshadweep','32-Kerala','33-Tamil Nadu','34-Puducherry',
    '35-Andaman & Nicobar','36-Telangana','37-Andhra Pradesh'
  ];
  var GST_RATES = [0, 5, 12, 18, 28];
  var UNITS = ['Pcs','Nos','Kg','Gm','Ltr','Ml','Mtr','Ft','Sq.Ft','Bag','Box','Doz','Set','Pair','Roll','Bundle','Carton','Packet'];

  // ─── DOM ───────────────────────────────────────────────────
  var $content   = document.getElementById('content');
  var $pageTitle = document.getElementById('pageTitle');
  var $topAvatar = document.getElementById('topAvatar');
  var $topName   = document.getElementById('topName');
  var $sidebar   = document.getElementById('sidebar');
  var $menuBtn   = document.getElementById('menuBtn');
  var $overlay   = document.getElementById('overlay');
  var $toast     = document.getElementById('toast');

  // ─── Global navigation ─────────────────────────────────────
  window.goTo = function (page, param) {
    currentPage = page;
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(function (el) {
      el.classList.remove('active');
    });
    var activeBtn = document.querySelector('.nav-item[data-page="' + page + '"]');
    if (activeBtn) activeBtn.classList.add('active');
    $sidebar.classList.remove('open');
    $overlay.classList.remove('active');
    try {
      switch (page) {
        case 'overview':    renderOverview(); break;
        case 'parties':     renderParties(); break;
        case 'items':       renderItems(); break;
        case 'add-party':   renderAddParty(); break;
        case 'edit-party':  renderEditParty(param); break;
        case 'add-item':    renderAddItem(); break;
        case 'edit-item':   renderEditItem(param); break;
        case 'new-invoice': renderNewInvoice(); break;
        case 'invoices':    renderInvoiceList(); break;
        case 'invoice':     renderInvoiceDetail(param); break;
        case 'reports':     renderReports(); break;
        case 'admin':       renderAdmin(); break;
        case 'settings':    renderSettings(); break;
        default: renderOverview();
      }
    } catch (err) {
      console.error('Navigation error:', err);
      showToast('Something went wrong: ' + err.message, 'error');
    }
  };

  // ─── API ───────────────────────────────────────────────────
  function api(method, url, body) {
    var opts = { method: method, headers: { 'Content-Type': 'application/json' } };
    if (token) opts.headers['Authorization'] = 'Bearer ' + token;
    if (body) opts.body = JSON.stringify(body);
    return fetch(url, opts).then(function (r) {
      if (r.status === 401) { logout(); throw new Error('Unauthorized'); }
      return r.json();
    });
  }

  // ─── Helpers ───────────────────────────────────────────────
  function formatINR(n) {
    return '\u20B9' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function formatDate(d) {
    if (!d) return '-';
    var dt = new Date(d);
    return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  function formatDateSlash(d) {
    if (!d) return '-';
    var parts = d.split('-');
    if (parts.length === 3) return parts[2] + '/' + parts[1] + '/' + parts[0];
    return d;
  }
  function showToast(msg, type) {
    $toast.textContent = msg;
    $toast.className = 'toast is-visible' + (type ? ' toast-' + type : '');
    clearTimeout(showToast._t);
    var dur = type === 'warning' ? 5000 : 3000;
    showToast._t = setTimeout(function () { $toast.className = 'toast'; }, dur);
  }
  function stateOptions(selected) {
    return '<option value="">-- Select State --</option>' +
      STATES.map(function (s) {
        return '<option value="' + s + '"' + (s === selected ? ' selected' : '') + '>' + s + '</option>';
      }).join('');
  }
  function unitOptions(selected) {
    return UNITS.map(function (u) {
      return '<option value="' + u + '"' + (u === (selected || 'Pcs') ? ' selected' : '') + '>' + u + '</option>';
    }).join('');
  }
  function numberToWords(num) {
    if (num === 0) return 'Zero';
    var a = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten',
      'Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
    var b = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
    var whole = Math.floor(num);
    var paise = Math.round((num - whole) * 100);
    function convert(n) {
      if (n < 20) return a[n];
      if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? ' ' + a[n % 10] : '');
      if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' and ' + convert(n % 100) : '');
      if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '');
      if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '');
      return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '');
    }
    var words = convert(whole) + ' Rupees';
    if (paise > 0) words += ' and ' + convert(paise) + ' Paise';
    return words + ' Only';
  }
  function computeTaxSummary(items, isIntra) {
    var map = {};
    items.forEach(function (item) {
      var hsn = item.hsn || '';
      var key = hsn + '|' + (item.gst || 0);
      if (!map[key]) {
        map[key] = { hsn: hsn, gst_rate: item.gst || 0, taxable: 0, cgst_rate: 0, cgst: 0, sgst_rate: 0, sgst: 0, igst_rate: 0, igst: 0, total_tax: 0 };
      }
      var taxable = (item.qty || 0) * (item.rate || 0);
      var gstAmt = taxable * (item.gst || 0) / 100;
      map[key].taxable += taxable;
      if (isIntra) {
        map[key].cgst_rate = (item.gst || 0) / 2;
        map[key].sgst_rate = (item.gst || 0) / 2;
        map[key].cgst += gstAmt / 2;
        map[key].sgst += gstAmt / 2;
      } else {
        map[key].igst_rate = item.gst || 0;
        map[key].igst += gstAmt;
      }
      map[key].total_tax += gstAmt;
    });
    return Object.values(map);
  }
  function downloadCSV(rows, filename) {
    var csv = rows.map(function (row) {
      return row.map(function (cell) {
        return '"' + String(cell == null ? '' : cell).replace(/"/g, '""') + '"';
      }).join(',');
    }).join('\n');
    var blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  function esc(s) { return (s || '').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }
  function fg(label, input) { return '<div class="form-group"><label>' + label + '</label>' + input + '</div>'; }
  function statCard(label, value, cls) {
    return '<div class="stat-card"><div class="stat-label">' + label + '</div><div class="stat-value ' + cls + '">' + value + '</div></div>';
  }
  function themePreviewCard(id, name, color, desc, current) {
    var active = (current || 'classic') === id;
    return '<label class="theme-preview-item' + (active ? ' selected' : '') + '">' +
      '<input type="radio" name="invoiceTheme" value="' + id + '"' + (active ? ' checked' : '') + '>' +
      '<div class="theme-mini">' +
        '<div class="theme-mini-header" style="background:' + color + '"></div>' +
        '<div class="theme-mini-lines"><div></div><div></div><div></div></div>' +
      '</div>' +
      '<div class="theme-preview-name">' + name + '</div>' +
      '<div class="theme-preview-desc">' + desc + '</div>' +
    '</label>';
  }
  function statusBadge(s) {
    var cls = s === 'paid' ? 'badge-paid' : s === 'partial' ? 'badge-partial' : 'badge-unpaid';
    return '<span class="badge ' + cls + '">' + s.charAt(0).toUpperCase() + s.slice(1) + '</span>';
  }

  // ─── Autocomplete ────────────────────────────────────────────
  var _acTimers = {};
  function acSearch(input, dropdown, endpoint, renderFn, selectFn) {
    input.setAttribute('autocomplete', 'off');
    var _data = [];

    input.addEventListener('input', function () {
      var q = input.value.trim();
      if (q.length < 1) { dropdown.classList.remove('open'); return; }
      clearTimeout(_acTimers[endpoint + input.id]);
      _acTimers[endpoint + input.id] = setTimeout(function () {
        api('GET', endpoint + '?q=' + encodeURIComponent(q)).then(function (res) {
          _data = res.parties || res.products || [];
          if (!_data.length) { dropdown.classList.remove('open'); return; }
          dropdown.innerHTML = _data.map(function (d, i) {
            return '<div class="ac-item" data-idx="' + i + '">' + renderFn(d, q) + '</div>';
          }).join('');
          dropdown.classList.add('open');
        });
      }, 250);
    });

    dropdown.addEventListener('mousedown', function (e) {
      e.preventDefault();
      var el = e.target.closest('.ac-item');
      if (!el) return;
      var idx = parseInt(el.getAttribute('data-idx'));
      if (_data[idx]) { selectFn(_data[idx]); dropdown.classList.remove('open'); }
    });

    input.addEventListener('blur', function () {
      setTimeout(function () { dropdown.classList.remove('open'); }, 200);
    });

    input.addEventListener('focus', function () {
      if (input.value.trim().length >= 1 && dropdown.children.length) {
        dropdown.classList.add('open');
      }
    });
  }

  function acHL(text, query) {
    if (!query) return esc(text);
    var i = (text || '').toLowerCase().indexOf(query.toLowerCase());
    if (i === -1) return esc(text);
    return esc(text.substring(0, i)) + '<b>' + esc(text.substring(i, i + query.length)) + '</b>' + esc(text.substring(i + query.length));
  }

  // ─── Auth ──────────────────────────────────────────────────
  function checkAuth() {
    if (!token) { window.location.href = '/'; return; }
    api('GET', '/api/auth/me').then(function (data) {
      if (data.error) { logout(); return; }
      currentUser = data.user;
      $topAvatar.textContent = (currentUser.name || 'U').charAt(0).toUpperCase();
      $topName.textContent = currentUser.business_name || currentUser.name;
      if (currentUser.role === 'superadmin') {
        var adminNav = document.getElementById('adminNavItem');
        if (adminNav) adminNav.style.display = '';
      }
      window.goTo('overview');
    }).catch(function () { logout(); });
  }
  function logout() {
    localStorage.removeItem('billwise_token');
    window.location.href = '/';
  }
  document.getElementById('logoutBtn').addEventListener('click', function (e) { e.preventDefault(); logout(); });
  $menuBtn.addEventListener('click', function () { $sidebar.classList.toggle('open'); $overlay.classList.toggle('active'); });
  $overlay.addEventListener('click', function () { $sidebar.classList.remove('open'); $overlay.classList.remove('active'); });

  // ═══════════════════════════════════════════════════════════
  // VIEWS
  // ═══════════════════════════════════════════════════════════

  // ── Overview (Enhanced Dashboard) ─────────────────────────
  function renderOverview() {
    $pageTitle.textContent = 'Home';
    $content.innerHTML = '<p style="color:var(--text-muted)">Loading dashboard...</p>';
    api('GET', '/api/invoices').then(function (data) {
      var allInv = data.invoices || [];
      var recentInv = allInv.slice(0, 5);

      // Calculate receivable/payable
      var receivable = 0, receivableParties = {};
      allInv.forEach(function (inv) {
        if (inv.status !== 'paid') {
          var due = (inv.total || 0) - (inv.amount_paid || 0);
          if (due > 0) {
            receivable += due;
            receivableParties[inv.customer_name] = true;
          }
        }
      });
      var partyCount = Object.keys(receivableParties).length;

      // Sales data for current month
      var now = new Date();
      var thisMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
      var lastMonth = now.getMonth() === 0
        ? (now.getFullYear() - 1) + '-12'
        : now.getFullYear() + '-' + String(now.getMonth()).padStart(2, '0');

      var thisMonthTotal = 0, lastMonthTotal = 0;
      var dailySales = {};
      allInv.forEach(function (inv) {
        var d = inv.invoice_date || '';
        if (d.startsWith(thisMonth)) {
          thisMonthTotal += inv.total || 0;
          var day = parseInt(d.split('-')[2]) || 1;
          dailySales[day] = (dailySales[day] || 0) + (inv.total || 0);
        }
        if (d.startsWith(lastMonth)) {
          lastMonthTotal += inv.total || 0;
        }
      });

      var comparePct = lastMonthTotal > 0 ? Math.round(((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100) : (thisMonthTotal > 0 ? 100 : 0);
      var compareText = '';
      if (comparePct > 0) compareText = '<span class="chart-compare up">' + comparePct + '% more than last month</span>';
      else if (comparePct < 0) compareText = '<span class="chart-compare down">' + Math.abs(comparePct) + '% less than last month</span>';

      // Build HTML
      var html = '';

      // Receivable / Payable cards
      html += '<div class="dash-summary">' +
        '<div class="summary-card receivable">' +
          '<div class="summary-icon"><svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M12 5v14M19 12l-7 7-7-7"/></svg></div>' +
          '<div><div class="summary-label">Total Receivable</div>' +
          '<div class="summary-amount">' + formatINR(receivable) + '</div>' +
          '<div class="summary-detail">From ' + partyCount + ' ' + (partyCount === 1 ? 'Party' : 'Parties') + '</div></div>' +
        '</div>' +
        '<div class="summary-card payable">' +
          '<div class="summary-icon"><svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M12 19V5M5 12l7-7 7 7"/></svg></div>' +
          '<div><div class="summary-label">Total Payable</div>' +
          '<div class="summary-amount">' + formatINR(0) + '</div>' +
          '<div class="summary-detail">You don\'t have any payables</div></div>' +
        '</div>' +
      '</div>';

      // Sales chart
      html += '<div class="dash-chart-card">' +
        '<div class="chart-header"><div>' +
          '<div class="chart-title">Total Sale</div>' +
          '<div class="chart-value">' + formatINR(thisMonthTotal) + ' ' + compareText + '</div>' +
        '</div>' +
        '<select class="chart-period" id="chartPeriod"><option>This Month</option></select>' +
        '</div>' +
        '<canvas id="salesChart" height="120"></canvas>' +
      '</div>';

      // Stats row
      html += '<div class="stats-grid">' +
        statCard('Total Invoices', allInv.length, '') +
        statCard('Total Sales', formatINR(allInv.reduce(function (s, i) { return s + (i.total || 0); }, 0)), 'primary') +
        statCard('Received', formatINR(allInv.filter(function (i) { return i.status === 'paid'; }).reduce(function (s, i) { return s + (i.total || 0); }, 0)), 'success') +
        statCard('Pending', formatINR(receivable), 'warning') +
      '</div>';

      // Quick reports
      html += '<div class="dash-reports"><div class="reports-header"><h3>Most Used Reports</h3>' +
        '<button type="button" class="btn btn-ghost btn-sm" onclick="window.goTo(\'reports\')">View All</button></div>' +
        '<div class="report-links">' +
          '<div class="report-link" onclick="window.goTo(\'reports\')"><svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 20V10M12 20V4M6 20v-6"/></svg> Sale Report</div>' +
          '<div class="report-link" onclick="window.goTo(\'invoices\')"><svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg> All Transactions</div>' +
          '<div class="report-link" onclick="window.goTo(\'parties\')"><svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg> Party Statement</div>' +
        '</div></div>';

      // Recent invoices
      html += '<div class="table-card"><div class="table-header"><h3>Recent Invoices</h3>' +
        '<button type="button" class="btn btn-primary btn-sm" onclick="window.goTo(\'new-invoice\')">+ New Invoice</button></div>' +
        (recentInv.length ? invoiceTableHTML(recentInv) : '<div class="empty-state">No invoices yet. <button type="button" onclick="window.goTo(\'new-invoice\')" style="color:var(--primary);background:none;border:none;cursor:pointer;font:inherit;font-weight:600;text-decoration:underline">Create your first GST invoice!</button></div>') +
      '</div>';

      $content.innerHTML = html;

      // Draw sales chart
      drawSalesChart(dailySales, now);

    }).catch(function (err) {
      console.error(err);
      $content.innerHTML = '<div class="empty-state">Failed to load. Please refresh the page.</div>';
    });
  }

  // ── Sales Chart (Canvas) ──────────────────────────────────
  function drawSalesChart(dailySales, now) {
    var canvas = document.getElementById('salesChart');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var dpr = window.devicePixelRatio || 1;
    var rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    var W = rect.width, H = rect.height;
    var pad = { top: 20, right: 20, bottom: 30, left: 60 };
    var cW = W - pad.left - pad.right;
    var cH = H - pad.top - pad.bottom;

    var daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    var data = [];
    var maxVal = 0;
    for (var d = 1; d <= daysInMonth; d++) {
      var v = dailySales[d] || 0;
      data.push(v);
      if (v > maxVal) maxVal = v;
    }
    if (maxVal === 0) maxVal = 1000;
    var yStep = Math.ceil(maxVal / 4 / 1000) * 1000;
    if (yStep < 1) yStep = 1;
    var yMax = yStep * 5;

    // Grid & labels
    ctx.strokeStyle = '#e2e8f0';
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px DM Sans, sans-serif';
    ctx.textAlign = 'right';
    ctx.lineWidth = 1;
    for (var g = 0; g <= 4; g++) {
      var yVal = g * yStep;
      var y = pad.top + cH - (yVal / yMax * cH);
      ctx.beginPath();
      ctx.setLineDash([4, 4]);
      ctx.moveTo(pad.left, y);
      ctx.lineTo(W - pad.right, y);
      ctx.stroke();
      ctx.setLineDash([]);
      var label = yVal >= 1000 ? (yVal / 1000) + 'k' : yVal;
      ctx.fillText(label, pad.left - 8, y + 4);
    }
    // X labels
    ctx.textAlign = 'center';
    var xLabels = [1, Math.ceil(daysInMonth * 0.25), Math.ceil(daysInMonth * 0.5), Math.ceil(daysInMonth * 0.75), daysInMonth];
    var monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    xLabels.forEach(function (day) {
      var x = pad.left + ((day - 1) / (daysInMonth - 1)) * cW;
      ctx.fillText(day + ' ' + monthNames[now.getMonth()], x, H - 8);
    });

    // Area fill
    ctx.beginPath();
    ctx.moveTo(pad.left, pad.top + cH);
    data.forEach(function (v, i) {
      var x = pad.left + (i / (daysInMonth - 1)) * cW;
      var y = pad.top + cH - (v / yMax * cH);
      if (i === 0) ctx.lineTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.lineTo(pad.left + cW, pad.top + cH);
    ctx.closePath();
    var grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + cH);
    grad.addColorStop(0, 'rgba(13,148,136,0.25)');
    grad.addColorStop(1, 'rgba(13,148,136,0.02)');
    ctx.fillStyle = grad;
    ctx.fill();

    // Line
    ctx.beginPath();
    data.forEach(function (v, i) {
      var x = pad.left + (i / (daysInMonth - 1)) * cW;
      var y = pad.top + cH - (v / yMax * cH);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = '#0d9488';
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Dots for non-zero days
    data.forEach(function (v, i) {
      if (v > 0) {
        var x = pad.left + (i / (daysInMonth - 1)) * cW;
        var y = pad.top + cH - (v / yMax * cH);
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#0d9488';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });
  }
  function invoiceTableHTML(list) {
    var rows = list.map(function (inv) {
      var invId = inv.id || inv._id;
      return '<tr style="cursor:pointer" onclick="window.goTo(\'invoice\',\'' + invId + '\')">' +
        '<td><strong>' + inv.invoice_number + '</strong></td><td>' + formatDate(inv.invoice_date) + '</td>' +
        '<td>' + inv.customer_name + '</td><td class="text-right">' + formatINR(inv.total) + '</td>' +
        '<td>' + statusBadge(inv.status) + '</td></tr>';
    }).join('');
    return '<div class="table-wrap"><table><thead><tr><th>Invoice #</th><th>Date</th><th>Customer</th><th class="text-right">Amount</th><th>Status</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  }

  // ── Parties Page ──────────────────────────────────────────
  function renderParties() {
    $pageTitle.textContent = 'Parties';
    $content.innerHTML = '<p style="color:var(--text-muted)">Loading...</p>';

    Promise.all([api('GET', '/api/parties'), api('GET', '/api/invoices')]).then(function (res) {
      var partyList = res[0].parties || [];
      var allInv = res[1].invoices || [];

      // Calculate receivable per party
      var partyReceivable = {};
      var partyInvCount = {};
      allInv.forEach(function (inv) {
        var name = inv.customer_name;
        if (!partyInvCount[name]) partyInvCount[name] = 0;
        partyInvCount[name]++;
        if (inv.status !== 'paid') {
          var due = (inv.total || 0) - (inv.amount_paid || 0);
          if (due > 0) {
            if (!partyReceivable[name]) partyReceivable[name] = 0;
            partyReceivable[name] += due;
          }
        }
      });

      var html = '<div class="page-actions">' +
        '<div class="page-search"><svg width="16" height="16" fill="none" stroke="var(--text-muted)" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>' +
        '<input type="text" id="partySearch" placeholder="Search parties..." autocomplete="off"></div>' +
        '<span style="color:var(--text-muted);font-size:0.875rem">' + partyList.length + ' parties</span>' +
        '<button type="button" class="btn btn-primary btn-sm" onclick="window.goTo(\'add-party\')"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg> Add Party</button></div>';

      html += '<div class="data-grid" id="partyGrid">';
      if (!partyList.length) {
        html += '<div class="empty-state" style="grid-column:1/-1">No saved parties yet. Create an invoice and parties will be saved automatically!</div>';
      }
      partyList.forEach(function (p) {
        var recv = partyReceivable[p.name] || 0;
        var invCount = partyInvCount[p.name] || 0;
        var pid = p.id || p._id;
        html += '<div class="party-card" data-name="' + esc(p.name).toLowerCase() + '" data-id="' + pid + '" style="cursor:pointer">' +
          '<div class="card-actions">' +
            '<button type="button" class="edit-btn" title="Edit" data-id="' + pid + '"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>' +
            '<button type="button" class="del" title="Delete" data-id="' + pid + '"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg></button>' +
          '</div>' +
          '<div class="card-name">' + esc(p.name) + '</div>' +
          (p.phone ? '<div class="card-detail">Ph: ' + esc(p.phone) + '</div>' : '') +
          (p.gstin ? '<div class="card-detail">GSTIN: ' + esc(p.gstin) + '</div>' : '') +
          (p.state ? '<div class="card-detail">' + esc(p.state) + '</div>' : '') +
          '<div class="card-detail">' + invCount + ' invoice' + (invCount !== 1 ? 's' : '') + '</div>' +
          (recv > 0 ? '<div class="card-badge receivable">' + formatINR(recv) + ' receivable</div>' : '<div class="card-badge no-due">No dues</div>') +
        '</div>';
      });
      html += '</div>';
      $content.innerHTML = html;

      // Search
      document.getElementById('partySearch').addEventListener('input', function () {
        var q = this.value.trim().toLowerCase();
        document.querySelectorAll('.party-card').forEach(function (card) {
          card.style.display = !q || card.getAttribute('data-name').indexOf(q) !== -1 ? '' : 'none';
        });
      });

      // Edit buttons
      $content.querySelectorAll('.card-actions .edit-btn').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          window.goTo('edit-party', btn.getAttribute('data-id'));
        });
      });

      // Card click to edit
      $content.querySelectorAll('.party-card').forEach(function (card) {
        card.addEventListener('click', function () {
          window.goTo('edit-party', card.getAttribute('data-id'));
        });
      });

      // Delete buttons
      $content.querySelectorAll('.card-actions .del').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          if (!confirm('Delete this party?')) return;
          api('DELETE', '/api/parties/' + btn.getAttribute('data-id')).then(function (d) {
            showToast(d.message || 'Deleted', 'success');
            renderParties();
          });
        });
      });
    });
  }

  // ── Items Page ───────────────────────────────────────────
  function renderItems() {
    $pageTitle.textContent = 'Items';
    $content.innerHTML = '<p style="color:var(--text-muted)">Loading...</p>';
    api('GET', '/api/products?q=').then(function (data) {
      var itemList = data.products || [];

      var html = '<div class="page-actions">' +
        '<div class="page-search"><svg width="16" height="16" fill="none" stroke="var(--text-muted)" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>' +
        '<input type="text" id="itemSearch" placeholder="Search items..." autocomplete="off"></div>' +
        '<span style="color:var(--text-muted);font-size:0.875rem">' + itemList.length + ' items</span>' +
        '<button type="button" class="btn btn-primary btn-sm" onclick="window.goTo(\'add-item\')"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg> Add Item</button></div>';

      html += '<div class="data-grid" id="itemGrid">';
      if (!itemList.length) {
        html += '<div class="empty-state" style="grid-column:1/-1">No saved items yet. Create an invoice and items will be saved automatically!</div>';
      }
      itemList.forEach(function (item) {
        var iid = item.id || item._id;
        html += '<div class="item-card" data-name="' + esc(item.name).toLowerCase() + '" data-id="' + iid + '" style="cursor:pointer">' +
          '<div class="card-actions">' +
            '<button type="button" class="edit-btn" title="Edit" data-id="' + iid + '"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>' +
            '<button type="button" class="del" title="Delete" data-id="' + iid + '"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg></button>' +
          '</div>' +
          '<div class="card-name">' + esc(item.name) + '</div>' +
          (item.hsn ? '<div class="card-detail">HSN: ' + esc(item.hsn) + '</div>' : '') +
          '<div class="card-detail">Rate: ' + formatINR(item.rate || 0) + ' | GST: ' + (item.gst || 0) + '%</div>' +
          (item.size ? '<div class="card-detail">Size: ' + esc(item.size) + '</div>' : '') +
          '<div class="card-detail">Unit: ' + (item.unit || 'Pcs') + '</div>' +
        '</div>';
      });
      html += '</div>';
      $content.innerHTML = html;

      // Search
      document.getElementById('itemSearch').addEventListener('input', function () {
        var q = this.value.trim().toLowerCase();
        document.querySelectorAll('.item-card').forEach(function (card) {
          card.style.display = !q || card.getAttribute('data-name').indexOf(q) !== -1 ? '' : 'none';
        });
      });

      // Edit buttons
      $content.querySelectorAll('.card-actions .edit-btn').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          window.goTo('edit-item', btn.getAttribute('data-id'));
        });
      });

      // Card click to edit
      $content.querySelectorAll('.item-card').forEach(function (card) {
        card.addEventListener('click', function () {
          window.goTo('edit-item', card.getAttribute('data-id'));
        });
      });

      // Delete buttons
      $content.querySelectorAll('.card-actions .del').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          if (!confirm('Delete this item?')) return;
          api('DELETE', '/api/products/' + btn.getAttribute('data-id')).then(function (d) {
            showToast(d.message || 'Deleted', 'success');
            renderItems();
          });
        });
      });
    });
  }

  // ── Add Party Page (Vyapar-style) ──────────────────────────
  function renderAddParty() {
    $pageTitle.textContent = 'Add Party';
    var gstTypes = ['Regular','Composition','Unregistered','Consumer','Deemed Export','SEZ','SEZ Developer','UIN Holder'];
    var gstTypeOpts = gstTypes.map(function (g) { return '<option value="' + g + '">' + g + '</option>'; }).join('');

    var html = '<div class="ap-card">' +
      // Header
      '<div class="ap-header">' +
        '<h3>Add Party</h3>' +
        '<button type="button" class="ap-close" onclick="window.goTo(\'parties\')" title="Close">&times;</button>' +
      '</div>' +

      // Top row: Name, GSTIN, Phone
      '<div class="ap-top-row">' +
        '<div class="ap-field"><label>Party Name <span class="req">*</span></label><input id="apName" placeholder="Party Name" required></div>' +
        '<div class="ap-field gstin-field"><label>GSTIN</label><div class="gstin-input-wrap">' +
          '<input id="apGstin" placeholder="e.g. 07AAACH7409R1ZZ" maxlength="15">' +
          '<span class="gstin-status" id="gstinStatus"></span></div></div>' +
        '<div class="ap-field"><label>Phone Number</label><input id="apPhone" placeholder="Phone Number" maxlength="10"></div>' +
      '</div>' +

      // Tabs
      '<div class="ap-tabs">' +
        '<button type="button" class="ap-tab active" data-tab="gst">GST & Address</button>' +
        '<button type="button" class="ap-tab" data-tab="credit">Credit & Balance</button>' +
        '<button type="button" class="ap-tab" data-tab="additional">Additional Fields</button>' +
      '</div>' +

      // Tab: GST & Address
      '<div class="ap-tab-content" id="apTabGst">' +
        '<div class="ap-gst-row">' +
          '<div class="ap-gst-left">' +
            '<div class="ap-field"><label>GST Type</label><select id="apGstType">' + gstTypeOpts + '</select></div>' +
            '<div class="ap-field"><label>State</label><select id="apState">' + stateOptions('') + '</select></div>' +
          '</div>' +
          '<div class="ap-addr-col">' +
            '<label>Billing Address</label>' +
            '<textarea id="apBillingAddr" rows="5" placeholder="Billing address will auto-fill from GSTIN..."></textarea>' +
          '</div>' +
          '<div class="ap-addr-col">' +
            '<label>Shipping Address</label>' +
            '<div class="ap-ship-toggle"><input type="checkbox" id="apEnableShip"> <span>Enable Shipping Address</span></div>' +
            '<textarea id="apShippingAddr" rows="5" placeholder="Same as billing address" disabled></textarea>' +
          '</div>' +
        '</div>' +
      '</div>' +

      // Tab: Credit & Balance
      '<div class="ap-tab-content" id="apTabCredit" style="display:none">' +
        '<div class="ap-credit-grid">' +
          '<div class="ap-field"><label>Opening Balance (\u20B9)</label><input id="apBalance" type="number" step="0.01" placeholder="0.00"></div>' +
          '<div class="ap-field"><label>Credit Limit (\u20B9)</label><input id="apCreditLimit" type="number" step="0.01" placeholder="0.00"></div>' +
          '<div class="ap-field"><label>Payment Terms</label><select id="apPayTerms">' +
            '<option value="">None</option><option value="receipt">Due on Receipt</option>' +
            '<option value="15">Net 15</option><option value="30">Net 30</option>' +
            '<option value="45">Net 45</option><option value="60">Net 60</option></select></div>' +
        '</div>' +
      '</div>' +

      // Tab: Additional Fields
      '<div class="ap-tab-content" id="apTabAdditional" style="display:none">' +
        '<div class="ap-credit-grid">' +
          '<div class="ap-field"><label>Email ID</label><input id="apEmail" type="email" placeholder="email@example.com"></div>' +
          '<div class="ap-field full-width"><label>Notes</label><textarea id="apNotes" rows="3" placeholder="Any notes about this party..."></textarea></div>' +
        '</div>' +
      '</div>' +

      // Footer buttons
      '<div class="ap-footer">' +
        '<button type="button" class="btn btn-ghost" onclick="window.goTo(\'parties\')">Cancel</button>' +
        '<button type="button" class="btn btn-outline" id="apSaveNewBtn">Save & New</button>' +
        '<button type="button" class="btn btn-primary" id="apSaveBtn">Save</button>' +
      '</div>' +
    '</div>';

    $content.innerHTML = html;

    // Tab switching
    document.querySelectorAll('.ap-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        document.querySelectorAll('.ap-tab').forEach(function (t) { t.classList.remove('active'); });
        tab.classList.add('active');
        document.getElementById('apTabGst').style.display = 'none';
        document.getElementById('apTabCredit').style.display = 'none';
        document.getElementById('apTabAdditional').style.display = 'none';
        var target = tab.getAttribute('data-tab');
        if (target === 'gst') document.getElementById('apTabGst').style.display = '';
        else if (target === 'credit') document.getElementById('apTabCredit').style.display = '';
        else document.getElementById('apTabAdditional').style.display = '';
      });
    });

    // Shipping address toggle
    document.getElementById('apEnableShip').addEventListener('change', function () {
      document.getElementById('apShippingAddr').disabled = !this.checked;
      if (!this.checked) document.getElementById('apShippingAddr').value = '';
    });

    // GSTIN auto-lookup
    var gstinTimer = null;
    var $gstinInput = document.getElementById('apGstin');
    var $gstinStatus = document.getElementById('gstinStatus');
    $gstinInput.addEventListener('input', function () {
      var val = $gstinInput.value.replace(/\s/g, '').toUpperCase();
      $gstinInput.value = val;
      $gstinStatus.className = 'gstin-status';
      $gstinStatus.textContent = '';
      clearTimeout(gstinTimer);
      if (val.length !== 15) {
        if (val.length > 0) { $gstinStatus.className = 'gstin-status typing'; $gstinStatus.textContent = val.length + '/15'; }
        return;
      }
      // Valid length - lookup
      $gstinStatus.className = 'gstin-status loading';
      $gstinStatus.innerHTML = '<span class="gstin-spinner"></span>';
      gstinTimer = setTimeout(function () {
        api('GET', '/api/gstin-lookup/' + val).then(function (res) {
          if (res.error) {
            $gstinStatus.className = 'gstin-status invalid';
            $gstinStatus.textContent = '\u2717';
            showToast(res.error, 'error');
            return;
          }
          $gstinStatus.className = 'gstin-status valid';
          $gstinStatus.textContent = '\u2713';
          // Auto-fill fields
          if (res.state) {
            var stateSelect = document.getElementById('apState');
            for (var i = 0; i < stateSelect.options.length; i++) {
              if (stateSelect.options[i].value === res.state) { stateSelect.selectedIndex = i; break; }
            }
          }
          if (res.address) {
            document.getElementById('apBillingAddr').value = res.address;
          }
          // Auto-fill party name from trade name or legal name
          if ((res.trade_name || res.legal_name)) {
            var nameField = document.getElementById('apName');
            if (!nameField.value.trim()) {
              nameField.value = res.trade_name || res.legal_name;
            }
          }
          if (res.gst_type) {
            var gtSel = document.getElementById('apGstType');
            var gtVal = res.gst_type.toLowerCase();
            for (var j = 0; j < gtSel.options.length; j++) {
              if (gtSel.options[j].value.toLowerCase().indexOf(gtVal) !== -1 ||
                  gtVal.indexOf(gtSel.options[j].value.toLowerCase()) !== -1) {
                gtSel.selectedIndex = j; break;
              }
            }
          }
          var msg = 'GSTIN verified!';
          if (res.address) {
            msg += ' Address auto-filled.';
            showToast(msg, 'success');
          } else if (res.needs_api_key) {
            msg += ' State detected. To auto-fill address, add a free GSTIN API key in Settings.';
            showToast(msg, 'warning');
          } else {
            msg += ' State detected. Address not found, enter manually.';
            showToast(msg, 'success');
          }
        }).catch(function () {
          $gstinStatus.className = 'gstin-status invalid';
          $gstinStatus.textContent = '\u2717';
        });
      }, 300);
    });

    // Save functions
    function collectPartyData() {
      var name = document.getElementById('apName').value.trim();
      if (!name) { showToast('Party name is required', 'error'); return null; }
      return {
        name: name,
        phone: document.getElementById('apPhone').value.trim(),
        email: document.getElementById('apEmail').value.trim(),
        gstin: document.getElementById('apGstin').value.trim().toUpperCase(),
        state: document.getElementById('apState').value,
        gst_type: document.getElementById('apGstType').value,
        address: document.getElementById('apBillingAddr').value.trim(),
        billing_address: document.getElementById('apBillingAddr').value.trim(),
        shipping_address: document.getElementById('apShippingAddr').value.trim(),
        opening_balance: parseFloat(document.getElementById('apBalance').value) || 0,
        credit_limit: parseFloat(document.getElementById('apCreditLimit').value) || 0,
        payment_terms: document.getElementById('apPayTerms').value,
        notes: document.getElementById('apNotes').value.trim()
      };
    }

    function saveParty(btn, goBack) {
      var data = collectPartyData();
      if (!data) return;
      btn.disabled = true; var origText = btn.textContent; btn.textContent = 'Saving...';
      api('POST', '/api/parties', data).then(function (res) {
        if (res.error) { showToast(res.error, 'error'); btn.disabled = false; btn.textContent = origText; return; }
        showToast(res.message || 'Party added!', 'success');
        if (goBack) window.goTo('parties'); else renderAddParty();
      }).catch(function () { showToast('Failed to add party', 'error'); btn.disabled = false; btn.textContent = origText; });
    }

    document.getElementById('apSaveBtn').addEventListener('click', function () { saveParty(this, true); });
    document.getElementById('apSaveNewBtn').addEventListener('click', function () { saveParty(this, false); });
  }

  // ── Edit Party Page ──────────────────────────────────────────
  function renderEditParty(partyId) {
    $pageTitle.textContent = 'Edit Party';
    $content.innerHTML = '<p style="color:var(--text-muted)">Loading party...</p>';

    api('GET', '/api/parties/' + partyId).then(function (data) {
      if (data.error) { showToast(data.error, 'error'); window.goTo('parties'); return; }
      var p = data.party;

      var gstTypes = ['Regular','Composition','Unregistered','Consumer','Deemed Export','SEZ','SEZ Developer','UIN Holder'];
      var gstTypeOpts = gstTypes.map(function (g) {
        return '<option value="' + g + '"' + (p.gst_type === g ? ' selected' : '') + '>' + g + '</option>';
      }).join('');

      var html = '<div class="ap-card">' +
        '<div class="ap-header">' +
          '<h3>Edit Party</h3>' +
          '<button type="button" class="ap-close" onclick="window.goTo(\'parties\')" title="Close">&times;</button>' +
        '</div>' +

        '<div class="ap-top-row">' +
          '<div class="ap-field"><label>Party Name <span class="req">*</span></label><input id="apName" placeholder="Party Name" required value="' + esc(p.name || '') + '"></div>' +
          '<div class="ap-field gstin-field"><label>GSTIN</label><div class="gstin-input-wrap">' +
            '<input id="apGstin" placeholder="e.g. 07AAACH7409R1ZZ" maxlength="15" value="' + esc(p.gstin || '') + '">' +
            '<span class="gstin-status" id="gstinStatus"></span></div></div>' +
          '<div class="ap-field"><label>Phone Number</label><input id="apPhone" placeholder="Phone Number" maxlength="10" value="' + esc(p.phone || '') + '"></div>' +
        '</div>' +

        '<div class="ap-tabs">' +
          '<button type="button" class="ap-tab active" data-tab="gst">GST & Address</button>' +
          '<button type="button" class="ap-tab" data-tab="credit">Credit & Balance</button>' +
          '<button type="button" class="ap-tab" data-tab="additional">Additional Fields</button>' +
        '</div>' +

        '<div class="ap-tab-content" id="apTabGst">' +
          '<div class="ap-gst-row">' +
            '<div class="ap-gst-left">' +
              '<div class="ap-field"><label>GST Type</label><select id="apGstType">' + gstTypeOpts + '</select></div>' +
              '<div class="ap-field"><label>State</label><select id="apState">' + stateOptions(p.state || '') + '</select></div>' +
            '</div>' +
            '<div class="ap-addr-col">' +
              '<label>Billing Address</label>' +
              '<textarea id="apBillingAddr" rows="5" placeholder="Billing address...">' + esc(p.billing_address || p.address || '') + '</textarea>' +
            '</div>' +
            '<div class="ap-addr-col">' +
              '<label>Shipping Address</label>' +
              '<div class="ap-ship-toggle"><input type="checkbox" id="apEnableShip"' + (p.shipping_address ? ' checked' : '') + '> <span>Enable Shipping Address</span></div>' +
              '<textarea id="apShippingAddr" rows="5" placeholder="Same as billing address"' + (p.shipping_address ? '' : ' disabled') + '>' + esc(p.shipping_address || '') + '</textarea>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div class="ap-tab-content" id="apTabCredit" style="display:none">' +
          '<div class="ap-credit-grid">' +
            '<div class="ap-field"><label>Opening Balance (\u20B9)</label><input id="apBalance" type="number" step="0.01" placeholder="0.00" value="' + (p.opening_balance || '') + '"></div>' +
            '<div class="ap-field"><label>Credit Limit (\u20B9)</label><input id="apCreditLimit" type="number" step="0.01" placeholder="0.00" value="' + (p.credit_limit || '') + '"></div>' +
            '<div class="ap-field"><label>Payment Terms</label><select id="apPayTerms">' +
              '<option value=""' + (!p.payment_terms ? ' selected' : '') + '>None</option>' +
              '<option value="receipt"' + (p.payment_terms === 'receipt' ? ' selected' : '') + '>Due on Receipt</option>' +
              '<option value="15"' + (p.payment_terms === '15' ? ' selected' : '') + '>Net 15</option>' +
              '<option value="30"' + (p.payment_terms === '30' ? ' selected' : '') + '>Net 30</option>' +
              '<option value="45"' + (p.payment_terms === '45' ? ' selected' : '') + '>Net 45</option>' +
              '<option value="60"' + (p.payment_terms === '60' ? ' selected' : '') + '>Net 60</option></select></div>' +
          '</div>' +
        '</div>' +

        '<div class="ap-tab-content" id="apTabAdditional" style="display:none">' +
          '<div class="ap-credit-grid">' +
            '<div class="ap-field"><label>Email ID</label><input id="apEmail" type="email" placeholder="email@example.com" value="' + esc(p.email || '') + '"></div>' +
            '<div class="ap-field full-width"><label>Notes</label><textarea id="apNotes" rows="3" placeholder="Any notes about this party...">' + esc(p.notes || '') + '</textarea></div>' +
          '</div>' +
        '</div>' +

        '<div class="ap-footer">' +
          '<button type="button" class="btn btn-ghost" onclick="window.goTo(\'parties\')">Cancel</button>' +
          '<button type="button" class="btn btn-primary" id="apSaveBtn">Update Party</button>' +
        '</div>' +
      '</div>';

      $content.innerHTML = html;

      // Tab switching
      document.querySelectorAll('.ap-tab').forEach(function (tab) {
        tab.addEventListener('click', function () {
          document.querySelectorAll('.ap-tab').forEach(function (t) { t.classList.remove('active'); });
          tab.classList.add('active');
          document.getElementById('apTabGst').style.display = 'none';
          document.getElementById('apTabCredit').style.display = 'none';
          document.getElementById('apTabAdditional').style.display = 'none';
          var target = tab.getAttribute('data-tab');
          if (target === 'gst') document.getElementById('apTabGst').style.display = '';
          else if (target === 'credit') document.getElementById('apTabCredit').style.display = '';
          else document.getElementById('apTabAdditional').style.display = '';
        });
      });

      // Shipping address toggle
      document.getElementById('apEnableShip').addEventListener('change', function () {
        document.getElementById('apShippingAddr').disabled = !this.checked;
        if (!this.checked) document.getElementById('apShippingAddr').value = '';
      });

      // GSTIN auto-lookup
      var gstinTimer = null;
      var $gstinInput = document.getElementById('apGstin');
      var $gstinStatus = document.getElementById('gstinStatus');
      $gstinInput.addEventListener('input', function () {
        var val = $gstinInput.value.replace(/\s/g, '').toUpperCase();
        $gstinInput.value = val;
        $gstinStatus.className = 'gstin-status';
        $gstinStatus.textContent = '';
        clearTimeout(gstinTimer);
        if (val.length !== 15) {
          if (val.length > 0) { $gstinStatus.className = 'gstin-status typing'; $gstinStatus.textContent = val.length + '/15'; }
          return;
        }
        $gstinStatus.className = 'gstin-status loading';
        $gstinStatus.innerHTML = '<span class="gstin-spinner"></span>';
        gstinTimer = setTimeout(function () {
          api('GET', '/api/gstin-lookup/' + val).then(function (res) {
            if (res.error) {
              $gstinStatus.className = 'gstin-status invalid';
              $gstinStatus.textContent = '\u2717';
              showToast(res.error, 'error');
              return;
            }
            $gstinStatus.className = 'gstin-status valid';
            $gstinStatus.textContent = '\u2713';
            if (res.state) {
              var stateSelect = document.getElementById('apState');
              for (var i = 0; i < stateSelect.options.length; i++) {
                if (stateSelect.options[i].value === res.state) { stateSelect.selectedIndex = i; break; }
              }
            }
            if (res.address) document.getElementById('apBillingAddr').value = res.address;
            if ((res.trade_name || res.legal_name)) {
              var nameField = document.getElementById('apName');
              if (!nameField.value.trim()) nameField.value = res.trade_name || res.legal_name;
            }
            if (res.gst_type) {
              var gtSel = document.getElementById('apGstType');
              var gtVal = res.gst_type.toLowerCase();
              for (var j = 0; j < gtSel.options.length; j++) {
                if (gtSel.options[j].value.toLowerCase().indexOf(gtVal) !== -1 ||
                    gtVal.indexOf(gtSel.options[j].value.toLowerCase()) !== -1) {
                  gtSel.selectedIndex = j; break;
                }
              }
            }
            showToast('GSTIN verified!', 'success');
          }).catch(function () {
            $gstinStatus.className = 'gstin-status invalid';
            $gstinStatus.textContent = '\u2717';
          });
        }, 300);
      });

      // Save (update)
      document.getElementById('apSaveBtn').addEventListener('click', function () {
        var name = document.getElementById('apName').value.trim();
        if (!name) { showToast('Party name is required', 'error'); return; }
        var updData = {
          name: name,
          phone: document.getElementById('apPhone').value.trim(),
          email: document.getElementById('apEmail').value.trim(),
          gstin: document.getElementById('apGstin').value.trim().toUpperCase(),
          state: document.getElementById('apState').value,
          gst_type: document.getElementById('apGstType').value,
          address: document.getElementById('apBillingAddr').value.trim(),
          billing_address: document.getElementById('apBillingAddr').value.trim(),
          shipping_address: document.getElementById('apShippingAddr').value.trim(),
          opening_balance: parseFloat(document.getElementById('apBalance').value) || 0,
          credit_limit: parseFloat(document.getElementById('apCreditLimit').value) || 0,
          payment_terms: document.getElementById('apPayTerms').value,
          notes: document.getElementById('apNotes').value.trim()
        };
        var btn = this;
        btn.disabled = true; btn.textContent = 'Saving...';
        api('PUT', '/api/parties/' + partyId, updData).then(function (res) {
          if (res.error) { showToast(res.error, 'error'); btn.disabled = false; btn.textContent = 'Update Party'; return; }
          showToast(res.message || 'Party updated!', 'success');
          window.goTo('parties');
        }).catch(function () { showToast('Failed to update party', 'error'); btn.disabled = false; btn.textContent = 'Update Party'; });
      });
    }).catch(function () { showToast('Failed to load party', 'error'); window.goTo('parties'); });
  }

  // ── Add Item Page ──────────────────────────────────────────
  function renderAddItem() {
    $pageTitle.textContent = 'Add Item';
    var unitOptions = ['Pcs','Kg','Gm','Ltr','Mtr','Sq.Ft','Box','Bag','Dozen','Pair','Set','Roll','Ton','Quintal','Nos','Bundle','Other'];
    var unitOpts = unitOptions.map(function (u) { return '<option value="' + u + '">' + u + '</option>'; }).join('');
    var gstOpts = GST_RATES.map(function (r) { return '<option value="' + r + '">' + r + '%</option>'; }).join('');
    var html = '<div class="add-form-card">' +
      '<div class="add-form-header"><h3>Add New Item</h3>' +
      '<button type="button" class="btn btn-ghost btn-sm" onclick="window.goTo(\'items\')">&larr; Back to Items</button></div>' +
      '<form id="addItemForm" class="add-form-body" novalidate>' +
        '<div class="add-form-grid">' +
          '<div class="form-group"><label>Item Name <span class="req">*</span></label><input id="aiName" placeholder="e.g. Cotton Shirt" required></div>' +
          '<div class="form-group"><label>HSN Code</label><input id="aiHsn" placeholder="e.g. 6109"></div>' +
          '<div class="form-group"><label>Sale Price / Rate <span class="req">*</span></label><input id="aiRate" type="number" step="0.01" min="0" placeholder="0.00" required></div>' +
          '<div class="form-group"><label>MRP</label><input id="aiMrp" type="number" step="0.01" min="0" placeholder="0.00"></div>' +
          '<div class="form-group"><label>GST Rate</label><select id="aiGst">' + gstOpts + '</select></div>' +
          '<div class="form-group"><label>Unit</label><select id="aiUnit">' + unitOpts + '</select></div>' +
          '<div class="form-group"><label>Size</label><input id="aiSize" placeholder="e.g. L, XL, 500ml"></div>' +
        '</div>' +
        '<div class="add-form-actions">' +
          '<button type="button" class="btn btn-ghost" onclick="window.goTo(\'items\')">Cancel</button>' +
          '<button type="submit" class="btn btn-primary" id="aiSubmitBtn">Save Item</button>' +
        '</div>' +
      '</form></div>';
    $content.innerHTML = html;

    document.getElementById('addItemForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var name = document.getElementById('aiName').value.trim();
      var rate = parseFloat(document.getElementById('aiRate').value) || 0;
      if (!name) { showToast('Item name is required', 'error'); return; }
      if (rate <= 0) { showToast('Rate is required', 'error'); return; }
      var btn = document.getElementById('aiSubmitBtn');
      btn.disabled = true; btn.textContent = 'Saving...';
      api('POST', '/api/products', {
        name: name,
        hsn: document.getElementById('aiHsn').value.trim(),
        rate: rate,
        mrp: parseFloat(document.getElementById('aiMrp').value) || 0,
        gst: parseInt(document.getElementById('aiGst').value) || 0,
        unit: document.getElementById('aiUnit').value,
        size: document.getElementById('aiSize').value.trim()
      }).then(function (res) {
        if (res.error) { showToast(res.error, 'error'); btn.disabled = false; btn.textContent = 'Save Item'; return; }
        showToast(res.message || 'Item added!', 'success');
        window.goTo('items');
      }).catch(function () { showToast('Failed to add item', 'error'); btn.disabled = false; btn.textContent = 'Save Item'; });
    });
  }

  // ── Edit Item Page ──────────────────────────────────────────
  function renderEditItem(itemId) {
    $pageTitle.textContent = 'Edit Item';
    $content.innerHTML = '<p style="color:var(--text-muted)">Loading item...</p>';

    api('GET', '/api/products/' + itemId).then(function (data) {
      if (data.error) { showToast(data.error, 'error'); window.goTo('items'); return; }
      var item = data.product;

      var unitOptions = ['Pcs','Kg','Gm','Ltr','Mtr','Sq.Ft','Box','Bag','Dozen','Pair','Set','Roll','Ton','Quintal','Nos','Bundle','Other'];
      var unitOpts = unitOptions.map(function (u) {
        return '<option value="' + u + '"' + ((item.unit || 'Pcs') === u ? ' selected' : '') + '>' + u + '</option>';
      }).join('');
      var gstOpts = GST_RATES.map(function (r) {
        return '<option value="' + r + '"' + ((item.gst || 0) === r ? ' selected' : '') + '>' + r + '%</option>';
      }).join('');

      var html = '<div class="add-form-card">' +
        '<div class="add-form-header"><h3>Edit Item</h3>' +
        '<button type="button" class="btn btn-ghost btn-sm" onclick="window.goTo(\'items\')">&larr; Back to Items</button></div>' +
        '<form id="editItemForm" class="add-form-body" novalidate>' +
          '<div class="add-form-grid">' +
            '<div class="form-group"><label>Item Name <span class="req">*</span></label><input id="aiName" placeholder="e.g. Cotton Shirt" required value="' + esc(item.name || '') + '"></div>' +
            '<div class="form-group"><label>HSN Code</label><input id="aiHsn" placeholder="e.g. 6109" value="' + esc(item.hsn || '') + '"></div>' +
            '<div class="form-group"><label>Sale Price / Rate <span class="req">*</span></label><input id="aiRate" type="number" step="0.01" min="0" placeholder="0.00" required value="' + (item.rate || '') + '"></div>' +
            '<div class="form-group"><label>MRP</label><input id="aiMrp" type="number" step="0.01" min="0" placeholder="0.00" value="' + (item.mrp || '') + '"></div>' +
            '<div class="form-group"><label>GST Rate</label><select id="aiGst">' + gstOpts + '</select></div>' +
            '<div class="form-group"><label>Unit</label><select id="aiUnit">' + unitOpts + '</select></div>' +
            '<div class="form-group"><label>Size</label><input id="aiSize" placeholder="e.g. L, XL, 500ml" value="' + esc(item.size || '') + '"></div>' +
          '</div>' +
          '<div class="add-form-actions">' +
            '<button type="button" class="btn btn-ghost" onclick="window.goTo(\'items\')">Cancel</button>' +
            '<button type="submit" class="btn btn-primary" id="aiSubmitBtn">Update Item</button>' +
          '</div>' +
        '</form></div>';
      $content.innerHTML = html;

      document.getElementById('editItemForm').addEventListener('submit', function (e) {
        e.preventDefault();
        var name = document.getElementById('aiName').value.trim();
        var rate = parseFloat(document.getElementById('aiRate').value) || 0;
        if (!name) { showToast('Item name is required', 'error'); return; }
        if (rate <= 0) { showToast('Rate is required', 'error'); return; }
        var btn = document.getElementById('aiSubmitBtn');
        btn.disabled = true; btn.textContent = 'Saving...';
        api('PUT', '/api/products/' + itemId, {
          name: name,
          hsn: document.getElementById('aiHsn').value.trim(),
          rate: rate,
          mrp: parseFloat(document.getElementById('aiMrp').value) || 0,
          gst: parseInt(document.getElementById('aiGst').value) || 0,
          unit: document.getElementById('aiUnit').value,
          size: document.getElementById('aiSize').value.trim()
        }).then(function (res) {
          if (res.error) { showToast(res.error, 'error'); btn.disabled = false; btn.textContent = 'Update Item'; return; }
          showToast(res.message || 'Item updated!', 'success');
          window.goTo('items');
        }).catch(function () { showToast('Failed to update item', 'error'); btn.disabled = false; btn.textContent = 'Update Item'; });
      });
    }).catch(function () { showToast('Failed to load item', 'error'); window.goTo('items'); });
  }

  // ── Invoice List ───────────────────────────────────────────
  function renderInvoiceList() {
    $pageTitle.textContent = 'All Invoices';
    $content.innerHTML = '<p style="color:var(--text-muted)">Loading...</p>';
    api('GET', '/api/invoices').then(function (data) {
      var list = data.invoices || [];
      $content.innerHTML = '<div class="table-card"><div class="table-header"><h3>Invoices (' + list.length + ')</h3>' +
        '<button type="button" class="btn btn-primary btn-sm" onclick="window.goTo(\'new-invoice\')">+ New Invoice</button></div>' +
        (list.length ? invoiceTableHTML(list) : '<div class="empty-state">No invoices found.</div>') + '</div>';
    });
  }

  // ── Invoice Detail (PDF-style format) ──────────────────────
  function renderInvoiceDetail(id) {
    $pageTitle.textContent = 'Invoice';
    $content.innerHTML = '<p style="color:var(--text-muted)">Loading...</p>';
    api('GET', '/api/invoices/' + id).then(function (data) {
      if (data.error) { showToast(data.error, 'error'); window.goTo('invoices'); return; }
      var inv = data.invoice;
      var items = inv.items || [];
      var u = currentUser || {};

      // Compute per-item inclusive amounts
      var totalQty = 0, totalGstAmt = 0, totalInclAmount = 0, totalTaxable = 0, totalMrpAmount = 0;
      items.forEach(function (item) {
        var taxable = (item.qty || 0) * (item.rate || 0);
        var gstAmt = taxable * (item.gst || 0) / 100;
        item._taxable = taxable;
        item._gst_amount = gstAmt;
        item._amount = taxable + gstAmt;
        totalQty += (item.qty || 0);
        totalGstAmt += gstAmt;
        totalInclAmount += taxable + gstAmt;
        totalTaxable += taxable;
        totalMrpAmount += ((item.mrp || 0) * (item.qty || 0));
      });

      var roundOff = inv.round_off !== undefined ? inv.round_off : (Math.round(totalInclAmount * 100) / 100 !== totalInclAmount ? Math.round(totalInclAmount) - totalInclAmount : 0);
      var grandTotal = inv.total || Math.round(totalInclAmount);
      var amountPaid = inv.amount_paid || 0;
      var balance = grandTotal - amountPaid;
      var youSaved = totalMrpAmount > totalInclAmount ? totalMrpAmount - totalInclAmount : 0;
      var isIntra = !inv.igst || inv.igst === 0;
      var taxSummary = computeTaxSummary(items, isIntra);

      // ── Action buttons (no-print) ──
      var selectedTheme = (u.invoice_theme || 'classic');
      var html = '<div class="no-print" style="margin-bottom:16px;display:flex;gap:12px;flex-wrap:wrap;align-items:center">' +
        '<button type="button" class="btn btn-secondary" onclick="window.print()">Print / PDF</button>' +
        '<button type="button" class="btn btn-outline" id="markPaidBtn">Mark as Paid</button>' +
        '<button type="button" class="btn btn-danger" id="deleteInvBtn">Delete</button>' +
        '<button type="button" class="btn btn-ghost" onclick="window.goTo(\'invoices\')">\u2190 Back</button></div>';

      // ── Theme Selector (no-print) ──
      var themes = [
        { id: 'classic', name: 'Classic', color: '#0d9488', desc: 'Teal header, clean layout' },
        { id: 'modern', name: 'Modern', color: '#6366f1', desc: 'Gradient, rounded, soft' },
        { id: 'elegant', name: 'Elegant', color: '#1e3a5f', desc: 'Navy & gold, serif fonts' },
        { id: 'minimal', name: 'Minimal', color: '#64748b', desc: 'No color, thin lines' },
        { id: 'bold', name: 'Bold', color: '#dc2626', desc: 'Red accent, high contrast' }
      ];
      html += '<div class="no-print theme-selector"><span class="theme-label">Invoice Theme:</span><div class="theme-options">';
      themes.forEach(function (t) {
        html += '<button type="button" class="theme-btn' + (selectedTheme === t.id ? ' active' : '') + '" data-theme="' + t.id + '" title="' + t.desc + '">' +
          '<span class="theme-swatch" style="background:' + t.color + '"></span>' +
          '<span>' + t.name + '</span></button>';
      });
      html += '</div></div>';

      // ── Invoice Print Layout ──
      html += '<div class="invoice-print theme-' + selectedTheme + '" id="invoicePrintArea">';

      // Title bar
      html += '<div class="inv-title-bar"><h2>Tax Invoice</h2></div>';

      // Business header
      html += '<div class="inv-biz-header">';
      html += '<h3 class="biz-name">' + esc(u.business_name || u.name || 'BillWise') + '</h3>';
      var addrParts = [u.address, u.city, u.state, u.pincode].filter(Boolean);
      if (addrParts.length) html += '<p>' + addrParts.join(', ') + '</p>';
      var contactParts = [];
      if (u.phone) contactParts.push('Phone: ' + u.phone);
      if (u.email) contactParts.push('Email: ' + u.email);
      if (contactParts.length) html += '<p>' + contactParts.join(' \u2003 ') + '</p>';
      var gstLine = [];
      if (u.gstin) gstLine.push('GSTIN: ' + u.gstin);
      if (u.state) gstLine.push('State: ' + u.state);
      if (gstLine.length) html += '<p>' + gstLine.join(' \u2003 ') + '</p>';
      html += '</div>';

      // Bill To + Invoice Details
      html += '<div class="inv-info-row"><div>';
      html += '<div class="inv-info-label">Bill To:</div>';
      html += '<p><strong>' + esc(inv.customer_name) + '</strong></p>';
      if (inv.customer_address) html += '<p>' + esc(inv.customer_address) + '</p>';
      if (inv.customer_state) html += '<p>' + inv.customer_state + '</p>';
      var cParts = [];
      if (inv.customer_phone) cParts.push('Contact No: ' + inv.customer_phone);
      if (inv.customer_gstin) cParts.push('GSTIN: ' + inv.customer_gstin);
      if (cParts.length) html += '<p>' + cParts.join(' \u2003 ') + '</p>';
      html += '</div><div>';
      html += '<div class="inv-info-label">Invoice Details:</div>';
      html += '<p><strong>No:</strong> ' + inv.invoice_number + '</p>';
      html += '<p><strong>Date:</strong> ' + formatDateSlash(inv.invoice_date) + '</p>';
      if (inv.due_date) html += '<p><strong>Due:</strong> ' + formatDateSlash(inv.due_date) + '</p>';
      if (inv.place_of_supply) html += '<p><strong>Place Of Supply:</strong> ' + inv.place_of_supply + '</p>';
      html += '</div></div>';

      // Items table
      html += '<div class="table-wrap"><table class="inv-items-table"><thead><tr>' +
        '<th>#</th><th class="text-left">Item name</th><th>HSN/SAC</th>' +
        '<th>Size</th><th>MRP(\u20B9)</th><th>Quantity</th><th>Unit</th>' +
        '<th>Price/Unit(\u20B9)</th><th>GST(\u20B9)</th><th>Amount(\u20B9)</th></tr></thead><tbody>';
      items.forEach(function (item, i) {
        html += '<tr><td>' + (i + 1) + '</td>';
        html += '<td class="text-left">' + esc(item.name) + '</td>';
        html += '<td>' + (item.hsn || '-') + '</td>';
        html += '<td>' + (item.size || '') + '</td>';
        html += '<td>' + (item.mrp ? formatINR(item.mrp) : '') + '</td>';
        html += '<td>' + item.qty + '</td>';
        html += '<td>' + (item.unit || 'Pcs') + '</td>';
        html += '<td>' + formatINR(item.rate) + '</td>';
        html += '<td>' + formatINR(item._gst_amount) + '<br><small>(' + item.gst + '%)</small></td>';
        html += '<td>' + formatINR(item._amount) + '</td></tr>';
      });
      html += '</tbody><tfoot><tr>' +
        '<td colspan="5" class="text-left" style="font-weight:700">Total</td>' +
        '<td style="font-weight:700">' + totalQty + '</td><td></td><td></td>' +
        '<td style="font-weight:700">' + formatINR(totalGstAmt) + '</td>' +
        '<td style="font-weight:700">' + formatINR(totalInclAmount) + '</td>' +
        '</tr></tfoot></table></div>';

      // Tax Summary
      html += '<div class="inv-tax-summary"><div class="inv-info-label">Tax Summary:</div>';
      html += '<div class="table-wrap"><table><thead>';
      if (isIntra) {
        html += '<tr><th rowspan="2">HSN/SAC</th><th rowspan="2" class="text-right">Taxable amount(\u20B9)</th>' +
          '<th colspan="2" class="text-center">CGST</th><th colspan="2" class="text-center">SGST</th>' +
          '<th rowspan="2" class="text-right">Total Tax(\u20B9)</th></tr>' +
          '<tr><th class="text-right">Rate(%)</th><th class="text-right">Amt(\u20B9)</th>' +
          '<th class="text-right">Rate(%)</th><th class="text-right">Amt(\u20B9)</th></tr>';
      } else {
        html += '<tr><th rowspan="2">HSN/SAC</th><th rowspan="2" class="text-right">Taxable amount(\u20B9)</th>' +
          '<th colspan="2" class="text-center">IGST</th>' +
          '<th rowspan="2" class="text-right">Total Tax(\u20B9)</th></tr>' +
          '<tr><th class="text-right">Rate(%)</th><th class="text-right">Amt(\u20B9)</th></tr>';
      }
      html += '</thead><tbody>';
      var tsTaxable = 0, tsCgst = 0, tsSgst = 0, tsIgst = 0, tsTax = 0;
      taxSummary.forEach(function (ts) {
        tsTaxable += ts.taxable; tsCgst += ts.cgst; tsSgst += ts.sgst; tsIgst += ts.igst; tsTax += ts.total_tax;
        if (isIntra) {
          html += '<tr><td>' + (ts.hsn || '-') + '</td><td class="text-right">' + formatINR(ts.taxable) + '</td>' +
            '<td class="text-right">' + ts.cgst_rate + '</td><td class="text-right">' + formatINR(ts.cgst) + '</td>' +
            '<td class="text-right">' + ts.sgst_rate + '</td><td class="text-right">' + formatINR(ts.sgst) + '</td>' +
            '<td class="text-right">' + formatINR(ts.total_tax) + '</td></tr>';
        } else {
          html += '<tr><td>' + (ts.hsn || '-') + '</td><td class="text-right">' + formatINR(ts.taxable) + '</td>' +
            '<td class="text-right">' + ts.igst_rate + '</td><td class="text-right">' + formatINR(ts.igst) + '</td>' +
            '<td class="text-right">' + formatINR(ts.total_tax) + '</td></tr>';
        }
      });
      // Tax summary total row
      if (isIntra) {
        html += '<tr class="tax-total-row"><td><strong>TOTAL</strong></td><td class="text-right"><strong>' + formatINR(tsTaxable) + '</strong></td>' +
          '<td></td><td class="text-right"><strong>' + formatINR(tsCgst) + '</strong></td>' +
          '<td></td><td class="text-right"><strong>' + formatINR(tsSgst) + '</strong></td>' +
          '<td class="text-right"><strong>' + formatINR(tsTax) + '</strong></td></tr>';
      } else {
        html += '<tr class="tax-total-row"><td><strong>TOTAL</strong></td><td class="text-right"><strong>' + formatINR(tsTaxable) + '</strong></td>' +
          '<td></td><td class="text-right"><strong>' + formatINR(tsIgst) + '</strong></td>' +
          '<td class="text-right"><strong>' + formatINR(tsTax) + '</strong></td></tr>';
      }
      html += '</tbody></table></div></div>';

      // Totals section
      html += '<div class="inv-totals-section"><table>' +
        '<tr><td>Sub Total</td><td>:</td><td class="text-right">' + formatINR(totalInclAmount) + '</td></tr>';
      if (roundOff !== 0) {
        var roSign = roundOff >= 0 ? '+' : '-';
        html += '<tr><td>Round Off</td><td>:</td><td class="text-right">' + roSign + '\u20B9' + Math.abs(roundOff).toFixed(2) + '</td></tr>';
      }
      html += '<tr class="total-row"><td><strong>Total</strong></td><td>:</td><td class="text-right"><strong>' + formatINR(grandTotal) + '</strong></td></tr></table></div>';

      // Amount in words
      html += '<div class="inv-words"><strong>Invoice Amount in Words:</strong><br>' + numberToWords(grandTotal) + '</div>';

      // Payment info
      html += '<div class="inv-payment-section"><table>' +
        '<tr><td>Received</td><td>:</td><td class="text-right">' + formatINR(amountPaid) + '</td></tr>' +
        '<tr><td>Balance</td><td>:</td><td class="text-right"><strong>' + formatINR(balance) + '</strong></td></tr>';
      if (youSaved > 0) {
        html += '<tr class="you-saved"><td>You Saved</td><td>:</td><td class="text-right"><strong>' + formatINR(youSaved) + '</strong></td></tr>';
      }
      html += '</table></div>';

      // Terms & Conditions
      if (u.terms_conditions) {
        html += '<div style="padding:12px 30px;border-top:1px solid var(--border)">' +
          '<div class="inv-info-label">Terms & Conditions:</div>' +
          '<p style="font-size:0.875rem;white-space:pre-line;margin:4px 0">' + esc(u.terms_conditions) + '</p></div>';
      }

      // Notes
      if (inv.notes) {
        html += '<div style="padding:0 30px 12px;font-size:0.875rem;color:var(--text-muted)"><strong>Notes: </strong>' + esc(inv.notes) + '</div>';
      }

      // Bank Details + Signatory (bordered table like PDF)
      var hasBank = u.bank_name || u.account_no || u.upi_id;
      html += '<div class="inv-bank-sig"><table class="bank-sig-table"><tr>';
      // Bank Details cell
      html += '<td class="bank-cell">';
      html += '<div class="inv-info-label" style="margin-bottom:8px">Bank Details:</div>';
      if (hasBank) {
        html += '<div class="bank-content">';
        if (u.upi_qr) {
          html += '<div class="bank-qr">' +
            '<img src="' + u.upi_qr + '" alt="UPI QR" style="max-width:120px;max-height:120px">' +
            '<div class="upi-badge"><span style="font-weight:800;letter-spacing:1px">UPI</span><br><small>SCAN TO PAY</small></div></div>';
        } else if (u.upi_id) {
          var upiLink = 'upi://pay?pa=' + encodeURIComponent(u.upi_id) + '&pn=' + encodeURIComponent(u.business_name || u.name || '') + '&cu=INR';
          var qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=' + encodeURIComponent(upiLink);
          html += '<div class="bank-qr">' +
            '<img src="' + qrUrl + '" alt="UPI QR" width="100" height="100">' +
            '<div class="upi-badge"><span style="font-weight:800;letter-spacing:1px">UPI</span><br><small>SCAN TO PAY</small></div></div>';
        }
        html += '<div class="bank-text">';
        if (u.bank_name) html += '<p>Name : <strong>' + esc(u.bank_name) + '</strong></p>';
        if (u.account_no) html += '<p>Account No. : <strong>' + esc(u.account_no) + '</strong></p>';
        if (u.ifsc_code) html += '<p>IFSC code : <strong>' + esc(u.ifsc_code) + '</strong></p>';
        if (u.account_holder) html += '<p>Account holder\'s name : <strong>' + esc(u.account_holder) + '</strong></p>';
        html += '</div></div>';
      } else {
        html += '<p style="color:var(--text-muted);font-size:0.8125rem">Add bank details in Settings</p>';
      }
      html += '</td>';
      // Signatory cell
      html += '<td class="sig-cell">';
      html += '<p><strong>For ' + esc(u.business_name || u.name || 'BillWise') + ':</strong></p>';
      if (u.signature) {
        html += '<img src="' + u.signature + '" alt="Signature" class="sig-img">';
      } else {
        html += '<div class="sig-space"></div>';
      }
      html += '<p>Authorized Signatory</p>';
      html += '</td></tr></table></div>';

      html += '</div>'; // close invoice-print
      $content.innerHTML = html;

      // Event listeners
      document.getElementById('markPaidBtn').addEventListener('click', function () {
        api('PATCH', '/api/invoices/' + id, { status: 'paid', amount_paid: inv.total }).then(function (d) {
          showToast(d.message || 'Marked as paid', 'success');
          renderInvoiceDetail(id);
        });
      });
      document.getElementById('deleteInvBtn').addEventListener('click', function () {
        if (!confirm('Delete this invoice? This cannot be undone.')) return;
        api('DELETE', '/api/invoices/' + id).then(function (d) {
          showToast(d.message || 'Deleted', 'success');
          window.goTo('invoices');
        });
      });

      // Theme switch buttons
      document.querySelectorAll('.theme-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var theme = btn.getAttribute('data-theme');
          var printArea = document.getElementById('invoicePrintArea');
          if (!printArea) return;
          // Remove all theme classes
          printArea.className = printArea.className.replace(/theme-\w+/g, '').trim();
          printArea.classList.add('theme-' + theme);
          // Update active state
          document.querySelectorAll('.theme-btn').forEach(function (b) { b.classList.remove('active'); });
          btn.classList.add('active');
          // Save preference
          api('PUT', '/api/auth/profile', { invoice_theme: theme }).then(function (data) {
            if (data.user) currentUser = data.user;
          });
        });
      });
    });
  }

  // ── New Invoice Form (Vyapar-style) ────────────────────────
  function renderNewInvoice() {
    $pageTitle.textContent = 'New Invoice';
    var today = new Date().toISOString().slice(0, 10);
    var bizName = currentUser ? (currentUser.business_name || currentUser.name || 'BillWise') : 'BillWise';

    var html = '<form id="invoiceForm" novalidate>';

    // Sale header
    html += '<div class="sale-header">' +
      '<div class="sale-header-left"><h2 class="sale-title">Sale</h2>' +
      '<div class="sale-type"><label class="type-opt active" data-type="credit"><input type="radio" name="saleType" value="credit" checked> Credit</label>' +
      '<label class="type-opt" data-type="cash"><input type="radio" name="saleType" value="cash"> Cash</label></div></div>' +
      '<div class="sale-biz"><span class="user-avatar" style="width:30px;height:30px;font-size:0.75rem">' + bizName.charAt(0).toUpperCase() + '</span> ' + esc(bizName) + '</div></div>';

    // Top: Customer (left) + Invoice details (right)
    html += '<div class="sale-top"><div class="sale-customer">' +
      '<div class="form-group"><label>Customer *</label><div class="ac-wrap"><input id="cName" placeholder="Search or select customer" autocomplete="off"><div class="ac-dropdown" id="cNameAc"></div></div></div>' +
      '<div class="form-group"><label>Phone No.</label><input id="cPhone" placeholder="Phone number"></div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
        '<div class="form-group"><label>Email</label><input id="cEmail" type="email" placeholder="Email"></div>' +
        '<div class="form-group"><label>GSTIN</label><input id="cGstin" placeholder="GSTIN" maxlength="15" style="text-transform:uppercase"></div></div>' +
      '<div class="form-group"><label>Address</label><input id="cAddress" placeholder="Address"></div>' +
      '<div class="form-group"><label>State</label><select id="cState">' + stateOptions('') + '</select></div>' +
    '</div>';

    html += '<div class="sale-details">' +
      '<div class="detail-row"><span class="detail-label">Invoice Number</span><span class="detail-value">Auto</span></div>' +
      '<div class="detail-row"><span class="detail-label">Invoice Date</span><input id="invDate" type="date" value="' + today + '"></div>' +
      '<div class="detail-row"><span class="detail-label">Payment Terms</span><select id="payTerms">' +
        '<option value="receipt">Due on Receipt</option><option value="15">Net 15</option><option value="30">Net 30</option><option value="45">Net 45</option><option value="60">Net 60</option><option value="custom">Custom</option></select></div>' +
      '<div class="detail-row"><span class="detail-label">Due Date</span><input id="dueDate" type="date" value="' + today + '"></div>' +
      '<div class="detail-row"><span class="detail-label">State of supply</span><select id="posState">' + stateOptions(currentUser ? currentUser.state : '') + '</select></div>' +
    '</div></div>';

    // Items table
    html += '<div class="sale-items"><div class="table-wrap"><table class="items-table" style="min-width:1100px"><thead><tr>' +
      '<th style="width:15%">Item Name</th><th style="width:7%">HSN</th>' +
      '<th style="width:6%">Size</th><th style="width:7%">MRP</th>' +
      '<th style="width:5%">Qty</th><th style="width:7%">Unit</th>' +
      '<th style="width:8%">Price/Unit</th><th style="width:5%">Disc%</th><th style="width:7%">Disc\u20B9</th>' +
      '<th style="width:6%">GST%</th><th style="width:7%">GST\u20B9</th><th style="width:8%">Amount</th><th style="width:30px"></th>' +
    '</tr></thead><tbody id="itemsBody"></tbody></table></div>' +
    '<div class="sale-items-actions"><button type="button" class="btn btn-outline btn-sm" id="addItemBtn">+ Add Item</button></div></div>';

    // Bottom: Notes (left) + Totals (right)
    html += '<div class="sale-bottom"><div class="sale-notes">' +
      '<textarea id="invNotes" placeholder="Add description / notes..."></textarea></div>' +
      '<div class="sale-totals"><table class="summary-table">' +
        '<tr><td>Subtotal</td><td id="sumSubtotal">\u20B90.00</td></tr>' +
        '<tr><td>Discount</td><td id="sumDiscount">-\u20B90.00</td></tr>' +
        '<tr id="rowCgst"><td>CGST</td><td id="sumCgst">\u20B90.00</td></tr>' +
        '<tr id="rowSgst"><td>SGST</td><td id="sumSgst">\u20B90.00</td></tr>' +
        '<tr id="rowIgst"><td>IGST</td><td id="sumIgst">\u20B90.00</td></tr>' +
        '<tr><td><label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" id="roundOffChk" checked> Round Off</label></td><td id="sumRoundOff">\u20B90.00</td></tr>' +
        '<tr class="total-row"><td>Total</td><td id="sumTotal">\u20B90.00</td></tr>' +
      '</table></div></div>';

    // Actions
    html += '<div class="sale-actions">' +
      '<button type="button" class="btn btn-ghost btn-lg" id="resetFormBtn">Reset</button>' +
      '<button type="submit" class="btn btn-primary btn-lg" style="min-width:140px">Save</button></div></form>';

    $content.innerHTML = html;
    addItemRow();

    // Event listeners
    document.getElementById('addItemBtn').addEventListener('click', addItemRow);
    document.getElementById('resetFormBtn').addEventListener('click', function () {
      document.getElementById('invoiceForm').reset();
      document.getElementById('itemsBody').innerHTML = '';
      addItemRow(); recalculate();
    });
    document.getElementById('posState').addEventListener('change', recalculate);
    document.getElementById('roundOffChk').addEventListener('change', recalculate);
    document.getElementById('invoiceForm').addEventListener('submit', function (e) { e.preventDefault(); submitInvoice(); });

    // Sale type toggle
    document.querySelectorAll('.type-opt input').forEach(function (radio) {
      radio.addEventListener('change', function () {
        document.querySelectorAll('.type-opt').forEach(function (l) { l.classList.remove('active'); });
        radio.parentElement.classList.add('active');
      });
    });

    // Payment terms -> auto-set due date
    document.getElementById('payTerms').addEventListener('change', function () {
      var terms = this.value;
      var invDate = document.getElementById('invDate').value;
      if (!invDate || terms === 'custom') return;
      var d = new Date(invDate);
      if (terms !== 'receipt') d.setDate(d.getDate() + parseInt(terms));
      document.getElementById('dueDate').value = d.toISOString().slice(0, 10);
    });

    // Party autocomplete
    acSearch(document.getElementById('cName'), document.getElementById('cNameAc'), '/api/parties',
      function (p, q) {
        return '<div class="ac-main">' + acHL(p.name, q) + '</div>' +
          (p.gstin || p.phone ? '<div class="ac-sub">' +
            (p.gstin ? 'GSTIN: ' + p.gstin : '') +
            (p.gstin && p.phone ? ' \u2022 ' : '') +
            (p.phone ? 'Ph: ' + p.phone : '') + '</div>' : '');
      },
      function (p) {
        document.getElementById('cName').value = p.name;
        if (p.phone) document.getElementById('cPhone').value = p.phone;
        if (p.email) document.getElementById('cEmail').value = p.email;
        if (p.gstin) document.getElementById('cGstin').value = p.gstin;
        if (p.address) document.getElementById('cAddress').value = p.address;
        if (p.state) document.getElementById('cState').value = p.state;
      }
    );
  }

  var itemCounter = 0;
  function addItemRow() {
    var idx = itemCounter++;
    var gstOpts = GST_RATES.map(function (r) {
      return '<option value="' + r + '"' + (r === 18 ? ' selected' : '') + '>' + r + '%</option>';
    }).join('');
    var tr = document.createElement('tr');
    tr.id = 'item-' + idx;
    tr.innerHTML =
      '<td><div class="ac-wrap"><input data-f="name" placeholder="Item name" autocomplete="off"><div class="ac-dropdown"></div></div></td>' +
      '<td><input data-f="hsn" placeholder="HSN"></td>' +
      '<td><input data-f="size" placeholder="Size"></td>' +
      '<td><input data-f="mrp" type="number" min="0" step="0.01" placeholder="0"></td>' +
      '<td><input data-f="qty" type="number" min="1" value="1"></td>' +
      '<td><select data-f="unit">' + unitOptions('Pcs') + '</select></td>' +
      '<td><input data-f="rate" type="number" min="0" step="0.01" placeholder="0"></td>' +
      '<td><input data-f="disc_pct" type="number" min="0" max="100" step="0.01" placeholder="0"></td>' +
      '<td class="amt" data-f="disc_amt">\u20B90</td>' +
      '<td><select data-f="gst">' + gstOpts + '</select></td>' +
      '<td class="amt" data-f="gst_amount">\u20B90</td>' +
      '<td class="amt" data-f="amount">\u20B90</td>' +
      '<td><button type="button" class="remove-item" title="Remove">\u00D7</button></td>';
    document.getElementById('itemsBody').appendChild(tr);
    tr.querySelectorAll('input').forEach(function (el) { el.addEventListener('input', recalculate); });
    tr.querySelectorAll('select').forEach(function (el) { el.addEventListener('change', recalculate); });
    tr.querySelector('.remove-item').addEventListener('click', function () {
      if (document.getElementById('itemsBody').children.length > 1) { tr.remove(); recalculate(); }
    });

    // Item autocomplete
    var nameInput = tr.querySelector('[data-f="name"]');
    var nameDD = nameInput.parentNode.querySelector('.ac-dropdown');
    acSearch(nameInput, nameDD, '/api/products',
      function (p, q) {
        return '<div class="ac-main">' + acHL(p.name, q) + '</div><div class="ac-sub">' +
          (p.hsn ? 'HSN: ' + p.hsn + ' \u2022 ' : '') + '\u20B9' + (p.rate || 0) + ' \u2022 GST: ' + (p.gst || 0) + '%</div>';
      },
      function (p) {
        nameInput.value = p.name;
        var row = nameInput.closest('tr');
        if (p.hsn) row.querySelector('[data-f="hsn"]').value = p.hsn;
        if (p.size) row.querySelector('[data-f="size"]').value = p.size;
        if (p.mrp) row.querySelector('[data-f="mrp"]').value = p.mrp;
        if (p.rate) row.querySelector('[data-f="rate"]').value = p.rate;
        if (p.gst !== undefined) row.querySelector('[data-f="gst"]').value = p.gst;
        if (p.unit) row.querySelector('[data-f="unit"]').value = p.unit;
        recalculate();
      }
    );
    recalculate();
  }

  function recalculate() {
    var rows = document.querySelectorAll('#itemsBody tr');
    var subtotal = 0, totalDiscount = 0, totalCgst = 0, totalSgst = 0, totalIgst = 0;
    var pos = document.getElementById('posState').value;
    var businessState = currentUser ? currentUser.state : '';
    var isIntra = pos && businessState && pos === businessState;

    rows.forEach(function (tr) {
      var qty = parseFloat(tr.querySelector('[data-f="qty"]').value) || 0;
      var rate = parseFloat(tr.querySelector('[data-f="rate"]').value) || 0;
      var gst = parseFloat(tr.querySelector('[data-f="gst"]').value) || 0;
      var discPct = parseFloat(tr.querySelector('[data-f="disc_pct"]').value) || 0;
      var lineTotal = qty * rate;
      var discAmt = lineTotal * discPct / 100;
      var afterDisc = lineTotal - discAmt;
      var gstAmt = afterDisc * gst / 100;
      var amount = afterDisc + gstAmt;
      subtotal += lineTotal;
      totalDiscount += discAmt;
      if (isIntra || !pos) { totalCgst += afterDisc * gst / 200; totalSgst += afterDisc * gst / 200; }
      else { totalIgst += afterDisc * gst / 100; }
      tr.querySelector('[data-f="disc_amt"]').textContent = formatINR(discAmt);
      tr.querySelector('[data-f="gst_amount"]').textContent = formatINR(gstAmt);
      tr.querySelector('[data-f="amount"]').textContent = formatINR(amount);
    });

    var taxableAfterDisc = subtotal - totalDiscount;
    var totalBeforeRound = taxableAfterDisc + totalCgst + totalSgst + totalIgst;
    var roundOffChk = document.getElementById('roundOffChk');
    var roundedTotal, roundOff;
    if (roundOffChk && roundOffChk.checked) {
      roundedTotal = Math.round(totalBeforeRound);
      roundOff = roundedTotal - totalBeforeRound;
    } else {
      roundedTotal = Math.round(totalBeforeRound * 100) / 100;
      roundOff = 0;
    }

    document.getElementById('sumSubtotal').textContent = formatINR(subtotal);
    document.getElementById('sumDiscount').textContent = '-' + formatINR(totalDiscount);
    document.getElementById('sumCgst').textContent = formatINR(totalCgst);
    document.getElementById('sumSgst').textContent = formatINR(totalSgst);
    document.getElementById('sumIgst').textContent = formatINR(totalIgst);
    document.getElementById('sumRoundOff').textContent = (roundOff >= 0 ? '+' : '') + formatINR(roundOff);
    document.getElementById('sumTotal').textContent = formatINR(roundedTotal);
    document.getElementById('rowCgst').style.display = totalIgst > 0 ? 'none' : '';
    document.getElementById('rowSgst').style.display = totalIgst > 0 ? 'none' : '';
    document.getElementById('rowIgst').style.display = totalIgst > 0 ? '' : 'none';
  }

  function submitInvoice() {
    var rows = document.querySelectorAll('#itemsBody tr');
    var pos = document.getElementById('posState').value;
    var businessState = currentUser ? currentUser.state : '';
    var isIntra = pos && businessState && pos === businessState;
    var saleType = (document.querySelector('input[name="saleType"]:checked') || {}).value || 'credit';
    var items = [];
    var subtotal = 0, totalDiscount = 0, totalCgst = 0, totalSgst = 0, totalIgst = 0, totalMrp = 0;

    rows.forEach(function (tr) {
      var name = tr.querySelector('[data-f="name"]').value.trim();
      var hsn = tr.querySelector('[data-f="hsn"]').value.trim();
      var size = tr.querySelector('[data-f="size"]').value.trim();
      var mrp = parseFloat(tr.querySelector('[data-f="mrp"]').value) || 0;
      var qty = parseFloat(tr.querySelector('[data-f="qty"]').value) || 0;
      var unit = tr.querySelector('[data-f="unit"]').value;
      var rate = parseFloat(tr.querySelector('[data-f="rate"]').value) || 0;
      var gst = parseFloat(tr.querySelector('[data-f="gst"]').value) || 0;
      var discPct = parseFloat(tr.querySelector('[data-f="disc_pct"]').value) || 0;
      var lineTotal = qty * rate;
      var discAmt = lineTotal * discPct / 100;
      var afterDisc = lineTotal - discAmt;
      if (!name) return;
      items.push({ name: name, hsn: hsn, size: size, mrp: mrp, qty: qty, unit: unit, rate: rate, gst: gst, disc_pct: discPct, disc_amt: Math.round(discAmt * 100) / 100 });
      subtotal += lineTotal;
      totalDiscount += discAmt;
      totalMrp += mrp * qty;
      if (isIntra || !pos) { totalCgst += afterDisc * gst / 200; totalSgst += afterDisc * gst / 200; }
      else { totalIgst += afterDisc * gst / 100; }
    });

    var customerName = document.getElementById('cName').value.trim();
    var invoiceDate = document.getElementById('invDate').value;
    if (!customerName) { showToast('Please enter customer name', 'error'); document.getElementById('cName').focus(); return; }
    if (!invoiceDate) { showToast('Please select invoice date', 'error'); return; }
    if (!items.length) { showToast('Add at least one item with a name', 'error'); return; }

    var taxableAfterDisc = subtotal - totalDiscount;
    var totalBeforeRound = taxableAfterDisc + totalCgst + totalSgst + totalIgst;
    var roundOffChk = document.getElementById('roundOffChk');
    var roundedTotal, roundOff;
    if (roundOffChk && roundOffChk.checked) {
      roundedTotal = Math.round(totalBeforeRound);
      roundOff = Math.round((roundedTotal - totalBeforeRound) * 100) / 100;
    } else {
      roundedTotal = Math.round(totalBeforeRound * 100) / 100;
      roundOff = 0;
    }

    var body = {
      invoice_date: invoiceDate,
      due_date: document.getElementById('dueDate').value,
      customer_name: customerName,
      customer_phone: document.getElementById('cPhone').value.trim(),
      customer_email: document.getElementById('cEmail').value.trim(),
      customer_address: document.getElementById('cAddress').value.trim(),
      customer_gstin: document.getElementById('cGstin').value.trim().toUpperCase(),
      customer_state: document.getElementById('cState').value,
      place_of_supply: pos,
      payment_terms: document.getElementById('payTerms').value,
      items: items,
      subtotal: Math.round(subtotal * 100) / 100,
      discount: Math.round(totalDiscount * 100) / 100,
      cgst: Math.round(totalCgst * 100) / 100,
      sgst: Math.round(totalSgst * 100) / 100,
      igst: Math.round(totalIgst * 100) / 100,
      round_off: roundOff,
      total: roundedTotal,
      total_mrp: Math.round(totalMrp * 100) / 100,
      notes: document.getElementById('invNotes').value.trim(),
      status: saleType === 'cash' ? 'paid' : 'unpaid'
    };

    var submitBtn = document.querySelector('#invoiceForm button[type="submit"]');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Saving...'; }
    api('POST', '/api/invoices', body).then(function (data) {
      if (data.error) {
        showToast(data.error, 'error');
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Save'; }
        return;
      }
      showToast('Invoice ' + data.invoice.invoice_number + ' created!', 'success');
      window.goTo('invoice', data.invoice.id || data.invoice._id);
    }).catch(function () {
      showToast('Failed to create invoice', 'error');
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Save'; }
    });
  }

  // ── Reports ────────────────────────────────────────────────
  function renderReports() {
    $pageTitle.textContent = 'Reports';
    var today = new Date().toISOString().slice(0, 10);
    var firstOfMonth = today.slice(0, 8) + '01';

    var html = '<div class="form-card"><h3>Generate Report</h3><div class="form-grid">' +
      fg('From Date', '<input id="rptFrom" type="date" value="' + firstOfMonth + '">') +
      fg('To Date', '<input id="rptTo" type="date" value="' + today + '">') +
    '</div>' +
    '<div class="form-actions" style="margin-top:16px">' +
      '<button type="button" class="btn btn-primary" id="generateRptBtn">Generate Report</button>' +
      '<button type="button" class="btn btn-outline" id="dlSalesCSV">\u2913 Sales CSV</button>' +
      '<button type="button" class="btn btn-outline" id="dlGstCSV">\u2913 GST CSV</button>' +
    '</div></div><div id="reportContent"><div class="empty-state">Click "Generate Report" to view reports.</div></div>';

    $content.innerHTML = html;
    var reportData = null;

    document.getElementById('generateRptBtn').addEventListener('click', function () {
      var from = document.getElementById('rptFrom').value;
      var to = document.getElementById('rptTo').value;
      document.getElementById('reportContent').innerHTML = '<p style="color:var(--text-muted)">Loading report...</p>';
      api('GET', '/api/reports?from=' + encodeURIComponent(from) + '&to=' + encodeURIComponent(to)).then(function (data) {
        reportData = data;
        renderReportContent(data);
      }).catch(function () {
        document.getElementById('reportContent').innerHTML = '<div class="empty-state">Failed to load report.</div>';
      });
    });

    document.getElementById('dlSalesCSV').addEventListener('click', function () {
      if (!reportData || !reportData.invoices) { showToast('Generate report first', 'error'); return; }
      var csvRows = [['Invoice #', 'Date', 'Customer', 'Customer GSTIN', 'Taxable Amount', 'CGST', 'SGST', 'IGST', 'Total', 'Status']];
      reportData.invoices.forEach(function (inv) {
        csvRows.push([inv.invoice_number, inv.invoice_date, inv.customer_name, inv.customer_gstin || '',
          (inv.subtotal || 0).toFixed(2), (inv.cgst || 0).toFixed(2), (inv.sgst || 0).toFixed(2),
          (inv.igst || 0).toFixed(2), (inv.total || 0).toFixed(2), inv.status]);
      });
      downloadCSV(csvRows, 'sales_report_' + document.getElementById('rptFrom').value + '_to_' + document.getElementById('rptTo').value + '.csv');
      showToast('Sales CSV downloaded!', 'success');
    });

    document.getElementById('dlGstCSV').addEventListener('click', function () {
      if (!reportData || !reportData.hsn_summary) { showToast('Generate report first', 'error'); return; }
      var csvRows = [['HSN/SAC', 'GST Rate(%)', 'Taxable Amount', 'CGST Rate(%)', 'CGST Amount', 'SGST Rate(%)', 'SGST Amount', 'IGST Rate(%)', 'IGST Amount', 'Total Tax']];
      reportData.hsn_summary.forEach(function (h) {
        csvRows.push([h.hsn || '-', h.gst_rate, h.taxable.toFixed(2),
          h.cgst_rate || '', h.cgst.toFixed(2), h.sgst_rate || '', h.sgst.toFixed(2),
          h.igst_rate || '', h.igst.toFixed(2), h.total_tax.toFixed(2)]);
      });
      downloadCSV(csvRows, 'gst_report_' + document.getElementById('rptFrom').value + '_to_' + document.getElementById('rptTo').value + '.csv');
      showToast('GST CSV downloaded!', 'success');
    });

    // Auto-generate on load
    document.getElementById('generateRptBtn').click();
  }

  function renderReportContent(data) {
    var s = data.summary || {};
    var invList = data.invoices || [];
    var hsnData = data.hsn_summary || [];

    var html = '<div class="stats-grid">' +
      statCard('Invoices', s.total_invoices || 0, '') +
      statCard('Total Sales', formatINR(s.total_amount || 0), 'primary') +
      statCard('Total Tax', formatINR(s.total_tax || 0), 'warning') +
      statCard('Received', formatINR(s.paid_amount || 0), 'success') +
      statCard('Pending', formatINR(s.unpaid_amount || 0), 'warning') +
    '</div>';

    // Sales table
    html += '<div class="table-card" style="margin-bottom:20px"><div class="table-header"><h3>Sales Report (' + invList.length + ' invoices)</h3></div>';
    if (invList.length) {
      var rows = invList.map(function (inv) {
        var invId = inv.id || inv._id;
        return '<tr style="cursor:pointer" onclick="window.goTo(\'invoice\',\'' + invId + '\')">' +
          '<td>' + inv.invoice_number + '</td><td>' + formatDate(inv.invoice_date) + '</td>' +
          '<td>' + inv.customer_name + '</td>' +
          '<td class="text-right">' + formatINR(inv.subtotal || 0) + '</td>' +
          '<td class="text-right">' + formatINR((inv.cgst || 0) + (inv.sgst || 0) + (inv.igst || 0)) + '</td>' +
          '<td class="text-right">' + formatINR(inv.total || 0) + '</td>' +
          '<td>' + statusBadge(inv.status) + '</td></tr>';
      }).join('');
      html += '<div class="table-wrap"><table><thead><tr>' +
        '<th>Invoice #</th><th>Date</th><th>Customer</th>' +
        '<th class="text-right">Taxable</th><th class="text-right">Tax</th><th class="text-right">Total</th><th>Status</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table></div>';
    } else {
      html += '<div class="empty-state">No invoices found for this period.</div>';
    }
    html += '</div>';

    // GST Summary table
    if (hsnData.length) {
      var totTaxable = 0, totCgst = 0, totSgst = 0, totTax = 0;
      var hsnRows = hsnData.map(function (h) {
        totTaxable += h.taxable; totCgst += h.cgst; totSgst += h.sgst; totTax += h.total_tax;
        return '<tr><td>' + (h.hsn || '-') + '</td><td class="text-right">' + formatINR(h.taxable) + '</td>' +
          '<td class="text-right">' + (h.cgst_rate ? h.cgst_rate + '%' : '-') + '</td><td class="text-right">' + formatINR(h.cgst) + '</td>' +
          '<td class="text-right">' + (h.sgst_rate ? h.sgst_rate + '%' : '-') + '</td><td class="text-right">' + formatINR(h.sgst) + '</td>' +
          '<td class="text-right">' + formatINR(h.total_tax) + '</td></tr>';
      }).join('');
      html += '<div class="table-card"><div class="table-header"><h3>GST Summary (HSN-wise)</h3></div>' +
        '<div class="table-wrap"><table><thead><tr>' +
        '<th>HSN/SAC</th><th class="text-right">Taxable Amt</th>' +
        '<th class="text-right">CGST Rate</th><th class="text-right">CGST Amt</th>' +
        '<th class="text-right">SGST Rate</th><th class="text-right">SGST Amt</th>' +
        '<th class="text-right">Total Tax</th></tr></thead><tbody>' + hsnRows +
        '<tr style="font-weight:700;border-top:2px solid var(--text)"><td>TOTAL</td>' +
        '<td class="text-right">' + formatINR(totTaxable) + '</td><td></td><td class="text-right">' + formatINR(totCgst) + '</td>' +
        '<td></td><td class="text-right">' + formatINR(totSgst) + '</td><td class="text-right">' + formatINR(totTax) + '</td></tr>' +
        '</tbody></table></div></div>';
    }

    document.getElementById('reportContent').innerHTML = html;
  }

  // ── Settings ───────────────────────────────────────────────
  function renderSettings() {
    $pageTitle.textContent = 'Business Settings';
    var u = currentUser || {};

    var html = '<form id="settingsForm">' +
      '<div class="form-card"><h3>Business Profile</h3>' +
      '<p style="color:var(--text-muted);font-size:0.875rem;margin:0 0 16px">This information appears on your invoices.</p>' +
      '<div class="form-grid">' +
        fg('Your Name *', '<input id="sName" value="' + esc(u.name) + '">') +
        fg('Business Name', '<input id="sBiz" value="' + esc(u.business_name) + '" placeholder="e.g. Sharma Electronics">') +
        fg('GSTIN', '<input id="sGstin" value="' + esc(u.gstin) + '" placeholder="22AAAAA0000A1Z5" maxlength="15" style="text-transform:uppercase">') +
        fg('Email', '<input value="' + esc(u.email) + '" disabled>') +
        fg('Phone', '<input value="' + esc(u.phone) + '" disabled>') +
        fg('Address', '<input id="sAddr" value="' + esc(u.address) + '" placeholder="Shop No., Street">') +
        fg('City', '<input id="sCity" value="' + esc(u.city) + '">') +
        fg('State', '<select id="sState">' + stateOptions(u.state) + '</select>') +
        fg('Pincode', '<input id="sPin" value="' + esc(u.pincode) + '" maxlength="6" placeholder="400001">') +
      '</div></div>' +

      '<div class="form-card"><h3>Bank & Payment Details</h3>' +
      '<p style="color:var(--text-muted);font-size:0.875rem;margin:0 0 16px">Bank details shown on your invoices for customer payments.</p>' +
      '<div class="form-grid">' +
        fg('Bank Name', '<input id="sBankName" value="' + esc(u.bank_name) + '" placeholder="e.g. State Bank of India, Main Branch">') +
        fg('Account Number', '<input id="sAccNo" value="' + esc(u.account_no) + '" placeholder="e.g. 123456789012">') +
        fg('IFSC Code', '<input id="sIfsc" value="' + esc(u.ifsc_code) + '" placeholder="e.g. SBIN0001234" style="text-transform:uppercase">') +
        fg('Account Holder Name', '<input id="sAccHolder" value="' + esc(u.account_holder) + '" placeholder="Name as per bank records">') +
        fg('UPI ID (optional)', '<input id="sUpiId" value="' + esc(u.upi_id) + '" placeholder="e.g. yourname@upi or 9876543210@paytm">') +
        '<div class="form-group"><label>Upload UPI QR Code</label>' +
          '<input type="file" id="qrUpload" accept="image/*" style="font-size:0.875rem;margin-top:4px">' +
          '<input type="hidden" id="qrData" value="">' +
        '</div>' +
      '</div>' +
      (u.upi_qr ? '<div id="qrPreview" style="margin-top:12px"><p style="font-size:0.75rem;color:var(--text-muted);margin:0 0 4px">Current QR Code:</p><img src="' + u.upi_qr + '" style="max-height:120px;border:1px solid var(--border);border-radius:8px;padding:4px"></div>' : '<div id="qrPreview" style="margin-top:12px"></div>') +
      '</div>' +

      '<div class="form-card"><h3>Invoice Theme</h3>' +
      '<p style="color:var(--text-muted);font-size:0.875rem;margin:0 0 16px">Choose the default look and feel for your tax invoices.</p>' +
      '<div class="theme-preview-grid">' +
        themePreviewCard('classic', 'Classic', '#0d9488', 'Teal header, clean tables, professional look', u.invoice_theme) +
        themePreviewCard('modern', 'Modern', '#6366f1', 'Gradient header, rounded corners, soft shadows', u.invoice_theme) +
        themePreviewCard('elegant', 'Elegant', '#1e3a5f', 'Navy & gold accents, serif fonts, decorative', u.invoice_theme) +
        themePreviewCard('minimal', 'Minimal', '#64748b', 'No colored headers, thin lines, clean and light', u.invoice_theme) +
        themePreviewCard('bold', 'Bold', '#dc2626', 'Red accents, dark header, high contrast', u.invoice_theme) +
      '</div></div>' +

      '<div class="form-card"><h3>GSTIN Lookup API Key</h3>' +
      '<p style="color:var(--text-muted);font-size:0.875rem;margin:0 0 8px">To auto-fill party address from GSTIN, get a <strong>free API key</strong> (20 free lookups) from <a href="https://gstincheck.co.in" target="_blank" style="color:var(--primary);font-weight:600">gstincheck.co.in</a>. Enter your email there, receive the key, paste it below.</p>' +
      '<div class="form-grid">' +
        fg('API Key', '<input id="sGstApiKey" value="' + esc(u.gstin_api_key || '') + '" placeholder="Paste your free API key here">') +
      '</div></div>' +

      '<div class="form-card"><h3>Terms & Conditions</h3>' +
      '<p style="color:var(--text-muted);font-size:0.875rem;margin:0 0 16px">Default terms shown at the bottom of your invoices.</p>' +
      '<div class="form-group full"><textarea id="sTerms" rows="4" placeholder="e.g. Thanks for doing business with us! Payment due within 30 days.">' + esc(u.terms_conditions) + '</textarea></div></div>' +

      '<div class="form-card"><h3>Signature</h3>' +
      '<p style="color:var(--text-muted);font-size:0.875rem;margin:0 0 16px">Draw your signature or upload an image to display on invoices.</p>' +
      '<div class="sig-mode-tabs">' +
        '<button type="button" class="sig-mode-tab active" data-mode="draw">Draw Signature</button>' +
        '<button type="button" class="sig-mode-tab" data-mode="upload">Upload Image</button>' +
      '</div>' +
      '<div id="sigDrawPanel">' +
        '<canvas id="sigCanvas" width="500" height="180" style="border:2px solid var(--border);border-radius:8px;cursor:crosshair;background:#fff;display:block;width:100%;max-width:500px;touch-action:none"></canvas>' +
        '<div style="margin-top:8px;display:flex;gap:8px">' +
          '<button type="button" class="btn btn-sm btn-outline" id="clearSigBtn">Clear</button>' +
          '<button type="button" class="btn btn-sm btn-ghost" id="undoSigBtn">Undo</button>' +
        '</div>' +
      '</div>' +
      '<div id="sigUploadPanel" style="display:none">' +
        '<input type="file" id="sigUpload" accept="image/*" style="font-size:0.875rem">' +
      '</div>' +
      '<input type="hidden" id="sigData" value="">' +
      (u.signature ? '<div id="sigPreview" style="margin-top:12px;padding:8px;border:1px dashed var(--border);border-radius:8px;display:inline-block"><p style="font-size:0.75rem;color:var(--text-muted);margin:0 0 4px">Current Signature:</p><img src="' + u.signature + '" style="max-height:60px;display:block"></div>' : '<div id="sigPreview" style="margin-top:12px"></div>') +
      '</div>' +
      '<div class="form-actions"><button type="submit" class="btn btn-primary">Save Settings</button></div></form>';

    $content.innerHTML = html;

    // ── Theme Preview Selection ──
    document.querySelectorAll('input[name="invoiceTheme"]').forEach(function (radio) {
      radio.addEventListener('change', function () {
        document.querySelectorAll('.theme-preview-item').forEach(function (item) { item.classList.remove('selected'); });
        radio.closest('.theme-preview-item').classList.add('selected');
      });
    });

    // ── Signature Pad (Canvas Drawing) ──
    var sigCanvas = document.getElementById('sigCanvas');
    var sigCtx = sigCanvas.getContext('2d');
    var sigDrawing = false;
    var sigPaths = [];
    var currentPath = [];
    sigCtx.lineWidth = 2.5;
    sigCtx.lineCap = 'round';
    sigCtx.lineJoin = 'round';
    sigCtx.strokeStyle = '#1e293b';

    function getSigPos(e) {
      var rect = sigCanvas.getBoundingClientRect();
      var scaleX = sigCanvas.width / rect.width;
      var scaleY = sigCanvas.height / rect.height;
      if (e.touches) {
        return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY };
      }
      return { x: e.offsetX * scaleX, y: e.offsetY * scaleY };
    }
    function sigStart(e) {
      e.preventDefault();
      sigDrawing = true;
      currentPath = [];
      var pos = getSigPos(e);
      sigCtx.beginPath();
      sigCtx.moveTo(pos.x, pos.y);
      currentPath.push(pos);
    }
    function sigMove(e) {
      if (!sigDrawing) return;
      e.preventDefault();
      var pos = getSigPos(e);
      sigCtx.lineTo(pos.x, pos.y);
      sigCtx.stroke();
      currentPath.push(pos);
    }
    function sigEnd() {
      if (!sigDrawing) return;
      sigDrawing = false;
      if (currentPath.length > 1) {
        sigPaths.push(currentPath);
        document.getElementById('sigData').value = sigCanvas.toDataURL('image/png');
      }
    }
    sigCanvas.addEventListener('mousedown', sigStart);
    sigCanvas.addEventListener('mousemove', sigMove);
    sigCanvas.addEventListener('mouseup', sigEnd);
    sigCanvas.addEventListener('mouseleave', sigEnd);
    sigCanvas.addEventListener('touchstart', sigStart, { passive: false });
    sigCanvas.addEventListener('touchmove', sigMove, { passive: false });
    sigCanvas.addEventListener('touchend', sigEnd);

    document.getElementById('clearSigBtn').addEventListener('click', function () {
      sigCtx.clearRect(0, 0, sigCanvas.width, sigCanvas.height);
      sigPaths = [];
      document.getElementById('sigData').value = '';
    });
    document.getElementById('undoSigBtn').addEventListener('click', function () {
      if (!sigPaths.length) return;
      sigPaths.pop();
      sigCtx.clearRect(0, 0, sigCanvas.width, sigCanvas.height);
      sigPaths.forEach(function (path) {
        sigCtx.beginPath();
        sigCtx.moveTo(path[0].x, path[0].y);
        for (var i = 1; i < path.length; i++) { sigCtx.lineTo(path[i].x, path[i].y); }
        sigCtx.stroke();
      });
      document.getElementById('sigData').value = sigPaths.length ? sigCanvas.toDataURL('image/png') : '';
    });

    // Signature mode tabs (Draw / Upload)
    document.querySelectorAll('.sig-mode-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        document.querySelectorAll('.sig-mode-tab').forEach(function (t) { t.classList.remove('active'); });
        tab.classList.add('active');
        var mode = tab.getAttribute('data-mode');
        document.getElementById('sigDrawPanel').style.display = mode === 'draw' ? '' : 'none';
        document.getElementById('sigUploadPanel').style.display = mode === 'upload' ? '' : 'none';
      });
    });

    // Signature file upload
    document.getElementById('sigUpload').addEventListener('change', function (e) {
      var file = e.target.files[0];
      if (!file) return;
      if (file.size > 500000) { showToast('Image must be under 500KB', 'error'); e.target.value = ''; return; }
      var reader = new FileReader();
      reader.onload = function (ev) {
        document.getElementById('sigData').value = ev.target.result;
        document.getElementById('sigPreview').innerHTML = '<div style="padding:8px;border:1px dashed var(--border);border-radius:8px;display:inline-block"><p style="font-size:0.75rem;color:var(--text-muted);margin:0 0 4px">Current Signature:</p><img src="' + ev.target.result + '" style="max-height:60px;display:block"></div>';
      };
      reader.readAsDataURL(file);
    });

    // UPI QR code upload
    document.getElementById('qrUpload').addEventListener('change', function (e) {
      var file = e.target.files[0];
      if (!file) return;
      if (file.size > 500000) { showToast('Image must be under 500KB', 'error'); e.target.value = ''; return; }
      var reader = new FileReader();
      reader.onload = function (ev) {
        document.getElementById('qrData').value = ev.target.result;
        document.getElementById('qrPreview').innerHTML = '<p style="font-size:0.75rem;color:var(--text-muted);margin:0 0 4px">Current QR Code:</p><img src="' + ev.target.result + '" style="max-height:120px;border:1px solid var(--border);border-radius:8px;padding:4px">';
      };
      reader.readAsDataURL(file);
    });

    // Form submit
    document.getElementById('settingsForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var body = {
        name: document.getElementById('sName').value.trim(),
        business_name: document.getElementById('sBiz').value.trim(),
        gstin: document.getElementById('sGstin').value.trim().toUpperCase(),
        address: document.getElementById('sAddr').value.trim(),
        city: document.getElementById('sCity').value.trim(),
        state: document.getElementById('sState').value,
        pincode: document.getElementById('sPin').value.trim(),
        bank_name: document.getElementById('sBankName').value.trim(),
        account_no: document.getElementById('sAccNo').value.trim(),
        ifsc_code: document.getElementById('sIfsc').value.trim().toUpperCase(),
        account_holder: document.getElementById('sAccHolder').value.trim(),
        terms_conditions: document.getElementById('sTerms').value.trim(),
        upi_id: document.getElementById('sUpiId').value.trim(),
        upi_qr: document.getElementById('qrData').value || (currentUser ? currentUser.upi_qr : '') || '',
        signature: document.getElementById('sigData').value || (currentUser ? currentUser.signature : '') || '',
        invoice_theme: (document.querySelector('input[name="invoiceTheme"]:checked') || {}).value || 'classic',
        gstin_api_key: document.getElementById('sGstApiKey').value.trim()
      };
      api('PUT', '/api/auth/profile', body).then(function (data) {
        if (data.error) { showToast(data.error, 'error'); return; }
        currentUser = data.user;
        $topAvatar.textContent = (currentUser.name || 'U').charAt(0).toUpperCase();
        $topName.textContent = currentUser.business_name || currentUser.name;
        showToast('Settings saved!', 'success');
      });
    });
  }

  // ── Admin Panel ─────────────────────────────────────────────
  function renderAdmin() {
    $pageTitle.textContent = 'Admin Panel';
    if (!currentUser || currentUser.role !== 'superadmin') {
      $content.innerHTML = '<div class="empty-state">Access denied. Admin privileges required.</div>';
      return;
    }
    $content.innerHTML = '<p style="color:var(--text-muted)">Loading users...</p>';
    loadAdminUsers('');
  }

  function loadAdminUsers(query) {
    var url = '/api/admin/users' + (query ? '?q=' + encodeURIComponent(query) : '');
    api('GET', url).then(function (data) {
      if (data.error) { showToast(data.error, 'error'); return; }
      var userList = data.users || [];

      var html = '<div class="admin-panel">' +
        '<div class="page-actions">' +
          '<div class="page-search">' +
            '<svg width="16" height="16" fill="none" stroke="var(--text-muted)" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>' +
            '<input type="text" id="adminSearch" placeholder="Search by name, email or phone..." autocomplete="off" value="' + esc(query) + '">' +
          '</div>' +
          '<span style="color:var(--text-muted);font-size:0.875rem">' + userList.length + ' users</span>' +
        '</div>';

      html += '<div class="table-card"><div class="table-header"><h3>All Users (' + userList.length + ')</h3></div>';
      if (userList.length) {
        html += '<div class="table-wrap"><table><thead><tr>' +
          '<th>Name</th><th>Email</th><th>Phone</th><th>Business</th><th>Role</th><th>Registered</th><th>Actions</th>' +
          '</tr></thead><tbody>';
        userList.forEach(function (u) {
          var roleBadge = u.role === 'superadmin'
            ? '<span class="badge badge-admin">superadmin</span>'
            : '<span class="badge badge-user">user</span>';
          html += '<tr>' +
            '<td><strong>' + esc(u.name || '') + '</strong></td>' +
            '<td>' + esc(u.email || '-') + '</td>' +
            '<td>' + esc(u.phone || '-') + '</td>' +
            '<td>' + esc(u.business_name || '-') + '</td>' +
            '<td>' + roleBadge + '</td>' +
            '<td>' + formatDate(u.created_at) + '</td>' +
            '<td class="admin-actions">' +
              '<button type="button" class="btn btn-outline btn-sm admin-edit-btn" data-id="' + u.id + '" data-name="' + esc(u.name || '') + '" data-email="' + esc(u.email || '') + '" data-phone="' + esc(u.phone || '') + '" data-role="' + esc(u.role || 'user') + '" data-biz="' + esc(u.business_name || '') + '">Edit</button>' +
              '<button type="button" class="btn btn-danger btn-sm admin-del-btn" data-id="' + u.id + '" data-name="' + esc(u.name || '') + '">Delete</button>' +
            '</td></tr>';
        });
        html += '</tbody></table></div>';
      } else {
        html += '<div class="empty-state">No users found.</div>';
      }
      html += '</div></div>';

      // Edit modal placeholder
      html += '<div class="admin-modal-overlay" id="adminModal" style="display:none">' +
        '<div class="admin-modal">' +
          '<div class="admin-modal-header"><h3>Edit User</h3><button type="button" class="ap-close" id="adminModalClose">&times;</button></div>' +
          '<div class="admin-modal-body">' +
            '<div class="form-grid">' +
              '<div class="form-group"><label>Name</label><input id="aeditName"></div>' +
              '<div class="form-group"><label>Email</label><input id="aeditEmail" type="email"></div>' +
              '<div class="form-group"><label>Phone</label><input id="aeditPhone"></div>' +
              '<div class="form-group"><label>Business Name</label><input id="aeditBiz"></div>' +
              '<div class="form-group"><label>Role</label><select id="aeditRole"><option value="user">user</option><option value="superadmin">superadmin</option></select></div>' +
            '</div>' +
          '</div>' +
          '<div class="admin-modal-footer">' +
            '<button type="button" class="btn btn-ghost" id="adminModalCancel">Cancel</button>' +
            '<button type="button" class="btn btn-primary" id="adminModalSave">Save Changes</button>' +
          '</div>' +
        '</div></div>';

      $content.innerHTML = html;

      // Search
      var searchTimer = null;
      document.getElementById('adminSearch').addEventListener('input', function () {
        var q = this.value.trim();
        clearTimeout(searchTimer);
        searchTimer = setTimeout(function () { loadAdminUsers(q); }, 300);
      });

      // Delete buttons
      $content.querySelectorAll('.admin-del-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var userId = btn.getAttribute('data-id');
          var userName = btn.getAttribute('data-name');
          if (!confirm('Delete user "' + userName + '" and ALL their data (invoices, parties, products)? This cannot be undone.')) return;
          btn.disabled = true; btn.textContent = 'Deleting...';
          api('DELETE', '/api/admin/users/' + userId).then(function (d) {
            if (d.error) { showToast(d.error, 'error'); btn.disabled = false; btn.textContent = 'Delete'; return; }
            showToast(d.message || 'User deleted', 'success');
            loadAdminUsers(document.getElementById('adminSearch') ? document.getElementById('adminSearch').value.trim() : '');
          }).catch(function () { showToast('Failed to delete user', 'error'); btn.disabled = false; btn.textContent = 'Delete'; });
        });
      });

      // Edit buttons
      var editUserId = null;
      $content.querySelectorAll('.admin-edit-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          editUserId = btn.getAttribute('data-id');
          document.getElementById('aeditName').value = btn.getAttribute('data-name');
          document.getElementById('aeditEmail').value = btn.getAttribute('data-email');
          document.getElementById('aeditPhone').value = btn.getAttribute('data-phone');
          document.getElementById('aeditBiz').value = btn.getAttribute('data-biz');
          document.getElementById('aeditRole').value = btn.getAttribute('data-role');
          document.getElementById('adminModal').style.display = '';
        });
      });

      // Modal close
      var closeModal = function () { document.getElementById('adminModal').style.display = 'none'; editUserId = null; };
      document.getElementById('adminModalClose').addEventListener('click', closeModal);
      document.getElementById('adminModalCancel').addEventListener('click', closeModal);
      document.getElementById('adminModal').addEventListener('click', function (e) {
        if (e.target === this) closeModal();
      });

      // Modal save
      document.getElementById('adminModalSave').addEventListener('click', function () {
        if (!editUserId) return;
        var saveBtn = this;
        saveBtn.disabled = true; saveBtn.textContent = 'Saving...';
        api('PUT', '/api/admin/users/' + editUserId, {
          name: document.getElementById('aeditName').value.trim(),
          email: document.getElementById('aeditEmail').value.trim(),
          phone: document.getElementById('aeditPhone').value.trim(),
          business_name: document.getElementById('aeditBiz').value.trim(),
          role: document.getElementById('aeditRole').value
        }).then(function (d) {
          if (d.error) { showToast(d.error, 'error'); saveBtn.disabled = false; saveBtn.textContent = 'Save Changes'; return; }
          showToast(d.message || 'User updated', 'success');
          closeModal();
          loadAdminUsers(document.getElementById('adminSearch') ? document.getElementById('adminSearch').value.trim() : '');
        }).catch(function () { showToast('Failed to update user', 'error'); saveBtn.disabled = false; saveBtn.textContent = 'Save Changes'; });
      });
    }).catch(function (err) {
      console.error(err);
      $content.innerHTML = '<div class="empty-state">Failed to load users.</div>';
    });
  }

  // ─── Global Search ───────────────────────────────────────────
  var searchTimer = null;
  var $globalSearch = document.getElementById('globalSearch');
  if ($globalSearch) {
    $globalSearch.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        var q = $globalSearch.value.trim();
        if (!q) return;
        $pageTitle.textContent = 'Search: "' + q + '"';
        $content.innerHTML = '<p style="color:var(--text-muted)">Searching...</p>';
        api('GET', '/api/invoices').then(function (data) {
          var all = data.invoices || [];
          var ql = q.toLowerCase();
          var results = all.filter(function (inv) {
            return (inv.invoice_number || '').toLowerCase().indexOf(ql) !== -1 ||
              (inv.customer_name || '').toLowerCase().indexOf(ql) !== -1 ||
              (inv.customer_phone || '').indexOf(ql) !== -1 ||
              (inv.customer_gstin || '').toLowerCase().indexOf(ql) !== -1;
          });
          $content.innerHTML = '<div class="table-card"><div class="table-header"><h3>Search Results (' + results.length + ')</h3></div>' +
            (results.length ? invoiceTableHTML(results) : '<div class="empty-state">No invoices match "' + esc(q) + '"</div>') + '</div>';
        });
      }
    });
  }

  // ─── Init ──────────────────────────────────────────────────
  checkAuth();

})();
