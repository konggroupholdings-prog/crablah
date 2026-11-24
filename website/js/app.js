(function () {
  var ui = window.CrabLahUI;
  var catalog = window.CrabLahProducts;
  var page = document.body.getAttribute("data-page");

  function $(id) { return document.getElementById(id); }

  function renderHome() {
    ui.mountChrome("");
    function paintBar() {
      document.body.classList.toggle("scrolled", window.scrollY > 24);
    }
    paintBar();
    window.addEventListener("scroll", paintBar, { passive: true });
  }

  function renderSizeList(kind) {
    ui.mountChrome(kind);
    var host = $("size-list");
    host.innerHTML = catalog.sizes.map(function (s) {
      if (kind === "promo") {
        return (
          '<a class="choice" href="build.html?type=promo&size=' + s.id + '">' +
            '<img class="thumb" src="img/twin.png" alt="">' +
            "<div class='copy'><h3>" + s.twinName + "</h3>" +
            '<div class="meta">Two live ' + s.live + " crabs. One gravy. 6 fried mantou. Enough for " + s.serves + (s.advanceOrder ? " · Next-day" : "") + ".</div></div>" +
            '<div class="right"><div class="price">' + ui.money(s.promo2) + "</div>" +
            '<div class="save"><s>' + ui.money(s.single * 2) + "</s> save " + ui.money(s.single * 2 - s.promo2) + "</div></div>" +
          "</a>"
        );
      }
      return (
        '<a class="choice" href="build.html?type=single&size=' + s.id + '">' +
          '<img class="thumb" src="img/single.png" alt="">' +
          "<div class='copy'><h3>" + s.name + "</h3>" +
            '<div class="meta">Live ' + s.live + " · about " + s.cooked + " cooked · " + s.serves + " · 6 fried mantou" + (s.advanceOrder ? " · Next-day" : "") + "</div></div>" +
          '<div class="right"><div class="price">' + ui.money(s.single) + "</div>" +
          '<div class="save">2nd crab ' + ui.money(s.addon) + " · save " + ui.money(s.single - s.addon) + "</div></div>" +
        "</a>"
      );
    }).join("");
  }

  function renderBoilList() {
    ui.mountChrome("boil");
    $("boil-list").innerHTML = catalog.pots.map(function (p) {
      return (
        '<a class="choice" href="build.html?type=boil&pot=' + p.id + '">' +
          '<img class="thumb" src="img/' + (p.noCrab ? "mix.png" : "pot.png") + '" alt="">' +
          "<div class='copy'><h3>" + p.name + "</h3>" +
          '<div class="meta">' + p.pax + (p.advanceOrder ? " · Next-day" : "") + " · " + p.blurb + "</div></div>" +
          '<div class="right"><div class="price">' + ui.money(p.price) + "</div></div>" +
        "</a>"
      );
    }).join("");
  }

  function saveLine(was, now) {
    var cut = Number(was) - Number(now);
    if (cut <= 0) return "";
    return '<div class="deal-prices"><s>' + ui.money(was) + "</s><b>" + ui.money(now) + '</b><span class="save-pill">Save ' + ui.money(cut) + "</span></div>";
  }

  function qtyRow(label, meta, price, qty, action, img, was) {
    var prices = was ? saveLine(was, price) : '<div class="meta">' + ui.money(price) + "</div>";
    return (
      '<div class="row addon-row">' +
        (img ? '<img class="addon-thumb" src="' + img + '" alt="">' : "") +
        "<div class='copy'><b>" + label + "</b><div class='meta'>" + meta + "</div>" + prices + "</div>" +
        '<div class="stepper">' +
          '<button type="button" data-act="' + action + '" data-dir="-1">−</button>' +
          "<b>" + qty + "</b>" +
          '<button type="button" data-act="' + action + '" data-dir="1">+</button>' +
        "</div>" +
      "</div>"
    );
  }

  function renderBuild() {
    var type = ui.qs("type");
    var sizeId = ui.qs("size");
    var potId = ui.qs("pot");
    if (type !== "boil" && !ui.sizeById(sizeId)) { location.href = "index.html"; return; }
    if (type === "boil" && !ui.potById(potId)) { location.href = "boil.html"; return; }

    var stored = ui.loadBuild();
    var build = stored && stored.type === type &&
      ((type === "boil" && stored.potId === potId) || (type !== "boil" && stored.sizeId === sizeId))
      ? stored
      : ui.defaultBuild(type, type === "boil" ? potId : sizeId);
    if (type === "promo") build.makePromo = true;
    ui.storeBuild(build);
    ui.mountChrome(type === "boil" ? "boil" : type);

    function paint() {
      ui.storeBuild(build);
      var title = "";
      var back = "single.html";
      var sub = "";
      if (type === "boil") {
        var pot = ui.potById(build.potId);
        title = pot.name;
        back = "boil.html";
        sub = pot.pax;
      } else {
        var size = ui.sizeById(build.sizeId);
        var n = ui.crabCount(build);
        title = n === 1 ? size.name : (n === 2 ? size.twinName : n + "× " + size.name);
        back = type === "promo" ? "promo.html" : "single.html";
        sub = "Live " + size.live + (n > 1 ? " each" : "") + " · " + ui.gravyLabel(build) + " · 6 fried mantou in";
      }
      $("back-link").href = back;
      $("build-title").textContent = title;
      $("build-sub").textContent = sub;

      var gravyList = ui.flavoursFor(type);
      if (!gravyList.some(function (f) { return f.id === build.flavour; })) {
        build.flavour = gravyList[0].id;
      }
      $("flavour-chips").innerHTML = gravyList.map(function (f) {
        return '<button type="button" class="chip' + (f.id === build.flavour ? " active" : "") + '" data-flavour="' + f.id + '">' + f.name + "</button>";
      }).join("");
      var chosen = gravyList.find(function (f) { return f.id === build.flavour; });
      $("flavour-copy").textContent = chosen.blurb;
      var heatHost = $("heat-row");
      if (!heatHost) {
        heatHost = document.createElement("div");
        heatHost.id = "heat-row";
        $("flavour-chips").after(heatHost);
      }
      if (chosen.heat) {
        if (!build.heat) build.heat = "mild";
        heatHost.hidden = false;
        heatHost.innerHTML =
          '<p class="heat-label">How spicy</p>' +
          '<div class="chip-row">' +
            catalog.heats.map(function (h) {
              return '<button type="button" class="chip' + (h.id === build.heat ? " active" : "") + '" data-heat="' + h.id + '">' + h.name + "</button>";
            }).join("") +
          "</div>";
      } else {
        heatHost.hidden = true;
        heatHost.innerHTML = "";
      }

      var extras = "";
      if (type === "single") {
        var s = ui.sizeById(build.sizeId);
        var save = s.single - s.addon;
        extras +=
          '<button type="button" class="deal' + (build.makePromo ? " on" : "") + '" id="make-promo">' +
            '<img class="addon-thumb" src="img/twin.png" alt="">' +
            "<div class='copy'>" +
              '<p class="kicker">' + (build.makePromo ? "In your order" : "Add a second crab") + "</p>" +
              "<b>" + (build.makePromo ? s.twinName + " is on" : "Make it Twin Lanka") + "</b>" +
              "<p>Second crab " + ui.money(s.addon) + ", not another " + ui.money(s.single) + " plate.</p>" +
              saveLine(s.single, s.addon) +
              '<div class="deal-total">Twin ' + ui.money(s.promo2) + " · two solos " + ui.money(s.single * 2) + "</div>" +
            "</div>" +
            '<span class="deal-cta">' + (build.makePromo ? "Remove" : "Add · save " + ui.money(save)) + "</span>" +
          "</button>";
      }
      if (type === "promo" || (type === "single" && build.makePromo)) {
        var s2 = ui.sizeById(build.sizeId);
        extras += '<div class="panel"><h2>A third Lanka</h2><p>Same add-on price as the second crab. A full Solo plate is ' + ui.money(s2.single) + ".</p>" +
          qtyRow("Another " + s2.name, s2.live, s2.addon, build.moreCrabs || 0, "more", "img/single.png", s2.single) +
          "</div>";
      }
      if (type === "boil") {
        var pot2 = ui.potById(build.potId);
        extras += '<div class="panel"><h2>In the bag</h2><ul class="contents">' +
          pot2.contents.map(function (c) { return "<li>" + c.item + " · " + c.amount + "</li>"; }).join("") +
          "</ul></div>";
        extras += '<div class="panel"><h2>Add a Lanka crab</h2><p>Add-on price — not a second Solo Lanka plate.</p>';
        catalog.sizes.forEach(function (sz) {
          extras += qtyRow(sz.name, sz.live, sz.addon, Number((build.crabs || {})[sz.id] || 0), "crab:" + sz.id, "img/single.png", sz.single);
        });
        extras += '</div><div class="panel"><h2>More in the bag</h2><p>Prawn, La La (Clams), mussels, sotong — 200g packs. Boston lobster is 1 pc.</p>';
        catalog.boilExtras.forEach(function (item) {
          extras += qtyRow(item.name, item.unit, item.price, Number((build.extras || {})[item.id] || 0), "extra:" + item.id, item.img, item.compareAt);
        });
        extras += "</div>";
      } else {
        var lobster = catalog.boilExtras.find(function (x) { return x.id === "lobster"; });
        if (lobster) {
          extras += '<div class="panel"><h2>Add lobster</h2><p>Same gravy, add-on price — not a second plate.</p>';
          extras += qtyRow(lobster.name, lobster.unit, lobster.price, Number((build.extras || {})[lobster.id] || 0), "extra:" + lobster.id, lobster.img);
          extras += "</div>";
        }
      }
      extras += '<div class="panel"><h2>Mantou and rice</h2>';
      if (type === "boil") {
        extras += "<p>The bag already has 6 fried mantou. Add more in packs of 6.</p>";
      } else {
        extras += "<p>6 fried mantou come with Solo and Twin Lanka. Add more in packs of 6.</p>";
        extras +=
          '<div class="row addon-row">' +
            '<img class="addon-thumb" src="img/addon-mantou.png" alt="">' +
            "<div class='copy'><b>Fried mantou</b><div class='meta'>6 pcs · already in the bag</div></div>" +
            '<b class="foc-tag">Included</b>' +
          "</div>";
      }
      catalog.sides.forEach(function (item) {
        extras += qtyRow(item.name, item.unit, item.price, Number((build.sides || {})[item.id] || 0), "side:" + item.id, item.img);
      });
      extras += "</div>";
      $("build-extras").innerHTML = extras;

      $("sticky-price").textContent = ui.money(ui.total(build));
      var bits = ui.lines(build).map(function (l) { return (l.qty > 1 ? l.qty + "× " : "") + l.name; });
      $("sticky-note").textContent = bits.slice(0, 2).join(" · ");
    }

    $("build-root").addEventListener("click", function (e) {
      var t = e.target.closest("[data-flavour], [data-heat], [data-act], #make-promo");
      if (!t) return;
      if (t.dataset.flavour) {
        build.flavour = t.dataset.flavour;
        var picked = catalog.flavours.find(function (f) { return f.id === build.flavour; });
        if (picked && picked.heat && !build.heat) build.heat = "mild";
        paint();
        return;
      }
      if (t.dataset.heat) {
        build.heat = t.dataset.heat;
        paint();
        return;
      }
      if (t.id === "make-promo") {
        build.makePromo = !build.makePromo;
        if (!build.makePromo) build.moreCrabs = 0;
        paint();
        return;
      }
      var dir = Number(t.dataset.dir);
      var act = t.dataset.act;
      if (act === "more") {
        build.moreCrabs = Math.max(0, Number(build.moreCrabs || 0) + dir);
      } else if (act.indexOf("crab:") === 0) {
        var cid = act.slice(5);
        build.crabs = build.crabs || {};
        build.crabs[cid] = Math.max(0, Number(build.crabs[cid] || 0) + dir);
      } else if (act.indexOf("extra:") === 0) {
        var eid = act.slice(6);
        build.extras = build.extras || {};
        build.extras[eid] = Math.max(0, Number(build.extras[eid] || 0) + dir);
      } else if (act.indexOf("side:") === 0) {
        var sid = act.slice(5);
        build.sides = build.sides || {};
        build.sides[sid] = Math.max(0, Number(build.sides[sid] || 0) + dir);
      }
      paint();
    });

    $("go-checkout").addEventListener("click", function () {
      ui.storeBuild(build);
      location.href = "checkout.html";
    });

    paint();
  }

  function needOrder() {
    var order = ui.loadOrder();
    if (!order) { location.href = "checkout.html"; return null; }
    return order;
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;");
  }

  function reviewBlock(title, rows) {
    return (
      (title ? "<h2>" + title + "</h2>" : "") +
      rows.map(function (r) {
        return '<div class="line"><span>' + r[0] + "</span><b>" + esc(r[1]) + "</b></div>";
      }).join("")
    );
  }

  function orderLinesHtml(order) {
    return order.items.map(function (l) {
      return '<div class="line"><span>' + (l.qty > 1 ? l.qty + "× " : "") + l.name + "</span><b>" + ui.lineAmount(l) + "</b></div>";
    }).join("");
  }

  function renderCheckout() {
    ui.mountChrome("");
    var cfg = window.CrabLahConfig;
    var build = ui.loadBuild();
    if (!build) { location.href = "index.html"; return; }

    var deliveryFee = Number(cfg.delivery || 15);
    var existing = ui.loadOrder();

    $("order-lines").innerHTML = ui.lines(build).map(function (l) {
      return '<div class="line"><span>' + (l.qty > 1 ? l.qty + "× " : "") + l.name + "</span><b>" + ui.lineAmount(l) + "</b></div>";
    }).join("");
    $("sum-food").textContent = ui.money(ui.total(build));
    $("sum-del").textContent = ui.money(deliveryFee);
    $("sum-total").textContent = ui.money(ui.total(build) + deliveryFee);

    function ymd(d) {
      return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    }

    function minDate() {
      var start = new Date();
      var cutoff = Number(cfg.sameDayDeliveryCutoffHour || 14);
      var kilo = ui.needsAdvanceOrder(build);
      if (kilo || ui.isWeekendNow(start) || start.getHours() >= cutoff) {
        start.setDate(start.getDate() + 1);
      }
      return ymd(start);
    }

    var min = minDate();
    $("date").min = min;
    if (ui.needsAdvanceOrder(build)) {
      $("when-copy").innerHTML =
        "<b>Kilo is next-day.</b> Lanka Kilo, Mix Kilo Bag, and 1650 Mix Bag: order today, earliest tomorrow. Friday–Sunday is always next-day too. Window 6–8pm — the driver will message you.";
    } else if (ui.isWeekendNow()) {
      $("when-copy").innerHTML =
        "<b>Friday–Sunday: order a day ahead.</b> Earliest delivery is tomorrow. Window 6–8pm — the driver will message you.";
    } else {
      $("when-copy").innerHTML =
        "<b>Last order 2pm for same-day delivery.</b> After 2pm, next day. Friday–Sunday and kilo: order a day ahead. Window 6–8pm — the driver will message you. No fixed minute.";
    }

    if (existing && existing.customer) {
      $("name").value = existing.customer.name || "";
      $("phone").value = existing.customer.phone || "";
      $("address").value = existing.customer.address || "";
      $("unit").value = existing.customer.unit || "";
      $("postal").value = existing.customer.postal || "";
      $("notes").value = existing.customer.notes || "";
      if (existing.customer.date && existing.customer.date >= min) $("date").value = existing.customer.date;
    }
    if (!$("date").value || $("date").value < min) $("date").value = min;

    $("checkout-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var need = ["name", "phone", "date", "address", "postal"];
      for (var i = 0; i < need.length; i++) {
        if (!$("" + need[i]).value.trim()) { alert("Please fill in " + need[i] + "."); return; }
      }
      var food = ui.total(build);
      var prev = ui.loadOrder();
      var order = {
        id: prev && prev.id && !prev.confirmedAt ? prev.id : "",
        localOnly: !!(prev && prev.localOnly && !prev.confirmedAt),
        fulfilment: "deliver",
        fulfilmentLabel: "Delivery",
        customer: {
          name: $("name").value.trim(),
          phone: $("phone").value.trim(),
          address: $("address").value.trim(),
          unit: $("unit").value.trim(),
          postal: $("postal").value.trim(),
          date: $("date").value,
          window: cfg.deliveryWindow + ", driver to confirm",
          notes: $("notes").value.trim()
        },
        items: ui.lines(build),
        subtotal: food,
        delivery: deliveryFee,
        total: food + deliveryFee
      };
      var btn = e.target.querySelector('[type="submit"]') || e.target;
      var label = btn.textContent;
      btn.disabled = true;
      btn.textContent = "Saving order…";
      function go(saved) {
        ui.storeOrder(saved);
        location.href = "pay.html";
      }
      function localGo() {
        if (!order.id) order.id = ui.nextOrderId();
        order.localOnly = true;
        go(order);
      }
      var crm = window.CrabLahCRM;
      if (!crm) { localGo(); return; }
      crm.alive().then(function (ok) {
        if (!ok) { localGo(); return; }
        return crm.upsertOrder(order).then(go);
      }).catch(function () {
        localGo();
      }).then(function () {
        btn.disabled = false;
        btn.textContent = label;
      });
    });
  }

  function renderPay() {
    ui.mountChrome("");
    var order = needOrder();
    if (!order) return;
    $("pay-amount").textContent = ui.money(order.total);
    $("pay-ref").textContent = order.id;
  }

  function renderConfirm() {
    ui.mountChrome("");
    var order = needOrder();
    if (!order) return;
    var c = order.customer;
    $("review-details").innerHTML = reviewBlock("Your details", [
      ["Name", c.name],
      ["Mobile", c.phone],
      ["Address", ui.deliveryAddress(order)],
      ["Date", c.date + " · " + c.window],
      ["Notes", c.notes || "—"]
    ]);
    $("review-order").innerHTML =
      "<h2>Your order</h2>" +
      orderLinesHtml(order) +
      '<div class="line"><span>Food</span><b>' + ui.money(order.subtotal) + "</b></div>" +
      '<div class="line"><span>Delivery</span><b>' + ui.money(order.delivery) + "</b></div>" +
      '<div class="line"><span>Total</span><b>' + ui.money(order.total) + "</b></div>";

    $("confirm-order").addEventListener("click", function (e) {
      e.preventDefault();
      var btn = $("confirm-order");
      if (btn.getAttribute("data-busy")) return;
      btn.setAttribute("data-busy", "1");
      var label = btn.textContent;
      btn.textContent = "Sending…";
      function finish(saved) {
        if (saved && saved.id) {
          saved.confirmedAt = saved.confirmedAt || new Date().toISOString();
          ui.storeOrder(saved);
          order = saved;
        } else {
          order.confirmedAt = new Date().toISOString();
          ui.storeOrder(order);
        }
        var href = ui.whatsappHref(order);
        if (href) window.open(href, "_blank");
        location.href = "confirmed.html";
      }
      var crm = window.CrabLahCRM;
      if (!crm) { finish(order); return; }
      crm.alive().then(function (ok) {
        if (!ok) { finish(order); return; }
        return crm.confirmOrder(order).then(finish);
      }).catch(function () {
        finish(order);
      }).then(function () {
        btn.textContent = label;
        btn.removeAttribute("data-busy");
      });
    });
  }

  function renderConfirmed() {
    ui.mountChrome("");
    var order = needOrder();
    if (!order) return;
    $("confirmed-lede").textContent =
      "Order " + order.id + ". Keep this receipt. Delivery 6–8pm — the driver will message you.";
    $("receipt").innerHTML =
      '<p class="kicker">Order ' + esc(order.id) + "</p>" +
      "<h2>" + esc(order.customer.name) + "</h2>" +
      reviewBlock("", [
        ["Mobile", order.customer.phone],
        ["Address", ui.deliveryAddress(order)],
        ["When", order.customer.date + " · " + order.customer.window]
      ]) +
      orderLinesHtml(order) +
      '<div class="line"><span>Food</span><b>' + ui.money(order.subtotal) + "</b></div>" +
      '<div class="line"><span>Delivery</span><b>' + ui.money(order.delivery) + "</b></div>" +
      '<div class="line"><span>Total</span><b>' + ui.money(order.total) + "</b></div>" +
      (order.customer.notes ? '<div class="line"><span>Notes</span><b>' + esc(order.customer.notes) + "</b></div>" : "");

    $("save-receipt").addEventListener("click", function () { window.print(); });
    $("download-receipt").addEventListener("click", function () {
      var a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([ui.receiptText(order)], { type: "text/plain;charset=utf-8" }));
      a.download = "CrabLah-" + order.id + ".txt";
      a.click();
    });
  }

  if (page === "home") renderHome();
  if (page === "single") renderSizeList("single");
  if (page === "promo") renderSizeList("promo");
  if (page === "boil") renderBoilList();
  if (page === "build") renderBuild();
  if (page === "checkout") renderCheckout();
  if (page === "pay") renderPay();
  if (page === "confirm") renderConfirm();
  if (page === "confirmed") renderConfirmed();
})();
