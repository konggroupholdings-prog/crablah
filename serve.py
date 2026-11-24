#!/usr/bin/env python3
"""CrabLah shop + order desk. Shop stays public; /desk.html is passworded."""
from __future__ import annotations

import json
import os
import secrets
import threading
import traceback
from datetime import datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse

ROOT = Path(__file__).resolve().parent
WEB = ROOT / "website"
DATA = ROOT / "data"
ADMIN_FILE = DATA / "admin.json"
ORDERS_FILE = DATA / "orders.json"
SGT = timezone(timedelta(hours=8))
HOST = os.environ.get("CRABLAH_HOST", "0.0.0.0")
PORT = int(os.environ.get("PORT") or os.environ.get("CRABLAH_PORT", "4175"))
TOKEN_HOURS = 14
COOKIE = "crablah_desk"

LOCK = threading.Lock()
SESSIONS = {}
LOGIN_HITS = {}

MIME = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".webp": "image/webp",
    ".txt": "text/plain; charset=utf-8",
}


def now_sgt() -> datetime:
    return datetime.now(SGT)


def iso_now() -> str:
    return now_sgt().isoformat(timespec="seconds")


def day_stamp() -> str:
    return now_sgt().strftime("%Y%m%d")


def phone_key(raw) -> str:
    digits = "".join(c for c in str(raw or "") if c.isdigit())
    if len(digits) >= 8:
        return digits[-8:]
    return digits


def read_json(path: Path, fallback):
    if not path.exists():
        return fallback
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return fallback


def write_json(path: Path, payload) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(path.name + ".tmp")
    tmp.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    os.replace(tmp, path)


def ensure_admin() -> str:
    env = os.environ.get("CRABLAH_ADMIN_PASSWORD")
    if env:
        return env
    DATA.mkdir(parents=True, exist_ok=True)
    if not ADMIN_FILE.exists():
        example = DATA / "admin.example.json"
        password = "crablah"
        if example.exists():
            password = str(read_json(example, {}).get("password") or password)
        write_json(ADMIN_FILE, {"password": password})
    data = read_json(ADMIN_FILE, {})
    return str(data.get("password") or "crablah")


def empty_store():
    return {"seq": {}, "orders": []}


def load_store() -> dict:
    store = read_json(ORDERS_FILE, empty_store())
    if not isinstance(store, dict):
        return empty_store()
    store.setdefault("seq", {})
    store.setdefault("orders", [])
    if not isinstance(store["orders"], list):
        store["orders"] = []
    return store


def save_store(store: dict) -> None:
    write_json(ORDERS_FILE, store)


def clip(value, limit=240) -> str:
    text = " ".join(str(value or "").split())
    return text[:limit]


def clean_items(raw) -> list:
    out = []
    if not isinstance(raw, list):
        return out
    for row in raw[:40]:
        if not isinstance(row, dict):
            continue
        try:
            qty = int(row.get("qty") or 1)
        except (TypeError, ValueError):
            qty = 1
        try:
            price = float(row.get("price") or 0)
        except (TypeError, ValueError):
            price = 0.0
        out.append({
            "name": clip(row.get("name"), 160),
            "qty": max(1, min(qty, 99)),
            "price": round(price, 2),
            "foc": bool(row.get("foc") or price == 0),
        })
    return out


def money_num(value, fallback=0.0) -> float:
    try:
        return round(float(value), 2)
    except (TypeError, ValueError):
        return fallback


def public_order(order: dict) -> dict:
    return json.loads(json.dumps(order))


def find_order(store: dict, order_id: str):
    for row in store["orders"]:
        if str(row.get("id")) == str(order_id):
            return row
    return None


def next_order_id(store: dict) -> str:
    day = day_stamp()
    n = int(store["seq"].get(day) or 0) + 1
    store["seq"][day] = n
    return f"{day}{n}"


def ingest_order(raw: dict, existing: dict | None) -> dict:
    customer = raw.get("customer") if isinstance(raw.get("customer"), dict) else {}
    items = clean_items(raw.get("items"))
    subtotal = money_num(raw.get("subtotal"))
    delivery = money_num(raw.get("delivery"), 15)
    total = money_num(raw.get("total"), subtotal + delivery)
    body = existing.copy() if existing else {}
    body.update({
        "customer": {
            "name": clip(customer.get("name"), 80),
            "phone": clip(customer.get("phone"), 20),
            "address": clip(customer.get("address"), 160),
            "unit": clip(customer.get("unit"), 40),
            "postal": clip(customer.get("postal"), 10),
            "date": clip(customer.get("date"), 12),
            "window": clip(customer.get("window"), 80),
            "notes": clip(customer.get("notes"), 400),
        },
        "items": items,
        "subtotal": subtotal,
        "delivery": delivery,
        "total": total,
        "fulfilment": "deliver",
        "fulfilmentLabel": "Delivery",
        "updatedAt": iso_now(),
        "phoneKey": phone_key(customer.get("phone")),
    })
    return body


def create_order(raw: dict) -> dict:
    store = load_store()
    order = ingest_order(raw, None)
    order["id"] = next_order_id(store)
    order["status"] = "awaiting_payment"
    order["paid"] = False
    order["createdAt"] = iso_now()
    order["confirmedAt"] = None
    order["paidAt"] = None
    order["kitchenNotes"] = ""
    store["orders"].append(order)
    save_store(store)
    return order


def update_draft(order_id: str, raw: dict) -> dict | None:
    store = load_store()
    row = find_order(store, order_id)
    if not row:
        return None
    if row.get("paid") or row.get("status") in ("paid", "cancelled", "claimed"):
        raise ValueError("locked")
    updated = ingest_order(raw, row)
    updated["id"] = row["id"]
    updated["status"] = row.get("status") or "awaiting_payment"
    updated["paid"] = bool(row.get("paid"))
    updated["createdAt"] = row.get("createdAt") or iso_now()
    updated["confirmedAt"] = row.get("confirmedAt")
    updated["paidAt"] = row.get("paidAt")
    updated["kitchenNotes"] = row.get("kitchenNotes") or ""
    row.clear()
    row.update(updated)
    save_store(store)
    return row


def confirm_order(order_id: str) -> dict | None:
    store = load_store()
    row = find_order(store, order_id)
    if not row:
        return None
    if row.get("status") != "cancelled":
        row["status"] = "claimed" if not row.get("paid") else "paid"
        row["confirmedAt"] = iso_now()
        row["updatedAt"] = iso_now()
        save_store(store)
    return row


def patch_order(order_id: str, raw: dict) -> dict | None:
    store = load_store()
    row = find_order(store, order_id)
    if not row:
        return None
    if "kitchenNotes" in raw:
        row["kitchenNotes"] = clip(raw.get("kitchenNotes"), 600)
    if "status" in raw:
        status = str(raw.get("status") or "")
        if status in ("awaiting_payment", "claimed", "paid", "cancelled"):
            row["status"] = status
            if status == "paid":
                row["paid"] = True
                row["paidAt"] = row.get("paidAt") or iso_now()
            elif status == "cancelled":
                row["paid"] = False
            elif status in ("awaiting_payment", "claimed"):
                row["paid"] = False
                row["paidAt"] = None
    if "paid" in raw:
        row["paid"] = bool(raw.get("paid"))
        if row["paid"]:
            row["status"] = "paid"
            row["paidAt"] = iso_now()
        elif row.get("status") == "paid":
            row["status"] = "claimed" if row.get("confirmedAt") else "awaiting_payment"
            row["paidAt"] = None
    row["updatedAt"] = iso_now()
    save_store(store)
    return row


def visit_counts(store: dict) -> dict:
    counts = {}
    for row in store["orders"]:
        key = row.get("phoneKey") or phone_key((row.get("customer") or {}).get("phone"))
        if key:
            counts[key] = counts.get(key, 0) + 1
    return counts


def list_orders(query: dict) -> list:
    store = load_store()
    counts = visit_counts(store)
    q = (query.get("q") or "").strip().lower()
    status = (query.get("status") or "").strip()
    day = (query.get("day") or "").strip()
    today = day_stamp()
    out = []
    for row in reversed(store["orders"]):
        created = str(row.get("createdAt") or "")
        order_day = str(row.get("id") or "")[:8]
        if day == "today" and order_day != today:
            continue
        st = row.get("status") or "awaiting_payment"
        if status == "unpaid" and (row.get("paid") or st == "cancelled"):
            continue
        if status in ("awaiting_payment", "claimed", "paid", "cancelled") and st != status:
            continue
        blob = " ".join([
            str(row.get("id") or ""),
            str((row.get("customer") or {}).get("name") or ""),
            str((row.get("customer") or {}).get("phone") or ""),
            str((row.get("customer") or {}).get("address") or ""),
            str((row.get("customer") or {}).get("postal") or ""),
            " ".join(i.get("name") or "" for i in row.get("items") or []),
        ]).lower()
        if q and q not in blob:
            continue
        item = public_order(row)
        key = row.get("phoneKey") or phone_key((row.get("customer") or {}).get("phone"))
        item["visits"] = counts.get(key, 1)
        item["created"] = created
        out.append(item)
    return out


def customer_history(phone: str) -> dict:
    store = load_store()
    key = phone_key(phone)
    rows = []
    name = ""
    for row in reversed(store["orders"]):
        if (row.get("phoneKey") or phone_key((row.get("customer") or {}).get("phone"))) == key:
            rows.append(public_order(row))
            if not name:
                name = (row.get("customer") or {}).get("name") or ""
    return {
        "phoneKey": key,
        "name": name,
        "count": len(rows),
        "orders": rows,
    }


def prune_sessions() -> None:
    cutoff = datetime.now(timezone.utc)
    dead = [tok for tok, exp in SESSIONS.items() if exp <= cutoff]
    for tok in dead:
        SESSIONS.pop(tok, None)


def new_session() -> str:
    prune_sessions()
    token = secrets.token_urlsafe(24)
    SESSIONS[token] = datetime.now(timezone.utc) + timedelta(hours=TOKEN_HOURS)
    return token


def valid_token(token: str) -> bool:
    prune_sessions()
    exp = SESSIONS.get(token)
    return bool(exp and exp > datetime.now(timezone.utc))


def login_allowed(ip: str) -> bool:
    now = datetime.now(timezone.utc)
    hits = [t for t in LOGIN_HITS.get(ip, []) if now - t < timedelta(minutes=10)]
    LOGIN_HITS[ip] = hits
    return len(hits) < 12


def record_login(ip: str) -> None:
    LOGIN_HITS.setdefault(ip, []).append(datetime.now(timezone.utc))


class Handler(BaseHTTPRequestHandler):
    server_version = "CrabLahDesk/1"

    def log_message(self, fmt, *args):
        print("[%s] %s" % (self.log_date_time_string(), fmt % args))

    def _read_json(self) -> dict:
        length = int(self.headers.get("Content-Length") or 0)
        if length > 200_000:
            raise ValueError("too large")
        raw = self.rfile.read(length) if length else b"{}"
        data = json.loads(raw.decode("utf-8") or "{}")
        if not isinstance(data, dict):
            raise ValueError("object required")
        return data

    def _cookie_token(self) -> str:
        header = self.headers.get("Cookie") or ""
        for part in header.split(";"):
            if "=" in part:
                k, v = part.strip().split("=", 1)
                if k == COOKIE:
                    return v.strip()
        auth = self.headers.get("Authorization") or ""
        if auth.lower().startswith("bearer "):
            return auth.split(" ", 1)[1].strip()
        return ""

    def _authed(self) -> bool:
        return valid_token(self._cookie_token())

    def _send(self, code: int, body, content_type="application/json; charset=utf-8", headers=None):
        if isinstance(body, (dict, list)):
            payload = json.dumps(body, ensure_ascii=False).encode("utf-8")
        elif isinstance(body, bytes):
            payload = body
        else:
            payload = str(body).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(payload)))
        self.send_header("Cache-Control", "no-store")
        if headers:
            for key, value in headers.items():
                self.send_header(key, value)
        self.end_headers()
        self.wfile.write(payload)

    def _json(self, code: int, body: dict, headers=None):
        self._send(code, body, headers=headers)

    def _is_https(self) -> bool:
        proto = (self.headers.get("X-Forwarded-Proto") or "").split(",")[0].strip().lower()
        return proto == "https"

    def _client_ip(self) -> str:
        forwarded = self.headers.get("CF-Connecting-IP") or self.headers.get("X-Forwarded-For") or ""
        if forwarded:
            return forwarded.split(",")[0].strip()
        return self.client_address[0]

    def _cookie_header(self, token: str | None) -> dict:
        flags = "HttpOnly; SameSite=Lax; Path=/"
        if self._is_https():
            flags += "; Secure"
        if token:
            return {"Set-Cookie": "%s=%s; %s; Max-Age=%s" % (
                COOKIE, token, flags, TOKEN_HOURS * 3600
            )}
        return {"Set-Cookie": "%s=; %s; Max-Age=0" % (COOKIE, flags)}

    def do_HEAD(self):
        try:
            self._handle_get()
        except Exception:
            traceback.print_exc()
            self._json(500, {"error": "server"})

    def do_GET(self):
        try:
            self._handle_get()
        except Exception:
            traceback.print_exc()
            self._json(500, {"error": "server"})

    def do_POST(self):
        try:
            self._handle_post()
        except Exception:
            traceback.print_exc()
            self._json(500, {"error": "server"})

    def do_PUT(self):
        try:
            self._handle_put()
        except Exception:
            traceback.print_exc()
            self._json(500, {"error": "server"})

    def _handle_get(self):
        parsed = urlparse(self.path)
        path = unquote(parsed.path)
        query = {k: (v[-1] if v else "") for k, v in parse_qs(parsed.query).items()}

        if path == "/api/health":
            self._json(200, {"ok": True})
            return
        if path == "/api/session":
            self._json(200, {"ok": self._authed()})
            return
        if path == "/api/orders":
            if not self._authed():
                self._json(401, {"error": "auth"})
                return
            with LOCK:
                orders = list_orders(query)
            self._json(200, {"orders": orders})
            return
        if path.startswith("/api/orders/"):
            if not self._authed():
                self._json(401, {"error": "auth"})
                return
            order_id = path.split("/")[3]
            with LOCK:
                store = load_store()
                row = find_order(store, order_id)
                if not row:
                    self._json(404, {"error": "missing"})
                    return
                item = public_order(row)
                item["history"] = customer_history(item.get("phoneKey") or (item.get("customer") or {}).get("phone")).get("orders") or []
            self._json(200, {"order": item})
            return
        if path.startswith("/api/customers/"):
            if not self._authed():
                self._json(401, {"error": "auth"})
                return
            phone = path.split("/")[3]
            with LOCK:
                self._json(200, customer_history(phone))
            return
        self._static(path)

    def _handle_post(self):
        parsed = urlparse(self.path)
        path = unquote(parsed.path)
        ip = self._client_ip()

        if path == "/api/login":
            if not login_allowed(ip):
                self._json(429, {"error": "wait"})
                return
            record_login(ip)
            body = self._read_json()
            password = str(body.get("password") or "")
            if secrets.compare_digest(password, ensure_admin()):
                token = new_session()
                self._json(200, {"ok": True}, headers=self._cookie_header(token))
            else:
                self._json(401, {"error": "password"})
            return
        if path == "/api/logout":
            SESSIONS.pop(self._cookie_token(), None)
            self._json(200, {"ok": True}, headers=self._cookie_header(None))
            return
        if path == "/api/orders":
            body = self._read_json()
            if not clip((body.get("customer") or {}).get("name")) or not phone_key((body.get("customer") or {}).get("phone")):
                self._json(400, {"error": "details"})
                return
            with LOCK:
                order = create_order(body)
            self._json(201, {"order": public_order(order)})
            return
        if path.endswith("/confirm") and path.startswith("/api/orders/"):
            order_id = path.split("/")[3]
            with LOCK:
                row = confirm_order(order_id)
            if not row:
                self._json(404, {"error": "missing"})
                return
            self._json(200, {"order": public_order(row)})
            return
        if path.startswith("/api/orders/"):
            if not self._authed():
                self._json(401, {"error": "auth"})
                return
            order_id = path.split("/")[3]
            body = self._read_json()
            with LOCK:
                try:
                    row = patch_order(order_id, body)
                except ValueError:
                    self._json(409, {"error": "locked"})
                    return
            if not row:
                self._json(404, {"error": "missing"})
                return
            self._json(200, {"order": public_order(row)})
            return
        self._json(404, {"error": "missing"})

    def _handle_put(self):
        parsed = urlparse(self.path)
        path = unquote(parsed.path)
        if not path.startswith("/api/orders/"):
            self._json(404, {"error": "missing"})
            return
        order_id = path.split("/")[3]
        body = self._read_json()
        with LOCK:
            try:
                row = update_draft(order_id, body)
            except ValueError:
                self._json(409, {"error": "locked"})
                return
        if not row:
            self._json(404, {"error": "missing"})
            return
        self._json(200, {"order": public_order(row)})

    def _static(self, path: str):
        if path in ("", "/"):
            path = "/index.html"
        if path == "/desk":
            path = "/desk.html"
        rel = path.lstrip("/").replace("\\", "/")
        if ".." in rel.split("/"):
            self._json(403, {"error": "no"})
            return
        full = (WEB / rel).resolve()
        try:
            full.relative_to(WEB.resolve())
        except ValueError:
            self._json(403, {"error": "no"})
            return
        if full.is_dir():
            full = full / "index.html"
        if not full.is_file():
            self._send(404, b"Not found", "text/plain; charset=utf-8")
            return
        ext = full.suffix.lower()
        self._send(200, full.read_bytes(), MIME.get(ext, "application/octet-stream"))


def main():
    ensure_admin()
    DATA.mkdir(parents=True, exist_ok=True)
    if not ORDERS_FILE.exists():
        write_json(ORDERS_FILE, empty_store())
    httpd = ThreadingHTTPServer((HOST, PORT), Handler)
    print("CrabLah shop  http://127.0.0.1:%s/" % PORT, flush=True)
    print("Order desk    http://127.0.0.1:%s/desk.html" % PORT, flush=True)
    print("Password is in data/admin.json — change it.", flush=True)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
        httpd.server_close()


if __name__ == "__main__":
    main()
