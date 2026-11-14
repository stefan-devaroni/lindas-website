// All text the "Create your own Dutch pancake" page shows, in one place.
// To add Dutch or Spanish later: copy the "en" block, name it "nl" or "es", translate the right-hand side,
// and open the page with ?lang=nl or ?lang=es.
// The group headings are set in the Telegrafico font, which only has the letters A to Z:
// no digits and no punctuation in those.
window.PK_STRINGS = {
  en: {
    pageTitle: "Create your own Dutch pancake | Linda's Dutch Pancakes",
    logoAlt: "Linda's Dutch Pancakes",
    title: 'Create your own Dutch pancake',
    intro: 'One big, thin Dutch pancake. Tap what you want on it. Tap again to take it off.',

    // Group headings (letters only, see above) and the small line under a heading
    groups: { fruit: 'Fresh fruit', sweet: 'Sweet', savory: 'Savory', alcohol: 'With alcohol' },
    groupNotes: { alcohol: 'For the grown-ups. The liqueurs come as a shot next to your pancake.' },

    // Toppings: [name on the button, name inside a sentence]
    toppings: {
      apple: ['Apple', 'apple'],
      banana: ['Banana', 'banana'],
      strawberries: ['Strawberries', 'strawberries'],
      blueberries: ['Blueberries', 'blueberries'],
      mango: ['Mango', 'mango'],
      papaya: ['Papaya', 'papaya'],
      pineapple: ['Pineapple', 'pineapple'],
      raisins: ['Raisins', 'raisins'],
      coconut: ['Grated Coconut', 'grated coconut'],
      honey: ['Honey', 'honey'],
      whipped_cream: ['Whipped Cream', 'whipped cream'],
      chocolate_syrup: ['Chocolate Syrup', 'chocolate syrup'],
      strawberry_syrup: ['Strawberry Syrup', 'strawberry syrup'],
      caramel_syrup: ['Caramel Syrup', 'caramel syrup'],
      chocolate_chips: ['Chocolate Chips', 'chocolate chips'],
      ice_vanilla: ['Vanilla Ice Cream', 'vanilla ice cream'],
      ice_chocolate: ['Chocolate Ice Cream', 'chocolate ice cream'],
      ice_strawberry: ['Strawberry Ice Cream', 'strawberry ice cream'],
      ice_oreo: ['Oreo Ice Cream', 'Oreo ice cream'],
      ice_hazelnut: ['Hazelnut Ice Cream', 'hazelnut ice cream'],
      ice_pistachio: ['Pistachio Ice Cream', 'pistachio ice cream'],
      nutella: ['Nutella', 'Nutella'],
      peanut_butter: ['Peanut Butter', 'peanut butter'],
      bacon: ['Bacon', 'bacon'],
      ham: ['Ham', 'ham'],
      gouda: ['Gouda Cheese', 'Gouda'],
      brie: ['Brie Cheese', 'Brie'],
      mozzarella: ['Mozzarella Cheese', 'mozzarella'],
      almonds: ['Almonds', 'almonds'],
      walnuts: ['Walnuts', 'walnuts'],
      tuna: ['Tuna', 'tuna'],
      mushroom: ['Mushroom', 'mushroom'],
      green_pepper: ['Green Pepper', 'green pepper'],
      onion: ['Onion', 'onion'],
      tomato: ['Tomato', 'tomato'],
      banana_liqueur: ['Banana Liqueur', 'banana liqueur'],
      rum: ['Rum', 'rum'],
      coconut_rum: ['Coconut Rum', 'coconut rum'],
      amaretto: ['Amaretto', 'amaretto'],
      grand_marnier: ['Grand Marnier', 'Grand Marnier'],
      rum_raisins: ['Rum Soaked Raisins', 'rum soaked raisins']
    },

    // Buttons
    startOver: 'Start over',
    savePicture: 'Save picture',
    on: 'on',

    // The pancake's name
    nameLabel: 'Name your pancake',
    namePlaceholder: 'Name your pancake',
    suggestName: 'Name it for me',
    defaultName: 'My Dutch pancake',
    // Name ideas. {a} is the first topping, {b} the second.
    nameIdeasPlain: ['The Purist', 'Plain and Proud', 'Just Sugar'],
    nameIdeasOne: ['The Big {a}', '{a} Sunrise', 'Palm Beach {a}', 'Double Dutch {a}', 'One Happy {a}'],
    nameIdeasTwo: ['{a} Meets {b}', 'The {a} and {b}', '{a} {b} Special', 'Palm Beach {a} and {b}'],

    // The line that says what is on the pancake
    summaryPlain: 'Plain, with powdered sugar. Nothing wrong with that.',
    and: 'and',
    more: '{n} more',
    summaryMany: 'That is a lot of pancake.',
    summaryAll: 'Everything on the menu. Brave.',
    canvasLabel: 'A Dutch pancake on a plate. On it: {list}',
    canvasLabelPlain: 'A plain Dutch pancake on a plate, with powdered sugar.',

    // Prices (switched off in toppings.js for now)
    total: 'Total',

    // The saved picture
    picPlace: 'PALM BEACH ARUBA',
    picSince: 'since 2001',
    picSite: 'lindas-aruba.com',
    picFile: 'my-dutch-pancake',
    saved: 'Picture saved.',
    saveFailed: 'This device would not save the picture.',

    // Kiosk
    idleWarn: 'Still there? Starting over in {n}',

    footer: "Linda's Dutch Pancakes. Palm Beach, Aruba. Since 2001."
  }
};
