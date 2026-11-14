// The toppings of the "Create your own Dutch pancake" page, in menu order.
//
// Each topping has:
//   id     the name the code uses (the visible name is in strings.js)
//   group  which menu group it is listed under: fruit, sweet, savory or alcohol.
//          Powdered sugar follows this: a pancake with ANY topping from the savory group on it
//          is served without powdered sugar. Move a topping to another group and the sugar follows.
//   layer  where it goes on the pancake. From the bottom up:
//            cooked    baked into the batter, flush with the surface (bacon, apple rings, raisins)
//            spread    spread over the pancake (Nutella, peanut butter)
//            cheese    melted over the pancake and over everything that is cooked in
//            fresh     laid on top (strawberries, banana slices)
//            sprinkle  sprinkled over the fruit (coconut, chocolate chips)
//            drizzle   poured over all of that (syrups, honey)
//            cup       in its own little cup standing on the pancake (whipped cream, ice cream)
//            side      a shot glass next to the plate (the liqueurs)
//   price  the price of the topping. Prices are NOT shown at the moment. To show them:
//          fill in a number for every topping (for example price: 3), fill in basePrice
//          below, and set showPrices to true.
window.PK_DATA = {
  config: {
    showPrices: false,     // prices change on December 1; keep this off until the new ones are filled in
    currency: '$',
    basePrice: null,       // the plain Dutch pancake
    kioskIdleSeconds: 60   // ?kiosk=1: back to a plain pancake after this long without a touch
  },

  groups: ['fruit', 'sweet', 'savory', 'alcohol'],

  toppings: [
    // Fresh fruit
    { id: 'apple',            group: 'fruit',   layer: 'cooked',   price: null },
    { id: 'banana',           group: 'fruit',   layer: 'fresh',    price: null },
    { id: 'strawberries',     group: 'fruit',   layer: 'fresh',    price: null },
    { id: 'blueberries',      group: 'fruit',   layer: 'fresh',    price: null },
    { id: 'mango',            group: 'fruit',   layer: 'fresh',    price: null },
    { id: 'papaya',           group: 'fruit',   layer: 'fresh',    price: null },
    { id: 'pineapple',        group: 'fruit',   layer: 'fresh',    price: null },

    // Sweet
    { id: 'raisins',          group: 'sweet',   layer: 'cooked',   price: null },
    { id: 'coconut',          group: 'sweet',   layer: 'sprinkle', price: null },
    { id: 'honey',            group: 'sweet',   layer: 'drizzle',  price: null },
    { id: 'whipped_cream',    group: 'sweet',   layer: 'cup',      price: null },
    { id: 'chocolate_syrup',  group: 'sweet',   layer: 'drizzle',  price: null },
    { id: 'strawberry_syrup', group: 'sweet',   layer: 'drizzle',  price: null },
    { id: 'caramel_syrup',    group: 'sweet',   layer: 'drizzle',  price: null },
    { id: 'chocolate_chips',  group: 'sweet',   layer: 'sprinkle', price: null },
    { id: 'ice_vanilla',      group: 'sweet',   layer: 'cup',      price: null },
    { id: 'ice_chocolate',    group: 'sweet',   layer: 'cup',      price: null },
    { id: 'ice_strawberry',   group: 'sweet',   layer: 'cup',      price: null },
    { id: 'ice_oreo',         group: 'sweet',   layer: 'cup',      price: null },
    { id: 'ice_hazelnut',     group: 'sweet',   layer: 'cup',      price: null },
    { id: 'ice_pistachio',    group: 'sweet',   layer: 'cup',      price: null },
    { id: 'nutella',          group: 'sweet',   layer: 'spread',   price: null },
    { id: 'peanut_butter',    group: 'sweet',   layer: 'spread',   price: null },

    // Savory
    { id: 'bacon',            group: 'savory',  layer: 'cooked',   price: null },
    { id: 'ham',              group: 'savory',  layer: 'cooked',   price: null },
    { id: 'gouda',            group: 'savory',  layer: 'cheese',   price: null },
    { id: 'brie',             group: 'savory',  layer: 'cheese',   price: null },
    { id: 'mozzarella',       group: 'savory',  layer: 'cheese',   price: null },
    { id: 'almonds',          group: 'savory',  layer: 'cooked',   price: null },
    { id: 'walnuts',          group: 'savory',  layer: 'cooked',   price: null },
    { id: 'tuna',             group: 'savory',  layer: 'cooked',   price: null },
    { id: 'mushroom',         group: 'savory',  layer: 'cooked',   price: null },
    { id: 'green_pepper',     group: 'savory',  layer: 'cooked',   price: null },
    { id: 'onion',            group: 'savory',  layer: 'cooked',   price: null },
    { id: 'tomato',           group: 'savory',  layer: 'cooked',   price: null },

    // Alcohol
    { id: 'banana_liqueur',   group: 'alcohol', layer: 'side',     price: null },
    { id: 'rum',              group: 'alcohol', layer: 'side',     price: null },
    { id: 'coconut_rum',      group: 'alcohol', layer: 'side',     price: null },
    { id: 'amaretto',         group: 'alcohol', layer: 'side',     price: null },
    { id: 'grand_marnier',    group: 'alcohol', layer: 'side',     price: null },
    { id: 'rum_raisins',      group: 'alcohol', layer: 'fresh',    price: null }
  ]
};
