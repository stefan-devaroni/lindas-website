/* Linda's Dutch Pancakes: "Stories" — ALL the words on the page live in this one file.

   HOW TO CHANGE A STORY
   - Every piece of text looks like  { en: "English text" }.
     To add Dutch or Spanish later, add a line next to it:  { en: "...", nl: "...", es: "..." }
     and add the language to `languages` below. Anything not translated falls back to English.
   - A story has: title, teaser (the line on the start screen), panels (4 to 6), facts
     ("Did you know?", 2 or 3), an optional quiz (three answers, `correct` counts from 0),
     a gift shop line and a sources line.
   - To add a story, copy one whole { ... } block inside `stories` and change its `id`.

   PICTURES
   - `art` is the name of a drawing made in code (see stories-art.js).
   - To show a real photo on a panel instead, fill in its `photo` slot:
       photo: { src: "photos/your-file.jpg", width: 1200, height: 900,
                alt: { en: "What the picture shows" },
                caption: { en: "Line under the picture" },
                credit: { en: "Who made it / where it comes from" } }
     Put the file in stories/photos/. Leave `photo: null` to keep the drawing.
     `look: "print"` shows the photo as an old print (cream border, slightly tilted).
     `maxScale` stops a small photo from being blown up (1.5 = at most 1.5 times its real size).

   The fancy capital-letter font has LETTERS ONLY. The page checks this by itself and uses the
   normal font for any label that has a digit or punctuation in it.

   Every fact below was checked in November 2026. Sources are listed per story; the full
   claim-by-claim list is in the hand-over report. Please change facts only with a source. */

window.LINDAS_STORIES = {
  defaultLang: "en",
  languages: { en: "English" },

  /* Words used by the page itself (buttons, labels). */
  ui: {
    homeKicker:   { en: "While you wait" },
    homeTitle:    { en: "Stories from our gift shop" },
    homeSub:      { en: "Four short stories about things you can see and buy here. Tap one to read it." },
    read:         { en: "Read" },
    allStories:   { en: "All stories" },
    next:         { en: "Next" },
    back:         { en: "Back" },
    counter:      { en: "{n} of {total}" },
    factsKicker:  { en: "Did you know" },
    factsTitle:   { en: "Did you know?" },
    quizKicker:   { en: "Quiz" },
    quizRight:    { en: "Yes!" },
    quizWrong:    { en: "Not quite." },
    quizAgain:    { en: "Tap another answer." },
    shopKicker:   { en: "In our gift shop" },
    sources:      { en: "Sources" },
    more:         { en: "Read another story" }
  },

  stories: [

    /* ───────────────────────── 1. THE KISSING COUPLE ───────────────────────── */
    {
      id: "kissing-couple",
      art: "couple",
      title:  { en: "The Kissing Couple" },
      teaser: { en: "A boy, a girl and a very old postcard." },

      panels: [
        {
          heading: { en: "You have met them before" },
          text: { en: "A boy and a girl in old Dutch clothes lean in for a kiss. You find them in souvenir shops all over the Netherlands: as little statues, on mugs and on T-shirts." },
          art: "couple",
          photo: {
            src: "../assets/photos/CMP25057.webp", width: 1600, height: 1066,
            alt: { en: "A small Delft Blue figurine of a girl and a boy in Dutch costume leaning in for a kiss, on a base that says Holland." },
            caption: { en: "A Delft Blue kissing couple at Linda's." },
            credit: { en: "Photo: Linda's Dutch Pancakes" }
          }
        },
        {
          heading: { en: "Not from Delft" },
          text: { en: "Most kissing couples wear the old dress of Volendam, a fishing village north of Amsterdam: a pointed white cap for her, wide trousers and a cap for him, wooden shoes for both. Delft is a different town. It gave its name to the blue-and-white pottery the figures are often made of." },
          art: "costume",
          photo: null
        },
        {
          heading: { en: "Meet Jan and Grietje" },
          text: { en: "This picture postcard from Volendam is more than a hundred years old. It belongs to a set that tells a tiny love story: Jan rows up, takes off his hat, says hello to Grietje, and gets a kiss. The kiss card is called “Welcome home”." },
          art: "postcard",
          photo: {
            src: "photos/kissing-couple-original.webp", width: 480, height: 480,
            look: "print", maxScale: 1.5,
            alt: { en: "Old sepia photograph: a girl in a striped skirt, apron and white cap kisses a boy in dark wide trousers, cap and wooden shoes on a small wooden dock by a canal. A rowing boat lies beside them; a brick house and two people are in the background." },
            caption: { en: "Postcard “De verwelkoming. Welcome home.”, Volendam, between 1905 and 1920." },
            credit: { en: "Photographer unknown. A copy of this postcard is kept by the Zuiderzee Museum in Enkhuizen, the Netherlands." }
          }
        },
        {
          heading: { en: "From postcard to figurine?" },
          text: { en: "The story goes that a souvenir maker saw this picture and made the first kissing figurines. Nobody has proved it. A Delft city archaeologist says the true origin is lost: couples like this are known from the 1700s, and the kiss seems to have been added much later." },
          art: "mystery",
          photo: null
        },
        {
          heading: { en: "A kiss that meant peace" },
          text: { en: "The Dutch word for kiss is “zoen”. Long ago it meant making peace. A peace was sometimes sealed with a kiss, and that is how the word came to mean kiss." },
          art: "zoen",
          photo: null
        },
        {
          heading: { en: "A very big kiss" },
          text: { en: "In 2017 a giant kissing couple was placed by the water in Amsterdam's western harbour area, next to a ferry landing. Artist Saske van der Eerden made it. It stands about 10 metres (33 feet) tall, roughly as high as a three-storey building." },
          art: "giant",
          photo: null
        }
      ],

      facts: [
        { en: "In Volendam the girl's pointed cap is called a “hul”." },
        { en: "In 1428 a peace deal was signed in the city of Delft. The Dutch still call it the Zoen van Delft. No one has shown any link with the figurine: it is just a nice coincidence of words." },
        { en: "The giant couple in Amsterdam weighs about 6,700 kilos (almost 15,000 pounds) and is lit up at night." }
      ],

      quiz: {
        question: { en: "Where do the kissing couple's clothes come from?" },
        answers: [ { en: "Delft" }, { en: "Volendam" }, { en: "Amsterdam" } ],
        correct: 1,
        explain: { en: "Volendam, a fishing village. Delft only gave its name to the blue pottery." }
      },

      shop: {
        heading: { en: "Find it in our gift shop" },
        text: { en: "The kissing couple T-shirt and mug." },
        art: "bag",
        photo: null
      },
      sources: { en: "Zuiderzee Museum (collection), DutchNews, NL Times, AT5, Etymologiebank, Britannica, Wikipedia, Souvenirs Holland, Dutch4Beginners." }
    },

    /* ───────────────────────────── 2. HOT DELIGHT ───────────────────────────── */
    {
      id: "hot-delight",
      art: "pepper",
      title:  { en: "Hot Delight" },
      teaser: { en: "Aruba's papaya hot sauce started out in baby food jars." },

      panels: [
        {
          heading: { en: "Pica!" },
          text: { en: "In Aruba, hot sauce is called pica. Hot Delight makes pica di papaya: hot peppers and papaya in one bottle." },
          art: "pepper",
          photo: null
        },
        {
          heading: { en: "Grandfather's recipe" },
          text: { en: "The family says the recipe comes from Aurelio Ruiz's grandfather and is more than a hundred years old. It went from father to son until it reached Aurelio." },
          art: "papaya",
          photo: null
        },
        {
          heading: { en: "Baby food jars" },
          text: { en: "Aurelio worked as an engineer and made the sauce as a hobby, for family and friends. His first shop customer was a supermarket. He filled recycled baby food jars, with peppers and papayas grown at home." },
          art: "jar",
          photo: null
        },
        {
          heading: { en: "A company since 1993" },
          text: { en: "More and more people wanted the sauce. In 1993 Hot Delight became an official company. Today the bottles stand in restaurants, supermarkets and souvenir shops across the island." },
          art: "bottles",
          photo: {
            src: "../assets/shop/hot-sauce.webp", width: 600, height: 600, maxScale: 1.5,
            alt: { en: "Shelves full of Hot Delight hot sauce bottles in Linda's gift shop." },
            caption: { en: "Hot Delight on the shelf in our gift shop." },
            credit: { en: "Photo: Linda's Dutch Pancakes" }
          }
        },
        {
          heading: { en: "Two sauces" },
          text: { en: "Hot Delight Papaya is the original and the milder one: papaya with Madame Jeanette peppers. Hot Delight Madame mixes Madame Jeanette and habanero peppers and is very hot. The makers say both pack a punch." },
          art: "bottles",
          photo: null
        },
        {
          heading: { en: "Still a family business" },
          text: { en: "Aurelio retired on January 1, 2023. His children Rose-Ann, Kelvin and Anthony now run the company. It is based in Noord, here in Aruba." },
          art: "three-peppers",
          photo: null
        }
      ],

      facts: [
        { en: "The Madame Jeanette pepper is a cousin of the habanero. Aruba's tourism board says it can be up to 130 times hotter than a jalapeño." },
        { en: "The pepper comes from Suriname in South America and is grown a lot in Aruba." },
        { en: "The family company is called Kelant-Rose. The three children are Kelvin, Anthony and Rose-Ann. See it?" }
      ],

      quiz: {
        question: { en: "What did the very first Hot Delight sauce come in?" },
        answers: [ { en: "Recycled baby food jars" }, { en: "Coconut shells" }, { en: "Soda bottles" } ],
        correct: 0,
        explain: { en: "Recycled baby food jars. The peppers and papayas were grown at home." }
      },

      shop: {
        heading: { en: "Find it in our gift shop" },
        text: { en: "Hot Delight hot sauces, the same ones we serve at our tables." },
        art: "bag",
        photo: null
      },
      sources: { en: "Hot Delight (company website), Aruba.com (Aruba Tourism Authority), Wikipedia." }
    },

    /* ───────────────────────── 3. HEINEN DELFTS BLAUW ───────────────────────── */
    {
      id: "heinen",
      art: "windmill",
      title:  { en: "Heinen Delfts Blauw" },
      teaser: { en: "Delft Blue that began at a market stall." },

      panels: [
        {
          heading: { en: "Blue and white" },
          text: { en: "Delft Blue is pottery painted in blue on white. It is named after the Dutch city of Delft, where it was first made in the early 1600s. The potters were inspired by blue-and-white porcelain from China." },
          art: "windmill",
          photo: null
        },
        {
          heading: { en: "A market stall" },
          text: { en: "In 1975 Jaap Heinen sat painting at a summer market in the fishing village of Spakenburg. He and his wife Janny had filled the car with vases and paint. People liked his work so much that he was booked for months." },
          art: "stall",
          photo: null
        },
        {
          heading: { en: "Father and son" },
          text: { en: "His son Jorrit started painting too, to help his father and earn some pocket money. In the 1980s Jaap opened a small workshop in the village of Putten. There he taught himself every step, from making designs to glazing and firing." },
          art: "painting",
          photo: null
        },
        {
          heading: { en: "A shop on the canal" },
          text: { en: "In 1985 father and son opened their first shop on the Prinsengracht, a canal in Amsterdam. It is still a Heinen shop today. There are more shops now, from Delft and Volendam to Curaçao, Bonaire and Holland, Michigan." },
          art: "shop",
          photo: null
        },
        {
          heading: { en: "The paint starts out black" },
          text: { en: "Here is the surprise: the paint is black when it goes on. In an oven of about 1,040 °C (1,900 °F) it turns Delft blue. Every brushstroke stays visible, so the painter cannot fix a mistake afterwards." },
          art: "kiln",
          photo: null
        },
        {
          heading: { en: "Look for the fish" },
          text: { en: "Heinen's hand-painted pieces carry a small fish mark and the painter's signature. Not everything is painted by hand: the company also makes souvenirs in larger numbers in its own factories." },
          art: "fish",
          photo: null
        }
      ],

      facts: [
        { en: "Heinen mixes its own clay from more than ten raw materials. It also makes its own paint, and that takes about eight days." },
        { en: "Before Delft Blue, Jaap Heinen painted in an Asian style called Imari." },
        { en: "Three generations of the Heinen family have worked in the business. The company says it is now the world's largest maker of Delft Blue pottery." }
      ],

      quiz: {
        question: { en: "What colour is the paint before it goes into the oven?" },
        answers: [ { en: "Blue" }, { en: "Black" }, { en: "White" } ],
        correct: 1,
        explain: { en: "Black. The heat of the oven turns it blue." }
      },

      shop: {
        heading: { en: "Find it in our gift shop" },
        text: { en: "Delft Blue by Heinen. Linda's is an official Heinen partner." },
        art: "bag",
        photo: {
          src: "../assets/shop/delft-blue.webp", width: 600, height: 600, maxScale: 1.5,
          alt: { en: "A small Delft Blue kissing couple figurine on a wooden table." },
          caption: { en: "Delft Blue at Linda's." },
          credit: { en: "Photo: Linda's Dutch Pancakes" }
        }
      },
      sources: { en: "Heinen Delfts Blauw (company website), Britannica, Wikipedia, Tableware International, Homo Faber." }
    },

    /* ─────────────────────── 4. THE LITTLE BLUE HOUSES (KLM) ─────────────────────── */
    {
      id: "klm-houses",
      art: "houses",
      title:  { en: "The Little Blue Houses" },
      teaser: { en: "The airline gift that people collect." },

      panels: [
        {
          heading: { en: "A gift in the sky" },
          text: { en: "These little Delft Blue houses come from KLM, the Dutch airline. Since the 1950s KLM has handed them out on long flights, to passengers in business class. People take them home and start collecting." },
          art: "houses-plane",
          photo: null
        },
        {
          heading: { en: "Real buildings, made small" },
          text: { en: "Each house is a small copy of a real building. Many are canal houses from Amsterdam, but there is also a palace, a brewery and a train station. The Anne Frank House is number 47 and Rembrandt's house is number 48." },
          art: "houses-numbered",
          photo: null
        },
        {
          heading: { en: "Aruba has one too" },
          text: { en: "House number 103 is the Ecury House in Oranjestad, here in Aruba. KLM presented it on the island in 2022. The real house dates from 1929 and is part of the National Archaeological Museum." },
          art: "house-aruba",
          photo: null
        },
        {
          heading: { en: "One house per birthday" },
          text: { en: "KLM was founded on October 7, 1919. Every year on that date a new house joins the row. Since 1994 the number of houses has matched KLM's age: number 107 arrived in October 2026." },
          art: "house-birthday",
          photo: null
        },
        {
          heading: { en: "What is inside?" },
          text: { en: "Each house is really a little bottle. Inside is genever from the Dutch distiller Bols, a drink for grown-ups that is often called Dutch gin. On flights to countries where alcohol is not allowed, the houses are handed out empty." },
          art: "house-bottle",
          photo: null
        },
        {
          heading: { en: "Why a house?" },
          text: { en: "The story goes that in the 1950s airlines were not allowed to give passengers valuable gifts. A free drink was fine. So KLM served the drink in a little house, and asked who says a drink must come in a glass." },
          art: "house-glass",
          photo: null
        }
      ],

      facts: [
        { en: "In 1994 KLM turned 75. That year it made a batch of extra houses to catch up with its age." },
        { en: "Every house has a number. Collectors swap their doubles and hunt for the ones they miss, and KLM made an app to keep track." },
        { en: "KLM is the oldest airline in the world that still flies under its original name." }
      ],

      quiz: {
        question: { en: "When does a new house come out?" },
        answers: [ { en: "At Christmas" }, { en: "On KLM's birthday, October 7" }, { en: "On the first day of summer" } ],
        correct: 1,
        explain: { en: "On October 7, KLM's birthday. One new house every year." }
      },

      shop: {
        heading: { en: "Find them in our gift shop" },
        text: { en: "Collectors' houses from this series." },
        art: "bag",
        photo: null
      },
      sources: { en: "KLM (website and press releases), CNBC, Afar, Aruba Airport, Wikipedia." }
    }
  ]
};
