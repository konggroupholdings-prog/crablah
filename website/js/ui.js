window.CrabLahUI = (function () {
  function header(active) {
    function link(href, id, label) {
      return '<a href="' + href + '"' + (active === id ? ' class="active"' : "") + ">" + label + "</a>";
    }
    var menus = window.CrabLahProducts.menus;
    return (
      '<header class="topbar"><div class="wrap topbar-inner">' +
        '<a class="brand" href="index.html"><img class="mark" src="img/logo.png" alt="CrabLah" width="38" height="38">CrabLah</a>' +
        '<nav class="nav">' +
          link("single.html", "single", menus.single.nav) +
          link("promo.html", "promo", menus.promo.nav) +
          link("boil.html", "boil", menus.boil.nav) +
        "</nav>" +
      "</div></header>"
    );
  }

  function footer() {
    return (
      '<footer><div class="wrap">' +
        "<p><b>CrabLah</b> · Sri Lankan mud crab. Singapore gravy, to your doorstep. · @crablah.sg</p>" +
        "<p>" + ((window.CrabLahConfig && window.CrabLahConfig.notice) ||
          "Mon–Thu 2pm same-day · Fri–Sun order a day ahead · Kilo always next day · Delivery $15 · 6–8pm · Live until PayNow · Prices exclude GST") + "</p>" +
      "</div></footer>"
    );
  }

  function money(n) {
    var x = Number(n);
    return "$" + (Math.round(x * 100) % 100 === 0 ? x.toFixed(0) : x.toFixed(2));
  }

  function lineAmount(l) {
    if (l.foc || Number(l.price) === 0) return "FOC";
    return money(l.price * l.qty);
  }

  function flavourName(id) {
    var f = window.CrabLahProducts.flavours.find(function (x) { return x.id === id; });
    return f ? f.name : id;
  }

  function heatName(id) {
    var h = (window.CrabLahProducts.heats || []).find(function (x) { return x.id === id; });
    return h ? h.name : "";
  }

  function gravyLabel(build) {
    var name = flavourName(build.flavour);
    var f = window.CrabLahProducts.flavours.find(function (x) { return x.id === build.flavour; });
    if (f && f.heat) {
      var heat = heatName(build.heat || "mild");
      if (heat) name += " · " + heat;
    }
    return name;
  }

  function flavoursFor(type) {
    return window.CrabLahProducts.flavours.filter(function (f) {
      return type === "boil" ? f.pot : true;
    });
  }

  function sizeById(id) {
    return window.CrabLahProducts.sizes.find(function (s) { return s.id === id; });
  }

  function potById(id) {
    return window.CrabLahProducts.pots.find(function (p) { return p.id === id; });
  }

  function needsAdvanceOrder(build) {
    if (!build) return false;
    if (build.sizeId === "kilo") return true;
    var pot = build.potId ? potById(build.potId) : null;
    if (pot && pot.advanceOrder) return true;
    if (build.crabs && Number(build.crabs.kilo) > 0) return true;
    return false;
  }

  function isWeekendNow(d) {
    var day = (d || new Date()).getDay();
    return day === 0 || day === 5 || day === 6;
  }

  function qs(key) {
    return new URLSearchParams(location.search).get(key);
  }

  function storeBuild(data) {
    localStorage.setItem("crablah-build", JSON.stringify(data));
  }

  function loadBuild() {
    try { return JSON.parse(localStorage.getItem("crablah-build") || "null"); }
    catch (e) { return null; }
  }

  function nextOrderId() {
    var d = new Date();
    var day =
      String(d.getFullYear()) +
      String(d.getMonth() + 1).padStart(2, "0") +
      String(d.getDate()).padStart(2, "0");
    var key = "crablah-seq-" + day;
    var n = Number(localStorage.getItem(key) || 0) + 1;
    localStorage.setItem(key, String(n));
    return day + String(n);
  }

  function storeOrder(data) {
    localStorage.setItem("crablah-last-order", JSON.stringify(data));
  }

  function loadOrder() {
    try { return JSON.parse(localStorage.getItem("crablah-last-order") || "null"); }
    catch (e) { return null; }
  }

  function deliveryAddress(order) {
    var c = order.customer || {};
    return [c.address, c.unit, c.postal].filter(Boolean).join(", ");
  }

  function receiptText(order) {
    var lines = [
      "CrabLah",
      "Order " + order.id,
      "",
      order.customer.name,
      order.customer.phone,
      deliveryAddress(order),
      "Delivery " + order.customer.date + " · " + order.customer.window,
      ""
    ];
    order.items.forEach(function (l) {
      lines.push((l.qty > 1 ? l.qty + " × " : "") + l.name + "  " + lineAmount(l));
    });
    lines.push("");
    lines.push("Food  " + money(order.subtotal));
    lines.push("Delivery  " + money(order.delivery));
    lines.push("Total  " + money(order.total));
    if (order.customer.notes) {
      lines.push("");
      lines.push("Notes: " + order.customer.notes);
    }
    lines.push("");
    lines.push("Prices exclude GST.");
    return lines.join("\n");
  }

  function operatorWhatsApp() {
    var cfg = window.CrabLahConfig || {};
    var raw = String(cfg.whatsapp || "").replace(/\D/g, "");
    if (!raw && cfg.paynowMobile && cfg.paynowMobile !== "90000000") {
      raw = String(cfg.paynowMobile).replace(/\D/g, "");
    }
    if (raw.length === 8) raw = "65" + raw;
    if (raw.length === 10 && raw.slice(0, 2) !== "65") raw = "65" + raw.slice(-8);
    return raw.length >= 10 ? raw : "";
  }

  function whatsappHref(order) {
    var to = operatorWhatsApp();
    if (!to) return "";
    var body =
      "Hi CrabLah, I have paid.\n\n" +
      receiptText(order) +
      "\nPayNow remarks: " + order.id;
    return "https://wa.me/" + to + "?text=" + encodeURIComponent(body);
  }

  function defaultBuild(type, id) {
    if (type === "boil") {
      return {
        type: "boil",
        potId: id,
        flavour: "salted-egg",
        heat: "mild",
        crabs: {},
        extras: {},
        sides: {}
      };
    }
    return {
      type: type,
      sizeId: id,
      flavour: "salted-egg",
      heat: "mild",
      makePromo: type === "promo",
      moreCrabs: 0,
      sides: {}
    };
  }

  function crabCount(build) {
    if (build.type === "boil") {
      var n = 0;
      Object.keys(build.crabs || {}).forEach(function (k) { n += Number(build.crabs[k] || 0); });
      return n;
    }
    var base = build.makePromo ? 2 : 1;
    return base + Number(build.moreCrabs || 0);
  }

  function total(build) {
    var catalog = window.CrabLahProducts;
    var sum = 0;
    if (build.type === "boil") {
      var pot = potById(build.potId);
      sum += pot.price;
      Object.keys(build.crabs || {}).forEach(function (id) {
        var size = sizeById(id);
        sum += size.addon * Number(build.crabs[id] || 0);
      });
    } else {
      var size = sizeById(build.sizeId);
      var n = crabCount(build);
      sum += size.single + size.addon * (n - 1);
    }
    Object.keys(build.extras || {}).forEach(function (id) {
      var extra = catalog.boilExtras.find(function (x) { return x.id === id; });
      if (!extra) return;
      sum += extra.price * Number(build.extras[id] || 0);
    });
    Object.keys(build.sides || {}).forEach(function (id) {
      var item = catalog.sides.find(function (x) { return x.id === id; });
      sum += item.price * Number(build.sides[id] || 0);
    });
    return Math.round(sum * 100) / 100;
  }

  function lines(build) {
    var catalog = window.CrabLahProducts;
    var out = [];
    var gravy = gravyLabel(build);
    if (build.type === "boil") {
      var pot = potById(build.potId);
      out.push({ name: pot.name + " · " + gravy, qty: 1, price: pot.price });
      Object.keys(build.crabs || {}).forEach(function (id) {
        var q = Number(build.crabs[id] || 0);
        if (!q) return;
        var size = sizeById(id);
        out.push({ name: "Extra " + size.name, qty: q, price: size.addon });
      });
      Object.keys(build.extras || {}).forEach(function (id) {
        var q = Number(build.extras[id] || 0);
        if (!q) return;
        var item = catalog.boilExtras.find(function (x) { return x.id === id; });
        out.push({ name: item.name, qty: q, price: item.price });
      });
    } else {
      var size = sizeById(build.sizeId);
      var n = crabCount(build);
      var label = n === 1 ? size.name : (n === 2 ? size.twinName : n + "× " + size.name);
      out.push({ name: label + " · " + gravy, qty: 1, price: size.single + size.addon * (n - 1) });
      out.push({ name: "Fried mantou · 6 pcs", qty: 1, price: 0, foc: true });
      Object.keys(build.extras || {}).forEach(function (id) {
        var q = Number(build.extras[id] || 0);
        if (!q) return;
        var extra = catalog.boilExtras.find(function (x) { return x.id === id; });
        if (!extra) return;
        out.push({ name: extra.name, qty: q, price: extra.price });
      });
    }
    Object.keys(build.sides || {}).forEach(function (id) {
      var q = Number(build.sides[id] || 0);
      if (!q) return;
      var item = catalog.sides.find(function (x) { return x.id === id; });
      out.push({ name: item.name + (item.unit ? " · " + item.unit : ""), qty: q, price: item.price });
    });
    return out;
  }

  function ticker() {
    var beat =
      "<span>Mon–Thu 2pm same-day</span><span>Fri–Sun order a day ahead</span><span>Kilo always next day</span><span>Delivery $15 · 6–8pm</span><span>Live until PayNow</span><span>Prices exclude GST</span>";
    return '<div class="ticker" aria-hidden="true"><div class="ticker-track">' + beat + beat + "</div></div>";
  }

  function mountChrome(active) {
    document.getElementById("site-header").innerHTML =
      header(active) + (document.body.classList.contains("home") ? "" : ticker());
    var foot = document.getElementById("site-footer");
    if (foot) foot.innerHTML = footer();
  }

  return {
    mountChrome: mountChrome,
    money: money,
    lineAmount: lineAmount,
    flavourName: flavourName,
    gravyLabel: gravyLabel,
    flavoursFor: flavoursFor,
    sizeById: sizeById,
    potById: potById,
    qs: qs,
    needsAdvanceOrder: needsAdvanceOrder,
    isWeekendNow: isWeekendNow,
    storeBuild: storeBuild,
    loadBuild: loadBuild,
    nextOrderId: nextOrderId,
    storeOrder: storeOrder,
    loadOrder: loadOrder,
    deliveryAddress: deliveryAddress,
    receiptText: receiptText,
    whatsappHref: whatsappHref,
    defaultBuild: defaultBuild,
    crabCount: crabCount,
    total: total,
    lines: lines
  };
})();
