// What is on sale in the online shop right now. Change a link, price or name here.
//
//   title   the product name, as it reads in the shop.
//   price   the price as shown in the shop. Set from: true when bigger sizes cost more.
//   note    one short line: what it is and the colour.
//   link    the product page. The QR code is made from this, so it changes with it.
//   photo   optional. The product's own picture from the shop, saved in the products folder.
//           With it the card shows that picture. This is what every product uses now.
//   kind    'tee' or 'mug'. Picks the small drawing on the card when there is no photo.
//   shirt   colour of that drawing: white, cream, blue, navy or black.
//   file    optional. A picture from the designs folder, drawn onto the shirt or mug when there is no photo.
//
// Keep the T-shirts first and the mugs after. Names and prices read from the shop on 14 November 2026.
// This file is the only place a price is written down: change it here and the page follows.
// To add a product: save its shop picture as a square .webp in products/, then add a line here.
window.VOTE_PRODUCTS = [
  { title: 'Pancakes & Sunshine Tee',          price: '$26.99', from: true,  note: 'Unisex tee, white or natural', kind: 'tee', shirt: 'white',
    photo: 'products/pancakes-sunshine-tee.webp',
    link: 'https://app.amazecommerce.com/shop/lindasaruba/pancakes-sunshine-tee' },
  { title: 'Anatomy of a Dutch Pancake Tee',  price: '$26.99', from: true,  note: 'Unisex tee, white',  kind: 'tee', shirt: 'white',
    photo: 'products/anatomy-of-a-dutch-pancake-tee.webp', file: 'designs/46-anatomy-of-a-dutch-pancake.webp',
    link: 'https://app.amazecommerce.com/shop/lindasaruba/anatomy-of-a-dutch-pancake-tee' },
  { title: "Linda's Vintage Logo Tee",         price: '$26.99', from: true,  note: 'Unisex tee, white',  kind: 'tee', shirt: 'white',
    photo: 'products/vintage-logo.webp',
    link: 'https://app.amazecommerce.com/shop/lindasaruba/vintage-logo' },
  { title: 'Dutch Kissing Couple Aruba Tee',   price: '$26.99', from: true,  note: "Women's tee, white", kind: 'tee', shirt: 'white',
    photo: 'products/kissing-couple-tee.webp',
    link: 'https://app.amazecommerce.com/shop/lindasaruba/kissing-couple-tee' },
  { title: "Kissing Couple Women's Tank Top",  price: '$26.99', from: true,  note: "Women's tank top, white", kind: 'tee', shirt: 'white',
    photo: 'products/kissing-couple-women-s-tank-top.webp',
    link: 'https://app.amazecommerce.com/shop/lindasaruba/kissing-couple-women-s-tank-top' },
  { title: 'Love at First Bite Tee',           price: '$26.99', from: true,  note: "Women's tee, white", kind: 'tee', shirt: 'white',
    photo: 'products/untitled-product.webp', file: 'designs/shop-love-at-first-bite.webp',
    link: 'https://app.amazecommerce.com/shop/lindasaruba/untitled-product' },
  { title: "Linda's 25 Years Anniversary Tee", price: '$26.99', from: true,  note: "Women's tee, navy",  kind: 'tee', shirt: 'navy',
    photo: 'products/25-year-anniversary-shirt.webp', file: 'designs/shop-25-years.webp',
    link: 'https://app.amazecommerce.com/shop/lindasaruba/25-year-anniversary-shirt' },
  { title: 'I survived the 5 AM palapa war',   price: '$26.99', from: true,  note: 'Unisex tee, white',  kind: 'tee', shirt: 'white',
    photo: 'products/i-survived-the-5-am-palapa-war.webp',
    link: 'https://app.amazecommerce.com/shop/lindasaruba/i-survived-the-5-am-palapa-war' },
  { title: "Kids' Aruba Iguana Tee",           price: '$22.00', from: false, note: "Kids' tee, white",   kind: 'tee', shirt: 'white',
    photo: 'products/kid-s-iguana-shirt.webp',
    link: 'https://app.amazecommerce.com/shop/lindasaruba/kid-s-iguana-shirt' },

  { title: "Linda's Vintage Logo Mug",         price: '$13.99', from: false, note: 'White mug, 11 oz',   kind: 'mug', shirt: 'white',
    photo: 'products/vintage-design-mug.webp',
    link: 'https://app.amazecommerce.com/shop/lindasaruba/vintage-design-mug' },
  { title: "Linda's 25 Years Anniversary Mug", price: '$13.99', from: false, note: 'White mug, 11 oz',   kind: 'mug', shirt: 'white',
    photo: 'products/linda-s-25-years-anniversary-mug.webp', file: 'designs/shop-25-years.webp',
    link: 'https://app.amazecommerce.com/shop/lindasaruba/linda-s-25-years-anniversary-mug' },
  { title: 'Kissing Couple Mug',               price: '$13.99', from: false, note: 'White mug, 11 oz',   kind: 'mug', shirt: 'white',
    photo: 'products/kissing-couple-mug-2.webp',
    link: 'https://app.amazecommerce.com/shop/lindasaruba/kissing-couple-mug-2' }
];
