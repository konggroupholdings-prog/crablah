(function () {
  var crm = window.CrabLahCRM;
  var filter = "today";
  var selectedId = "";
  var cache = [];

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;");
  }
  function money(n) {
    var x = Number(n) || 0;
    return "$" + (Math.round(x * 100) % 100 === 0 ? x.toFixed(0) : x.toFixed(2));
  }
  function addr(c) {
    c = c || {};
    return [c.address, c.unit, c.postal].filter(Boolean).join(", ");
  }
  function statusLabel(order) {
    if (order.status === "paid" || order.paid) return "Paid";
    if (order.status === "cancelled") return "Cancelled";
    if (order.status === "claimed") return "They say paid";
    return "Awaiting PayNow";
  }
  function statusClass(order) {
    if (order.status === "paid" || order.paid) return "paid";
    if (order.status === "cancelled") return "cancelled";
    if (order.status === "claimed") return "claimed";
    return "";
  }

  function showLogin(err) {
    $("login-view").hidden = false;
    $("desk-view").hidden = true;
    $("login-error").hidden = !err;
  }

  function showDesk() {
    $("login-view").hidden = true;
    $("desk-view").hidden = false;
    tickClock();
    load();
  }

  function tickClock() {
    var el = $("desk-clock");
    if (!el) return;
    el.textContent = new Date().toLocaleString("en-SG", {
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
  }

  function queryForFilter() {
    if (filter === "today") return { day: "today" };
    if (filter === "all") return {};
    if (filter === "unpaid") return { status: "unpaid" };
    return { status: filter };
  }

  function load() {
    var q = queryForFilter();
    var search = ($("search").value || "").trim();
    if (search) q.q = search;
    var qs = Object.keys(q).map(function (k) {
      return encodeURIComponent(k) + "=" + encodeURIComponent(q[k]);
    }).join("&");
    crm.req("GET", "/api/orders" + (qs ? "?" + qs : "")).then(function (data) {
      cache = data.orders || [];
      paintStats();
      paintList();
      if (selectedId) {
        var still = cache.some(function (o) { return o.id === selectedId; });
        if (still) openOrder(selectedId);
        else paintDetail(null);
      }
    }).catch(function (err) {
      if (err.status === 401) showLogin(false);
    });
  }

  function paintStats() {
    var today = cache;
    var unpaid = today.filter(function (o) { return !o.paid && o.status !== "cancelled"; }).length;
    var paidSum = today.filter(function (o) { return o.paid; }).reduce(function (n, o) { return n + Number(o.total || 0); }, 0);
    $("desk-stats").innerHTML =
      '<div class="desk-stat"><b>' + today.length + "</b><span>In this list</span></div>" +
      '<div class="desk-stat"><b>' + unpaid + "</b><span>Need PayNow check</span></div>" +
      '<div class="desk-stat"><b>' + money(paidSum) + "</b><span>Marked paid</span></div>";
  }

  function paintList() {
    if (!cache.length) {
      $("order-list").innerHTML = '<p class="lede">No orders in this filter.</p>';
      return;
    }
    $("order-list").innerHTML = cache.map(function (o) {
      var c = o.customer || {};
      var food = (o.items || []).filter(function (i) { return !i.foc; }).map(function (i) { return i.name; }).slice(0, 2).join(" · ");
      var repeat = Number(o.visits || 1) > 1 ? '<div class="repeat-tag">Order ' + o.visits + " from this mobile</div>" : "";
      return (
        '<button type="button" class="order-card' + (o.id === selectedId ? " on" : "") + '" data-id="' + esc(o.id) + '">' +
          '<div class="order-card-top"><b>' + esc(o.id) + "</b><span class='pill " + statusClass(o) + "'>" + esc(statusLabel(o)) + "</span></div>" +
          "<div><b>" + esc(c.name) + "</b> · " + esc(c.phone) + "</div>" +
          '<div class="meta">' + esc(food) + " · " + money(o.total) + "</div>" +
          '<div class="meta">' + esc(c.date) + " · " + esc(addr(c)) + "</div>" +
          repeat +
        "</button>"
      );
    }).join("");
  }

  function lineHtml(items) {
    return (items || []).map(function (l) {
      var amt = l.foc || Number(l.price) === 0 ? "FOC" : money(l.price * (l.qty || 1));
      return '<div class="line"><span>' + (l.qty > 1 ? l.qty + "× " : "") + esc(l.name) + "</span><b>" + amt + "</b></div>";
    }).join("");
  }

  function openOrder(id) {
    selectedId = id;
    paintList();
    crm.req("GET", "/api/orders/" + encodeURIComponent(id)).then(function (data) {
      paintDetail(data.order);
    }).catch(function () {
      var local = cache.filter(function (o) { return o.id === id; })[0];
      paintDetail(local || null);
    });
  }

  function paintDetail(order) {
    var box = $("order-detail");
    if (!order) {
      box.innerHTML = '<p class="lede">Pick an order.</p>';
      return;
    }
    var c = order.customer || {};
    var history = (order.history || []).filter(function (h) { return h.id !== order.id; });
    var paidBtn = order.paid
      ? '<button class="btn btn-ghost" type="button" data-act="unpay">Not paid</button>'
      : '<button class="btn btn-chilli" type="button" data-act="pay">Mark paid</button>';
    var cancelBtn = order.status === "cancelled"
      ? '<button class="btn btn-ghost" type="button" data-act="reopen">Reopen</button>'
      : '<button class="btn btn-ghost" type="button" data-act="cancel">Cancel</button>';
    box.innerHTML =
      '<p class="kicker">' + esc(statusLabel(order)) + "</p>" +
      "<h2>" + esc(order.id) + "</h2>" +
      '<p class="meta">' + money(order.total) + " · " + esc(c.date) + " · " + esc(c.window || "") + "</p>" +
      '<div class="desk-actions">' + paidBtn + cancelBtn + "</div>" +
      '<div class="line"><span>Name</span><b>' + esc(c.name) + "</b></div>" +
      '<div class="line"><span>Mobile</span><b>' + esc(c.phone) + "</b></div>" +
      '<div class="line"><span>Address</span><b>' + esc(addr(c)) + "</b></div>" +
      (c.notes ? '<div class="line"><span>Customer note</span><b>' + esc(c.notes) + "</b></div>" : "") +
      "<h3 style='margin-top:18px'>Order</h3>" +
      lineHtml(order.items) +
      '<div class="line"><span>Food</span><b>' + money(order.subtotal) + "</b></div>" +
      '<div class="line"><span>Delivery</span><b>' + money(order.delivery) + "</b></div>" +
      '<div class="line"><span>Total</span><b>' + money(order.total) + "</b></div>" +
      '<label for="kitchen-notes">Kitchen / driver note</label>' +
      '<textarea id="kitchen-notes" rows="3">' + esc(order.kitchenNotes || "") + "</textarea>" +
      '<p style="margin-top:12px"><button class="btn btn-ink" type="button" data-act="notes">Save note</button></p>' +
      (history.length
        ? "<h3 style='margin-top:22px'>Earlier from this mobile</h3>" + history.map(function (h) {
            return '<div class="history-row"><span>' + esc(h.id) + " · " + esc((h.customer || {}).date || "") + "</span><b>" + money(h.total) + "</b></div>";
          }).join("")
        : '<p class="note" style="margin-top:18px">First order from this mobile.</p>');
    box.dataset.id = order.id;
  }

  function patch(id, body) {
    return crm.req("POST", "/api/orders/" + encodeURIComponent(id), body).then(function () {
      load();
    });
  }

  $("login-form").addEventListener("submit", function (e) {
    e.preventDefault();
    crm.req("POST", "/api/login", { password: $("password").value }).then(function () {
      $("password").value = "";
      showDesk();
    }).catch(function () {
      showLogin(true);
    });
  });

  $("logout").addEventListener("click", function () {
    crm.req("POST", "/api/logout", {}).finally(function () { showLogin(false); });
  });

  $("filters").addEventListener("click", function (e) {
    var btn = e.target.closest("[data-filter]");
    if (!btn) return;
    filter = btn.getAttribute("data-filter");
    Array.prototype.forEach.call($("filters").querySelectorAll(".chip"), function (el) {
      el.classList.toggle("active", el === btn);
    });
    selectedId = "";
    load();
  });

  var searchTimer;
  $("search").addEventListener("input", function () {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(load, 200);
  });

  $("order-list").addEventListener("click", function (e) {
    var card = e.target.closest("[data-id]");
    if (card) openOrder(card.getAttribute("data-id"));
  });

  $("order-detail").addEventListener("click", function (e) {
    var btn = e.target.closest("[data-act]");
    var id = $("order-detail").dataset.id;
    if (!btn || !id) return;
    var act = btn.getAttribute("data-act");
    if (act === "pay") patch(id, { paid: true });
    if (act === "unpay") patch(id, { paid: false });
    if (act === "cancel") patch(id, { status: "cancelled" });
    if (act === "reopen") patch(id, { status: "claimed" });
    if (act === "notes") patch(id, { kitchenNotes: $("kitchen-notes").value });
  });

  setInterval(function () {
    tickClock();
    if (!$("desk-view").hidden) load();
  }, 20000);

  crm.req("GET", "/api/session").then(function (data) {
    if (data.ok) showDesk();
    else showLogin(false);
  }).catch(function () {
    showLogin(false);
    $("login-error").hidden = false;
    $("login-error").textContent = "Start the CrabLah server (python serve.py) to use this desk.";
  });
})();
