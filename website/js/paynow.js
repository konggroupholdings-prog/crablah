window.CrabLahPayNow = (function () {
  function format(id, value) {
    var str = String(value);
    var len = str.length.toString().padStart(2, "0");
    return id + len + str;
  }

  function crc16ccitt(str) {
    var crc = 0xffff;
    for (var i = 0; i < str.length; i++) {
      crc ^= str.charCodeAt(i) << 8;
      for (var j = 0; j < 8; j++) {
        crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
        crc &= 0xffff;
      }
    }
    return crc.toString(16).toUpperCase().padStart(4, "0");
  }

  /* Banks only accept PayNow mobile as +65xxxxxxxx, not the 8 digits alone. */
  function paynowProxy(value) {
    var raw = String(value || "").trim();
    if (raw.charAt(0) === "+") return raw.replace(/\s+/g, "");
    var d = raw.replace(/\D/g, "");
    if (d.indexOf("65") === 0 && d.length >= 10) return "+" + d;
    if (d.length === 8) return "+65" + d;
    return d ? "+65" + d.slice(-8) : "";
  }

  function payload(opts) {
    var proxyType = opts.proxyType || "0";
    var proxyValue = paynowProxy(opts.proxyValue);
    var amount = opts.amount ? Number(opts.amount).toFixed(2) : "";
    var ref = opts.ref ? String(opts.ref).slice(0, 25) : "";
    var name = (opts.name || "CRABLAH").slice(0, 25);
    var editable = opts.editable ? "1" : "0";

    var merchant =
      format("00", "SG.PAYNOW") +
      format("01", proxyType) +
      format("02", proxyValue) +
      format("03", editable);

    var body =
      format("00", "01") +
      format("01", "12") +
      format("26", merchant) +
      format("52", "0000") +
      format("53", "702");

    if (amount) body += format("54", amount);
    body += format("58", "SG") + format("59", name) + format("60", "Singapore");
    if (ref) body += format("62", format("01", ref));
    body += "6304";
    return body + crc16ccitt(body);
  }

  return { payload: payload };
})();
