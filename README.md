# CrabLah — Sri Lankan crab, Singapore gravy

Slogan: **Sri Lankan crab. Singapore gravy.**

Orders are **website only**, then PayNow. Flow: home → Solo Lanka / Twin Lanka / Seafood Bag → gravy and add-ons → address → PayNow.

## Product logic

Cook is **$30 once**. Extra crabs are cheaper because they only carry the live-crab buy.

| Size | Single | Extra crab | 2× promo | Buy | Extra net | 2× net |
| --- | --- | --- | --- | --- | --- | --- |
| 650 (600–700g) | $88 | $60 | $148 | $38 | $22 | $40 |
| 750 | $98 | $68 | $166 | $47 | $21 | $40 |
| 850 | $108 | $78 | $186 | $58 | $20 | $38 |
| Kilo | $118 | $88 | $206 | $68 | $20 | $38 |

8 Crabs Large is $78.90; two at full price is $157.80. Their 2× Large “was” is $165.80; sale is not the comparison. 2× 650 at $148 is $10 under their normal two Larges.

**Mix Bag** $52 (no crab; prawn, La La, mussels, sotong 200g each). **650 Mix Bag** $108 already includes one 650. **Mix Kilo Bag** $168 (seafood 400g each). **1650 Mix Bag** $258 (seafood 600g each). Kilo SKUs and Friday–Sunday: order a day ahead. Mon–Thu others: 2pm same-day cutoff.

## Order desk

Run the shop and the private CRM from one server:

```
python serve.py
```

- Shop: http://127.0.0.1:4175/
- Desk: http://127.0.0.1:4175/desk.html
- Password: `data/admin.json` (default `crablah` — change it)

Confirm still opens WhatsApp. The desk is the list that stays: unique order numbers, paid / unpaid, notes, repeat customers by mobile. Personal PayNow cannot mark paid by itself — tick **Mark paid** after you see it.

## Before launch

Edit `website/js/config.js`: PayNow mobile, optional kitchen email. Delivery is islandwide $15.

## Files

Shop pages live in `website/`. Costs in `data/costs.json`. Kitchen in `kitchen/`. Social in `social/`. Orders sit in `data/orders.json` once the desk is running.
