(function () {
  'use strict';

  // ─── State ─────────────────────────────────────────────────
  var token = localStorage.getItem('rupiya_token');
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
    // Auto-open Sale group if a sub-item inside it is selected
    var salePages = ['new-invoice','invoices','estimates','new-estimate','estimate','proformas','new-proforma','proforma','payments-in','new-payment-in','challans','new-challan','challan','sale-returns','new-sale-return','sale-return'];
    var saleGroup = document.getElementById('saleNavGroup');
    if (saleGroup) {
      if (salePages.indexOf(page) !== -1) saleGroup.classList.add('open');
    }
    var purchasePages = ['purchase-bills','new-purchase-bill','purchase-bill','purchase-orders','new-purchase-order','purchase-order','purchase-returns','new-purchase-return','purchase-return','payments-out','new-payment-out','expenses-list','new-expense','expense'];
    var purchaseGroup = document.getElementById('purchaseNavGroup');
    if (purchaseGroup) {
      if (purchasePages.indexOf(page) !== -1) purchaseGroup.classList.add('open');
    }
    $sidebar.classList.remove('open');
    $overlay.classList.remove('active');
    try {
      switch (page) {
        case 'overview':    renderOverview(); break;
        case 'parties':     renderParties(); break;
        case 'items':       renderItems(); break;
        case 'add-party':   renderAddParty(); break;
        case 'edit-party':  renderEditParty(param); break;
        case 'party-statement': renderPartyStatement(param); break;
        case 'add-item':    renderAddItem(); break;
        case 'edit-item':   renderEditItem(param); break;
        case 'new-invoice': renderNewInvoice(); break;
        case 'invoices':    renderInvoiceList(); break;
        case 'invoice':     renderInvoiceDetail(param); break;
        case 'estimates':    renderSaleDocList('estimate'); break;
        case 'new-estimate': renderSaleDocForm('estimate'); break;
        case 'estimate':     renderSaleDocDetail('estimate', param); break;
        case 'proformas':    renderSaleDocList('proforma'); break;
        case 'new-proforma': renderSaleDocForm('proforma'); break;
        case 'proforma':     renderSaleDocDetail('proforma', param); break;
        case 'challans':     renderSaleDocList('challan'); break;
        case 'new-challan':  renderSaleDocForm('challan'); break;
        case 'challan':      renderSaleDocDetail('challan', param); break;
        case 'sale-returns':    renderSaleDocList('sale_return'); break;
        case 'new-sale-return': renderSaleDocForm('sale_return'); break;
        case 'sale-return':     renderSaleDocDetail('sale_return', param); break;
        case 'payments-in':    renderPaymentsInList(); break;
        case 'new-payment-in': renderNewPaymentIn(); break;
        case 'purchase-bills':      renderPurchaseDocList('purchase_bill'); break;
        case 'new-purchase-bill':   renderPurchaseDocForm('purchase_bill'); break;
        case 'purchase-bill':       renderPurchaseDocDetail('purchase_bill', param); break;
        case 'purchase-orders':     renderPurchaseDocList('purchase_order'); break;
        case 'new-purchase-order':  renderPurchaseDocForm('purchase_order'); break;
        case 'purchase-order':      renderPurchaseDocDetail('purchase_order', param); break;
        case 'purchase-returns':    renderPurchaseDocList('purchase_return'); break;
        case 'new-purchase-return': renderPurchaseDocForm('purchase_return'); break;
        case 'purchase-return':     renderPurchaseDocDetail('purchase_return', param); break;
        case 'payments-out':    renderPaymentsOutList(); break;
        case 'new-payment-out': renderNewPaymentOut(); break;
        case 'expenses-list':   renderExpensesList(); break;
        case 'new-expense':     renderNewExpense(); break;
        case 'expense':         renderExpenseDetail(param); break;
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
    // Handle ISO timestamps like "2026-02-11T00:00:00.000Z"
    var clean = String(d).split('T')[0];
    var parts = clean.split('-');
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
      var lineTotal = (item.qty || 0) * (item.rate || 0);
      var discAmt = item.disc_amt || (lineTotal * (item.disc_pct || 0) / 100);
      var taxable = lineTotal - discAmt;
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

  // ── Download as Excel (.xlsx) using SheetJS ──
  function downloadExcel(rows, filename, sheetName) {
    if (typeof XLSX === 'undefined') { showToast('Excel library not loaded', 'error'); return; }
    var ws = XLSX.utils.aoa_to_sheet(rows);
    // Auto-size columns
    var colWidths = [];
    rows.forEach(function(row) {
      row.forEach(function(cell, ci) {
        var len = String(cell == null ? '' : cell).length + 2;
        if (!colWidths[ci] || len > colWidths[ci]) colWidths[ci] = len;
      });
    });
    ws['!cols'] = colWidths.map(function(w) { return { wch: Math.min(w, 40) }; });
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName || 'Report');
    XLSX.writeFile(wb, filename);
  }

  // ── Download as PDF using jsPDF + autoTable ──
  function downloadPDF(rows, filename, title) {
    try {
      // Resolve jsPDF constructor
      var _jsPDF = null;
      if (window.jspdf && window.jspdf.jsPDF) _jsPDF = window.jspdf.jsPDF;
      else if (typeof jsPDF !== 'undefined') _jsPDF = jsPDF;
      if (!_jsPDF) { showToast('PDF library not loaded. Please hard-refresh.', 'error'); return; }

      // Ensure autotable plugin is applied (v5 requires explicit apply)
      if (window.jspdf_autotable && window.jspdf_autotable.applyPlugin) {
        window.jspdf_autotable.applyPlugin(_jsPDF);
      }

      var headers = rows[0];
      var body = rows.slice(1);
      var doc = new _jsPDF({ orientation: headers.length > 8 ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' });

      // Title
      var bizName = (currentUser && (currentUser.business_name || currentUser.name)) || 'Report';
      doc.setFontSize(14);
      doc.text(bizName, 14, 15);
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(title || filename.replace('.pdf', ''), 14, 22);
      doc.text('Generated: ' + new Date().toLocaleDateString('en-IN'), 14, 27);
      doc.setTextColor(0);

      // Table — try both v5 direct call and legacy plugin method
      var tableOpts = {
        head: [headers],
        body: body,
        startY: 32,
        theme: 'grid',
        styles: { fontSize: 7.5, cellPadding: 2 },
        headStyles: { fillColor: [13, 110, 253], textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        margin: { left: 10, right: 10 }
      };

      if (typeof doc.autoTable === 'function') {
        // Legacy plugin style (auto-registered)
        doc.autoTable(tableOpts);
      } else if (window.jspdf_autotable && typeof window.jspdf_autotable.autoTable === 'function') {
        // v5 direct function style
        window.jspdf_autotable.autoTable(doc, tableOpts);
      } else if (typeof autoTable === 'function') {
        autoTable(doc, tableOpts);
      } else {
        showToast('AutoTable plugin not loaded', 'error'); return;
      }

      doc.save(filename);
    } catch (e) {
      console.error('PDF generation error:', e);
      showToast('PDF generation failed: ' + e.message, 'error');
    }
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
  var _acIdCounter = 0;
  function acSearch(input, dropdown, endpoint, renderFn, selectFn) {
    input.setAttribute('autocomplete', 'off');
    var _data = [];
    // Use a fixed-position popup appended to body so it escapes all overflow containers
    var popup = document.createElement('div');
    popup.className = 'ac-popup';
    popup.style.cssText = 'display:none;position:fixed;z-index:9999;background:#fff;border:1.5px solid var(--primary);border-radius:0 0 8px 8px;box-shadow:0 8px 24px rgba(0,0,0,0.2);max-height:260px;overflow-y:auto;min-width:280px;';
    document.body.appendChild(popup);

    function positionPopup() {
      var rect = input.getBoundingClientRect();
      popup.style.top = rect.bottom + 'px';
      popup.style.left = rect.left + 'px';
      popup.style.width = Math.max(rect.width, 280) + 'px';
    }

    function showPopup() { positionPopup(); popup.style.display = 'block'; }
    function hidePopup() { popup.style.display = 'none'; }

    var _acKey = endpoint + '_' + (input.id || input.getAttribute('data-f') || ('ac' + (++_acIdCounter)));
    function doSearch(q) {
      clearTimeout(_acTimers[_acKey]);
      _acTimers[_acKey] = setTimeout(function () {
        api('GET', endpoint + '?q=' + encodeURIComponent(q)).then(function (res) {
          _data = res.parties || res.products || res.invoices || res.documents || res.payments || [];
          if (!_data.length) {
            popup.innerHTML = '<div class="ac-empty">No results found</div>';
            showPopup();
            return;
          }
          popup.innerHTML = _data.map(function (d, i) {
            return '<div class="ac-item" data-idx="' + i + '">' + renderFn(d, q) + '</div>';
          }).join('');
          showPopup();
        });
      }, q ? 200 : 50);
    }

    input.addEventListener('input', function () {
      doSearch(input.value.trim());
    });

    popup.addEventListener('mousedown', function (e) {
      e.preventDefault();
      var el = e.target.closest('.ac-item');
      if (!el) return;
      var idx = parseInt(el.getAttribute('data-idx'));
      if (_data[idx]) { selectFn(_data[idx]); hidePopup(); }
    });

    input.addEventListener('blur', function () {
      setTimeout(hidePopup, 200);
    });

    input.addEventListener('focus', function () {
      doSearch(input.value.trim());
    });

    // Reposition on scroll
    var scrollParent = input.closest('.table-wrap') || input.closest('.content') || window;
    if (scrollParent && scrollParent !== window) {
      scrollParent.addEventListener('scroll', function () {
        if (popup.style.display !== 'none') positionPopup();
      });
    }
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
    localStorage.removeItem('rupiya_token');
    window.location.href = '/';
  }
  document.getElementById('logoutBtn').addEventListener('click', function (e) { e.preventDefault(); logout(); });
  $menuBtn.addEventListener('click', function () { $sidebar.classList.toggle('open'); $overlay.classList.toggle('active'); });
  $overlay.addEventListener('click', function () { $sidebar.classList.remove('open'); $overlay.classList.remove('active'); });

  // Sale nav-group toggle
  var saleGroupToggle = document.getElementById('saleGroupToggle');
  if (saleGroupToggle) {
    saleGroupToggle.addEventListener('click', function () {
      document.getElementById('saleNavGroup').classList.toggle('open');
    });
  }
  var purchaseGroupToggle = document.getElementById('purchaseGroupToggle');
  if (purchaseGroupToggle) {
    purchaseGroupToggle.addEventListener('click', function () {
      document.getElementById('purchaseNavGroup').classList.toggle('open');
    });
  }

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
          '<div class="report-link" onclick="window.goTo(\'party-statement\')"><svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg> Party Statement</div>' +
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
            '<button type="button" class="stmt-btn" title="View Statement" data-pname="' + esc(p.name) + '"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg></button>' +
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

      // Statement buttons
      $content.querySelectorAll('.card-actions .stmt-btn').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          window.goTo('party-statement', btn.getAttribute('data-pname'));
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
      var is = (currentUser && currentUser.item_settings) || {};
      itemList.forEach(function (item) {
        var iid = item.id || item._id;
        // Build badge row
        var badges = '';
        if (is.category && item.category) {
          badges += '<span class="item-badge badge-category">' + esc(item.category) + '</span>';
        }
        if (is.stock) {
          var sq = item.stock_quantity || 0;
          var lt = item.low_stock_threshold || is.low_stock_threshold || 10;
          if (sq <= 0) badges += '<span class="item-badge badge-stock out">Out of Stock</span>';
          else if (sq <= lt) badges += '<span class="item-badge badge-stock low">Low: ' + sq + '</span>';
          else badges += '<span class="item-badge badge-stock">Stock: ' + sq + '</span>';
        }
        if (is.batch_tracking && item.batch_no) {
          badges += '<span class="item-badge badge-batch">Batch: ' + esc(item.batch_no) + '</span>';
        }
        if (is.batch_tracking && item.exp_date) {
          var expStr = '';
          try { expStr = new Date(item.exp_date).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }); } catch(e) { expStr = item.exp_date; }
          var isExpired = new Date(item.exp_date) < new Date();
          badges += '<span class="item-badge badge-expiry' + (isExpired ? ' expired' : '') + '">' + (isExpired ? 'Expired: ' : 'Exp: ') + expStr + '</span>';
        }
        html += '<div class="item-card" data-name="' + esc(item.name).toLowerCase() + '" data-id="' + iid + '" style="cursor:pointer">' +
          '<div class="card-actions">' +
            '<button type="button" class="edit-btn" title="Edit" data-id="' + iid + '"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>' +
            '<button type="button" class="del" title="Delete" data-id="' + iid + '"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg></button>' +
          '</div>' +
          '<div class="card-name">' + esc(item.name) + '</div>' +
          (badges ? '<div style="margin:4px 0 2px">' + badges + '</div>' : '') +
          (item.hsn ? '<div class="card-detail">HSN: ' + esc(item.hsn) + '</div>' : '') +
          '<div class="card-detail">Rate: ' + formatINR(item.rate || 0) + ' | GST: ' + (item.gst || 0) + '%</div>' +
          (item.size ? '<div class="card-detail">Size: ' + esc(item.size) + '</div>' : '') +
          '<div class="card-detail">Unit: ' + (item.unit || 'Pcs') + '</div>' +
          (item.description ? '<div class="card-detail" style="color:var(--text-muted);font-style:italic">' + esc(item.description) + '</div>' : '') +
          (is.batch_tracking && item.model_no ? '<div class="card-detail">Model: ' + esc(item.model_no) + '</div>' : '') +
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

  // ── Party Statement Page ───────────────────────────────────
  function renderPartyStatement(partyName) {
    $pageTitle.textContent = 'Party Statement';
    if (!partyName) {
      $content.innerHTML = '<div class="form-card"><h3>Party Statement</h3>' +
        '<div class="form-grid">' +
        '<div class="form-group"><label>Party Name *</label><div class="ac-wrap"><input id="psParty" placeholder="Search party..." autocomplete="off"><div class="ac-dropdown" id="psPartyAc"></div></div></div>' +
        '<div class="form-group"><label>From Date</label><input id="psFrom" type="date"></div>' +
        '<div class="form-group"><label>To Date</label><input id="psTo" type="date"></div>' +
        '</div>' +
        '<div style="margin-top:16px"><button type="button" class="btn btn-primary" id="psGenBtn">View Statement</button></div></div>' +
        '<div id="psContent"></div>';
      $content.innerHTML = $content.innerHTML; // force re-render
      acSearch(document.getElementById('psParty'), document.getElementById('psPartyAc'), '/api/parties',
        function(p, q) { return '<div class="ac-main">' + acHL(p.name, q) + '</div>' + (p.phone ? '<div class="ac-sub">Ph: ' + p.phone + '</div>' : ''); },
        function(p) { document.getElementById('psParty').value = p.name; });
      document.getElementById('psGenBtn').addEventListener('click', function() {
        var pn = document.getElementById('psParty').value.trim();
        if (!pn) return showToast('Select a party', 'error');
        window.goTo('party-statement', pn);
      });
      return;
    }

    // Decode party name
    partyName = decodeURIComponent(partyName);
    var today = new Date().toISOString().slice(0, 10);
    var firstOfYear = today.slice(0, 4) + '-01-01';

    var html = '<div class="form-card" style="margin-bottom:16px"><div class="form-grid" style="align-items:flex-end">' +
      '<div class="form-group"><label>Party</label><div class="ac-wrap"><input id="psParty" value="' + esc(partyName) + '" autocomplete="off"><div class="ac-dropdown" id="psPartyAc"></div></div></div>' +
      '<div class="form-group"><label>From</label><input id="psFrom" type="date" value="' + firstOfYear + '"></div>' +
      '<div class="form-group"><label>To</label><input id="psTo" type="date" value="' + today + '"></div>' +
      '<div class="form-group"><button type="button" class="btn btn-primary" id="psGenBtn">View Statement</button></div>' +
      '</div>' +
      '<div class="form-actions" style="margin-top:12px;flex-wrap:wrap;gap:8px">' +
        '<div class="dl-wrap" id="psDlWrap">' +
          '<button type="button" class="dl-btn" id="psDlBtn">' +
            '<svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>' +
            'Download Statement <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg></button>' +
          '<div class="dl-menu" id="psDlMenu">' +
            '<button type="button" data-fmt="pdf"><svg width="15" height="15" fill="none" stroke="#dc2626" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> Download PDF</button>' +
            '<button type="button" data-fmt="excel"><svg width="15" height="15" fill="none" stroke="#0d6efd" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> Download Excel</button>' +
            '<button type="button" data-fmt="csv"><svg width="15" height="15" fill="none" stroke="#16a34a" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> Download CSV</button>' +
          '</div></div>' +
        '<button type="button" class="btn btn-outline" onclick="window.print()">Print</button>' +
      '</div></div>' +
      '<div id="psContent"><p style="color:var(--text-muted)">Loading statement...</p></div>';
    $content.innerHTML = html;

    // Autocomplete on party field
    acSearch(document.getElementById('psParty'), document.getElementById('psPartyAc'), '/api/parties',
      function(p, q) { return '<div class="ac-main">' + acHL(p.name, q) + '</div>' + (p.phone ? '<div class="ac-sub">Ph: ' + p.phone + '</div>' : ''); },
      function(p) { document.getElementById('psParty').value = p.name; });

    var _psData = null;

    function loadStatement() {
      var pName = document.getElementById('psParty').value.trim();
      var from = document.getElementById('psFrom').value;
      var to = document.getElementById('psTo').value;
      if (!pName) return showToast('Enter a party name', 'error');
      document.getElementById('psContent').innerHTML = '<p style="color:var(--text-muted)">Loading statement...</p>';
      var url = '/api/party-statement?party=' + encodeURIComponent(pName);
      if (from) url += '&from=' + from;
      if (to) url += '&to=' + to;
      api('GET', url).then(function(data) {
        _psData = data;
        _psData._from = from;
        _psData._to = to;
        renderStatementContent(data);
      }).catch(function() {
        document.getElementById('psContent').innerHTML = '<div class="empty-state">Failed to load statement.</div>';
      });
    }

    function renderStatementContent(data) {
      var u = currentUser || {};
      var p = data.party || {};
      var txns = data.transactions || [];
      var summary = data.summary || {};

      // Business header (print-friendly)
      var sHtml = '<div class="ps-print-area" id="psPrintArea">';
      sHtml += '<div class="ps-biz-header">';
      sHtml += '<h2 class="ps-biz-name">' + esc(u.business_name || u.name || '') + '</h2>';
      if (u.address || u.city) sHtml += '<div class="ps-biz-detail">' + esc([u.address, u.city, u.state, u.pincode].filter(Boolean).join(', ')) + '</div>';
      if (u.phone) sHtml += '<div class="ps-biz-detail">Phone: ' + esc(u.phone) + (u.email ? '&nbsp;&nbsp;Email: ' + esc(u.email) : '') + '</div>';
      if (u.gstin) sHtml += '<div class="ps-biz-detail">GSTIN: ' + esc(u.gstin) + (u.state ? ', State: ' + esc(u.state) : '') + '</div>';
      sHtml += '</div>';

      // Title + party info
      sHtml += '<h3 class="ps-title">Party Statement</h3>';
      sHtml += '<div class="ps-party-info">';
      sHtml += '<div><strong>Party name:</strong> ' + esc(p.name || '') + '</div>';
      if (p.address) sHtml += '<div>' + esc(p.address) + '</div>';
      if (p.city || p.state) sHtml += '<div>' + esc([p.city, p.state].filter(Boolean).join(', ')) + (p.pincode ? '-' + p.pincode : '') + '</div>';
      if (p.gstin) sHtml += '<div>GSTIN: ' + esc(p.gstin) + '</div>';
      if (data._from || data._to) sHtml += '<div style="margin-top:4px;color:var(--text-muted);font-size:0.8125rem">Period: ' + (data._from || 'Start') + ' to ' + (data._to || 'Today') + '</div>';
      sHtml += '</div>';

      // Table
      sHtml += '<div class="table-wrap" style="margin-top:16px"><table class="ps-table"><thead><tr>' +
        '<th>Date</th><th>Txn Type</th><th>Ref No.</th><th>Payment Status</th>' +
        '<th class="text-right">Total</th><th class="text-right">Received / Paid</th>' +
        '<th class="text-right">Txn Balance</th><th class="text-right">Receivable Balance</th><th class="text-right">Payable Balance</th>' +
        '</tr></thead><tbody>';

      if (!txns.length) {
        sHtml += '<tr><td colspan="9" class="text-center" style="color:var(--text-muted)">No transactions found</td></tr>';
      }
      txns.forEach(function(t) {
        var statusClass = t.status === 'paid' ? 'badge-paid' : t.status === 'partial' ? 'badge-partial' : 'badge-unpaid';
        sHtml += '<tr>' +
          '<td>' + formatDateSlash(t.date) + '</td>' +
          '<td>' + esc(t.type) + '</td>' +
          '<td>' + esc(t.ref_no || '-') + '</td>' +
          '<td><span class="badge ' + statusClass + '">' + (t.status || 'unpaid').charAt(0).toUpperCase() + (t.status || 'unpaid').slice(1) + '</span></td>' +
          '<td class="text-right">' + formatINR(t.total) + '</td>' +
          '<td class="text-right">' + formatINR(t.received) + '</td>' +
          '<td class="text-right">' + formatINR(t.txn_balance) + '</td>' +
          '<td class="text-right" style="font-weight:600;color:var(--primary)">' + formatINR(t.receivable_balance) + '</td>' +
          '<td class="text-right" style="font-weight:600;color:#dc2626">' + formatINR(t.payable_balance) + '</td>' +
          '</tr>';
      });
      sHtml += '</tbody></table></div>';

      // Totals row
      sHtml += '<div class="ps-totals">';
      if (summary.total_receivable) sHtml += '<div class="ps-total-item"><span>Total Receivable:</span><strong style="color:var(--primary)">' + formatINR(summary.total_receivable) + '</strong></div>';
      if (summary.total_payable) sHtml += '<div class="ps-total-item"><span>Total Payable:</span><strong style="color:#dc2626">' + formatINR(summary.total_payable) + '</strong></div>';
      var net = summary.net_balance || 0;
      sHtml += '<div class="ps-total-item ps-net"><span>Net Balance:</span><strong style="color:' + (net >= 0 ? 'var(--primary)' : '#dc2626') + '">' + formatINR(Math.abs(net)) + (net >= 0 ? ' Receivable' : ' Payable') + '</strong></div>';
      sHtml += '</div></div>';

      document.getElementById('psContent').innerHTML = sHtml;
    }

    // Generate button
    document.getElementById('psGenBtn').addEventListener('click', loadStatement);

    // Download dropdown
    (function() {
      var dlBtn = document.getElementById('psDlBtn');
      var dlMenu = document.getElementById('psDlMenu');
      dlBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        document.querySelectorAll('.dl-menu.open').forEach(function(m) { if (m !== dlMenu) m.classList.remove('open'); });
        dlMenu.classList.toggle('open');
      });
      document.addEventListener('click', function() { dlMenu.classList.remove('open'); });

      dlMenu.addEventListener('click', function(e) {
        var btn = e.target.closest('button[data-fmt]');
        if (!btn) return;
        if (!_psData || !_psData.transactions) { showToast('Load statement first', 'error'); return; }
        var fmt = btn.dataset.fmt;
        var p = _psData.party || {};
        var txns = _psData.transactions || [];
        var rows = [['Date', 'Txn Type', 'Ref No.', 'Payment Status', 'Total', 'Received / Paid', 'Txn Balance', 'Receivable Balance', 'Payable Balance']];
        txns.forEach(function(t) {
          rows.push([
            formatDateSlash(t.date), t.type, t.ref_no || '-',
            (t.status || 'unpaid').charAt(0).toUpperCase() + (t.status || 'unpaid').slice(1),
            (t.total || 0).toFixed(2), (t.received || 0).toFixed(2), (t.txn_balance || 0).toFixed(2),
            (t.receivable_balance || 0).toFixed(2), (t.payable_balance || 0).toFixed(2)
          ]);
        });
        // Add total row
        var s = _psData.summary || {};
        rows.push(['', '', '', 'Total', '', '', '', (s.total_receivable || 0).toFixed(2), (s.total_payable || 0).toFixed(2)]);

        var suffix = (p.name || 'party').replace(/[^a-zA-Z0-9]/g, '_') + '_statement';
        if (fmt === 'csv') { downloadCSV(rows, suffix + '.csv'); showToast('CSV downloaded!', 'success'); }
        else if (fmt === 'excel') { downloadExcel(rows, suffix + '.xlsx', 'Party Statement'); showToast('Excel downloaded!', 'success'); }
        else if (fmt === 'pdf') {
          _downloadPartyStatementPDF(_psData);
          showToast('PDF downloaded!', 'success');
        }
        dlMenu.classList.remove('open');
      });
    })();

    // Auto-load
    loadStatement();
  }

  // Generate party statement PDF matching the Vyapar format
  function _downloadPartyStatementPDF(data) {
    try {
      var _jsPDF = null;
      if (window.jspdf && window.jspdf.jsPDF) _jsPDF = window.jspdf.jsPDF;
      else if (typeof jsPDF !== 'undefined') _jsPDF = jsPDF;
      if (!_jsPDF) { showToast('PDF library not loaded', 'error'); return; }
      if (window.jspdf_autotable && window.jspdf_autotable.applyPlugin) window.jspdf_autotable.applyPlugin(_jsPDF);

      var u = currentUser || {};
      var p = data.party || {};
      var txns = data.transactions || [];
      var summary = data.summary || {};

      var doc = new _jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      var pageW = doc.internal.pageSize.getWidth();
      var y = 12;

      // Business header
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text(u.business_name || u.name || '', 14, y); y += 5;
      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(80);
      if (u.address || u.city) { doc.text([u.address, u.city, u.state, u.pincode].filter(Boolean).join(', '), 14, y); y += 3.5; }
      if (u.phone) { doc.text('Phone no.: ' + u.phone + (u.email ? '  Email: ' + u.email : ''), 14, y); y += 3.5; }
      if (u.gstin) { doc.text('GSTIN: ' + u.gstin + (u.state ? ', State: ' + u.state : ''), 14, y); y += 3.5; }
      doc.setTextColor(0);

      // Title
      y += 3;
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text('Party Statement', 14, y); y += 5;

      // Party info
      doc.setFontSize(8.5);
      doc.setFont(undefined, 'bold');
      doc.text('Party name: ' + (p.name || ''), 14, y); y += 3.5;
      doc.setFont(undefined, 'normal');
      doc.setTextColor(80);
      if (p.address) { doc.text(p.address, 14, y); y += 3.5; }
      if (p.city || p.state) { doc.text([p.city, p.state].filter(Boolean).join(', ') + (p.pincode ? '-' + p.pincode : ''), 14, y); y += 3.5; }
      if (p.gstin) { doc.text('GSTIN: ' + p.gstin, 14, y); y += 3.5; }
      doc.setTextColor(0);
      y += 2;

      // Table
      var headers = ['Date', 'Txn Type', 'Ref No.', 'Payment\nStatus', 'Total', 'Received /\nPaid', 'Txn Balance', 'Receivable\nBalance', 'Payable\nBalance'];
      var body = txns.map(function(t) {
        return [
          formatDateSlash(t.date), t.type, t.ref_no || '-',
          (t.status || 'unpaid').charAt(0).toUpperCase() + (t.status || 'unpaid').slice(1),
          '\u20B9 ' + formatINR(t.total), '\u20B9 ' + formatINR(t.received),
          '\u20B9 ' + formatINR(t.txn_balance),
          '\u20B9 ' + formatINR(t.receivable_balance),
          '\u20B9 ' + formatINR(t.payable_balance)
        ];
      });
      // Total row
      body.push(['', '', '', '', '', '', 'Total',
        '\u20B9 ' + formatINR(summary.total_receivable || 0),
        '\u20B9 ' + formatINR(summary.total_payable || 0)
      ]);

      var tableOpts = {
        head: [headers],
        body: body,
        startY: y,
        theme: 'grid',
        styles: { fontSize: 7.5, cellPadding: 2, lineColor: [200, 200, 200], lineWidth: 0.2 },
        headStyles: { fillColor: [240, 240, 240], textColor: [30, 30, 30], fontStyle: 'bold', fontSize: 7 },
        columnStyles: {
          4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right' },
          7: { halign: 'right', fontStyle: 'bold' }, 8: { halign: 'right', fontStyle: 'bold' }
        },
        margin: { left: 10, right: 10 },
        didParseCell: function(data) {
          // Bold the total row
          if (data.row.index === body.length - 1) {
            data.cell.styles.fontStyle = 'bold';
          }
        }
      };

      if (typeof doc.autoTable === 'function') doc.autoTable(tableOpts);
      else if (window.jspdf_autotable && typeof window.jspdf_autotable.autoTable === 'function') window.jspdf_autotable.autoTable(doc, tableOpts);
      else if (typeof autoTable === 'function') autoTable(doc, tableOpts);
      else { showToast('AutoTable plugin not loaded', 'error'); return; }

      // Footer
      var pageCount = doc.internal.getNumberOfPages();
      for (var i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(150);
        doc.text('-- ' + i + ' of ' + pageCount + ' --', pageW / 2, doc.internal.pageSize.getHeight() - 6, { align: 'center' });
      }

      doc.save((p.name || 'party').replace(/[^a-zA-Z0-9 ]/g, '') + ' statement.pdf');
    } catch(e) {
      console.error('PDF generation error:', e);
      showToast('PDF failed: ' + e.message, 'error');
    }
  }

  // ── Add Item Page ──────────────────────────────────────────
  function renderAddItem() {
    $pageTitle.textContent = 'Add Item';
    var unitOptions = ['Pcs','Kg','Gm','Ltr','Mtr','Sq.Ft','Box','Bag','Dozen','Pair','Set','Roll','Ton','Quintal','Nos','Bundle','Other'];
    var unitOpts = unitOptions.map(function (u) { return '<option value="' + u + '">' + u + '</option>'; }).join('');
    var gstOpts = GST_RATES.map(function (r) { return '<option value="' + r + '">' + r + '%</option>'; }).join('');
    var is = (currentUser && currentUser.item_settings) || {};
    var catOpts = '';
    if (is.category && is.categories && is.categories.length) {
      catOpts = '<option value="">-- Select --</option>' + is.categories.map(function(c) { return '<option value="' + esc(c) + '">' + esc(c) + '</option>'; }).join('');
    }
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
          '<div class="form-group full"><label>Description</label><textarea id="aiDesc" rows="2" placeholder="Optional item description"></textarea></div>' +
          (is.category ? '<div class="form-group"><label>Category</label><select id="aiCategory">' + catOpts + '</select></div>' : '') +
          (is.stock ? '<div class="form-group"><label>Opening Stock</label><input id="aiStockQty" type="number" step="0.01" min="0" placeholder="0" value="0"></div>' +
            '<div class="form-group"><label>Low Stock Alert</label><input id="aiLowStock" type="number" step="1" min="0" placeholder="' + (is.low_stock_threshold || 10) + '" value="' + (is.low_stock_threshold || 10) + '"></div>' : '') +
          (is.batch_tracking ? '<div class="form-group"><label>Batch No.</label><input id="aiBatchNo" placeholder="e.g. B2026-001"></div>' +
            '<div class="form-group"><label>Mfg Date</label><input id="aiMfgDate" type="date"></div>' +
            '<div class="form-group"><label>Expiry Date</label><input id="aiExpDate" type="date"></div>' +
            '<div class="form-group"><label>Model No.</label><input id="aiModelNo" placeholder="e.g. MX-500"></div>' : '') +
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
      var body = {
        name: name,
        hsn: document.getElementById('aiHsn').value.trim(),
        rate: rate,
        mrp: parseFloat(document.getElementById('aiMrp').value) || 0,
        gst: parseInt(document.getElementById('aiGst').value) || 0,
        unit: document.getElementById('aiUnit').value,
        size: document.getElementById('aiSize').value.trim(),
        description: document.getElementById('aiDesc') ? document.getElementById('aiDesc').value.trim() : ''
      };
      if (document.getElementById('aiCategory')) body.category = document.getElementById('aiCategory').value;
      if (document.getElementById('aiStockQty')) body.stock_quantity = parseFloat(document.getElementById('aiStockQty').value) || 0;
      if (document.getElementById('aiLowStock')) body.low_stock_threshold = parseFloat(document.getElementById('aiLowStock').value) || 0;
      if (document.getElementById('aiBatchNo')) body.batch_no = document.getElementById('aiBatchNo').value.trim();
      if (document.getElementById('aiMfgDate')) body.mfg_date = document.getElementById('aiMfgDate').value || null;
      if (document.getElementById('aiExpDate')) body.exp_date = document.getElementById('aiExpDate').value || null;
      if (document.getElementById('aiModelNo')) body.model_no = document.getElementById('aiModelNo').value.trim();
      api('POST', '/api/products', body).then(function (res) {
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
      var is = (currentUser && currentUser.item_settings) || {};

      var unitOptions = ['Pcs','Kg','Gm','Ltr','Mtr','Sq.Ft','Box','Bag','Dozen','Pair','Set','Roll','Ton','Quintal','Nos','Bundle','Other'];
      var unitOpts = unitOptions.map(function (u) {
        return '<option value="' + u + '"' + ((item.unit || 'Pcs') === u ? ' selected' : '') + '>' + u + '</option>';
      }).join('');
      var gstOpts = GST_RATES.map(function (r) {
        return '<option value="' + r + '"' + ((item.gst || 0) === r ? ' selected' : '') + '>' + r + '%</option>';
      }).join('');
      var catOpts = '';
      if (is.category && is.categories && is.categories.length) {
        catOpts = '<option value="">-- Select --</option>' + is.categories.map(function(c) {
          return '<option value="' + esc(c) + '"' + ((item.category || '') === c ? ' selected' : '') + '>' + esc(c) + '</option>';
        }).join('');
      }
      var fmtDate = function(d) { if (!d) return ''; try { return new Date(d).toISOString().split('T')[0]; } catch(e) { return ''; } };

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
            '<div class="form-group full"><label>Description</label><textarea id="aiDesc" rows="2" placeholder="Optional item description">' + esc(item.description || '') + '</textarea></div>' +
            (is.category ? '<div class="form-group"><label>Category</label><select id="aiCategory">' + catOpts + '</select></div>' : '') +
            (is.stock ? '<div class="form-group"><label>Stock Quantity</label><input id="aiStockQty" type="number" step="0.01" min="0" value="' + (item.stock_quantity || 0) + '"></div>' +
              '<div class="form-group"><label>Low Stock Alert</label><input id="aiLowStock" type="number" step="1" min="0" value="' + (item.low_stock_threshold || is.low_stock_threshold || 10) + '"></div>' : '') +
            (is.batch_tracking ? '<div class="form-group"><label>Batch No.</label><input id="aiBatchNo" value="' + esc(item.batch_no || '') + '"></div>' +
              '<div class="form-group"><label>Mfg Date</label><input id="aiMfgDate" type="date" value="' + fmtDate(item.mfg_date) + '"></div>' +
              '<div class="form-group"><label>Expiry Date</label><input id="aiExpDate" type="date" value="' + fmtDate(item.exp_date) + '"></div>' +
              '<div class="form-group"><label>Model No.</label><input id="aiModelNo" value="' + esc(item.model_no || '') + '"></div>' : '') +
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
        var body = {
          name: name,
          hsn: document.getElementById('aiHsn').value.trim(),
          rate: rate,
          mrp: parseFloat(document.getElementById('aiMrp').value) || 0,
          gst: parseInt(document.getElementById('aiGst').value) || 0,
          unit: document.getElementById('aiUnit').value,
          size: document.getElementById('aiSize').value.trim(),
          description: document.getElementById('aiDesc') ? document.getElementById('aiDesc').value.trim() : ''
        };
        if (document.getElementById('aiCategory')) body.category = document.getElementById('aiCategory').value;
        if (document.getElementById('aiStockQty')) body.stock_quantity = parseFloat(document.getElementById('aiStockQty').value) || 0;
        if (document.getElementById('aiLowStock')) body.low_stock_threshold = parseFloat(document.getElementById('aiLowStock').value) || 0;
        if (document.getElementById('aiBatchNo')) body.batch_no = document.getElementById('aiBatchNo').value.trim();
        if (document.getElementById('aiMfgDate')) body.mfg_date = document.getElementById('aiMfgDate').value || null;
        if (document.getElementById('aiExpDate')) body.exp_date = document.getElementById('aiExpDate').value || null;
        if (document.getElementById('aiModelNo')) body.model_no = document.getElementById('aiModelNo').value.trim();
        api('PUT', '/api/products/' + itemId, body).then(function (res) {
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
      $content.innerHTML = '<div class="table-card"><div class="table-header"><h3>Invoices (' + list.length + ')</h3></div>' +
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

      // Compute per-item inclusive amounts (with discount applied)
      var totalQty = 0, totalGstAmt = 0, totalInclAmount = 0, totalTaxable = 0, totalMrpAmount = 0, totalDiscountAmt = 0;
      items.forEach(function (item) {
        var lineTotal = (item.qty || 0) * (item.rate || 0);
        var discAmt = item.disc_amt || (lineTotal * (item.disc_pct || 0) / 100);
        var taxable = lineTotal - discAmt;
        var gstAmt = taxable * (item.gst || 0) / 100;
        item._taxable = taxable;
        item._gst_amount = gstAmt;
        item._amount = taxable + gstAmt;
        item._disc_amt = discAmt;
        totalQty += (item.qty || 0);
        totalGstAmt += gstAmt;
        totalInclAmount += taxable + gstAmt;
        totalTaxable += taxable;
        totalDiscountAmt += discAmt;
        totalMrpAmount += ((item.mrp || 0) * (item.qty || 0));
      });

      var roundOff = inv.round_off !== undefined ? inv.round_off : (Math.round(totalInclAmount * 100) / 100 !== totalInclAmount ? Math.round(totalInclAmount) - totalInclAmount : 0);
      var grandTotal = inv.total || Math.round(totalInclAmount);
      var amountPaid = inv.amount_paid || 0;
      var balance = grandTotal - amountPaid;
      // You Saved = (MRP total - rate-based subtotal before discount) + discount amount
      var priceBeforeDisc = totalTaxable + totalDiscountAmt;
      var mrpSavings = totalMrpAmount > priceBeforeDisc ? totalMrpAmount - priceBeforeDisc : 0;
      var youSaved = mrpSavings + totalDiscountAmt;
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
      html += '<div class="inv-biz-header' + (u.logo ? ' has-logo' : '') + '">';
      html += '<div class="biz-info">';
      html += '<h3 class="biz-name">' + esc(u.business_name || u.name || 'Rupiya') + '</h3>';
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
      if (u.logo) {
        html += '<div class="biz-logo"><img src="' + u.logo + '" alt="Logo"></div>';
      }
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
      var hasDiscount = totalDiscountAmt > 0;
      var _detailIs = (currentUser && currentUser.item_settings) || {};
      var _detailCf = _detailIs.custom_fields_list || [];
      html += '<div class="table-wrap"><table class="inv-items-table"><thead><tr>' +
        '<th>#</th><th class="text-left">Item name</th><th>HSN/SAC</th>' +
        '<th>' + (_detailIs.size_label || 'Size') + '</th><th>' + (_detailIs.mrp_label || 'MRP') + '(\u20B9)</th><th>Quantity</th><th>Unit</th>' +
        '<th>Price/Unit(\u20B9)</th>';
      // Custom field headers in detail view - before Disc
      _detailCf.forEach(function(cf) {
        if (cf.name) html += '<th>' + esc(cf.name) + '</th>';
      });
      html += (hasDiscount ? '<th>Disc(\u20B9)</th>' : '') +
        '<th>GST(\u20B9)</th>' +
        '<th>Amount(\u20B9)</th></tr></thead><tbody>';
      items.forEach(function (item, i) {
        html += '<tr><td>' + (i + 1) + '</td>';
        html += '<td class="text-left">' + esc(item.name) + '</td>';
        html += '<td>' + (item.hsn || '-') + '</td>';
        html += '<td>' + (item.size || '') + '</td>';
        html += '<td>' + (item.mrp ? formatINR(item.mrp) : '') + '</td>';
        html += '<td>' + item.qty + '</td>';
        html += '<td>' + (item.unit || 'Pcs') + '</td>';
        html += '<td>' + formatINR(item.rate) + '</td>';
        // Custom field values in detail view - before Disc
        _detailCf.forEach(function(cf) {
          if (cf.name) {
            var cfKey = 'cf_' + cf.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
            html += '<td>' + esc(item[cfKey] || '') + '</td>';
          }
        });
        if (hasDiscount) {
          html += '<td>' + (item._disc_amt ? formatINR(item._disc_amt) + (item.disc_pct ? '<br><small>(' + item.disc_pct + '%)</small>' : '') : '-') + '</td>';
        }
        html += '<td>' + formatINR(item._gst_amount) + '<br><small>(' + item.gst + '%)</small></td>';
        html += '<td>' + formatINR(item._amount) + '</td></tr>';
      });
      var cfCount = 0;
      _detailCf.forEach(function(cf) { if (cf.name) cfCount++; });
      // Footer: Total spans # + Item + HSN + Size + MRP = 5 cols
      html += '</tbody><tfoot><tr>' +
        '<td colspan="5" class="text-left" style="font-weight:700">Total</td>' +
        '<td style="font-weight:700">' + totalQty + '</td>' +
        '<td></td><td></td>'; // Unit + Price/Unit
      // Empty cells for custom fields
      for (var cfi = 0; cfi < cfCount; cfi++) html += '<td></td>';
      if (hasDiscount) html += '<td></td>';
      html += '<td style="font-weight:700">' + formatINR(totalGstAmt) + '</td>' +
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
      var displayDiscount = totalDiscountAmt || inv.discount || 0;
      html += '<div class="inv-totals-section"><table>' +
        '<tr><td>Sub Total</td><td>:</td><td class="text-right">' + formatINR(totalInclAmount + displayDiscount) + '</td></tr>';
      if (displayDiscount > 0) {
        html += '<tr><td>Discount</td><td>:</td><td class="text-right">-' + formatINR(displayDiscount) + '</td></tr>';
      }
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
      html += '<p><strong>For ' + esc(u.business_name || u.name || 'Rupiya') + ':</strong></p>';
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

      // Auto-scale invoice to fit single A4 page when printing
      function scaleInvoiceForPrint() {
        var printArea = document.getElementById('invoicePrintArea');
        if (!printArea) return;
        // Reset any prior scaling
        printArea.style.transform = '';
        printArea.style.width = '';
        // Wait a tick for layout to settle
        requestAnimationFrame(function () {
          var h = printArea.scrollHeight;
          // A4 at ~96dpi with 3mm top+bottom margin ≈ 1103px - 23px ≈ 1080px usable
          var maxH = 1050;
          if (h > maxH) {
            var scale = maxH / h;
            printArea.style.transform = 'scale(' + scale + ')';
            printArea.style.transformOrigin = 'top left';
            printArea.style.width = (100 / scale) + '%';
          }
        });
      }
      window.addEventListener('beforeprint', scaleInvoiceForPrint);
      // Restore after print
      window.addEventListener('afterprint', function () {
        var printArea = document.getElementById('invoicePrintArea');
        if (printArea) { printArea.style.transform = ''; printArea.style.width = ''; }
      });
    });
  }

  // ── New Invoice Form (Vyapar-style) ────────────────────────
  function renderNewInvoice() {
    $pageTitle.textContent = 'New Invoice';
    var today = new Date().toISOString().slice(0, 10);
    var bizName = currentUser ? (currentUser.business_name || currentUser.name || 'Rupiya') : 'Rupiya';

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

    // Items table - read column visibility from item_settings
    var colSettings = (currentUser && currentUser.item_settings && currentUser.item_settings.visible_columns) || {};
    var _is = (currentUser && currentUser.item_settings) || {};
    var colDefs = [
      { key:'name', label:'Item Name', always:true },
      { key:'hsn', label:'HSN/SAC' },
      { key:'size', label: _is.size_label || 'Size' },
      { key:'mrp', label: _is.mrp_label || 'MRP' },
      { key:'qty', label:'Qty', always:true },
      { key:'unit', label:'Unit' },
      { key:'rate', label:'Price/Unit', always:true },
      { key:'disc_pct', label:'Disc%' },
      { key:'disc_amt', label:'Disc\u20B9' },
      { key:'gst', label:'GST%', always:true },
      { key:'gst_amount', label:'GST\u20B9' },
      { key:'amount', label:'Amount', always:true }
    ];
    // Inject custom fields from item_settings before the Disc% column
    var customFields = _is.custom_fields_list || [];
    if (customFields.length > 0) {
      var discIdx = -1;
      for (var ci = 0; ci < colDefs.length; ci++) { if (colDefs[ci].key === 'disc_pct') { discIdx = ci; break; } }
      if (discIdx === -1) discIdx = colDefs.length - 1;
      customFields.forEach(function(cf) {
        if (cf.name) {
          var cfKey = 'cf_' + cf.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
          colDefs.splice(discIdx, 0, { key: cfKey, label: cf.name, custom: true });
          discIdx++;
        }
      });
    }
    // Default: all visible
    colDefs.forEach(function(c) {
      if (c.always) { c.visible = true; return; }
      c.visible = colSettings[c.key] !== undefined ? colSettings[c.key] : true;
    });
    window._colDefs = colDefs;

    html += '<div class="sale-items"><div class="sale-items-toolbar">' +
      '<span class="toolbar-label">Items</span>' +
      '<button type="button" class="col-settings-btn" id="colSettingsBtn" title="Column settings">' +
      '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>' +
      '</button></div>';

    // Column settings dropdown panel
    html += '<div class="col-settings-panel" id="colSettingsPanel">';
    colDefs.forEach(function(c) {
      if (c.always) return; // Can't toggle required columns
      html += '<label class="col-toggle-item"><input type="checkbox" data-col="' + c.key + '"' + (c.visible ? ' checked' : '') + '>' +
        '<span>' + c.label + '</span></label>';
    });
    html += '<div class="col-settings-link" id="colMoreSettings" style="cursor:pointer"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="vertical-align:-2px"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg> More Settings</div></div>';

    html += '<div class="table-wrap"><table class="items-table" id="itemsTable"><thead><tr id="itemsHead">' +
      '<th style="width:36px;text-align:center">#</th>';
    colDefs.forEach(function(c) {
      var vis = c.visible ? '' : ' style="display:none"';
      html += '<th data-col="' + c.key + '"' + vis + '>' + c.label + '</th>';
    });
    var visColCount = 1; // # column
    colDefs.forEach(function(c) { if (c.visible) visColCount++; });
    visColCount++; // action column

    html += '<th style="width:30px"></th></tr></thead><tbody id="itemsBody"></tbody>' +
    '<tfoot>' +
    // ADD ROW row
    '<tr class="items-addrow-row">' +
      '<td colspan="' + visColCount + '" style="padding:6px 12px;border-top:1px solid var(--border)">' +
        '<button type="button" class="add-row-inline" id="addItemBtn" title="Add Row">' +
          '<svg width="18" height="18" fill="none" stroke="var(--primary)" stroke-width="2.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>' +
          '<span>ADD ROW</span></button>' +
      '</td>' +
    '</tr>' +
    // TOTAL row
    '<tr class="items-total-row" id="itemsTotalRow">' +
      '<td></td>' +
      '<td data-col="name"><strong class="total-label">TOTAL</strong></td>';
    colDefs.forEach(function(c) {
      if (c.key === 'name') return;
      var vis = c.visible ? '' : ' style="display:none"';
      if (c.key === 'amount') {
        html += '<td data-col="amount"' + vis + '><strong id="footerTotal">\u20B90</strong></td>';
      } else if (c.key === 'qty') {
        html += '<td data-col="qty"' + vis + '><strong id="footerQty">0</strong></td>';
      } else {
        html += '<td data-col="' + c.key + '"' + vis + '></td>';
      }
    });
    html += '<td></td></tr></tfoot></table></div></div>';

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
        '<tr class="you-saved-row" id="rowYouSaved" style="display:none"><td style="color:#059669;font-weight:600">You Saved</td><td id="sumYouSaved" style="color:#059669;font-weight:600">\u20B90.00</td></tr>' +
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

    // Column settings gear button
    (function() {
      var settingsBtn = document.getElementById('colSettingsBtn');
      var settingsPanel = document.getElementById('colSettingsPanel');
      if (!settingsBtn || !settingsPanel) return;
      settingsBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        settingsPanel.classList.toggle('open');
      });
      // Close when clicking outside
      document.addEventListener('click', function(ev) {
        if (!settingsPanel.contains(ev.target) && ev.target !== settingsBtn) {
          settingsPanel.classList.remove('open');
        }
      });
      // Toggle column visibility
      settingsPanel.querySelectorAll('input[data-col]').forEach(function(chk) {
        chk.addEventListener('change', function() {
          var col = chk.dataset.col;
          var show = chk.checked;
          // Update _colDefs
          (window._colDefs || []).forEach(function(c) { if (c.key === col) c.visible = show; });
          // Toggle header
          var th = document.querySelector('#itemsHead th[data-col="' + col + '"]');
          if (th) th.style.display = show ? '' : 'none';
          // Toggle all body + footer cells
          document.querySelectorAll('#itemsTable td[data-col="' + col + '"]').forEach(function(td) {
            td.style.display = show ? '' : 'none';
          });
          // Auto-save column preferences
          _saveColPrefs();
        });
      });
      // "More Settings" link -> go to settings page
      var moreLink = document.getElementById('colMoreSettings');
      if (moreLink) moreLink.addEventListener('click', function() {
        settingsPanel.classList.remove('open');
        window.goTo('settings');
      });
    })();

    // Save column prefs to server
    function _saveColPrefs() {
      var prefs = {};
      (window._colDefs || []).forEach(function(c) {
        if (!c.always) prefs[c.key] = c.visible;
      });
      var is = (currentUser && currentUser.item_settings) ? Object.assign({}, currentUser.item_settings) : {};
      is.visible_columns = prefs;
      api('PUT', '/api/auth/profile', { item_settings: is }).then(function(data) {
        if (data && data.user) currentUser = data.user;
      });
    }

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
        // Store selected party ID for party-wise item rates
        window._selectedPartyId = p.id || p._id || null;
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
    var _cd = window._colDefs || [];
    function _cv(key) {
      for (var i = 0; i < _cd.length; i++) { if (_cd[i].key === key) return _cd[i].visible ? '' : ' style="display:none"'; }
      return '';
    }
    var rowNum = document.getElementById('itemsBody') ? document.getElementById('itemsBody').children.length + 1 : 1;
    // Build custom field cells
    var cfCells = '';
    _cd.forEach(function(c) {
      if (c.custom) {
        cfCells += '<td data-col="' + c.key + '"' + _cv(c.key) + '><input data-f="' + c.key + '" placeholder="' + c.label + '"></td>';
      }
    });
    tr.innerHTML =
      '<td class="row-num" style="text-align:center;color:var(--text-muted);font-weight:500">' + rowNum + '</td>' +
      '<td data-col="name"' + _cv('name') + '><div class="ac-wrap"><input data-f="name" placeholder="Item name" autocomplete="off"><div class="ac-dropdown"></div></div></td>' +
      '<td data-col="hsn"' + _cv('hsn') + '><input data-f="hsn" placeholder="HSN"></td>' +
      '<td data-col="size"' + _cv('size') + '><input data-f="size" placeholder="Size"></td>' +
      '<td data-col="mrp"' + _cv('mrp') + '><input data-f="mrp" type="number" min="0" step="0.01" placeholder="0"></td>' +
      '<td data-col="qty"' + _cv('qty') + '><input data-f="qty" type="number" min="1" value="1"></td>' +
      '<td data-col="unit"' + _cv('unit') + '><select data-f="unit">' + unitOptions('Pcs') + '</select></td>' +
      '<td data-col="rate"' + _cv('rate') + '><input data-f="rate" type="number" min="0" step="0.01" placeholder="0"></td>' +
      cfCells +
      '<td data-col="disc_pct"' + _cv('disc_pct') + '><input data-f="disc_pct" type="number" min="0" max="100" step="0.01" placeholder="0"></td>' +
      '<td data-col="disc_amt"' + _cv('disc_amt') + ' class="amt" data-f="disc_amt">\u20B90</td>' +
      '<td data-col="gst"' + _cv('gst') + '><select data-f="gst">' + gstOpts + '</select></td>' +
      '<td data-col="gst_amount"' + _cv('gst_amount') + ' class="amt" data-f="gst_amount">\u20B90</td>' +
      '<td data-col="amount"' + _cv('amount') + ' class="amt" data-f="amount">\u20B90</td>' +
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
        // Store product id on the row for reference
        row.setAttribute('data-product-id', p.id || p._id || '');
        // Check party-wise rate if enabled
        var isSettings = (currentUser && currentUser.item_settings) || {};
        var partyId = window._selectedPartyId;
        var productId = p.id || p._id;
        if (isSettings.party_rate && partyId && productId) {
          api('GET', '/api/party-rates/' + partyId + '/' + productId).then(function (res) {
            if (res.found && res.rate !== null) {
              row.querySelector('[data-f="rate"]').value = res.rate;
              // Show indicator
              var rateInput = row.querySelector('[data-f="rate"]');
              rateInput.style.borderColor = 'var(--primary)';
              rateInput.title = 'Party-specific rate applied';
              recalculate();
            }
          }).catch(function () {});
        }
        recalculate();
      }
    );
    recalculate();
  }

  function recalculate() {
    var rows = document.querySelectorAll('#itemsBody tr');
    var subtotal = 0, totalDiscount = 0, totalCgst = 0, totalSgst = 0, totalIgst = 0, totalMrpVal = 0;
    var totalQty = 0;
    var pos = document.getElementById('posState').value;
    var businessState = currentUser ? currentUser.state : '';
    var isIntra = pos && businessState && pos === businessState;

    var rowIdx = 0;
    rows.forEach(function (tr) {
      // Update row numbers
      rowIdx++;
      var numCell = tr.querySelector('.row-num');
      if (numCell) numCell.textContent = rowIdx;
      var qty = parseFloat(tr.querySelector('[data-f="qty"]').value) || 0;
      var rate = parseFloat(tr.querySelector('[data-f="rate"]').value) || 0;
      var mrp = parseFloat(tr.querySelector('[data-f="mrp"]').value) || 0;
      var gst = parseFloat(tr.querySelector('[data-f="gst"]').value) || 0;
      var discPct = parseFloat(tr.querySelector('[data-f="disc_pct"]').value) || 0;
      var lineTotal = qty * rate;
      var discAmt = lineTotal * discPct / 100;
      var afterDisc = lineTotal - discAmt;
      var gstAmt = afterDisc * gst / 100;
      var amount = afterDisc + gstAmt;
      subtotal += lineTotal;
      totalDiscount += discAmt;
      totalMrpVal += mrp * qty;
      totalQty += qty;
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

    // You Saved: MRP savings (MRP - Rate per item) + discount savings
    var youSaved = 0;
    // MRP savings: difference between total MRP and subtotal (rate-based total)
    if (totalMrpVal > subtotal) youSaved += totalMrpVal - subtotal;
    // Plus discount savings
    youSaved += totalDiscount;
    var savedRow = document.getElementById('rowYouSaved');
    if (savedRow) {
      if (youSaved > 0) {
        savedRow.style.display = '';
        document.getElementById('sumYouSaved').textContent = formatINR(youSaved);
      } else {
        savedRow.style.display = 'none';
      }
    }
    // Update footer totals
    var footerTotal = document.getElementById('footerTotal');
    if (footerTotal) footerTotal.textContent = formatINR(roundedTotal);
    var footerQty = document.getElementById('footerQty');
    if (footerQty) footerQty.textContent = totalQty;
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
      var itemObj = { name: name, hsn: hsn, size: size, mrp: mrp, qty: qty, unit: unit, rate: rate, gst: gst, disc_pct: discPct, disc_amt: Math.round(discAmt * 100) / 100 };
      // Collect custom field values
      (window._colDefs || []).forEach(function(c) {
        if (c.custom) {
          var cfInp = tr.querySelector('[data-f="' + c.key + '"]');
          if (cfInp) itemObj[c.key] = cfInp.value.trim();
        }
      });
      items.push(itemObj);
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

  // ═══════════════════════════════════════════════════════════
  // SALE DOCUMENTS (Estimates, Proforma, Challans, Sale Returns)
  // ═══════════════════════════════════════════════════════════

  var SALE_DOC_META = {
    estimate:    { title: 'Estimate / Quotation', plural: 'Estimates', listPage: 'estimates',    createPage: 'new-estimate',    detailPage: 'estimate',    prefix: 'EST',  printTitle: 'Estimate',          canConvert: true,  dueDateLabel: 'Valid Until',      extraFields: [] },
    proforma:    { title: 'Proforma Invoice',     plural: 'Proforma Invoices', listPage: 'proformas', createPage: 'new-proforma', detailPage: 'proforma', prefix: 'PI',   printTitle: 'Proforma Invoice',  canConvert: true,  dueDateLabel: 'Due Date',         extraFields: [] },
    challan:     { title: 'Delivery Challan',     plural: 'Delivery Challans', listPage: 'challans',  createPage: 'new-challan',  detailPage: 'challan',  prefix: 'DC',   printTitle: 'Delivery Challan',  canConvert: true,  dueDateLabel: 'Date',             extraFields: [] },
    sale_return: { title: 'Sale Return / Cr. Note', plural: 'Sale Returns', listPage: 'sale-returns', createPage: 'new-sale-return', detailPage: 'sale-return', prefix: 'SR', printTitle: 'Credit Note', canConvert: false, dueDateLabel: 'Date', extraFields: ['reason','reference_id'] }
  };

  function saleDocStatusBadge(s) {
    var map = {
      draft: 'draft', sent: 'sent', accepted: 'accepted', rejected: 'rejected',
      converted: 'converted', expired: 'expired', delivered: 'delivered', refunded: 'refunded'
    };
    var cls = map[s] || 'draft';
    return '<span class="badge badge-' + cls + '">' + (s || 'draft').charAt(0).toUpperCase() + (s || 'draft').slice(1) + '</span>';
  }

  // ── Shared List Page ──
  function renderSaleDocList(docType) {
    var meta = SALE_DOC_META[docType];
    $pageTitle.textContent = meta.plural;
    $content.innerHTML = '<p style="color:var(--text-muted)">Loading...</p>';
    api('GET', '/api/sale-docs?type=' + docType).then(function (data) {
      var list = data.documents || [];
      var html = '<div class="page-actions">' +
        '<div class="page-search"><svg width="16" height="16" fill="none" stroke="var(--text-muted)" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>' +
        '<input id="sdSearch" placeholder="Search ' + meta.plural.toLowerCase() + '..." autocomplete="off"></div>' +
        '<button type="button" class="btn btn-primary btn-sm" onclick="window.goTo(\'' + meta.createPage + '\')">+ New ' + meta.title.split('/')[0].trim() + '</button></div>';
      html += '<div class="table-card"><div class="table-header"><h3>' + meta.plural + ' (' + list.length + ')</h3></div>';
      if (list.length) {
        html += '<div class="table-wrap"><table><thead><tr>' +
          '<th>' + meta.prefix + ' #</th><th>Date</th><th>Customer</th><th class="text-right">Amount</th><th>Status</th></tr></thead><tbody>';
        list.forEach(function (doc) {
          var docId = doc.id || doc._id;
          var badge = saleDocStatusBadge(doc.status);
          // Check expired for estimates
          if (docType === 'estimate' && doc.due_date && (doc.status === 'draft' || doc.status === 'sent')) {
            var today = new Date().toISOString().slice(0, 10);
            if (doc.due_date < today) badge = saleDocStatusBadge('expired');
          }
          html += '<tr style="cursor:pointer" onclick="window.goTo(\'' + meta.detailPage + '\',\'' + docId + '\')">' +
            '<td><strong>' + doc.doc_number + '</strong></td><td>' + formatDate(doc.doc_date) + '</td>' +
            '<td>' + (doc.customer_name || '-') + '</td><td class="text-right">' + formatINR(doc.total || 0) + '</td>' +
            '<td>' + badge + '</td></tr>';
        });
        html += '</tbody></table></div>';
      } else {
        html += '<div class="empty-state">No ' + meta.plural.toLowerCase() + ' yet. <button type="button" onclick="window.goTo(\'' + meta.createPage + '\')" style="color:var(--primary);background:none;border:none;cursor:pointer;font:inherit;font-weight:600;text-decoration:underline">Create one now!</button></div>';
      }
      html += '</div>';
      $content.innerHTML = html;
      // Search filter
      var searchInput = document.getElementById('sdSearch');
      if (searchInput) {
        searchInput.addEventListener('input', function () {
          var q = this.value.toLowerCase();
          var rows = $content.querySelectorAll('tbody tr');
          rows.forEach(function (row) { row.style.display = row.textContent.toLowerCase().indexOf(q) !== -1 ? '' : 'none'; });
        });
      }
    }).catch(function () {
      $content.innerHTML = '<div class="empty-state">Failed to load ' + meta.plural.toLowerCase() + '.</div>';
    });
  }

  // ── Shared Create Form ──
  var saleDocItemCounter = 0;
  function renderSaleDocForm(docType) {
    var meta = SALE_DOC_META[docType];
    $pageTitle.textContent = 'New ' + meta.title;
    var today = new Date().toISOString().slice(0, 10);
    var bizName = currentUser ? (currentUser.business_name || currentUser.name || 'Rupiya') : 'Rupiya';

    var html = '<form id="saleDocForm" novalidate>';
    // Header
    html += '<div class="sale-header">' +
      '<div class="sale-header-left"><h2 class="sale-title">' + esc(meta.title) + '</h2></div>' +
      '<div class="sale-biz"><span class="user-avatar" style="width:30px;height:30px;font-size:0.75rem">' + bizName.charAt(0).toUpperCase() + '</span> ' + esc(bizName) + '</div></div>';

    // Top: Customer (left) + Details (right)
    html += '<div class="sale-top"><div class="sale-customer">' +
      '<div class="form-group"><label>Customer *</label><div class="ac-wrap"><input id="sdCName" placeholder="Search or select customer" autocomplete="off"><div class="ac-dropdown" id="sdCNameAc"></div></div></div>' +
      '<div class="form-group"><label>Phone No.</label><input id="sdCPhone" placeholder="Phone number"></div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
        '<div class="form-group"><label>Email</label><input id="sdCEmail" type="email" placeholder="Email"></div>' +
        '<div class="form-group"><label>GSTIN</label><input id="sdCGstin" placeholder="GSTIN" maxlength="15" style="text-transform:uppercase"></div></div>' +
      '<div class="form-group"><label>Address</label><input id="sdCAddress" placeholder="Address"></div>' +
      '<div class="form-group"><label>State</label><select id="sdCState">' + stateOptions('') + '</select></div>';

    // Sale return: invoice reference selector
    if (docType === 'sale_return') {
      html += '<div class="form-group"><label>Original Invoice #</label><div class="ac-wrap"><input id="sdRefInvoice" placeholder="Search invoice number..." autocomplete="off"><div class="ac-dropdown" id="sdRefInvoiceAc"></div></div></div>';
      html += '<div class="form-group"><label>Reason for Return</label><input id="sdReason" placeholder="Reason for return/credit note"></div>';
    }
    html += '</div>';

    html += '<div class="sale-details">' +
      '<div class="detail-row"><span class="detail-label">' + meta.prefix + ' Number</span><span class="detail-value">Auto</span></div>' +
      '<div class="detail-row"><span class="detail-label">Date</span><input id="sdDate" type="date" value="' + today + '"></div>';
    if (docType !== 'sale_return') {
      html += '<div class="detail-row"><span class="detail-label">' + meta.dueDateLabel + '</span><input id="sdDueDate" type="date" value="' + today + '"></div>';
    }
    html += '<div class="detail-row"><span class="detail-label">State of supply</span><select id="sdPosState">' + stateOptions(currentUser ? currentUser.state : '') + '</select></div>' +
    '</div></div>';

    // Items table
    html += '<div class="sale-items"><div class="table-wrap"><table class="items-table" style="min-width:1100px"><thead><tr>' +
      '<th style="width:15%">Item Name</th><th style="width:7%">HSN</th>' +
      '<th style="width:6%">Size</th><th style="width:7%">MRP</th>' +
      '<th style="width:5%">Qty</th><th style="width:7%">Unit</th>' +
      '<th style="width:8%">Price/Unit</th><th style="width:5%">Disc%</th><th style="width:7%">Disc\u20B9</th>' +
      '<th style="width:6%">GST%</th><th style="width:7%">GST\u20B9</th><th style="width:8%">Amount</th><th style="width:30px"></th>' +
    '</tr></thead><tbody id="sdItemsBody"></tbody></table></div>' +
    '<div class="sale-items-actions"><button type="button" class="btn btn-outline btn-sm" id="sdAddItemBtn">+ Add Item</button></div></div>';

    // Bottom: Notes + Totals
    html += '<div class="sale-bottom"><div class="sale-notes">' +
      '<textarea id="sdNotes" placeholder="Add notes..."></textarea></div>' +
      '<div class="sale-totals"><table class="summary-table">' +
        '<tr><td>Subtotal</td><td id="sdSumSubtotal">\u20B90.00</td></tr>' +
        '<tr><td>Discount</td><td id="sdSumDiscount">-\u20B90.00</td></tr>' +
        '<tr id="sdRowCgst"><td>CGST</td><td id="sdSumCgst">\u20B90.00</td></tr>' +
        '<tr id="sdRowSgst"><td>SGST</td><td id="sdSumSgst">\u20B90.00</td></tr>' +
        '<tr id="sdRowIgst"><td>IGST</td><td id="sdSumIgst">\u20B90.00</td></tr>' +
        '<tr><td><label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" id="sdRoundOffChk" checked> Round Off</label></td><td id="sdSumRoundOff">\u20B90.00</td></tr>' +
        '<tr class="total-row"><td>Total</td><td id="sdSumTotal">\u20B90.00</td></tr>' +
      '</table></div></div>';

    // Actions
    html += '<div class="sale-actions">' +
      '<button type="button" class="btn btn-ghost btn-lg" onclick="window.goTo(\'' + meta.listPage + '\')">&larr; Back</button>' +
      '<button type="submit" class="btn btn-primary btn-lg" style="min-width:140px">Save</button></div></form>';

    $content.innerHTML = html;
    sdAddItemRow();

    // Event listeners
    document.getElementById('sdAddItemBtn').addEventListener('click', sdAddItemRow);
    document.getElementById('sdPosState').addEventListener('change', sdRecalculate);
    document.getElementById('sdRoundOffChk').addEventListener('change', sdRecalculate);
    document.getElementById('saleDocForm').addEventListener('submit', function (e) {
      e.preventDefault();
      sdSubmit(docType);
    });

    // Party autocomplete
    acSearch(document.getElementById('sdCName'), document.getElementById('sdCNameAc'), '/api/parties',
      function (p, q) {
        return '<div class="ac-main">' + acHL(p.name, q) + '</div>' +
          (p.gstin || p.phone ? '<div class="ac-sub">' +
            (p.gstin ? 'GSTIN: ' + p.gstin : '') +
            (p.gstin && p.phone ? ' \u2022 ' : '') +
            (p.phone ? 'Ph: ' + p.phone : '') + '</div>' : '');
      },
      function (p) {
        document.getElementById('sdCName').value = p.name;
        if (p.phone) document.getElementById('sdCPhone').value = p.phone;
        if (p.email) document.getElementById('sdCEmail').value = p.email;
        if (p.gstin) document.getElementById('sdCGstin').value = p.gstin;
        if (p.address) document.getElementById('sdCAddress').value = p.address;
        if (p.state) document.getElementById('sdCState').value = p.state;
      }
    );

    // Invoice reference autocomplete for sale returns
    if (docType === 'sale_return') {
      acSearch(document.getElementById('sdRefInvoice'), document.getElementById('sdRefInvoiceAc'), '/api/invoices',
        function (inv, q) {
          return '<div class="ac-main">' + acHL(inv.invoice_number, q) + '</div>' +
            '<div class="ac-sub">' + (inv.customer_name || '') + ' \u2022 ' + formatINR(inv.total || 0) + '</div>';
        },
        function (inv) {
          document.getElementById('sdRefInvoice').value = inv.invoice_number;
          document.getElementById('sdRefInvoice').setAttribute('data-ref-id', inv.id || inv._id);
          // Auto-fill customer info from invoice
          document.getElementById('sdCName').value = inv.customer_name || '';
          if (inv.customer_phone) document.getElementById('sdCPhone').value = inv.customer_phone;
          if (inv.customer_email) document.getElementById('sdCEmail').value = inv.customer_email;
          if (inv.customer_gstin) document.getElementById('sdCGstin').value = inv.customer_gstin;
          if (inv.customer_address) document.getElementById('sdCAddress').value = inv.customer_address;
          if (inv.customer_state) document.getElementById('sdCState').value = inv.customer_state;
          // Auto-populate items from the invoice
          var tbody = document.getElementById('sdItemsBody');
          tbody.innerHTML = '';
          (inv.items || []).forEach(function (item) {
            sdAddItemRow();
            var lastRow = tbody.lastElementChild;
            if (lastRow) {
              lastRow.querySelector('[data-f="name"]').value = item.name || '';
              lastRow.querySelector('[data-f="hsn"]').value = item.hsn || '';
              lastRow.querySelector('[data-f="size"]').value = item.size || '';
              lastRow.querySelector('[data-f="mrp"]').value = item.mrp || 0;
              lastRow.querySelector('[data-f="qty"]').value = item.qty || 1;
              lastRow.querySelector('[data-f="rate"]').value = item.rate || 0;
              if (item.gst !== undefined) lastRow.querySelector('[data-f="gst"]').value = item.gst;
              if (item.unit) lastRow.querySelector('[data-f="unit"]').value = item.unit;
              if (item.disc_pct) lastRow.querySelector('[data-f="disc_pct"]').value = item.disc_pct;
            }
          });
          sdRecalculate();
        }
      );
    }
  }

  function sdAddItemRow() {
    var idx = saleDocItemCounter++;
    var gstOpts = GST_RATES.map(function (r) {
      return '<option value="' + r + '"' + (r === 18 ? ' selected' : '') + '>' + r + '%</option>';
    }).join('');
    var tr = document.createElement('tr');
    tr.id = 'sd-item-' + idx;
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
    document.getElementById('sdItemsBody').appendChild(tr);
    tr.querySelectorAll('input').forEach(function (el) { el.addEventListener('input', sdRecalculate); });
    tr.querySelectorAll('select').forEach(function (el) { el.addEventListener('change', sdRecalculate); });
    tr.querySelector('.remove-item').addEventListener('click', function () {
      if (document.getElementById('sdItemsBody').children.length > 1) { tr.remove(); sdRecalculate(); }
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
        sdRecalculate();
      }
    );
    sdRecalculate();
  }

  function sdRecalculate() {
    var rows = document.querySelectorAll('#sdItemsBody tr');
    var subtotal = 0, totalDiscount = 0, totalCgst = 0, totalSgst = 0, totalIgst = 0;
    var posEl = document.getElementById('sdPosState');
    var pos = posEl ? posEl.value : '';
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
    var roundOffChk = document.getElementById('sdRoundOffChk');
    var roundedTotal, roundOff;
    if (roundOffChk && roundOffChk.checked) {
      roundedTotal = Math.round(totalBeforeRound);
      roundOff = roundedTotal - totalBeforeRound;
    } else {
      roundedTotal = Math.round(totalBeforeRound * 100) / 100;
      roundOff = 0;
    }

    document.getElementById('sdSumSubtotal').textContent = formatINR(subtotal);
    document.getElementById('sdSumDiscount').textContent = '-' + formatINR(totalDiscount);
    document.getElementById('sdSumCgst').textContent = formatINR(totalCgst);
    document.getElementById('sdSumSgst').textContent = formatINR(totalSgst);
    document.getElementById('sdSumIgst').textContent = formatINR(totalIgst);
    document.getElementById('sdSumRoundOff').textContent = (roundOff >= 0 ? '+' : '') + formatINR(roundOff);
    document.getElementById('sdSumTotal').textContent = formatINR(roundedTotal);
    document.getElementById('sdRowCgst').style.display = totalIgst > 0 ? 'none' : '';
    document.getElementById('sdRowSgst').style.display = totalIgst > 0 ? 'none' : '';
    document.getElementById('sdRowIgst').style.display = totalIgst > 0 ? '' : 'none';
  }

  function sdSubmit(docType) {
    var meta = SALE_DOC_META[docType];
    var rows = document.querySelectorAll('#sdItemsBody tr');
    var posEl = document.getElementById('sdPosState');
    var pos = posEl ? posEl.value : '';
    var businessState = currentUser ? currentUser.state : '';
    var isIntra = pos && businessState && pos === businessState;
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

    var customerName = document.getElementById('sdCName').value.trim();
    var docDate = document.getElementById('sdDate').value;
    if (!customerName) { showToast('Please enter customer name', 'error'); document.getElementById('sdCName').focus(); return; }
    if (!docDate) { showToast('Please select date', 'error'); return; }
    if (!items.length) { showToast('Add at least one item with a name', 'error'); return; }

    var taxableAfterDisc = subtotal - totalDiscount;
    var totalBeforeRound = taxableAfterDisc + totalCgst + totalSgst + totalIgst;
    var roundOffChk = document.getElementById('sdRoundOffChk');
    var roundedTotal, roundOff;
    if (roundOffChk && roundOffChk.checked) {
      roundedTotal = Math.round(totalBeforeRound);
      roundOff = Math.round((roundedTotal - totalBeforeRound) * 100) / 100;
    } else {
      roundedTotal = Math.round(totalBeforeRound * 100) / 100;
      roundOff = 0;
    }

    var dueDateEl = document.getElementById('sdDueDate');
    var body = {
      doc_type: docType,
      doc_date: docDate,
      due_date: dueDateEl ? dueDateEl.value : null,
      customer_name: customerName,
      customer_phone: document.getElementById('sdCPhone').value.trim(),
      customer_email: document.getElementById('sdCEmail').value.trim(),
      customer_address: document.getElementById('sdCAddress').value.trim(),
      customer_gstin: document.getElementById('sdCGstin').value.trim().toUpperCase(),
      customer_state: document.getElementById('sdCState').value,
      place_of_supply: pos,
      items: items,
      subtotal: Math.round(subtotal * 100) / 100,
      discount: Math.round(totalDiscount * 100) / 100,
      cgst: Math.round(totalCgst * 100) / 100,
      sgst: Math.round(totalSgst * 100) / 100,
      igst: Math.round(totalIgst * 100) / 100,
      round_off: roundOff,
      total: roundedTotal,
      total_mrp: Math.round(totalMrp * 100) / 100,
      notes: document.getElementById('sdNotes').value.trim(),
      status: 'draft'
    };

    // Sale return extras
    if (docType === 'sale_return') {
      var refEl = document.getElementById('sdRefInvoice');
      body.reference_id = refEl ? refEl.getAttribute('data-ref-id') || null : null;
      var reasonEl = document.getElementById('sdReason');
      body.reason = reasonEl ? reasonEl.value.trim() : '';
    }

    var submitBtn = document.querySelector('#saleDocForm button[type="submit"]');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Saving...'; }
    api('POST', '/api/sale-docs', body).then(function (data) {
      if (data.error) {
        showToast(data.error, 'error');
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Save'; }
        return;
      }
      showToast(data.message || 'Document created!', 'success');
      window.goTo(meta.detailPage, data.document.id || data.document._id);
    }).catch(function () {
      showToast('Failed to create ' + meta.title.toLowerCase(), 'error');
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Save'; }
    });
  }

  // ── Shared Detail/View Page ──
  function renderSaleDocDetail(docType, id) {
    var meta = SALE_DOC_META[docType];
    $pageTitle.textContent = meta.title;
    $content.innerHTML = '<p style="color:var(--text-muted)">Loading...</p>';

    api('GET', '/api/sale-docs/' + id).then(function (data) {
      if (data.error) { showToast(data.error, 'error'); window.goTo(meta.listPage); return; }
      var doc = data.document;
      var items = doc.items || [];
      var u = currentUser || {};
      var isIntra = !doc.igst || doc.igst === 0;
      var taxSummary = computeTaxSummary(items, isIntra);
      var theme = u.invoice_theme || 'classic';

      // Check if expired (for estimates)
      var isExpired = false;
      if (docType === 'estimate' && doc.due_date && (doc.status === 'draft' || doc.status === 'sent')) {
        var today = new Date().toISOString().slice(0, 10);
        if (doc.due_date < today) isExpired = true;
      }

      // Action buttons
      var html = '<div class="no-print" style="display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap">';
      html += '<button type="button" class="btn btn-primary" onclick="window.print()">Print / PDF</button>';
      if (meta.canConvert && doc.status !== 'converted') {
        html += '<button type="button" class="btn btn-secondary" id="sdConvertBtn">Convert to Invoice</button>';
      }
      if (doc.status === 'draft') {
        html += '<button type="button" class="btn btn-outline" id="sdMarkSentBtn">Mark as Sent</button>';
      }
      if (docType === 'challan' && doc.status === 'sent') {
        html += '<button type="button" class="btn btn-outline" id="sdMarkDeliveredBtn">Mark Delivered</button>';
      }
      html += '<button type="button" class="btn btn-danger" id="sdDeleteBtn">Delete</button>';
      html += '<button type="button" class="btn btn-ghost" onclick="window.goTo(\'' + meta.listPage + '\')">\u2190 Back</button></div>';

      // Print area (reuse invoice print layout)
      html += '<div class="invoice-print theme-' + theme + '" id="sdPrintArea">';
      // Title bar
      html += '<div class="inv-title-bar"><h2>' + meta.printTitle + (isExpired ? ' (EXPIRED)' : '') + '</h2></div>';

      // Business header
      var hasLogo = u.logo ? true : false;
      html += '<div class="inv-biz-header' + (hasLogo ? ' has-logo' : '') + '">';
      html += '<div class="biz-info"><h3 class="biz-name">' + esc(u.business_name || u.name || 'Your Business') + '</h3>';
      if (u.address) html += '<p>' + esc(u.address) + (u.city ? ', ' + esc(u.city) : '') + (u.state ? ', ' + esc(u.state) : '') + (u.pincode ? ' - ' + esc(u.pincode) : '') + '</p>';
      if (u.gstin) html += '<p><strong>GSTIN:</strong> ' + esc(u.gstin) + '</p>';
      if (u.phone) html += '<p>Ph: ' + esc(u.phone) + (u.email ? ' | ' + esc(u.email) : '') + '</p>';
      html += '</div>';
      if (hasLogo) html += '<div class="biz-logo"><img src="' + u.logo + '" alt="Logo"></div>';
      html += '</div>';

      // Info row
      html += '<div class="inv-info-row"><div>';
      html += '<div class="inv-info-label">Bill To</div>';
      html += '<p><strong>' + esc(doc.customer_name || '') + '</strong></p>';
      if (doc.customer_address) html += '<p>' + esc(doc.customer_address) + '</p>';
      if (doc.customer_state) html += '<p>' + esc(doc.customer_state) + '</p>';
      if (doc.customer_gstin) html += '<p>GSTIN: ' + esc(doc.customer_gstin) + '</p>';
      if (doc.customer_phone) html += '<p>Ph: ' + esc(doc.customer_phone) + '</p>';
      html += '</div><div style="text-align:right">';
      html += '<div class="inv-info-label">' + meta.printTitle + ' Details</div>';
      html += '<p><strong>' + meta.prefix + ' #:</strong> ' + doc.doc_number + '</p>';
      html += '<p><strong>Date:</strong> ' + formatDateSlash(doc.doc_date) + '</p>';
      if (doc.due_date) html += '<p><strong>' + meta.dueDateLabel + ':</strong> ' + formatDateSlash(doc.due_date) + '</p>';
      if (doc.place_of_supply) html += '<p><strong>Place of Supply:</strong> ' + esc(doc.place_of_supply) + '</p>';
      html += '<p><strong>Status:</strong> ' + saleDocStatusBadge(isExpired ? 'expired' : doc.status) + '</p>';
      if (doc.reason) html += '<p><strong>Reason:</strong> ' + esc(doc.reason) + '</p>';
      html += '</div></div>';

      // Items table
      html += '<table class="inv-items-table"><thead><tr style="text-align:left">';
      html += '<th style="text-align:left">#</th><th style="text-align:left">Item</th><th>HSN</th><th>Qty</th><th>Rate</th><th>GST</th><th>Amount</th></tr></thead><tbody>';
      var totalInclAmount = 0;
      items.forEach(function (item, i) {
        var lineTotal = (item.qty || 0) * (item.rate || 0);
        var discAmt = item.disc_amt || (lineTotal * (item.disc_pct || 0) / 100);
        var taxable = lineTotal - discAmt;
        var gstAmt = taxable * (item.gst || 0) / 100;
        var amount = taxable + gstAmt;
        totalInclAmount += amount;
        html += '<tr><td style="text-align:left">' + (i + 1) + '</td>';
        html += '<td style="text-align:left">' + esc(item.name || '') + (item.size ? '<br><small>' + esc(item.size) + '</small>' : '') + '</td>';
        html += '<td>' + (item.hsn || '-') + '</td>';
        html += '<td>' + (item.qty || 0) + ' ' + (item.unit || 'Pcs') + '</td>';
        html += '<td>' + formatINR(item.rate || 0) + '</td>';
        html += '<td>' + formatINR(gstAmt) + '<br><small>(' + (item.gst || 0) + '%)</small></td>';
        html += '<td>' + formatINR(amount) + '</td></tr>';
      });
      html += '</tbody></table>';

      // Totals
      var displayDiscount = doc.discount || 0;
      var grandTotal = doc.total || 0;
      html += '<div class="inv-totals-section"><table>';
      html += '<tr><td>Sub Total</td><td>:</td><td class="text-right">' + formatINR(totalInclAmount + displayDiscount) + '</td></tr>';
      if (displayDiscount > 0) {
        html += '<tr><td>Discount</td><td>:</td><td class="text-right">-' + formatINR(displayDiscount) + '</td></tr>';
      }
      if (doc.round_off) html += '<tr><td>Round Off</td><td>:</td><td class="text-right">' + (doc.round_off >= 0 ? '+' : '') + formatINR(doc.round_off) + '</td></tr>';
      html += '<tr class="total-row"><td><strong>Total</strong></td><td>:</td><td class="text-right"><strong>' + formatINR(grandTotal) + '</strong></td></tr></table></div>';

      // Amount in words
      html += '<div class="inv-words"><strong>Amount in Words:</strong><br>' + numberToWords(grandTotal) + '</div>';

      // Notes
      if (doc.notes) {
        html += '<div style="padding:12px 30px"><p style="font-size:0.875rem;color:var(--text-muted)"><strong>Notes:</strong> ' + esc(doc.notes) + '</p></div>';
      }

      html += '</div>'; // close invoice-print

      $content.innerHTML = html;

      // Event listeners for buttons
      var convertBtn = document.getElementById('sdConvertBtn');
      if (convertBtn) {
        convertBtn.addEventListener('click', function () {
          if (!confirm('Convert this ' + meta.title.toLowerCase() + ' to an invoice?')) return;
          convertBtn.disabled = true; convertBtn.textContent = 'Converting...';
          api('POST', '/api/sale-docs/' + id + '/convert').then(function (d) {
            if (d.error) { showToast(d.error, 'error'); convertBtn.disabled = false; convertBtn.textContent = 'Convert to Invoice'; return; }
            showToast(d.message || 'Converted!', 'success');
            window.goTo('invoice', d.invoice.id || d.invoice._id);
          }).catch(function () { showToast('Conversion failed', 'error'); convertBtn.disabled = false; convertBtn.textContent = 'Convert to Invoice'; });
        });
      }

      var sentBtn = document.getElementById('sdMarkSentBtn');
      if (sentBtn) {
        sentBtn.addEventListener('click', function () {
          sentBtn.disabled = true;
          api('PUT', '/api/sale-docs/' + id, { status: 'sent' }).then(function (d) {
            if (d.error) { showToast(d.error, 'error'); sentBtn.disabled = false; return; }
            showToast('Marked as sent', 'success');
            renderSaleDocDetail(docType, id);
          }).catch(function () { sentBtn.disabled = false; });
        });
      }

      var deliveredBtn = document.getElementById('sdMarkDeliveredBtn');
      if (deliveredBtn) {
        deliveredBtn.addEventListener('click', function () {
          deliveredBtn.disabled = true;
          api('PUT', '/api/sale-docs/' + id, { status: 'delivered' }).then(function (d) {
            if (d.error) { showToast(d.error, 'error'); deliveredBtn.disabled = false; return; }
            showToast('Marked as delivered', 'success');
            renderSaleDocDetail(docType, id);
          }).catch(function () { deliveredBtn.disabled = false; });
        });
      }

      var deleteBtn = document.getElementById('sdDeleteBtn');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', function () {
          if (!confirm('Delete this ' + meta.title.toLowerCase() + '? This cannot be undone.')) return;
          deleteBtn.disabled = true;
          api('DELETE', '/api/sale-docs/' + id).then(function (d) {
            if (d.error) { showToast(d.error, 'error'); deleteBtn.disabled = false; return; }
            showToast('Deleted', 'success');
            window.goTo(meta.listPage);
          }).catch(function () { deleteBtn.disabled = false; });
        });
      }

    }).catch(function () {
      showToast('Failed to load document', 'error');
      window.goTo(meta.listPage);
    });
  }

  // ═══════════════════════════════════════════════════════════
  // PAYMENT-IN
  // ═══════════════════════════════════════════════════════════

  function renderPaymentsInList() {
    $pageTitle.textContent = 'Payment-In';
    $content.innerHTML = '<p style="color:var(--text-muted)">Loading...</p>';
    api('GET', '/api/payments-in').then(function (data) {
      var list = data.payments || [];
      var html = '<div class="page-actions">' +
        '<div class="page-search"><svg width="16" height="16" fill="none" stroke="var(--text-muted)" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>' +
        '<input id="paySearch" placeholder="Search payments..." autocomplete="off"></div>' +
        '<button type="button" class="btn btn-primary btn-sm" onclick="window.goTo(\'new-payment-in\')">+ Record Payment</button></div>';
      html += '<div class="table-card"><div class="table-header"><h3>Payments Received (' + list.length + ')</h3></div>';
      if (list.length) {
        html += '<div class="table-wrap"><table><thead><tr>' +
          '<th>Payment #</th><th>Date</th><th>Party</th><th>Mode</th><th class="text-right">Amount</th><th>Reference</th><th style="width:60px"></th></tr></thead><tbody>';
        list.forEach(function (pay) {
          var payId = pay.id || pay._id;
          html += '<tr>' +
            '<td><strong>' + pay.payment_number + '</strong></td>' +
            '<td>' + formatDate(pay.payment_date) + '</td>' +
            '<td>' + esc(pay.party_name || '-') + '</td>' +
            '<td><span class="payment-mode-badge">' + (pay.payment_mode || 'cash').toUpperCase() + '</span></td>' +
            '<td class="text-right" style="font-weight:700;color:var(--success)">' + formatINR(pay.amount || 0) + '</td>' +
            '<td>' + esc(pay.reference_number || '-') + '</td>' +
            '<td><button type="button" class="btn btn-sm btn-danger" onclick="event.stopPropagation();window.deletePaymentIn(\'' + payId + '\')" title="Delete">Delete</button></td></tr>';
        });
        html += '</tbody></table></div>';
      } else {
        html += '<div class="empty-state">No payments recorded yet. <button type="button" onclick="window.goTo(\'new-payment-in\')" style="color:var(--primary);background:none;border:none;cursor:pointer;font:inherit;font-weight:600;text-decoration:underline">Record one now!</button></div>';
      }
      html += '</div>';
      // Summary
      if (list.length) {
        var totalReceived = list.reduce(function (s, p) { return s + (p.amount || 0); }, 0);
        html += '<div style="margin-top:16px;text-align:right;font-size:0.9375rem"><strong>Total Received:</strong> <span style="color:var(--success);font-weight:700;font-size:1.125rem">' + formatINR(totalReceived) + '</span></div>';
      }
      $content.innerHTML = html;
      // Search filter
      var searchInput = document.getElementById('paySearch');
      if (searchInput) {
        searchInput.addEventListener('input', function () {
          var q = this.value.toLowerCase();
          var rows = $content.querySelectorAll('tbody tr');
          rows.forEach(function (row) { row.style.display = row.textContent.toLowerCase().indexOf(q) !== -1 ? '' : 'none'; });
        });
      }
    }).catch(function () {
      $content.innerHTML = '<div class="empty-state">Failed to load payments.</div>';
    });
  }

  window.deletePaymentIn = function (id) {
    if (!confirm('Delete this payment? This will reverse the invoice amount if linked.')) return;
    api('DELETE', '/api/payments-in/' + id).then(function (r) {
      if (r.error) return showToast(r.error, 'error');
      showToast(r.message || 'Payment deleted', 'success');
      renderPaymentsInList();
    }).catch(function () { showToast('Failed to delete payment', 'error'); });
  };

  function renderNewPaymentIn() {
    $pageTitle.textContent = 'Record Payment';
    var today = new Date().toISOString().slice(0, 10);

    var html = '<div class="form-card" style="max-width:700px">' +
      '<h3>Record Payment Received</h3>' +
      '<form id="paymentInForm">' +
      '<div class="form-grid">' +
        '<div class="form-group full">' +
          '<label>Party / Customer *</label>' +
          '<div class="ac-wrap"><input id="piPartyName" placeholder="Search party name..." autocomplete="off"><div class="ac-dropdown" id="piPartyAc"></div></div>' +
          '<input type="hidden" id="piPartyId">' +
        '</div>' +
        '<div class="form-group full">' +
          '<label>Select Invoice (optional)</label>' +
          '<div id="piInvoiceList"><p style="color:var(--text-muted);font-size:0.875rem">Select a party first to see unpaid invoices</p></div>' +
          '<input type="hidden" id="piInvoiceId">' +
        '</div>' +
        fg('Amount *', '<input id="piAmount" type="number" min="0.01" step="0.01" placeholder="0.00" required>') +
        fg('Payment Date', '<input id="piDate" type="date" value="' + today + '">') +
        fg('Payment Mode', '<select id="piMode"><option value="cash">Cash</option><option value="bank_transfer">Bank Transfer</option><option value="upi">UPI</option><option value="cheque">Cheque</option><option value="other">Other</option></select>') +
        fg('Reference / Txn No.', '<input id="piRef" placeholder="Cheque no., UPI ref., etc.">') +
        '<div class="form-group full">' +
          '<label>Notes</label>' +
          '<textarea id="piNotes" style="width:100%;min-height:60px;padding:10px;font-family:inherit;font-size:0.875rem;border:1.5px solid var(--border);border-radius:8px;resize:vertical" placeholder="Optional notes..."></textarea>' +
        '</div>' +
      '</div>' +
      '<div class="form-actions">' +
        '<button type="button" class="btn btn-ghost" onclick="window.goTo(\'payments-in\')">Cancel</button>' +
        '<button type="submit" class="btn btn-primary">Save Payment</button>' +
      '</div></form></div>';

    $content.innerHTML = html;

    // Party autocomplete
    acSearch(document.getElementById('piPartyName'), document.getElementById('piPartyAc'), '/api/parties',
      function (p, q) {
        return '<div class="ac-main">' + acHL(p.name, q) + '</div>' +
          (p.phone ? '<div class="ac-sub">Ph: ' + p.phone + '</div>' : '');
      },
      function (p) {
        document.getElementById('piPartyName').value = p.name;
        document.getElementById('piPartyId').value = p.id || p._id || '';
        // Load unpaid invoices for this party
        loadUnpaidInvoices(p.name);
      }
    );

    // Form submit
    document.getElementById('paymentInForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var amount = parseFloat(document.getElementById('piAmount').value) || 0;
      if (amount <= 0) { showToast('Enter a valid amount', 'error'); return; }

      var body = {
        party_name: document.getElementById('piPartyName').value.trim(),
        party_id: document.getElementById('piPartyId').value || null,
        invoice_id: document.getElementById('piInvoiceId').value || null,
        amount: amount,
        payment_date: document.getElementById('piDate').value,
        payment_mode: document.getElementById('piMode').value,
        reference_number: document.getElementById('piRef').value.trim(),
        notes: document.getElementById('piNotes').value.trim()
      };

      var submitBtn = document.querySelector('#paymentInForm button[type="submit"]');
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Saving...'; }
      api('POST', '/api/payments-in', body).then(function (data) {
        if (data.error) {
          showToast(data.error, 'error');
          if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Save Payment'; }
          return;
        }
        showToast(data.message || 'Payment recorded!', 'success');
        window.goTo('payments-in');
      }).catch(function () {
        showToast('Failed to record payment', 'error');
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Save Payment'; }
      });
    });
  }

  function loadUnpaidInvoices(partyName) {
    var container = document.getElementById('piInvoiceList');
    container.innerHTML = '<p style="color:var(--text-muted);font-size:0.875rem">Loading invoices...</p>';
    api('GET', '/api/invoices/unpaid?party=' + encodeURIComponent(partyName)).then(function (data) {
      var invList = data.invoices || [];
      if (!invList.length) {
        container.innerHTML = '<p style="color:var(--text-muted);font-size:0.875rem">No unpaid invoices for this party.</p>';
        return;
      }
      var totalOutstanding = 0;
      var html = '<div style="display:flex;flex-direction:column;gap:8px;max-height:200px;overflow-y:auto">';
      invList.forEach(function (inv) {
        var invId = inv.id || inv._id;
        var outstanding = (inv.total || 0) - (inv.amount_paid || 0);
        totalOutstanding += outstanding;
        html += '<div class="inv-select-card" data-inv-id="' + invId + '" data-outstanding="' + outstanding + '">' +
          '<div><strong>' + inv.invoice_number + '</strong><br><small>' + formatDate(inv.invoice_date) + '</small></div>' +
          '<div style="text-align:right"><div>Total: ' + formatINR(inv.total || 0) + '</div>' +
          '<div class="inv-outstanding">Outstanding: ' + formatINR(outstanding) + '</div></div></div>';
      });
      html += '</div>';
      html += '<div style="margin-top:8px;padding:8px 12px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;display:flex;justify-content:space-between;align-items:center">' +
        '<span style="font-size:0.8125rem;color:#991b1b;font-weight:500">Total Outstanding (' + invList.length + ' invoice' + (invList.length > 1 ? 's' : '') + ')</span>' +
        '<span style="font-size:0.9375rem;color:#dc2626;font-weight:700">' + formatINR(totalOutstanding) + '</span></div>';
      container.innerHTML = html;

      // Click to select invoice
      container.querySelectorAll('.inv-select-card').forEach(function (card) {
        card.addEventListener('click', function () {
          container.querySelectorAll('.inv-select-card').forEach(function (c) { c.classList.remove('selected'); });
          card.classList.add('selected');
          document.getElementById('piInvoiceId').value = card.getAttribute('data-inv-id');
          // Pre-fill amount with outstanding
          var outstanding = parseFloat(card.getAttribute('data-outstanding')) || 0;
          document.getElementById('piAmount').value = outstanding.toFixed(2);
        });
      });
    }).catch(function () {
      container.innerHTML = '<p style="color:var(--text-muted);font-size:0.875rem">Failed to load invoices.</p>';
    });
  }

  // ═══════════════════════════════════════════════════════════
  // PURCHASE & EXPENSE
  // ═══════════════════════════════════════════════════════════

  var PURCHASE_DOC_META = {
    purchase_bill:   { title: 'Purchase Bills', singular: 'Purchase Bill', newPage: 'new-purchase-bill', viewPage: 'purchase-bill', prefix: 'PB', statusOptions: ['unpaid','partial','paid'], statusDefault: 'unpaid' },
    purchase_order:  { title: 'Purchase Orders', singular: 'Purchase Order', newPage: 'new-purchase-order', viewPage: 'purchase-order', prefix: 'PO', statusOptions: ['draft','sent','accepted','rejected','converted'], statusDefault: 'draft' },
    purchase_return: { title: 'Purchase Returns', singular: 'Purchase Return / Dr. Note', newPage: 'new-purchase-return', viewPage: 'purchase-return', prefix: 'PR', statusOptions: ['draft','sent','accepted','refunded'], statusDefault: 'draft' }
  };

  function purchaseStatusBadge(s) {
    var map = { unpaid:'badge-unpaid', partial:'badge-partial', paid:'badge-paid',
      draft:'badge-draft', sent:'badge-sent', accepted:'badge-accepted',
      rejected:'badge-rejected', converted:'badge-converted', refunded:'badge-refunded' };
    return '<span class="badge ' + (map[s] || 'badge-draft') + '">' + esc(s) + '</span>';
  }

  // ── Purchase Doc List ──
  function renderPurchaseDocList(docType) {
    var meta = PURCHASE_DOC_META[docType];
    $pageTitle.textContent = meta.title;
    $content.innerHTML = '<p class="loading">Loading...</p>';
    api('GET', '/api/purchase-docs?type=' + docType).then(function (res) {
      var docs = res.documents || [];
      var now = new Date();
      var firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      var lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      var fmtD = function(d){ return String(d.getDate()).padStart(2,'0') + '/' + String(d.getMonth()+1).padStart(2,'0') + '/' + d.getFullYear(); };
      var thisMonth = docs.filter(function(d) { var dt = new Date(d.doc_date); return dt >= firstDay && dt <= lastDay; });
      var totalAmt = 0, paidAmt = 0;
      thisMonth.forEach(function(d) { totalAmt += (d.total || 0); paidAmt += (d.amount_paid || 0); });

      // Header
      var html = '<div class="pe-page-header">' +
        '<h2>' + meta.title + '</h2>' +
        '<button class="btn-add-primary" onclick="window.goTo(\'' + meta.newPage + '\')">+ Add ' + meta.singular + '</button></div>';

      // Filter bar
      html += '<div class="page-filter-bar">' +
        '<label>Filter by :</label>' +
        '<select id="pdFilterPeriod">' +
        '<option value="this_month" selected>This Month</option><option value="last_month">Last Month</option>' +
        '<option value="this_quarter">This Quarter</option><option value="this_year">This Year</option><option value="all">All Time</option></select>' +
        '<div class="filter-sep"></div>' +
        '<span style="font-size:0.8rem;color:var(--text-muted)">' + fmtD(firstDay) + '  To  ' + fmtD(lastDay) + '</span></div>';

      // Summary
      html += '<div class="summary-card-row">' +
        '<div class="summary-card-box"><div class="sc-label">Total Amount</div><div class="sc-value">' + formatINR(totalAmt) + '</div>' +
        '<div class="sc-sub">Paid: ' + formatINR(paidAmt) + '</div></div></div>';

      if (!thisMonth.length) {
        html += '<div class="pe-empty-state">' +
          '<svg width="80" height="80" fill="none" stroke="var(--text-muted)" stroke-width="1" viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>' +
          '<h3>No ' + meta.title + '</h3><p>You haven\'t added any yet.</p></div>';
      } else {
        html += '<div class="invoice-list" id="pdListCards">';
        thisMonth.forEach(function (d) {
          html += '<div class="invoice-card" onclick="window.goTo(\'' + meta.viewPage + '\',\'' + d.id + '\')" style="cursor:pointer">' +
            '<div class="inv-row"><strong>' + esc(d.doc_number) + '</strong> ' + purchaseStatusBadge(d.status) +
            '<span class="inv-total">' + formatINR(d.total) + '</span></div>' +
            '<div class="inv-row"><span>' + esc(d.supplier_name || 'No supplier') + '</span><span style="color:var(--text-muted);font-size:0.85rem">' + formatDate(d.doc_date) + '</span></div></div>';
        });
        html += '</div>';
      }
      $content.innerHTML = html;
      // Attach filter
      var sel = document.getElementById('pdFilterPeriod');
      if (sel) {
        sel.addEventListener('change', function () {
          var val = sel.value;
          var now2 = new Date(), startD, endD;
          if (val === 'this_month') { startD = new Date(now2.getFullYear(), now2.getMonth(), 1); endD = new Date(now2.getFullYear(), now2.getMonth()+1, 0); }
          else if (val === 'last_month') { startD = new Date(now2.getFullYear(), now2.getMonth()-1, 1); endD = new Date(now2.getFullYear(), now2.getMonth(), 0); }
          else if (val === 'this_quarter') { var q = Math.floor(now2.getMonth()/3)*3; startD = new Date(now2.getFullYear(), q, 1); endD = new Date(now2.getFullYear(), q+3, 0); }
          else if (val === 'this_year') { startD = new Date(now2.getFullYear(), 0, 1); endD = new Date(now2.getFullYear(), 11, 31); }
          else { startD = new Date(2000,0,1); endD = new Date(2099,11,31); }
          var filtered = docs.filter(function(d) { var dt = new Date(d.doc_date); return dt >= startD && dt <= endD; });
          var tAmt = 0, pAmt = 0;
          filtered.forEach(function(d) { tAmt += (d.total || 0); pAmt += (d.amount_paid || 0); });
          var summaryBox = document.querySelector('.summary-card-box');
          if (summaryBox) { summaryBox.querySelector('.sc-value').textContent = formatINR(tAmt); summaryBox.querySelector('.sc-sub').textContent = 'Paid: ' + formatINR(pAmt); }
          var spanEl = sel.parentElement.querySelector('span');
          var fmtD2 = function(d2){ return String(d2.getDate()).padStart(2,'0') + '/' + String(d2.getMonth()+1).padStart(2,'0') + '/' + d2.getFullYear(); };
          if (spanEl && val !== 'all') spanEl.textContent = fmtD2(startD) + '  To  ' + fmtD2(endD);
          else if (spanEl) spanEl.textContent = 'All Time';
          var listEl = document.getElementById('pdListCards');
          var emptyEl = document.querySelector('.pe-empty-state');
          if (!filtered.length) {
            if (listEl) listEl.innerHTML = '';
            if (!emptyEl) {
              var emptyDiv = document.createElement('div');
              emptyDiv.className = 'pe-empty-state';
              emptyDiv.innerHTML = '<svg width="80" height="80" fill="none" stroke="var(--text-muted)" stroke-width="1" viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>' +
                '<h3>No ' + meta.title + '</h3><p>No transactions in this period.</p>';
              $content.appendChild(emptyDiv);
            }
          } else {
            if (emptyEl) emptyEl.remove();
            if (!listEl) { listEl = document.createElement('div'); listEl.className = 'invoice-list'; listEl.id = 'pdListCards'; $content.appendChild(listEl); }
            var cHtml = '';
            filtered.forEach(function (d) {
              cHtml += '<div class="invoice-card" onclick="window.goTo(\'' + meta.viewPage + '\',\'' + d.id + '\')" style="cursor:pointer">' +
                '<div class="inv-row"><strong>' + esc(d.doc_number) + '</strong> ' + purchaseStatusBadge(d.status) +
                '<span class="inv-total">' + formatINR(d.total) + '</span></div>' +
                '<div class="inv-row"><span>' + esc(d.supplier_name || 'No supplier') + '</span><span style="color:var(--text-muted);font-size:0.85rem">' + formatDate(d.doc_date) + '</span></div></div>';
            });
            listEl.innerHTML = cHtml;
          }
        });
      }
    }).catch(function () { $content.innerHTML = '<p class="text-danger">Failed to load ' + meta.title + '</p>'; });
  }

  // ── Purchase Doc Form ──
  function renderPurchaseDocForm(docType) {
    var meta = PURCHASE_DOC_META[docType];
    $pageTitle.textContent = 'New ' + meta.singular;
    var today = new Date().toISOString().slice(0, 10);
    var html = '<form id="purchaseDocForm" class="form-card" onsubmit="return false">' +
      '<div class="sale-header" style="margin-bottom:16px">' +
        '<div class="sale-header-left"><h2 class="sale-title">' + meta.singular + '</h2>' +
        '<div class="sale-type"><label class="type-opt active" data-type="credit"><input type="radio" name="pdPayType" value="credit" checked> Credit</label>' +
        '<label class="type-opt" data-type="cash"><input type="radio" name="pdPayType" value="cash"> Cash</label></div></div></div>' +
      '<div class="form-grid">' +
      '<div class="form-group"><label>Supplier Name *</label><div class="ac-wrap"><input id="pdSupplier" class="form-control" placeholder="Type supplier name" autocomplete="off" required /><div class="ac-list" id="pdSupplierAC"></div></div></div>' +
      '<div class="form-group"><label>Supplier Phone</label><input id="pdPhone" class="form-control" placeholder="Phone" /></div>' +
      '<div class="form-group"><label>Supplier Email</label><input id="pdEmail" class="form-control" placeholder="Email" /></div>' +
      '<div class="form-group"><label>Supplier Address</label><input id="pdAddress" class="form-control" placeholder="Address" /></div>' +
      '<div class="form-group"><label>Supplier GSTIN</label><input id="pdGstin" class="form-control" placeholder="GSTIN" maxlength="15" /></div>' +
      '<div class="form-group"><label>Supplier State</label><input id="pdState" class="form-control" placeholder="State" /></div>' +
      '<div class="form-group"><label>Date</label><input id="pdDate" type="date" class="form-control" value="' + today + '" /></div>' +
      '<div class="form-group"><label>' + (docType === 'purchase_order' ? 'Expected Date' : 'Due Date') + '</label><input id="pdDueDate" type="date" class="form-control" /></div>' +
      '</div>';

    // Purchase items table with column settings (same as sale invoice)
    var pdColSettings = (currentUser && currentUser.item_settings && currentUser.item_settings.pd_visible_columns) || {};
    var _pdIs = (currentUser && currentUser.item_settings) || {};
    var pdColDefs = [
      { key:'name', label:'Item Name', always:true },
      { key:'hsn', label:'HSN/SAC' },
      { key:'size', label: _pdIs.size_label || 'Size' },
      { key:'qty', label:'Qty', always:true },
      { key:'unit', label:'Unit' },
      { key:'rate', label:'Rate', always:true },
      { key:'disc_pct', label:'Disc%' },
      { key:'gst', label:'GST%', always:true },
      { key:'amount', label:'Amount', always:true }
    ];
    // Inject custom fields before Disc%
    var pdCustomFields = _pdIs.custom_fields_list || [];
    if (pdCustomFields.length > 0) {
      var pdDiscIdx = -1;
      for (var pci = 0; pci < pdColDefs.length; pci++) { if (pdColDefs[pci].key === 'disc_pct') { pdDiscIdx = pci; break; } }
      if (pdDiscIdx === -1) pdDiscIdx = pdColDefs.length - 1;
      pdCustomFields.forEach(function(cf) {
        if (cf.name) {
          var cfKey = 'cf_' + cf.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
          pdColDefs.splice(pdDiscIdx, 0, { key: cfKey, label: cf.name, custom: true });
          pdDiscIdx++;
        }
      });
    }
    pdColDefs.forEach(function(c) {
      if (c.always) { c.visible = true; return; }
      c.visible = pdColSettings[c.key] !== undefined ? pdColSettings[c.key] : true;
    });
    window._pdColDefs = pdColDefs;

    html += '<div class="sale-items" style="margin-top:20px"><div class="sale-items-toolbar">' +
      '<span class="toolbar-label">Items</span>' +
      '<button type="button" class="col-settings-btn" id="pdColSettingsBtn" title="Column settings">' +
      '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>' +
      '</button></div>';

    // Column settings panel
    html += '<div class="col-settings-panel" id="pdColSettingsPanel">';
    pdColDefs.forEach(function(c) {
      if (c.always) return;
      html += '<label class="col-toggle-item"><input type="checkbox" data-col="' + c.key + '"' + (c.visible ? ' checked' : '') + '>' +
        '<span>' + c.label + '</span></label>';
    });
    html += '<div class="col-settings-link" id="pdColMoreSettings" style="cursor:pointer"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="vertical-align:-2px"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg> More Settings</div></div>';

    html += '<div class="table-wrap"><table class="items-table" id="pdItemsTable"><thead><tr id="pdItemsHead">' +
      '<th style="width:36px;text-align:center">#</th>';
    pdColDefs.forEach(function(c) {
      var vis = c.visible ? '' : ' style="display:none"';
      html += '<th data-col="' + c.key + '"' + vis + '>' + c.label + '</th>';
    });
    var pdVisColCount = 1;
    pdColDefs.forEach(function(c) { if (c.visible) pdVisColCount++; });
    pdVisColCount++;

    html += '<th style="width:30px"></th></tr></thead><tbody id="pdItemsBody"></tbody>' +
    '<tfoot>' +
    '<tr class="items-addrow-row"><td colspan="' + pdVisColCount + '" style="padding:6px 12px;border-top:1px solid var(--border)">' +
      '<button type="button" class="add-row-inline" id="pdAddItemBtn" title="Add Row">' +
        '<svg width="18" height="18" fill="none" stroke="var(--primary)" stroke-width="2.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>' +
        '<span>ADD ROW</span></button></td></tr>' +
    '<tr class="items-total-row" id="pdItemsTotalRow">' +
      '<td></td>' +
      '<td data-col="name"><strong class="total-label">TOTAL</strong></td>';
    pdColDefs.forEach(function(c) {
      if (c.key === 'name') return;
      var vis = c.visible ? '' : ' style="display:none"';
      if (c.key === 'amount') {
        html += '<td data-col="amount"' + vis + '><strong id="pdFooterTotal">\u20B90</strong></td>';
      } else if (c.key === 'qty') {
        html += '<td data-col="qty"' + vis + '><strong id="pdFooterQty">0</strong></td>';
      } else {
        html += '<td data-col="' + c.key + '"' + vis + '></td>';
      }
    });
    html += '<td></td></tr></tfoot></table></div></div>';

    html += '<div class="form-grid" style="margin-top:18px">' +
      '<div class="form-group"><label>Notes</label><textarea id="pdNotes" class="form-control" rows="2" placeholder="Notes"></textarea></div>' +
      '<div class="form-group"><label>Reference Number</label><input id="pdRefNo" class="form-control" placeholder="Bill / Reference #" /></div>' +
      '</div>' +
      '<div id="pdTotals" class="totals-box"></div>' +
      '<div style="margin-top:18px;display:flex;gap:10px">' +
      '<button type="button" class="btn btn-primary" id="pdSaveBtn">Save ' + meta.singular + '</button>' +
      '<button type="button" class="btn btn-outline" id="pdCancelBtn">Cancel</button></div></form>';
    $content.innerHTML = html;

    // Wire up save + cancel buttons via addEventListener (no inline onclick)
    document.getElementById('pdSaveBtn').addEventListener('click', function() { pdSubmit(docType); });
    document.getElementById('pdCancelBtn').addEventListener('click', function() { window.goTo(meta.newPage.replace('new-','') + 's'); });
    document.getElementById('pdAddItemBtn').addEventListener('click', pdAddItemRow);

    pdAddItemRow();
    pdRecalculate();

    // Supplier autocomplete
    acSearch(document.getElementById('pdSupplier'), document.getElementById('pdSupplierAC'), '/api/parties',
      function (p, q) {
        return '<div class="ac-main">' + acHL(p.name, q) + '</div>' +
          (p.phone ? '<div class="ac-sub">Ph: ' + p.phone + '</div>' : '');
      },
      function (p) {
        document.getElementById('pdSupplier').value = p.name;
        document.getElementById('pdPhone').value = p.phone || '';
        document.getElementById('pdEmail').value = p.email || '';
        document.getElementById('pdAddress').value = p.address || '';
        document.getElementById('pdGstin').value = p.gstin || '';
        document.getElementById('pdState').value = p.state || '';
      });

    // Column settings gear button for purchase docs
    (function() {
      var settingsBtn = document.getElementById('pdColSettingsBtn');
      var settingsPanel = document.getElementById('pdColSettingsPanel');
      if (!settingsBtn || !settingsPanel) return;
      settingsBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        settingsPanel.classList.toggle('open');
      });
      document.addEventListener('click', function(ev) {
        if (!settingsPanel.contains(ev.target) && ev.target !== settingsBtn) {
          settingsPanel.classList.remove('open');
        }
      });
      settingsPanel.querySelectorAll('input[data-col]').forEach(function(chk) {
        chk.addEventListener('change', function() {
          var col = chk.dataset.col;
          var show = chk.checked;
          (window._pdColDefs || []).forEach(function(c) { if (c.key === col) c.visible = show; });
          var th = document.querySelector('#pdItemsHead th[data-col="' + col + '"]');
          if (th) th.style.display = show ? '' : 'none';
          document.querySelectorAll('#pdItemsTable td[data-col="' + col + '"]').forEach(function(td) {
            td.style.display = show ? '' : 'none';
          });
          // Save preferences
          var prefs = {};
          (window._pdColDefs || []).forEach(function(c) { if (!c.always) prefs[c.key] = c.visible; });
          var is = (currentUser && currentUser.item_settings) ? Object.assign({}, currentUser.item_settings) : {};
          is.pd_visible_columns = prefs;
          api('PUT', '/api/auth/profile', { item_settings: is }).then(function(data) {
            if (data && data.user) currentUser = data.user;
          });
        });
      });
      var moreLink = document.getElementById('pdColMoreSettings');
      if (moreLink) moreLink.addEventListener('click', function() {
        settingsPanel.classList.remove('open');
        window.goTo('settings');
      });
    })();

    // Credit / Cash toggle for purchase docs
    document.querySelectorAll('#purchaseDocForm .type-opt input').forEach(function(radio) {
      radio.addEventListener('change', function() {
        document.querySelectorAll('#purchaseDocForm .type-opt').forEach(function(l) { l.classList.remove('active'); });
        radio.parentElement.classList.add('active');
      });
    });
  }

  window.pdAddItemRow = pdAddItemRow;
  window.pdRecalculate = pdRecalculate;
  window.pdSubmit = pdSubmit;

  function pdAddItemRow() {
    var tbody = document.getElementById('pdItemsBody');
    if (!tbody) return;
    var tr = document.createElement('tr');
    var _pcd = window._pdColDefs || [];
    function _pcv(key) {
      for (var i = 0; i < _pcd.length; i++) { if (_pcd[i].key === key) return _pcd[i].visible ? '' : ' style="display:none"'; }
      return '';
    }
    var rowNum = tbody.children.length + 1;
    var gstOpts = GST_RATES.map(function (r) {
      return '<option value="' + r + '"' + (r === 18 ? ' selected' : '') + '>' + r + '%</option>';
    }).join('');
    tr.innerHTML =
      '<td class="row-num" style="text-align:center;color:var(--text-muted);font-weight:500">' + rowNum + '</td>' +
      '<td data-col="name"' + _pcv('name') + '><div class="ac-wrap"><input class="form-control pd-item-name" placeholder="Item name" autocomplete="off" /><div class="ac-list pd-item-ac"></div></div></td>' +
      '<td data-col="hsn"' + _pcv('hsn') + '><input class="form-control pd-item-hsn" placeholder="HSN" /></td>' +
      '<td data-col="size"' + _pcv('size') + '><input class="form-control pd-item-size" placeholder="Size" /></td>' +
      '<td data-col="qty"' + _pcv('qty') + '><input class="form-control pd-item-qty" type="number" value="1" min="0" step="any" /></td>' +
      '<td data-col="unit"' + _pcv('unit') + '><select class="form-control pd-item-unit">' + unitOptions('Pcs') + '</select></td>' +
      '<td data-col="rate"' + _pcv('rate') + '><input class="form-control pd-item-rate" type="number" step="any" value="0" /></td>';
    // Custom field cells for purchase docs - before disc
    var pdCfCells = '';
    _pcd.forEach(function(c) {
      if (c.custom) {
        pdCfCells += '<td data-col="' + c.key + '"' + _pcv(c.key) + '><input class="form-control" data-f="' + c.key + '" placeholder="' + c.label + '" /></td>';
      }
    });
    tr.innerHTML += pdCfCells +
      '<td data-col="disc_pct"' + _pcv('disc_pct') + '><input class="form-control pd-item-disc" type="number" min="0" max="100" step="0.01" value="0" /></td>' +
      '<td data-col="gst"' + _pcv('gst') + '><select class="form-control pd-item-gst">' + gstOpts + '</select></td>' +
      '<td data-col="amount"' + _pcv('amount') + ' class="pd-item-amt" style="text-align:right;white-space:nowrap">\u20B90</td>' +
      '<td><button type="button" class="remove-item" title="Remove">\u00D7</button></td>';
    tbody.appendChild(tr);
    // Remove button
    tr.querySelector('.remove-item').addEventListener('click', function() {
      if (tbody.children.length > 1) { tr.remove(); pdRecalculate(); }
    });
    // Item autocomplete
    var nameInp = tr.querySelector('.pd-item-name');
    var acDiv = tr.querySelector('.pd-item-ac');
    acSearch(nameInp, acDiv, '/api/products',
      function (p, q) {
        return '<div class="ac-main">' + acHL(p.name, q) + '</div>' +
          '<div class="ac-sub">Rate: ' + formatINR(p.rate || 0) + (p.hsn ? ' \u2022 HSN: ' + p.hsn : '') + '</div>';
      },
      function (p) {
        nameInp.value = p.name;
        tr.querySelector('.pd-item-hsn').value = p.hsn || '';
        if (p.size) tr.querySelector('.pd-item-size').value = p.size;
        tr.querySelector('.pd-item-rate').value = p.rate || 0;
        tr.querySelector('.pd-item-gst').value = p.gst || 0;
        if (p.unit) tr.querySelector('.pd-item-unit').value = p.unit;
        pdRecalculate();
      });
    tr.querySelectorAll('input').forEach(function(el) { el.addEventListener('input', pdRecalculate); });
    tr.querySelectorAll('select').forEach(function(el) { el.addEventListener('change', pdRecalculate); });
  }

  function pdRecalculate() {
    var rows = document.querySelectorAll('#pdItemsBody tr');
    var subtotal = 0, totalCgst = 0, totalSgst = 0, totalQty = 0, totalDisc = 0;
    var rowIdx = 0;
    rows.forEach(function (tr) {
      rowIdx++;
      var numCell = tr.querySelector('.row-num');
      if (numCell) numCell.textContent = rowIdx;
      var qty = parseFloat(tr.querySelector('.pd-item-qty').value) || 0;
      var rate = parseFloat(tr.querySelector('.pd-item-rate').value) || 0;
      var gstP = parseFloat(tr.querySelector('.pd-item-gst').value) || 0;
      var discPct = 0;
      var discInp = tr.querySelector('.pd-item-disc');
      if (discInp) discPct = parseFloat(discInp.value) || 0;
      var lineTotal = qty * rate;
      var discAmt = lineTotal * discPct / 100;
      var afterDisc = lineTotal - discAmt;
      var gstAmt = afterDisc * gstP / 100;
      subtotal += lineTotal;
      totalDisc += discAmt;
      totalCgst += gstAmt / 2;
      totalSgst += gstAmt / 2;
      totalQty += qty;
      tr.querySelector('.pd-item-amt').textContent = formatINR(afterDisc + gstAmt);
    });
    var total = subtotal - totalDisc + totalCgst + totalSgst;
    var roundOff = Math.round(total) - total;
    var grandTotal = Math.round(total);
    var box = document.getElementById('pdTotals');
    if (box) {
      box.innerHTML = '<div class="totals-row"><span>Subtotal</span><span>' + formatINR(subtotal) + '</span></div>' +
        (totalDisc > 0 ? '<div class="totals-row"><span>Discount</span><span>-' + formatINR(totalDisc) + '</span></div>' : '') +
        '<div class="totals-row"><span>CGST</span><span>' + formatINR(totalCgst) + '</span></div>' +
        '<div class="totals-row"><span>SGST</span><span>' + formatINR(totalSgst) + '</span></div>' +
        '<div class="totals-row"><span>Round Off</span><span>' + roundOff.toFixed(2) + '</span></div>' +
        '<div class="totals-row total-final"><span>Total</span><span>' + formatINR(grandTotal) + '</span></div>';
    }
    // Update footer totals
    var ft = document.getElementById('pdFooterTotal');
    if (ft) ft.textContent = formatINR(grandTotal);
    var fq = document.getElementById('pdFooterQty');
    if (fq) fq.textContent = totalQty;
  }

  function pdSubmit(docType) {
    var supplier = (document.getElementById('pdSupplier').value || '').trim();
    if (!supplier) return showToast('Supplier name is required', 'error');
    var rows = document.querySelectorAll('#pdItemsBody tr');
    var items = [], subtotal = 0, tCgst = 0, tSgst = 0, tDisc = 0;
    rows.forEach(function (tr) {
      var name = tr.querySelector('.pd-item-name').value.trim();
      if (!name) return;
      var qty = parseFloat(tr.querySelector('.pd-item-qty').value) || 0;
      var rate = parseFloat(tr.querySelector('.pd-item-rate').value) || 0;
      var gst = parseFloat(tr.querySelector('.pd-item-gst').value) || 0;
      var hsn = tr.querySelector('.pd-item-hsn').value.trim();
      var size = tr.querySelector('.pd-item-size') ? tr.querySelector('.pd-item-size').value.trim() : '';
      var unit = tr.querySelector('.pd-item-unit') ? tr.querySelector('.pd-item-unit').value : '';
      var discPct = tr.querySelector('.pd-item-disc') ? parseFloat(tr.querySelector('.pd-item-disc').value) || 0 : 0;
      var lineTotal = qty * rate;
      var discAmt = lineTotal * discPct / 100;
      var afterDisc = lineTotal - discAmt;
      var gstAmt = afterDisc * gst / 100;
      subtotal += lineTotal;
      tDisc += discAmt;
      tCgst += gstAmt / 2;
      tSgst += gstAmt / 2;
      var pdItemObj = { name: name, hsn: hsn, size: size, unit: unit, qty: qty, rate: rate, gst: gst, disc_pct: discPct, disc_amt: Math.round(discAmt * 100) / 100, amount: afterDisc + gstAmt };
      // Collect custom field values
      (window._pdColDefs || []).forEach(function(c) {
        if (c.custom) {
          var cfInp = tr.querySelector('[data-f="' + c.key + '"]');
          if (cfInp) pdItemObj[c.key] = cfInp.value.trim();
        }
      });
      items.push(pdItemObj);
    });
    if (!items.length) return showToast('Add at least one item', 'error');
    var total = subtotal - tDisc + tCgst + tSgst;
    var roundOff = Math.round(total) - total;
    var grandTotal = Math.round(total);
    var pdPayType = (document.querySelector('input[name="pdPayType"]:checked') || {}).value || 'credit';
    var body = {
      doc_type: docType,
      doc_date: document.getElementById('pdDate').value,
      due_date: document.getElementById('pdDueDate').value || null,
      supplier_name: supplier,
      supplier_phone: document.getElementById('pdPhone').value,
      supplier_email: document.getElementById('pdEmail').value,
      supplier_address: document.getElementById('pdAddress').value,
      supplier_gstin: document.getElementById('pdGstin').value,
      supplier_state: document.getElementById('pdState').value,
      items: items, subtotal: subtotal, cgst: tCgst, sgst: tSgst, igst: 0,
      total: grandTotal, round_off: roundOff, discount: tDisc,
      notes: document.getElementById('pdNotes').value,
      reference_number: document.getElementById('pdRefNo').value,
      payment_type: pdPayType,
      status: pdPayType === 'cash' ? 'paid' : (PURCHASE_DOC_META[docType].statusDefault || 'unpaid')
    };
    api('POST', '/api/purchase-docs', body).then(function (res) {
      if (res.error) return showToast(res.error, 'error');
      showToast(res.message || 'Saved!', 'success');
      window.goTo(PURCHASE_DOC_META[docType].viewPage.replace(/-/g, '-'), res.document.id);
    }).catch(function () { showToast('Failed to save', 'error'); });
  }

  // ── Purchase Doc Detail ──
  function renderPurchaseDocDetail(docType, id) {
    var meta = PURCHASE_DOC_META[docType];
    $pageTitle.textContent = meta.singular;
    $content.innerHTML = '<p class="loading">Loading...</p>';
    api('GET', '/api/purchase-docs/' + id).then(function (res) {
      if (res.error) { $content.innerHTML = '<p class="text-danger">' + esc(res.error) + '</p>'; return; }
      var d = res.document;
      var items = d.items || [];
      var html = '<div class="detail-actions" style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">' +
        '<button class="btn btn-sm btn-outline" onclick="window.print()">Print</button>';
      if (docType === 'purchase_order' && d.status !== 'converted') {
        html += '<button class="btn btn-sm btn-primary" id="pdConvertBtn">Convert to Purchase Bill</button>';
      }
      html += '<button class="btn btn-sm btn-danger" id="pdDeleteBtn">Delete</button></div>';
      html += '<div class="print-doc" id="printArea">';
      html += '<div class="doc-header"><div><h2>' + meta.singular + '</h2><p><strong>#' + esc(d.doc_number) + '</strong></p>' +
        '<p>Date: ' + formatDateSlash(d.doc_date) + '</p>' +
        (d.due_date ? '<p>Due: ' + formatDateSlash(d.due_date) + '</p>' : '') +
        (d.reference_number ? '<p>Ref: ' + esc(d.reference_number) + '</p>' : '') +
        '</div><div style="text-align:right">' + purchaseStatusBadge(d.status) + '</div></div>';
      html += '<div class="doc-parties" style="margin-top:16px"><div><strong>Supplier</strong><br>' + esc(d.supplier_name || '') +
        (d.supplier_phone ? '<br>' + esc(d.supplier_phone) : '') +
        (d.supplier_email ? '<br>' + esc(d.supplier_email) : '') +
        (d.supplier_address ? '<br>' + esc(d.supplier_address) : '') +
        (d.supplier_gstin ? '<br>GSTIN: ' + esc(d.supplier_gstin) : '') + '</div></div>';
      html += '<table class="doc-items-table" style="margin-top:16px"><thead><tr><th>#</th><th>Item</th><th>HSN</th><th>Qty</th><th>Rate</th><th>GST%</th><th style="text-align:right">Amount</th></tr></thead><tbody>';
      items.forEach(function (it, i) {
        html += '<tr><td>' + (i + 1) + '</td><td>' + esc(it.name) + '</td><td>' + esc(it.hsn || '') + '</td>' +
          '<td>' + it.qty + '</td><td>' + formatINR(it.rate) + '</td><td>' + (it.gst || 0) + '%</td>' +
          '<td style="text-align:right">' + formatINR(it.amount || 0) + '</td></tr>';
      });
      html += '</tbody></table>';
      html += '<div class="doc-totals" style="margin-top:16px">';
      html += '<div class="totals-row"><span>Subtotal</span><span>' + formatINR(d.subtotal) + '</span></div>';
      if (d.cgst) html += '<div class="totals-row"><span>CGST</span><span>' + formatINR(d.cgst) + '</span></div>';
      if (d.sgst) html += '<div class="totals-row"><span>SGST</span><span>' + formatINR(d.sgst) + '</span></div>';
      if (d.igst) html += '<div class="totals-row"><span>IGST</span><span>' + formatINR(d.igst) + '</span></div>';
      if (d.discount) html += '<div class="totals-row"><span>Discount</span><span>-' + formatINR(d.discount) + '</span></div>';
      if (d.round_off) html += '<div class="totals-row"><span>Round Off</span><span>' + Number(d.round_off).toFixed(2) + '</span></div>';
      html += '<div class="totals-row total-final"><span>Total</span><span>' + formatINR(d.total) + '</span></div>';
      if (docType === 'purchase_bill') {
        html += '<div class="totals-row"><span>Amount Paid</span><span>' + formatINR(d.amount_paid || 0) + '</span></div>';
        var outstanding = (d.total || 0) - (d.amount_paid || 0);
        if (outstanding > 0) html += '<div class="totals-row" style="color:var(--danger)"><span>Outstanding</span><span>' + formatINR(outstanding) + '</span></div>';
      }
      html += '</div>';
      if (d.notes) html += '<div style="margin-top:14px"><strong>Notes:</strong> ' + esc(d.notes) + '</div>';
      html += '</div>';
      $content.innerHTML = html;

      // Delete handler
      document.getElementById('pdDeleteBtn').addEventListener('click', function () {
        if (!confirm('Delete this ' + meta.singular + '?')) return;
        api('DELETE', '/api/purchase-docs/' + id).then(function (r) {
          if (r.error) return showToast(r.error, 'error');
          showToast('Deleted', 'success');
          window.goTo(meta.newPage.replace('new-', '') + 's');
        });
      });
      // Convert PO → PB
      var convertBtn = document.getElementById('pdConvertBtn');
      if (convertBtn) {
        convertBtn.addEventListener('click', function () {
          if (!confirm('Convert this Purchase Order to a Purchase Bill?')) return;
          var pbBody = {
            doc_type: 'purchase_bill',
            doc_date: new Date().toISOString().slice(0, 10),
            supplier_name: d.supplier_name,
            supplier_phone: d.supplier_phone || '',
            supplier_email: d.supplier_email || '',
            supplier_address: d.supplier_address || '',
            supplier_gstin: d.supplier_gstin || '',
            supplier_state: d.supplier_state || '',
            items: d.items, subtotal: d.subtotal, cgst: d.cgst, sgst: d.sgst,
            igst: d.igst, total: d.total, round_off: d.round_off, discount: d.discount,
            notes: d.notes || '', reference_number: d.doc_number, reference_id: d.id
          };
          api('POST', '/api/purchase-docs', pbBody).then(function (r2) {
            if (r2.error) return showToast(r2.error, 'error');
            // Mark PO as converted
            api('PUT', '/api/purchase-docs/' + id, { status: 'converted' }).then(function () {
              showToast('Converted to ' + r2.document.doc_number, 'success');
              window.goTo('purchase-bill', r2.document.id);
            });
          });
        });
      }
    }).catch(function () { $content.innerHTML = '<p class="text-danger">Failed to load document</p>'; });
  }

  // ── Payments Out List ──
  function renderPaymentsOutList() {
    $pageTitle.textContent = 'Payment-Out';
    $content.innerHTML = '<p class="loading">Loading...</p>';
    api('GET', '/api/payments-out').then(function (res) {
      var list = res.payments || [];
      var now = new Date();
      var firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      var lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      var fmtD = function(d){ return String(d.getDate()).padStart(2,'0') + '/' + String(d.getMonth()+1).padStart(2,'0') + '/' + d.getFullYear(); };
      // Filter this month
      var thisMonth = list.filter(function(p) {
        var pd = new Date(p.payment_date);
        return pd >= firstDay && pd <= lastDay;
      });
      var totalAmt = 0;
      thisMonth.forEach(function (p) { totalAmt += (p.amount || 0); });

      // Page header
      var html = '<div class="pe-page-header">' +
        '<h2>Payment-Out</h2>' +
        '<button class="btn-add-primary" onclick="window.goTo(\'new-payment-out\')">+ Add Payment-Out</button></div>';

      // Filter bar
      html += '<div class="page-filter-bar">' +
        '<label>Filter by :</label>' +
        '<select id="poFilterPeriod" class="po-filter-period">' +
        '<option value="this_month" selected>This Month</option><option value="last_month">Last Month</option>' +
        '<option value="this_quarter">This Quarter</option><option value="this_year">This Year</option><option value="all">All Time</option></select>' +
        '<div class="filter-sep"></div>' +
        '<span style="font-size:0.8rem;color:var(--text-muted)">' + fmtD(firstDay) + '  To  ' + fmtD(lastDay) + '</span>' +
        '</div>';

      // Summary card
      html += '<div class="summary-card-row">' +
        '<div class="summary-card-box">' +
        '<div class="sc-label">Total Amount</div>' +
        '<div class="sc-value">' + formatINR(totalAmt) + '</div>' +
        '<div class="sc-sub">Paid: ' + formatINR(totalAmt) + '</div>' +
        '</div></div>';

      if (!thisMonth.length) {
        html += '<div class="pe-empty-state">' +
          '<svg width="80" height="80" fill="none" stroke="var(--text-muted)" stroke-width="1" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/><path d="M9 14l2 2 4-4"/></svg>' +
          '<h3>No Transactions to show</h3>' +
          '<p>You haven\'t added any transactions yet.</p></div>';
        $content.innerHTML = html;
        poAttachFilter(list);
        return;
      }
      html += '<div class="invoice-list" id="poListCards">';
      thisMonth.forEach(function (p) {
        html += renderPaymentOutCard(p);
      });
      html += '</div>';
      $content.innerHTML = html;
      poAttachFilter(list);
    }).catch(function () { $content.innerHTML = '<p class="text-danger">Failed to load payments</p>'; });
  }

  function renderPaymentOutCard(p) {
    return '<div class="payment-card">' +
      '<div class="inv-row"><strong>' + esc(p.payment_number) + '</strong>' +
      '<span class="payment-mode-badge">' + esc(p.payment_mode || 'cash') + '</span>' +
      '<span class="payment-amount">' + formatINR(p.amount) + '</span></div>' +
      '<div class="inv-row"><span>' + esc(p.party_name || 'Unknown') + '</span>' +
      '<span style="color:var(--text-muted);font-size:0.85rem">' + formatDate(p.payment_date) + '</span></div>' +
      '<div style="text-align:right;margin-top:4px"><button class="btn btn-sm btn-danger" onclick="event.stopPropagation();deletePaymentOut(\'' + p.id + '\')">Delete</button></div></div>';
  }

  function poAttachFilter(allPayments) {
    var sel = document.getElementById('poFilterPeriod');
    if (!sel) return;
    sel.addEventListener('change', function () {
      var val = sel.value;
      var now = new Date();
      var startD, endD;
      if (val === 'this_month') { startD = new Date(now.getFullYear(), now.getMonth(), 1); endD = new Date(now.getFullYear(), now.getMonth()+1, 0); }
      else if (val === 'last_month') { startD = new Date(now.getFullYear(), now.getMonth()-1, 1); endD = new Date(now.getFullYear(), now.getMonth(), 0); }
      else if (val === 'this_quarter') { var q = Math.floor(now.getMonth()/3)*3; startD = new Date(now.getFullYear(), q, 1); endD = new Date(now.getFullYear(), q+3, 0); }
      else if (val === 'this_year') { startD = new Date(now.getFullYear(), 0, 1); endD = new Date(now.getFullYear(), 11, 31); }
      else { startD = new Date(2000,0,1); endD = new Date(2099,11,31); }
      var filtered = allPayments.filter(function(p) { var d = new Date(p.payment_date); return d >= startD && d <= endD; });
      var totalAmt = 0;
      filtered.forEach(function(p) { totalAmt += (p.amount || 0); });
      // Update summary
      var summaryBoxes = document.querySelectorAll('.summary-card-box');
      if (summaryBoxes.length) {
        summaryBoxes[0].querySelector('.sc-value').textContent = formatINR(totalAmt);
        summaryBoxes[0].querySelector('.sc-sub').textContent = 'Paid: ' + formatINR(totalAmt);
      }
      // Update date range display
      var fmtD = function(d){ return String(d.getDate()).padStart(2,'0') + '/' + String(d.getMonth()+1).padStart(2,'0') + '/' + d.getFullYear(); };
      var spanEl = sel.parentElement.querySelector('span');
      if (spanEl && val !== 'all') spanEl.textContent = fmtD(startD) + '  To  ' + fmtD(endD);
      else if (spanEl) spanEl.textContent = 'All Time';
      // Update list
      var listEl = document.getElementById('poListCards');
      if (!listEl) {
        // Remove old empty state and create list area
        var oldEmpty = document.querySelector('.pe-empty-state');
        if (oldEmpty) oldEmpty.remove();
        var container = document.getElementById('content');
        var div = document.createElement('div');
        div.className = 'invoice-list';
        div.id = 'poListCards';
        container.appendChild(div);
        listEl = div;
      }
      if (!filtered.length) {
        listEl.innerHTML = '';
        if (!document.querySelector('.pe-empty-state')) {
          var emptyDiv = document.createElement('div');
          emptyDiv.className = 'pe-empty-state';
          emptyDiv.innerHTML = '<svg width="80" height="80" fill="none" stroke="var(--text-muted)" stroke-width="1" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/><path d="M9 14l2 2 4-4"/></svg>' +
            '<h3>No Transactions to show</h3><p>You haven\'t added any transactions yet.</p>';
          listEl.parentElement.appendChild(emptyDiv);
        }
      } else {
        var oldEmpty2 = document.querySelector('.pe-empty-state');
        if (oldEmpty2) oldEmpty2.remove();
        var cardsHtml = '';
        filtered.forEach(function(p) { cardsHtml += renderPaymentOutCard(p); });
        listEl.innerHTML = cardsHtml;
      }
    });
  }

  window.deletePaymentOut = function (id) {
    if (!confirm('Delete this payment?')) return;
    api('DELETE', '/api/payments-out/' + id).then(function (r) {
      if (r.error) return showToast(r.error, 'error');
      showToast('Payment deleted', 'success');
      renderPaymentsOutList();
    });
  };

  // ── New Payment Out Form ──
  function renderNewPaymentOut() {
    $pageTitle.textContent = 'New Payment-Out';
    var today = new Date().toISOString().slice(0, 10);
    var html = '<form id="payOutForm" class="form-card" onsubmit="return false">' +
      '<div class="sale-header" style="margin-bottom:16px">' +
        '<div class="sale-header-left"><h2 class="sale-title">Payment-Out</h2>' +
        '<div class="sale-type"><label class="type-opt active" data-type="credit"><input type="radio" name="poPayType" value="credit" checked> Credit</label>' +
        '<label class="type-opt" data-type="cash"><input type="radio" name="poPayType" value="cash"> Cash</label></div></div></div>' +
      '<div class="form-grid">' +
      '<div class="form-group"><label>Party / Supplier Name *</label><div class="ac-wrap"><input id="poParty" class="form-control" placeholder="Type party name" autocomplete="off" required /><div class="ac-list" id="poPartyAC"></div></div></div>' +
      '<div class="form-group"><label>Amount *</label><input id="poAmount" class="form-control" type="number" step="0.01" min="0" placeholder="0.00" required /></div>' +
      '<div class="form-group"><label>Payment Date</label><input id="poDate" type="date" class="form-control" value="' + today + '" /></div>' +
      '<div class="form-group"><label>Payment Mode</label><select id="poMode" class="form-control">' +
      '<option value="cash">Cash</option><option value="bank">Bank Transfer</option><option value="upi">UPI</option><option value="cheque">Cheque</option><option value="card">Card</option></select></div>' +
      '<div class="form-group"><label>Reference Number</label><input id="poRef" class="form-control" placeholder="Cheque / Txn #" /></div>' +
      '<div class="form-group"><label>Notes</label><textarea id="poNotes" class="form-control" rows="2" placeholder="Notes"></textarea></div>' +
      '</div>' +
      '<div id="poUnpaidBills" style="margin-top:16px"></div>' +
      '<div style="margin-top:18px;display:flex;gap:10px">' +
      '<button type="button" class="btn btn-primary" id="poSaveBtn">Save Payment</button>' +
      '<button type="button" class="btn btn-outline" onclick="window.goTo(\'payments-out\')">Cancel</button></div></form>';
    $content.innerHTML = html;

    // Credit / Cash toggle for payment-out
    document.querySelectorAll('#payOutForm .type-opt input').forEach(function(radio) {
      radio.addEventListener('change', function() {
        document.querySelectorAll('#payOutForm .type-opt').forEach(function(l) { l.classList.remove('active'); });
        radio.parentElement.classList.add('active');
      });
    });

    // Party autocomplete
    acSearch(document.getElementById('poParty'), document.getElementById('poPartyAC'), '/api/parties',
      function (p, q) {
        return '<div class="ac-main">' + acHL(p.name, q) + '</div>' +
          (p.phone ? '<div class="ac-sub">Ph: ' + p.phone + '</div>' : '');
      },
      function (p) {
        document.getElementById('poParty').value = p.name;
        loadUnpaidPurchaseBills(p.name);
      });

    document.getElementById('poSaveBtn').addEventListener('click', function () {
      var party = (document.getElementById('poParty').value || '').trim();
      var amount = parseFloat(document.getElementById('poAmount').value);
      if (!party) return showToast('Party name is required', 'error');
      if (!amount || amount <= 0) return showToast('Amount must be greater than 0', 'error');
      var poPayType = (document.querySelector('input[name="poPayType"]:checked') || {}).value || 'credit';
      var selectedBill = document.querySelector('.bill-select-card.selected');
      var body = {
        party_name: party, amount: amount,
        payment_date: document.getElementById('poDate').value,
        payment_mode: document.getElementById('poMode').value,
        reference_number: document.getElementById('poRef').value,
        notes: document.getElementById('poNotes').value,
        purchase_id: selectedBill ? selectedBill.getAttribute('data-id') : null,
        payment_type: poPayType,
        status: poPayType === 'cash' ? 'paid' : 'unpaid'
      };
      api('POST', '/api/payments-out', body).then(function (res) {
        if (res.error) return showToast(res.error, 'error');
        showToast(res.message || 'Payment saved!', 'success');
        window.goTo('payments-out');
      }).catch(function () { showToast('Failed to save payment', 'error'); });
    });
  }

  function loadUnpaidPurchaseBills(partyName) {
    var container = document.getElementById('poUnpaidBills');
    if (!container) return;
    container.innerHTML = '<p class="loading">Loading unpaid bills...</p>';
    api('GET', '/api/purchase-docs/unpaid?party=' + encodeURIComponent(partyName)).then(function (res) {
      var bills = res.documents || [];
      if (!bills.length) { container.innerHTML = '<p style="color:var(--text-muted);font-size:0.875rem">No unpaid purchase bills for this party.</p>'; return; }
      var html = '<label style="font-weight:600;margin-bottom:8px;display:block">Link to Purchase Bill (optional)</label><div class="bill-select-list">';
      bills.forEach(function (b) {
        var outstanding = (b.total || 0) - (b.amount_paid || 0);
        html += '<div class="bill-select-card inv-select-card" data-id="' + b.id + '" data-outstanding="' + outstanding + '">' +
          '<strong>' + esc(b.doc_number) + '</strong><span style="margin-left:8px">' + formatDate(b.doc_date) + '</span>' +
          '<span class="inv-outstanding" style="margin-left:auto">' + formatINR(outstanding) + ' due</span></div>';
      });
      html += '</div>';
      container.innerHTML = html;
      container.querySelectorAll('.bill-select-card').forEach(function (card) {
        card.addEventListener('click', function () {
          container.querySelectorAll('.bill-select-card').forEach(function (c) { c.classList.remove('selected'); });
          card.classList.toggle('selected');
          var outstanding = parseFloat(card.getAttribute('data-outstanding')) || 0;
          document.getElementById('poAmount').value = outstanding.toFixed(2);
        });
      });
    }).catch(function () {
      container.innerHTML = '<p style="color:var(--text-muted);font-size:0.875rem">Failed to load bills.</p>';
    });
  }

  // ═══════════════════════════════════════════════════════════
  // EXPENSES
  // ═══════════════════════════════════════════════════════════

  var EXPENSE_CATEGORIES = ['Petrol','Rent','Salary','Tea','Transport','Utilities','Office Supplies','Marketing','Insurance','Maintenance','Internet & Phone','Legal & Professional','Food & Beverages','Miscellaneous'];

  function renderExpensesList() {
    $pageTitle.textContent = 'Expenses';
    $content.innerHTML = '<p class="loading">Loading...</p>';
    api('GET', '/api/expenses').then(function (res) {
      var allExpenses = res.expenses || [];

      // Build category totals
      var catTotals = {};
      EXPENSE_CATEGORIES.forEach(function (c) { catTotals[c] = 0; });
      allExpenses.forEach(function (e) {
        var cat = e.category || 'Miscellaneous';
        if (catTotals[cat] === undefined) catTotals[cat] = 0;
        catTotals[cat] += (e.amount || 0);
      });

      // Tabs
      var html = '<div class="exp-tabs">' +
        '<button class="exp-tab active" id="expTabCategory">CATEGORY</button>' +
        '<button class="exp-tab" id="expTabItems">ITEMS</button></div>';

      // Main two-panel layout
      html += '<div class="exp-master-detail">';

      // Left panel: category list
      html += '<div class="exp-left-panel">' +
        '<div class="exp-left-header">' +
        '<div class="exp-search-wrap"><svg width="16" height="16" fill="none" stroke="var(--text-muted)" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>' +
        '<input id="expCatSearch" class="exp-search-input" placeholder="Search" autocomplete="off" /></div>' +
        '<button class="btn-add-primary btn-sm" onclick="window.goTo(\'new-expense\')" style="white-space:nowrap;font-size:0.8rem;padding:6px 14px">+ Add Expense</button></div>' +
        '<div class="exp-cat-table">' +
        '<div class="exp-cat-header"><span class="exp-cat-col-name">CATEGORY <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19V5M5 12l7-7 7 7"/></svg></span><span class="exp-cat-col-amt">AMOUNT</span></div>' +
        '<div class="exp-cat-list" id="expCatList">';
      EXPENSE_CATEGORIES.forEach(function (cat, idx) {
        html += '<div class="exp-cat-row' + (idx === 0 ? ' active' : '') + '" data-cat="' + esc(cat) + '">' +
          '<span class="exp-cat-col-name">' + esc(cat) + '</span>' +
          '<span class="exp-cat-col-amt">' + (catTotals[cat] || 0).toLocaleString('en-IN', {minimumFractionDigits: 0}) + '</span>' +
          '<button class="exp-cat-menu" title="Options">&#8942;</button></div>';
      });
      html += '</div></div></div>';

      // Right panel: detail view
      html += '<div class="exp-right-panel" id="expRightPanel">';
      var firstCat = EXPENSE_CATEGORIES[0];
      html += buildExpenseDetailPanel(firstCat, allExpenses, catTotals);
      html += '</div>';

      html += '</div>'; // close master-detail
      $content.innerHTML = html;

      // Category click handlers
      var catRows = document.querySelectorAll('.exp-cat-row');
      catRows.forEach(function (row) {
        row.addEventListener('click', function () {
          catRows.forEach(function (r) { r.classList.remove('active'); });
          row.classList.add('active');
          var cat = row.getAttribute('data-cat');
          document.getElementById('expRightPanel').innerHTML = buildExpenseDetailPanel(cat, allExpenses, catTotals);
          attachExpDetailListeners(cat, allExpenses);
        });
      });

      // Category search filter
      var catSearch = document.getElementById('expCatSearch');
      if (catSearch) {
        catSearch.addEventListener('input', function () {
          var q = catSearch.value.toLowerCase();
          catRows.forEach(function (row) {
            var name = row.getAttribute('data-cat').toLowerCase();
            row.style.display = name.indexOf(q) !== -1 ? '' : 'none';
          });
        });
      }

      // Tabs (CATEGORY vs ITEMS)
      document.getElementById('expTabCategory').addEventListener('click', function () {
        document.getElementById('expTabCategory').classList.add('active');
        document.getElementById('expTabItems').classList.remove('active');
        document.querySelector('.exp-left-panel .exp-cat-header .exp-cat-col-name').innerHTML = 'CATEGORY <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
        rebuildCatList(allExpenses, catTotals, 'category');
      });
      document.getElementById('expTabItems').addEventListener('click', function () {
        document.getElementById('expTabItems').classList.add('active');
        document.getElementById('expTabCategory').classList.remove('active');
        document.querySelector('.exp-left-panel .exp-cat-header .exp-cat-col-name').innerHTML = 'ITEM <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
        // Group by description/item instead of category
        var itemTotals = {};
        allExpenses.forEach(function (e) {
          var key = e.description || e.party_name || 'Uncategorized';
          if (!itemTotals[key]) itemTotals[key] = 0;
          itemTotals[key] += (e.amount || 0);
        });
        var listEl = document.getElementById('expCatList');
        if (!listEl) return;
        var h = '';
        var items = Object.keys(itemTotals).sort();
        if (!items.length) items = ['No items'];
        items.forEach(function (item, idx) {
          h += '<div class="exp-cat-row' + (idx === 0 ? ' active' : '') + '" data-cat="' + esc(item) + '">' +
            '<span class="exp-cat-col-name">' + esc(item) + '</span>' +
            '<span class="exp-cat-col-amt">' + (itemTotals[item] || 0).toLocaleString('en-IN', {minimumFractionDigits: 0}) + '</span>' +
            '<button class="exp-cat-menu" title="Options">&#8942;</button></div>';
        });
        listEl.innerHTML = h;
        // Select first
        var firstItem = items[0];
        var filtered = allExpenses.filter(function (e) { return (e.description || e.party_name || 'Uncategorized') === firstItem; });
        var total = 0; filtered.forEach(function(e) { total += (e.amount || 0); });
        document.getElementById('expRightPanel').innerHTML = buildExpenseDetailPanel(firstItem, allExpenses, itemTotals, 'item');
        attachExpDetailListeners(firstItem, allExpenses, 'item');
        // Re-attach click
        document.querySelectorAll('.exp-cat-row').forEach(function (row) {
          row.addEventListener('click', function () {
            document.querySelectorAll('.exp-cat-row').forEach(function (r) { r.classList.remove('active'); });
            row.classList.add('active');
            var key = row.getAttribute('data-cat');
            document.getElementById('expRightPanel').innerHTML = buildExpenseDetailPanel(key, allExpenses, itemTotals, 'item');
            attachExpDetailListeners(key, allExpenses, 'item');
          });
        });
      });

      attachExpDetailListeners(firstCat, allExpenses);
    }).catch(function () { $content.innerHTML = '<p class="text-danger">Failed to load expenses</p>'; });
  }

  function rebuildCatList(allExpenses, catTotals, mode) {
    var listEl = document.getElementById('expCatList');
    if (!listEl) return;
    var h = '';
    EXPENSE_CATEGORIES.forEach(function (cat, idx) {
      h += '<div class="exp-cat-row' + (idx === 0 ? ' active' : '') + '" data-cat="' + esc(cat) + '">' +
        '<span class="exp-cat-col-name">' + esc(cat) + '</span>' +
        '<span class="exp-cat-col-amt">' + (catTotals[cat] || 0).toLocaleString('en-IN', {minimumFractionDigits: 0}) + '</span>' +
        '<button class="exp-cat-menu" title="Options">&#8942;</button></div>';
    });
    listEl.innerHTML = h;
    var firstCat = EXPENSE_CATEGORIES[0];
    document.getElementById('expRightPanel').innerHTML = buildExpenseDetailPanel(firstCat, allExpenses, catTotals);
    attachExpDetailListeners(firstCat, allExpenses);
    document.querySelectorAll('.exp-cat-row').forEach(function (row) {
      row.addEventListener('click', function () {
        document.querySelectorAll('.exp-cat-row').forEach(function (r) { r.classList.remove('active'); });
        row.classList.add('active');
        var cat = row.getAttribute('data-cat');
        document.getElementById('expRightPanel').innerHTML = buildExpenseDetailPanel(cat, allExpenses, catTotals);
        attachExpDetailListeners(cat, allExpenses);
      });
    });
  }

  function buildExpenseDetailPanel(catName, allExpenses, totalsMap, groupBy) {
    var total = totalsMap[catName] || 0;
    var filtered;
    if (groupBy === 'item') {
      filtered = allExpenses.filter(function (e) { return (e.description || e.party_name || 'Uncategorized') === catName; });
    } else {
      filtered = allExpenses.filter(function (e) { return (e.category || 'Miscellaneous') === catName; });
    }
    var h = '<div class="exp-detail-header">' +
      '<div><div class="exp-detail-title">' + esc(catName).toUpperCase() + '</div>' +
      '<div class="exp-detail-sub">Direct Expense</div></div>' +
      '<div class="exp-detail-totals"><div>Total : ' + formatINR(total) + '</div>' +
      '<div>Balance : ' + formatINR(total) + '</div></div></div>';

    // Search + Table
    h += '<div class="exp-detail-body">' +
      '<div class="exp-detail-search"><svg width="14" height="14" fill="none" stroke="var(--text-muted)" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>' +
      '<input id="expDetailSearch" class="exp-search-input" placeholder="Search" autocomplete="off" /></div>' +
      '<div class="exp-detail-table-wrap"><table class="exp-detail-table"><thead><tr>' +
      '<th>DATE</th><th>EXP NO.</th><th>PARTY</th><th>PAYMENT</th><th>AMOUNT</th><th>BALANCE</th><th>STATUS</th><th></th>' +
      '</tr></thead><tbody id="expDetailTbody">';
    if (!filtered.length) {
      h += '<tr><td colspan="8" class="exp-empty-cell">No transactions to show</td></tr>';
    } else {
      filtered.forEach(function (e) {
        h += '<tr class="exp-detail-row" data-id="' + e.id + '" style="cursor:pointer">' +
          '<td>' + formatDateSlash(e.expense_date) + '</td>' +
          '<td>' + esc(e.expense_number) + '</td>' +
          '<td>' + esc(e.party_name || '-') + '</td>' +
          '<td><span class="payment-mode-badge">' + esc(e.payment_mode || 'cash') + '</span></td>' +
          '<td class="exp-amt-cell">' + formatINR(e.amount) + '</td>' +
          '<td>' + formatINR(e.amount) + '</td>' +
          '<td><span class="badge badge-paid">Paid</span></td>' +
          '<td><button class="exp-cat-menu exp-row-del" data-id="' + e.id + '" title="Delete">&#8942;</button></td></tr>';
      });
    }
    h += '</tbody></table></div></div>';
    return h;
  }

  function attachExpDetailListeners(catName, allExpenses, groupBy) {
    // Click rows to view detail
    document.querySelectorAll('.exp-detail-row').forEach(function (row) {
      row.addEventListener('click', function (ev) {
        if (ev.target.closest('.exp-row-del')) return;
        window.goTo('expense', row.getAttribute('data-id'));
      });
    });
    // Delete buttons
    document.querySelectorAll('.exp-row-del').forEach(function (btn) {
      btn.addEventListener('click', function (ev) {
        ev.stopPropagation();
        var eid = btn.getAttribute('data-id');
        if (!confirm('Delete this expense?')) return;
        api('DELETE', '/api/expenses/' + eid).then(function (r) {
          if (r.error) return showToast(r.error, 'error');
          showToast('Expense deleted', 'success');
          renderExpensesList();
        });
      });
    });
    // Detail search
    var detailSearch = document.getElementById('expDetailSearch');
    if (detailSearch) {
      detailSearch.addEventListener('input', function () {
        var q = detailSearch.value.toLowerCase();
        document.querySelectorAll('.exp-detail-row').forEach(function (row) {
          var text = row.textContent.toLowerCase();
          row.style.display = text.indexOf(q) !== -1 ? '' : 'none';
        });
      });
    }
  }

  function renderNewExpense() {
    $pageTitle.textContent = 'New Expense';
    var today = new Date().toISOString().slice(0, 10);
    var catOpts = EXPENSE_CATEGORIES.map(function (c) { return '<option value="' + c + '">' + c + '</option>'; }).join('');
    var html = '<form id="expenseForm" class="form-card" onsubmit="return false">' +
      '<div class="sale-header" style="margin-bottom:16px">' +
        '<div class="sale-header-left"><h2 class="sale-title">Expense</h2>' +
        '<div class="sale-type"><label class="type-opt active" data-type="credit"><input type="radio" name="expPayType" value="credit" checked> Credit</label>' +
        '<label class="type-opt" data-type="cash"><input type="radio" name="expPayType" value="cash"> Cash</label></div></div></div>' +
      '<div class="form-grid">' +
      '<div class="form-group"><label>Category *</label><select id="expCat" class="form-control">' + catOpts + '</select></div>' +
      '<div class="form-group"><label>Amount *</label><input id="expAmount" class="form-control" type="number" step="0.01" min="0" placeholder="0.00" required /></div>' +
      '<div class="form-group"><label>Date</label><input id="expDate" type="date" class="form-control" value="' + today + '" /></div>' +
      '<div class="form-group"><label>Payment Mode</label><select id="expMode" class="form-control">' +
      '<option value="cash">Cash</option><option value="bank">Bank Transfer</option><option value="upi">UPI</option><option value="cheque">Cheque</option><option value="card">Card</option></select></div>' +
      '<div class="form-group"><label>Description</label><input id="expDesc" class="form-control" placeholder="What was this expense for?" /></div>' +
      '<div class="form-group"><label>Party / Vendor</label><div class="ac-wrap"><input id="expParty" class="form-control" placeholder="Party name (optional)" autocomplete="off" /><div class="ac-list" id="expPartyAC"></div></div></div>' +
      '<div class="form-group"><label>Reference Number</label><input id="expRef" class="form-control" placeholder="Bill / Txn #" /></div>' +
      '<div class="form-group"><label>GST Applicable?</label><div style="display:flex;align-items:center;gap:10px"><input id="expGstCheck" type="checkbox" /><label for="expGstCheck" style="margin:0">Yes</label></div></div>' +
      '<div class="form-group" id="expGstAmtWrap" style="display:none"><label>GST Amount</label><input id="expGstAmt" class="form-control" type="number" step="0.01" value="0" /></div>' +
      '<div class="form-group" style="grid-column:1/-1"><label>Notes</label><textarea id="expNotes" class="form-control" rows="2" placeholder="Additional notes"></textarea></div>' +
      '</div>' +
      '<div style="margin-top:18px;display:flex;gap:10px">' +
      '<button type="button" class="btn btn-primary" id="expSaveBtn">Save Expense</button>' +
      '<button type="button" class="btn btn-outline" onclick="window.goTo(\'expenses-list\')">Cancel</button></div></form>';
    $content.innerHTML = html;

    // Credit / Cash toggle for expense
    document.querySelectorAll('#expenseForm .type-opt input').forEach(function(radio) {
      radio.addEventListener('change', function() {
        document.querySelectorAll('#expenseForm .type-opt').forEach(function(l) { l.classList.remove('active'); });
        radio.parentElement.classList.add('active');
      });
    });

    // GST toggle
    document.getElementById('expGstCheck').addEventListener('change', function () {
      document.getElementById('expGstAmtWrap').style.display = this.checked ? '' : 'none';
    });

    // Party autocomplete
    acSearch(document.getElementById('expParty'), document.getElementById('expPartyAC'), '/api/parties',
      function (p, q) {
        return '<div class="ac-main">' + acHL(p.name, q) + '</div>' +
          (p.phone ? '<div class="ac-sub">Ph: ' + p.phone + '</div>' : '');
      },
      function (p) { document.getElementById('expParty').value = p.name; });

    document.getElementById('expSaveBtn').addEventListener('click', function () {
      var amount = parseFloat(document.getElementById('expAmount').value);
      if (!amount || amount <= 0) return showToast('Amount must be greater than 0', 'error');
      var gstCheck = document.getElementById('expGstCheck').checked;
      var expPayType = (document.querySelector('input[name="expPayType"]:checked') || {}).value || 'credit';
      var body = {
        category: document.getElementById('expCat').value,
        amount: amount,
        expense_date: document.getElementById('expDate').value,
        payment_mode: document.getElementById('expMode').value,
        description: document.getElementById('expDesc').value,
        party_name: document.getElementById('expParty').value,
        reference_number: document.getElementById('expRef').value,
        gst_applicable: gstCheck,
        gst_amount: gstCheck ? (parseFloat(document.getElementById('expGstAmt').value) || 0) : 0,
        notes: document.getElementById('expNotes').value,
        payment_type: expPayType,
        status: expPayType === 'cash' ? 'paid' : 'unpaid'
      };
      api('POST', '/api/expenses', body).then(function (res) {
        if (res.error) return showToast(res.error, 'error');
        showToast(res.message || 'Expense saved!', 'success');
        window.goTo('expenses-list');
      }).catch(function () { showToast('Failed to save expense', 'error'); });
    });
  }

  function renderExpenseDetail(id) {
    $pageTitle.textContent = 'Expense Detail';
    $content.innerHTML = '<p class="loading">Loading...</p>';
    api('GET', '/api/expenses/' + id).then(function (res) {
      if (res.error) { $content.innerHTML = '<p class="text-danger">' + esc(res.error) + '</p>'; return; }
      var e = res.expense;
      var html = '<div class="detail-actions" style="display:flex;gap:8px;margin-bottom:16px">' +
        '<button class="btn btn-sm btn-outline" onclick="window.print()">Print</button>' +
        '<button class="btn btn-sm btn-danger" id="expDeleteBtn">Delete</button></div>';
      html += '<div class="print-doc" id="printArea">';
      html += '<h2 style="margin-bottom:4px">Expense</h2>';
      html += '<p><strong>#' + esc(e.expense_number) + '</strong></p>';
      html += '<div class="form-grid" style="margin-top:16px">';
      html += '<div><strong>Category:</strong> ' + esc(e.category || 'General') + '</div>';
      html += '<div><strong>Amount:</strong> ' + formatINR(e.amount) + '</div>';
      html += '<div><strong>Date:</strong> ' + formatDateSlash(e.expense_date) + '</div>';
      html += '<div><strong>Payment Mode:</strong> ' + esc(e.payment_mode || 'cash') + '</div>';
      if (e.description) html += '<div style="grid-column:1/-1"><strong>Description:</strong> ' + esc(e.description) + '</div>';
      if (e.party_name) html += '<div><strong>Party:</strong> ' + esc(e.party_name) + '</div>';
      if (e.reference_number) html += '<div><strong>Reference:</strong> ' + esc(e.reference_number) + '</div>';
      if (e.gst_applicable) html += '<div><strong>GST Amount:</strong> ' + formatINR(e.gst_amount || 0) + '</div>';
      if (e.notes) html += '<div style="grid-column:1/-1"><strong>Notes:</strong> ' + esc(e.notes) + '</div>';
      html += '</div></div>';
      $content.innerHTML = html;
      document.getElementById('expDeleteBtn').addEventListener('click', function () {
        if (!confirm('Delete this expense?')) return;
        api('DELETE', '/api/expenses/' + id).then(function (r) {
          if (r.error) return showToast(r.error, 'error');
          showToast('Expense deleted', 'success');
          window.goTo('expenses-list');
        });
      });
    }).catch(function () { $content.innerHTML = '<p class="text-danger">Failed to load expense</p>'; });
  }

  // ── Reports ────────────────────────────────────────────────
  function renderReports() {
    $pageTitle.textContent = 'Reports';
    var today = new Date().toISOString().slice(0, 10);
    var firstOfMonth = today.slice(0, 8) + '01';

    var html = '<div class="form-card"><h3>Generate Report</h3><div class="form-grid">' +
      fg('From Date', '<input id="rptFrom" type="date" value="' + firstOfMonth + '">') +
      fg('To Date', '<input id="rptTo" type="date" value="' + today + '">') +
      fg('Customer', '<div class="ac-wrap"><input id="rptCustomer" placeholder="All Customers" autocomplete="off"><div class="ac-dropdown" id="rptCustomerAc"></div></div>') +
      fg('Status', '<select id="rptStatus"><option value="">All</option><option value="paid">Paid</option><option value="unpaid">Unpaid</option><option value="partial">Partial</option></select>') +
    '</div>' +
    '<div class="form-actions" style="margin-top:16px;flex-wrap:wrap;gap:8px;align-items:flex-start">' +
      '<button type="button" class="btn btn-primary" id="generateRptBtn">Generate Report</button>' +
      // Sales download dropdown
      '<div class="dl-wrap" id="dlSalesWrap">' +
        '<button type="button" class="dl-btn" id="dlSalesBtn">' +
          '<svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>' +
          'Sales Report <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg></button>' +
        '<div class="dl-menu" id="dlSalesMenu">' +
          '<button type="button" data-fmt="csv"><svg width="15" height="15" fill="none" stroke="#16a34a" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> Download CSV</button>' +
          '<button type="button" data-fmt="excel"><svg width="15" height="15" fill="none" stroke="#0d6efd" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> Download Excel</button>' +
          '<button type="button" data-fmt="pdf"><svg width="15" height="15" fill="none" stroke="#dc2626" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> Download PDF</button>' +
        '</div></div>' +
      // Items download dropdown
      '<div class="dl-wrap" id="dlItemsWrap">' +
        '<button type="button" class="dl-btn" id="dlItemsBtn">' +
          '<svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>' +
          'Items Report <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg></button>' +
        '<div class="dl-menu" id="dlItemsMenu">' +
          '<button type="button" data-fmt="csv"><svg width="15" height="15" fill="none" stroke="#16a34a" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> Download CSV</button>' +
          '<button type="button" data-fmt="excel"><svg width="15" height="15" fill="none" stroke="#0d6efd" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> Download Excel</button>' +
          '<button type="button" data-fmt="pdf"><svg width="15" height="15" fill="none" stroke="#dc2626" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> Download PDF</button>' +
        '</div></div>' +
      // GST download dropdown
      '<div class="dl-wrap" id="dlGstWrap">' +
        '<button type="button" class="dl-btn" id="dlGstBtn">' +
          '<svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>' +
          'GST Report <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg></button>' +
        '<div class="dl-menu" id="dlGstMenu">' +
          '<button type="button" data-fmt="csv"><svg width="15" height="15" fill="none" stroke="#16a34a" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> Download CSV</button>' +
          '<button type="button" data-fmt="excel"><svg width="15" height="15" fill="none" stroke="#0d6efd" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> Download Excel</button>' +
          '<button type="button" data-fmt="pdf"><svg width="15" height="15" fill="none" stroke="#dc2626" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> Download PDF</button>' +
        '</div></div>' +
      '<button type="button" class="btn btn-outline" id="clearRptFilter" style="margin-left:auto;color:var(--text-muted)">Clear Filters</button>' +
    '</div></div><div id="reportContent"><div class="empty-state">Click "Generate Report" to view reports.</div></div>';

    $content.innerHTML = html;
    var reportData = null;

    // Customer autocomplete for filter
    acSearch(document.getElementById('rptCustomer'), document.getElementById('rptCustomerAc'), '/api/parties',
      function (p, q) {
        return '<div class="ac-main">' + acHL(p.name, q) + '</div>' +
          (p.phone ? '<div class="ac-sub">Ph: ' + p.phone + '</div>' : '');
      },
      function (p) { document.getElementById('rptCustomer').value = p.name; });

    // Clear filters
    document.getElementById('clearRptFilter').addEventListener('click', function () {
      document.getElementById('rptCustomer').value = '';
      document.getElementById('rptStatus').value = '';
      document.getElementById('rptFrom').value = firstOfMonth;
      document.getElementById('rptTo').value = today;
      document.getElementById('generateRptBtn').click();
    });

    function _rptFileSuffix() {
      var cust = document.getElementById('rptCustomer').value.trim();
      var suffix = document.getElementById('rptFrom').value + '_to_' + document.getElementById('rptTo').value;
      if (cust) suffix += '_' + cust.replace(/[^a-zA-Z0-9]/g, '_');
      return suffix;
    }

    document.getElementById('generateRptBtn').addEventListener('click', function () {
      var from = document.getElementById('rptFrom').value;
      var to = document.getElementById('rptTo').value;
      var customer = document.getElementById('rptCustomer').value.trim();
      var status = document.getElementById('rptStatus').value;
      document.getElementById('reportContent').innerHTML = '<p style="color:var(--text-muted)">Loading report...</p>';
      var url = '/api/reports?from=' + encodeURIComponent(from) + '&to=' + encodeURIComponent(to);
      if (customer) url += '&customer=' + encodeURIComponent(customer);
      if (status) url += '&status=' + encodeURIComponent(status);
      api('GET', url).then(function (data) {
        reportData = data;
        renderReportContent(data, customer);
      }).catch(function () {
        document.getElementById('reportContent').innerHTML = '<div class="empty-state">Failed to load report.</div>';
      });
    });

    // ── Download dropdown toggle logic ──
    function setupDlDropdown(btnId, menuId) {
      var btn = document.getElementById(btnId);
      var menu = document.getElementById(menuId);
      if (!btn || !menu) return;
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        // close other menus
        document.querySelectorAll('.dl-menu.open').forEach(function(m) { if (m !== menu) m.classList.remove('open'); });
        menu.classList.toggle('open');
      });
    }
    setupDlDropdown('dlSalesBtn', 'dlSalesMenu');
    setupDlDropdown('dlItemsBtn', 'dlItemsMenu');
    setupDlDropdown('dlGstBtn', 'dlGstMenu');
    // Close all menus on outside click
    document.addEventListener('click', function() {
      document.querySelectorAll('.dl-menu.open').forEach(function(m) { m.classList.remove('open'); });
    });

    // ── Build row data helpers ──
    function _salesRows() {
      var rows = [['Invoice #', 'Date', 'Customer', 'Phone', 'Email', 'GSTIN', 'State', 'Taxable Amount', 'Discount', 'CGST', 'SGST', 'IGST', 'Round Off', 'Total', 'Status']];
      (reportData.invoices || []).forEach(function (inv) {
        rows.push([inv.invoice_number, inv.invoice_date, inv.customer_name,
          inv.customer_phone || '', inv.customer_email || '', inv.customer_gstin || '', inv.customer_state || '',
          (inv.subtotal || 0).toFixed(2), (inv.discount || 0).toFixed(2),
          (inv.cgst || 0).toFixed(2), (inv.sgst || 0).toFixed(2),
          (inv.igst || 0).toFixed(2), (inv.round_off || 0).toFixed(2),
          (inv.total || 0).toFixed(2), inv.status]);
      });
      return rows;
    }
    function _itemsRows() {
      var rows = [['Invoice #', 'Date', 'Customer', 'Item Name', 'HSN/SAC', 'Qty', 'Unit', 'Rate', 'Disc%', 'GST%', 'Amount']];
      (reportData.invoices || []).forEach(function (inv) {
        (inv.items || []).forEach(function (item) {
          var lineTotal = (item.qty || 0) * (item.rate || 0);
          var discAmt = lineTotal * (item.disc_pct || 0) / 100;
          var afterDisc = lineTotal - discAmt;
          var gstAmt = afterDisc * (item.gst || 0) / 100;
          rows.push([inv.invoice_number, inv.invoice_date, inv.customer_name,
            item.name, item.hsn || '', item.qty, item.unit || '',
            (item.rate || 0).toFixed(2), (item.disc_pct || 0),
            (item.gst || 0), (afterDisc + gstAmt).toFixed(2)]);
        });
      });
      return rows;
    }
    function _gstRows() {
      var rows = [['HSN/SAC', 'GST Rate(%)', 'Taxable Amount', 'CGST Rate(%)', 'CGST Amount', 'SGST Rate(%)', 'SGST Amount', 'IGST Rate(%)', 'IGST Amount', 'Total Tax']];
      (reportData.hsn_summary || []).forEach(function (h) {
        rows.push([h.hsn || '-', h.gst_rate, h.taxable.toFixed(2),
          h.cgst_rate || '', h.cgst.toFixed(2), h.sgst_rate || '', h.sgst.toFixed(2),
          h.igst_rate || '', h.igst.toFixed(2), h.total_tax.toFixed(2)]);
      });
      return rows;
    }

    // ── Sales Report downloads ──
    document.getElementById('dlSalesMenu').addEventListener('click', function(e) {
      var btn = e.target.closest('button[data-fmt]');
      if (!btn) return;
      if (!reportData || !reportData.invoices) { showToast('Generate report first', 'error'); return; }
      var fmt = btn.dataset.fmt;
      var rows = _salesRows();
      var suffix = _rptFileSuffix();
      if (fmt === 'csv') { downloadCSV(rows, 'sales_report_' + suffix + '.csv'); showToast('Sales CSV downloaded!', 'success'); }
      else if (fmt === 'excel') { downloadExcel(rows, 'sales_report_' + suffix + '.xlsx', 'Sales Report'); showToast('Sales Excel downloaded!', 'success'); }
      else if (fmt === 'pdf') { downloadPDF(rows, 'sales_report_' + suffix + '.pdf', 'Sales Report (' + (reportData.invoices.length) + ' invoices)'); showToast('Sales PDF downloaded!', 'success'); }
      document.getElementById('dlSalesMenu').classList.remove('open');
    });

    // ── Items Report downloads ──
    document.getElementById('dlItemsMenu').addEventListener('click', function(e) {
      var btn = e.target.closest('button[data-fmt]');
      if (!btn) return;
      if (!reportData || !reportData.invoices) { showToast('Generate report first', 'error'); return; }
      var fmt = btn.dataset.fmt;
      var rows = _itemsRows();
      var suffix = _rptFileSuffix();
      if (fmt === 'csv') { downloadCSV(rows, 'items_report_' + suffix + '.csv'); showToast('Items CSV downloaded!', 'success'); }
      else if (fmt === 'excel') { downloadExcel(rows, 'items_report_' + suffix + '.xlsx', 'Items Report'); showToast('Items Excel downloaded!', 'success'); }
      else if (fmt === 'pdf') { downloadPDF(rows, 'items_report_' + suffix + '.pdf', 'Item-wise Report'); showToast('Items PDF downloaded!', 'success'); }
      document.getElementById('dlItemsMenu').classList.remove('open');
    });

    // ── GST Report downloads ──
    document.getElementById('dlGstMenu').addEventListener('click', function(e) {
      var btn = e.target.closest('button[data-fmt]');
      if (!btn) return;
      if (!reportData || !reportData.hsn_summary) { showToast('Generate report first', 'error'); return; }
      var fmt = btn.dataset.fmt;
      var rows = _gstRows();
      var suffix = _rptFileSuffix();
      if (fmt === 'csv') { downloadCSV(rows, 'gst_report_' + suffix + '.csv'); showToast('GST CSV downloaded!', 'success'); }
      else if (fmt === 'excel') { downloadExcel(rows, 'gst_report_' + suffix + '.xlsx', 'GST Report'); showToast('GST Excel downloaded!', 'success'); }
      else if (fmt === 'pdf') { downloadPDF(rows, 'gst_report_' + suffix + '.pdf', 'GST Summary (HSN-wise)'); showToast('GST PDF downloaded!', 'success'); }
      document.getElementById('dlGstMenu').classList.remove('open');
    });

    // Auto-generate on load
    document.getElementById('generateRptBtn').click();
  }

  function renderReportContent(data, customerFilter) {
    var s = data.summary || {};
    var invList = data.invoices || [];
    var hsnData = data.hsn_summary || [];

    var filterLabel = customerFilter ? ' &mdash; ' + esc(customerFilter) : '';
    var html = '';
    if (customerFilter) {
      html += '<div style="padding:12px 16px;background:#eef2ff;border:1px solid #c7d2fe;border-radius:8px;margin-bottom:16px;display:flex;align-items:center;gap:8px">' +
        '<svg width="18" height="18" fill="none" stroke="#4f46e5" stroke-width="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>' +
        '<strong style="color:#4f46e5">Customer: ' + esc(customerFilter) + '</strong></div>';
    }
    html += '<div class="stats-grid">' +
      statCard('Invoices', s.total_invoices || 0, '') +
      statCard('Total Sales', formatINR(s.total_amount || 0), 'primary') +
      statCard('Total Tax', formatINR(s.total_tax || 0), 'warning') +
      statCard('Received', formatINR(s.paid_amount || 0), 'success') +
      statCard('Pending', formatINR(s.unpaid_amount || 0), 'warning') +
    '</div>';

    // Sales table
    html += '<div class="table-card" style="margin-bottom:20px"><div class="table-header"><h3>Sales Report (' + invList.length + ' invoices)' + filterLabel + '</h3></div>';
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
      '</div>' +
      '<div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border)">' +
        '<label style="font-size:0.875rem;font-weight:600;color:var(--text);display:block;margin-bottom:8px">Business Logo</label>' +
        '<p style="color:var(--text-muted);font-size:0.8125rem;margin:0 0 10px">Upload your firm\'s logo. It will appear on the top-right of your invoices.</p>' +
        '<div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">' +
          (u.logo ? '<div id="logoPreview"><img src="' + u.logo + '" style="max-height:70px;max-width:180px;border:1px solid var(--border);border-radius:8px;padding:4px;background:#fff"></div>' : '<div id="logoPreview"></div>') +
          '<div>' +
            '<input type="file" id="logoUpload" accept="image/*" style="font-size:0.875rem">' +
            '<input type="hidden" id="logoData" value="">' +
            (u.logo ? '<br><button type="button" class="btn btn-ghost btn-sm" id="removeLogo" style="margin-top:6px;color:#dc2626">Remove Logo</button>' : '') +
          '</div>' +
        '</div>' +
      '</div>' +
      '</div>' +

      // ── Item Settings Card (Vyapar-style 3 column) ──
      (function() {
        var is = (u.item_settings && typeof u.item_settings === 'object') ? u.item_settings : {};
        var cats = is.categories || ['Electronics', 'Clothing', 'Food', 'Medicine', 'Other'];
        var cf = is.custom_fields_list || [];
        var cfHtml = '';
        cf.forEach(function(f, i) {
          cfHtml += '<div class="cf-row" data-idx="' + i + '">' +
            '<input class="cf-name-input" value="' + esc(f.name || '') + '" placeholder="Field name" />' +
            '<button type="button" class="cf-remove-btn" title="Remove">&times;</button></div>';
        });

        return '<div class="form-card"><h3>Item Settings</h3>' +
          '<p style="color:var(--text-muted);font-size:0.875rem;margin:0 0 20px">Configure item features, additional fields, and custom fields. These settings affect Add/Edit Item forms and invoices.</p>' +
          '<div class="is-three-col">' +

          // ─── Column 1: Item Settings ───
          '<div class="is-col">' +
            '<h4 class="is-col-title">Item Settings</h4>' +
            '<label class="is-check-row"><input type="checkbox" id="isEnableItem" ' + (is.enable_item !== false ? 'checked' : '') + '><span>Enable Item</span></label>' +
            '<div class="is-inline-row" style="margin:4px 0 8px 28px">' +
              '<span class="is-label-sm">What do you sell?</span>' +
              '<select id="isSellType" class="is-select-sm"><option value="product"' + (is.sell_type === 'service' ? '' : ' selected') + '>Product/Service</option><option value="service"' + (is.sell_type === 'service' ? ' selected' : '') + '>Service</option></select>' +
            '</div>' +
            '<label class="is-check-row"><input type="checkbox" id="isBarcodeScan" ' + (is.barcode_scan ? 'checked' : '') + '><span>Barcode Scan</span></label>' +
            '<label class="is-check-row"><input type="checkbox" id="isStock" ' + (is.stock ? 'checked' : '') + '><span>Stock Maintenance</span></label>' +
            '<div class="is-sub-row" id="stockThresholdRow" style="' + (is.stock ? '' : 'display:none') + '">' +
              '<label class="is-label-sm">Low Stock Alert Threshold</label>' +
              '<input type="number" id="isLowStockThreshold" class="is-input-sm" value="' + (is.low_stock_threshold || 10) + '" min="0" step="1">' +
            '</div>' +
            '<label class="is-check-row"><input type="checkbox" id="isShowLowStockDialog" ' + (is.show_low_stock_dialog ? 'checked' : '') + '><span>Show Low Stock Dialog</span></label>' +
            '<label class="is-check-row"><input type="checkbox" id="isItemsUnit" ' + (is.items_unit !== false ? 'checked' : '') + '><span>Items Unit</span></label>' +
            '<label class="is-check-row is-indent"><input type="checkbox" id="isDefaultUnit" ' + (is.default_unit ? 'checked' : '') + '><span>Default Unit</span></label>' +
            '<label class="is-check-row"><input type="checkbox" id="isCategory" ' + (is.category ? 'checked' : '') + '><span>Item Category</span></label>' +
            '<div class="is-sub-row" id="categoryListRow" style="' + (is.category ? '' : 'display:none') + '">' +
              '<input type="text" id="isCategoryList" class="is-input-full" value="' + esc(cats.join(', ')) + '" placeholder="Electronics, Clothing, Food...">' +
            '</div>' +
            '<label class="is-check-row"><input type="checkbox" id="isPartyRate" ' + (is.party_rate ? 'checked' : '') + '><span>Party Wise Item Rate</span></label>' +
            '<label class="is-check-row"><input type="checkbox" id="isDescription" ' + (is.description ? 'checked' : '') + '><span>Description</span></label>' +
            '<label class="is-check-row"><input type="checkbox" id="isItemTax" ' + (is.item_tax !== false ? 'checked' : '') + '><span>Item wise Tax</span></label>' +
            '<label class="is-check-row"><input type="checkbox" id="isItemDiscount" ' + (is.item_discount !== false ? 'checked' : '') + '><span>Item wise Discount</span></label>' +
            '<div class="is-inline-row" style="margin-top:12px">' +
              '<span class="is-label-sm">Quantity <small style="color:var(--text-muted)">(upto Decimal Places)</small></span>' +
              '<input type="number" id="isQtyDecimals" class="is-input-sm" value="' + (is.qty_decimals !== undefined ? is.qty_decimals : 2) + '" min="0" max="4" step="1" style="width:50px">' +
              '<small style="color:var(--text-muted);margin-left:4px">e.g. ' + (is.qty_decimals === 0 ? '1' : is.qty_decimals === 1 ? '1.0' : '1.00') + '</small>' +
            '</div>' +
          '</div>' +

          // ─── Column 2: Additional Item Fields ───
          '<div class="is-col">' +
            '<h4 class="is-col-title">Additional Item Fields</h4>' +
            '<h5 class="is-section-title">MRP/Price</h5>' +
            '<div class="is-check-inline"><label class="is-check-row"><input type="checkbox" id="isMrp" ' + (is.mrp !== false ? 'checked' : '') + '><span>MRP</span></label>' +
              '<input type="text" id="isMrpLabel" class="is-input-sm" value="' + esc(is.mrp_label || 'MRP') + '" placeholder="MRP" style="width:80px"></div>' +
            '<label class="is-check-row is-indent"><input type="checkbox" id="isCalcSalePrice" ' + (is.calc_sale_price ? 'checked' : '') + '><span>Calculate Sale Price From MRP & Disc.</span></label>' +
            '<label class="is-check-row is-indent"><input type="checkbox" id="isMrpBatch" ' + (is.mrp_for_batch !== false ? 'checked' : '') + '><span>Use MRP for Batch Tracking</span></label>' +

            '<h5 class="is-section-title">Serial No. Tracking</h5>' +
            '<div class="is-check-inline"><label class="is-check-row"><input type="checkbox" id="isSerialNo" ' + (is.serial_no ? 'checked' : '') + '><span>Serial No./ IMEI No. etc</span></label>' +
              '<input type="text" id="isSerialLabel" class="is-input-sm" value="' + esc(is.serial_label || 'Serial No.') + '" placeholder="Serial No." style="width:90px"></div>' +

            '<h5 class="is-section-title">Batch Tracking</h5>' +
            '<div class="is-check-inline"><label class="is-check-row"><input type="checkbox" id="isBatchNo" ' + (is.batch_tracking ? 'checked' : '') + '><span>Batch No.</span></label>' +
              '<input type="text" id="isBatchLabel" class="is-input-sm" value="' + esc(is.batch_label || 'SIZE') + '" placeholder="Batch No." style="width:80px"></div>' +
            '<div class="is-check-inline is-indent"><label class="is-check-row"><input type="checkbox" id="isExpDate" ' + (is.exp_date ? 'checked' : '') + '><span>Exp Date</span></label>' +
              '<select id="isExpDateFmt" class="is-select-sm"><option value="mm/yy"' + (is.exp_date_fmt === 'dd/mm/yy' ? '' : ' selected') + '>mm/yy</option><option value="dd/mm/yy"' + (is.exp_date_fmt === 'dd/mm/yy' ? ' selected' : '') + '>dd/mm/yy</option></select>' +
              '<input type="text" id="isExpDateLabel" class="is-input-sm" value="' + esc(is.exp_date_label || 'Exp. Date') + '" placeholder="Exp. Date" style="width:80px"></div>' +
            '<div class="is-check-inline is-indent"><label class="is-check-row"><input type="checkbox" id="isMfgDate" ' + (is.mfg_date ? 'checked' : '') + '><span>Mfg Date</span></label>' +
              '<select id="isMfgDateFmt" class="is-select-sm"><option value="dd/mm/yy" selected>dd/mm/yy</option><option value="mm/yy">mm/yy</option></select>' +
              '<input type="text" id="isMfgDateLabel" class="is-input-sm" value="' + esc(is.mfg_date_label || 'Mfg. Date') + '" placeholder="Mfg. Date" style="width:80px"></div>' +
            '<div class="is-check-inline"><label class="is-check-row"><input type="checkbox" id="isModelNo" ' + (is.model_no ? 'checked' : '') + '><span>Model No.</span></label>' +
              '<input type="text" id="isModelLabel" class="is-input-sm" value="' + esc(is.model_label || 'Microne') + '" placeholder="Microne" style="width:80px"></div>' +
            '<div class="is-check-inline"><label class="is-check-row"><input type="checkbox" id="isSize" ' + (is.size_field !== false ? 'checked' : '') + '><span>Size</span></label>' +
              '<input type="text" id="isSizeLabel" class="is-input-sm" value="' + esc(is.size_label || 'meters') + '" placeholder="meters" style="width:80px"></div>' +
          '</div>' +

          // ─── Column 3: Item Custom Fields ───
          '<div class="is-col">' +
            '<h4 class="is-col-title">Item Custom Fields</h4>' +
            '<div id="cfList">' + cfHtml + '</div>' +
            '<button type="button" class="btn btn-outline btn-sm" id="addCfBtn" style="margin-top:8px">+ Add Custom Field</button>' +
          '</div>' +

          '</div>' + // end .is-three-col
        '</div>'; // end .form-card
      })() +

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

    // Logo upload
    document.getElementById('logoUpload').addEventListener('change', function (e) {
      var file = e.target.files[0];
      if (!file) return;
      if (file.size > 500000) { showToast('Logo must be under 500KB', 'error'); e.target.value = ''; return; }
      var reader = new FileReader();
      reader.onload = function (ev) {
        document.getElementById('logoData').value = ev.target.result;
        document.getElementById('logoPreview').innerHTML = '<img src="' + ev.target.result + '" style="max-height:70px;max-width:180px;border:1px solid var(--border);border-radius:8px;padding:4px;background:#fff">';
      };
      reader.readAsDataURL(file);
    });

    // Remove logo button
    var removLogoBtn = document.getElementById('removeLogo');
    if (removLogoBtn) {
      removLogoBtn.addEventListener('click', function () {
        document.getElementById('logoData').value = '__REMOVE__';
        document.getElementById('logoPreview').innerHTML = '';
        document.getElementById('logoUpload').value = '';
        this.style.display = 'none';
        showToast('Logo will be removed when you save', 'warning');
      });
    }

    // Item settings toggle handlers
    var isStockCb = document.getElementById('isStock');
    var isCatCb = document.getElementById('isCategory');
    if (isStockCb) {
      isStockCb.addEventListener('change', function () {
        document.getElementById('stockThresholdRow').style.display = this.checked ? '' : 'none';
      });
    }
    if (isCatCb) {
      isCatCb.addEventListener('change', function () {
        document.getElementById('categoryListRow').style.display = this.checked ? '' : 'none';
      });
    }

    // Custom fields add/remove
    var addCfBtn = document.getElementById('addCfBtn');
    if (addCfBtn) {
      addCfBtn.addEventListener('click', function() {
        var list = document.getElementById('cfList');
        var idx = list.children.length;
        var div = document.createElement('div');
        div.className = 'cf-row';
        div.dataset.idx = idx;
        div.innerHTML = '<input class="cf-name-input" value="" placeholder="Field name" />' +
          '<button type="button" class="cf-remove-btn" title="Remove">&times;</button>';
        list.appendChild(div);
        div.querySelector('.cf-remove-btn').addEventListener('click', function() { div.remove(); });
        div.querySelector('.cf-name-input').focus();
      });
    }
    // Wire up existing remove buttons
    document.querySelectorAll('#cfList .cf-remove-btn').forEach(function(btn) {
      btn.addEventListener('click', function() { btn.closest('.cf-row').remove(); });
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
        gstin_api_key: document.getElementById('sGstApiKey').value.trim(),
        logo: (function () {
          var ld = document.getElementById('logoData').value;
          if (ld === '__REMOVE__') return '';
          return ld || (currentUser ? currentUser.logo : '') || '';
        })(),
        item_settings: (function() {
          function _el(id) { return document.getElementById(id); }
          function _chk(id) { var e = _el(id); return e ? e.checked : false; }
          function _val(id, def) { var e = _el(id); return e ? e.value : (def || ''); }
          // Collect custom fields
          var cfRows = document.querySelectorAll('#cfList .cf-row');
          var cfList = [];
          cfRows.forEach(function(r) {
            var nameInp = r.querySelector('.cf-name-input');
            if (nameInp && nameInp.value.trim()) cfList.push({ name: nameInp.value.trim() });
          });
          return {
            // Column 1: Item Settings
            enable_item: _chk('isEnableItem'),
            sell_type: _val('isSellType', 'product'),
            barcode_scan: _chk('isBarcodeScan'),
            stock: _chk('isStock'),
            low_stock_threshold: parseInt(_val('isLowStockThreshold', '10')) || 10,
            show_low_stock_dialog: _chk('isShowLowStockDialog'),
            items_unit: _chk('isItemsUnit'),
            default_unit: _chk('isDefaultUnit'),
            category: _chk('isCategory'),
            categories: (_val('isCategoryList', 'Electronics, Clothing, Food, Medicine, Other')).split(',').map(function(c) { return c.trim(); }).filter(Boolean),
            party_rate: _chk('isPartyRate'),
            description: _chk('isDescription'),
            item_tax: _chk('isItemTax'),
            item_discount: _chk('isItemDiscount'),
            qty_decimals: parseInt(_val('isQtyDecimals', '2')) || 0,
            // Column 2: Additional Item Fields
            mrp: _chk('isMrp'),
            mrp_label: _val('isMrpLabel', 'MRP'),
            calc_sale_price: _chk('isCalcSalePrice'),
            mrp_for_batch: _chk('isMrpBatch'),
            serial_no: _chk('isSerialNo'),
            serial_label: _val('isSerialLabel', 'Serial No.'),
            batch_tracking: _chk('isBatchNo'),
            batch_label: _val('isBatchLabel', 'SIZE'),
            exp_date: _chk('isExpDate'),
            exp_date_fmt: _val('isExpDateFmt', 'mm/yy'),
            exp_date_label: _val('isExpDateLabel', 'Exp. Date'),
            mfg_date: _chk('isMfgDate'),
            mfg_date_fmt: _val('isMfgDateFmt', 'dd/mm/yy'),
            mfg_date_label: _val('isMfgDateLabel', 'Mfg. Date'),
            model_no: _chk('isModelNo'),
            model_label: _val('isModelLabel', 'Microne'),
            size_field: _chk('isSize'),
            size_label: _val('isSizeLabel', 'meters'),
            // Column 3: Custom Fields
            custom_fields: cfList.length > 0,
            custom_fields_list: cfList,
            // Preserve column visibility prefs
            visible_columns: (currentUser && currentUser.item_settings && currentUser.item_settings.visible_columns) || {},
            pd_visible_columns: (currentUser && currentUser.item_settings && currentUser.item_settings.pd_visible_columns) || {}
          };
        })()
      };
      var submitBtn = e.target.querySelector('button[type="submit"]');
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Saving...'; }
      api('PUT', '/api/auth/profile', body).then(function (data) {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Save Settings'; }
        if (data.error) { showToast(data.error, 'error'); return; }
        currentUser = data.user;
        $topAvatar.textContent = (currentUser.name || 'U').charAt(0).toUpperCase();
        $topName.textContent = currentUser.business_name || currentUser.name;
        showToast('Settings saved!', 'success');
      }).catch(function (err) {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Save Settings'; }
        showToast('Failed to save settings. Please try again.', 'error');
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
