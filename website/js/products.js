window.CrabLahProducts = {
  slogan: "Sri Lankan crab. Singapore gravy. To your doorstep.",
  menus: {
    single: { nav: "Solo Lanka", kicker: "Solo Lanka", title: "Solo Lanka" },
    promo: { nav: "Twin Lanka", kicker: "Twin Lanka", title: "Twin Lanka" },
    boil: { nav: "Seafood Bag", kicker: "Seafood Bag", title: "Seafood Bag" }
  },

  flavours: [
    { id: "salted-egg", name: "Salted Egg", pot: true, blurb: "Yolk butter, curry leaf, chilli padi. The gravy people fight over with mantou." },
    { id: "chilli", name: "Chilli", pot: true, heat: true, blurb: "Sweet-savoury tomato chilli. The Singapore classic — pick mild spicy or more spicy." },
    { id: "black-pepper", name: "Black Pepper", pot: true, blurb: "Cracked pepper, butter, wok hei. Dark, loud, and a little dangerous." },
    { id: "thai-milk", name: "Thai Milk", pot: false, blurb: "Pong karee: evaporated milk, yellow curry, egg. Creamy Thai gravy, mild heat." }
  ],

  heats: [
    { id: "mild", name: "Mild spicy" },
    { id: "more", name: "More spicy" }
  ],

  /* buy = live crab cost. Cook $30 sits on the first plate / pot only. */
  sizes: [
    {
      id: "650",
      name: "Lanka 650",
      twinName: "Twin Lanka 650",
      live: "600–700g",
      liveGrams: 650,
      cooked: "380–460g",
      buy: 38,
      single: 88,
      addon: 60,
      promo2: 148,
      serves: "1–2"
    },
    {
      id: "750",
      name: "Lanka 750",
      twinName: "Twin Lanka 750",
      live: "700–800g",
      liveGrams: 750,
      cooked: "450–530g",
      buy: 47,
      single: 98,
      addon: 68,
      promo2: 166,
      serves: "1–2"
    },
    {
      id: "850",
      name: "Lanka 850",
      twinName: "Twin Lanka 850",
      live: "800–900g",
      liveGrams: 850,
      cooked: "500–590g",
      buy: 58,
      single: 108,
      addon: 78,
      promo2: 186,
      serves: "2"
    },
    {
      id: "kilo",
      name: "Lanka Kilo",
      twinName: "Twin Lanka Kilo",
      live: "900g–1kg",
      liveGrams: 950,
      cooked: "550–650g",
      buy: 68,
      single: 118,
      addon: 88,
      promo2: 206,
      serves: "2–3",
      advanceOrder: true
    }
  ],

  pots: [
    {
      id: "mix",
      sku: "MIX-01",
      name: "Mix Bag",
      pax: "2 to share",
      price: 52,
      noCrab: true,
      blurb: "Prawn, La La (Clams), mussels, sotong — 200g each — corn, potato, six mantou. No crab. Add a Lanka when you want claws.",
      contents: [
        { item: "Prawns", amount: "200g" },
        { item: "La La (Clams)", amount: "200g" },
        { item: "Mussels", amount: "200g" },
        { item: "Sotong", amount: "200g" },
        { item: "Corn", amount: "1 cob" },
        { item: "Potato", amount: "1 pc" },
        { item: "Fried mantou", amount: "6 pcs" }
      ]
    },
    {
      id: "pot-650",
      sku: "POT-650",
      name: "650 Mix Bag",
      pax: "2–4 to share",
      price: 108,
      blurb: "Mix Bag plus a live Lanka 650. Same seafood, same gravy, claws in the bag.",
      contents: [
        { item: "Sri Lankan mud crab", amount: "650g live" },
        { item: "Prawns", amount: "200g" },
        { item: "La La (Clams)", amount: "200g" },
        { item: "Mussels", amount: "200g" },
        { item: "Sotong", amount: "200g" },
        { item: "Corn", amount: "1 cob" },
        { item: "Potato", amount: "1 pc" },
        { item: "Fried mantou", amount: "6 pcs" }
      ]
    },
    {
      id: "pot-kilo",
      sku: "POT-KILO",
      name: "Mix Kilo Bag",
      pax: "4–8 to share",
      price: 168,
      advanceOrder: true,
      blurb: "Double Mix seafood — 400g each — plus a live Lanka Kilo. Order a day ahead.",
      contents: [
        { item: "Sri Lankan mud crab", amount: "900g–1kg live" },
        { item: "Prawns", amount: "400g" },
        { item: "La La (Clams)", amount: "400g" },
        { item: "Mussels", amount: "400g" },
        { item: "Sotong", amount: "400g" },
        { item: "Corn", amount: "1 cob" },
        { item: "Potato", amount: "1 pc" },
        { item: "Fried mantou", amount: "6 pcs" }
      ]
    },
    {
      id: "pot-table",
      sku: "POT-TABLE",
      name: "1650 Mix Bag",
      pax: "8–10 to share",
      price: 258,
      advanceOrder: true,
      blurb: "Triple Mix seafood — 600g each — kilo plus a 650. Order a day ahead.",
      contents: [
        { item: "Sri Lankan mud crab", amount: "Kilo + 650" },
        { item: "Prawns", amount: "600g" },
        { item: "La La (Clams)", amount: "600g" },
        { item: "Mussels", amount: "600g" },
        { item: "Sotong", amount: "600g" },
        { item: "Corn", amount: "1 cob" },
        { item: "Potato", amount: "1 pc" },
        { item: "Fried mantou", amount: "6 pcs" }
      ]
    }
  ],

  sides: [
    { id: "mantou", name: "Extra fried mantou", unit: "6 pcs", price: 3.9, img: "img/addon-mantou.png" },
    { id: "rice", name: "Jasmine rice", unit: "2 pax", price: 3, img: "img/addon-rice.png" },
    { id: "sauce", name: "Extra sauce", unit: "200ml", price: 4, img: "img/addon-sauce.png" }
  ],

  boilExtras: [
    { id: "extra-mix", name: "Extra Mix Bag", unit: "same as Mix Bag, no crab", price: 28, compareAt: 52, img: "img/mix.png" },
    { id: "prawn", name: "Prawns", unit: "200g", price: 10, img: "img/addon-prawn.png" },
    { id: "lala", name: "La La (Clams)", unit: "200g", price: 7, img: "img/addon-lala.png" },
    { id: "mussel", name: "Mussels", unit: "200g", price: 6, img: "img/addon-mussel.png" },
    { id: "sotong", name: "Sotong", unit: "200g", price: 11, img: "img/addon-sotong.png" },
    { id: "lobster", name: "Boston lobster", unit: "1 pc", price: 32, img: "img/addon-lobster.jpg" },
    { id: "sausage", name: "Chicken sausage", unit: "2 pcs", price: 4, img: "img/addon-sausage.png" }
  ]
};
