window.CrabLahCRM = (function () {
  function req(method, path, body) {
    var opts = {
      method: method,
      credentials: "same-origin",
      headers: { Accept: "application/json" }
    };
    if (body !== undefined) {
      opts.headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(body);
    }
    return fetch(path, opts).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (!res.ok) {
          var err = new Error((data && data.error) || ("http " + res.status));
          err.status = res.status;
          err.data = data;
          throw err;
        }
        return data;
      });
    });
  }

  function alive() {
    return fetch("/api/health", { credentials: "same-origin" })
      .then(function (res) { return res.ok; })
      .catch(function () { return false; });
  }

  function upsertOrder(order) {
    var payload = {
      customer: order.customer,
      items: order.items,
      subtotal: order.subtotal,
      delivery: order.delivery,
      total: order.total,
      fulfilment: order.fulfilment,
      fulfilmentLabel: order.fulfilmentLabel
    };
    function create() {
      return req("POST", "/api/orders", payload).then(function (data) { return data.order; });
    }
    if (!order.id || order.localOnly) return create();
    return req("PUT", "/api/orders/" + encodeURIComponent(order.id), payload)
      .then(function (data) { return data.order; })
      .catch(function (err) {
        if (err.status === 404) return create();
        throw err;
      });
  }

  function confirmOrder(order) {
    function mark(id) {
      return req("POST", "/api/orders/" + encodeURIComponent(id) + "/confirm", {}).then(function (data) {
        return data.order;
      });
    }
    if (order.id && !order.localOnly) {
      return mark(order.id).catch(function (err) {
        if (err.status === 404) {
          return upsertOrder(order).then(function (saved) { return mark(saved.id); });
        }
        throw err;
      });
    }
    return upsertOrder(order).then(function (saved) { return mark(saved.id); });
  }

  return {
    alive: alive,
    req: req,
    upsertOrder: upsertOrder,
    confirmOrder: confirmOrder
  };
})();
