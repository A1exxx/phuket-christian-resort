/* Реестр визуальных элементов проекта. Каждый слот — самостоятельная единица:
   свой референс, свой промпт, свой выходной файл. Править элемент = поменять
   промпт здесь и перегенерировать ОДИН слот:  node gen-slot.mjs <имя>
   Список и статусы:                            node gen-slot.mjs --list      */

const PHOTOS = "C:/Users/user/Downloads/cafechearch";

export const SLOTS = {

  /* ── Трансформации реальных фото (провайдер google, нужен биллинг) ── */

  "statue-water": {
    provider: "openrouter",
    ref: `${PHOTOS}/photo_6291971576924147947_y.jpg`,
    out: "images/site/site-statue-water.png",
    ar: "16:9",
    title: "Главный кадр: статуя на воде у дальнего берега",
    prompt: "Transform this exact lake photograph into a finished Christian destination while PRESERVING the original camera position, waterline, shoreline curve, green hills and treeline. A monumental white marble statue of Jesus Christ with arms outstretched stands IN THE SHALLOW WATER CLOSE TO THE FAR SHORE at the left, NOT in the middle of the lake — on a low stone platform just above the water, connected to the shore by a short wooden pier, mirror reflection in the calm water. The abandoned buildings at the far shore become a modest elegant PROTESTANT lakeside chapel: clean white gable-roof buildings, a plain cross on a low square tower, no spires, no ornate decoration. Replace the overcast sky with warm golden hour light. Photorealistic architectural visualization, same viewpoint as the original photo."
  },

  "cafe-entrance": {
    provider: "openrouter",
    ref: `${PHOTOS}/photo_6291971576924147945_y.jpg`,
    out: "images/site/site-cafe-entrance.png",
    ar: "16:9",
    title: "Каркас → кафе, вход с ангелами, набережная",
    prompt: "Transform this exact lakeside photograph into a finished Christian destination while PRESERVING the original camera angle, the lake, the shoreline, the green hills and distant houses. The abandoned 3-story concrete frame on the left is COMPLETED into an elegant 3-story white stone cafe with arched windows and a rooftop terrace with pergola. The dirt parking becomes a stone-paved entrance plaza with two white marble angel statues with feathered wings flanking the walkway, tropical flowers, elegant lanterns. The thatched hut becomes a white stone pavilion. The floating pontoons become an elegant wooden boardwalk with decorative railings. Low stone walls with engraved Bible verse calligraphy along the waterfront. Remove the pickup truck and motorbike. Warm golden hour light instead of the overcast sky. In the far distance a white statue of Jesus standing in the shallow water near the shore. Photorealistic architectural visualization, same viewpoint."
  },

  "retreat": {
    provider: "openrouter",
    ref: `${PHOTOS}/photo_6291971576924147948_y.jpg`,
    out: "images/site/site-retreat.png",
    ar: "16:9",
    title: "Павильоны у воды → ретрит-центр",
    prompt: "Transform this exact lake photograph into a finished Christian retreat center while PRESERVING the camera position, waterline, hills and treeline. The row of abandoned single-story lakefront pavilions on the right shore becomes a beautiful white retreat center: elegant guest pavilions with terraces over the water, connected by a covered walkway, warm light in the windows. A floating wooden prayer platform on the lake in front, a few people sitting peacefully. Landscaped gardens behind. Power pylons removed. Soft warm sunset light instead of the overcast sky. Photorealistic architectural visualization, same viewpoint."
  },

  "panorama": {
    provider: "openrouter",
    ref: `${PHOTOS}/photo_6291971576924147949_y.jpg`,
    out: "images/site/site-panorama.png",
    ar: "16:9",
    title: "Панорама всего комплекса с берега",
    prompt: "Transform this exact wide lake photograph into a finished Christian destination while PRESERVING the camera position, the wide water, shoreline and hills. The abandoned concrete frame at the far left becomes an elegant white 3-story cafe with terraces. Along the far shore: a modest white protestant chapel with a plain cross on a low tower, and a row of white lakefront retreat pavilions. A white statue of Jesus with outstretched arms stands in the shallow water NEAR THE LEFT SHORE by the cafe, reflected in the water. A stone promenade with lanterns rings the lake. Remove the green sports car and power pylons. Warm golden hour light instead of the overcast sky. Photorealistic architectural visualization, same viewpoint."
  },

  "masterplan-real": {
    provider: "openrouter",
    ref: "images/site/site-satellite-real.png",
    out: "images/site/site-masterplan-real.png",
    ar: "16:9",
    title: "Генплан поверх реального спутника",
    prompt: "Transform this real satellite photo into a photorealistic aerial architectural rendering of a Christian destination, PRESERVING the exact lake shape, the curving road along the north-west shore, the surrounding buildings, farms and the orange-roofed village at the east. On the site around the lake: the long dark-roofed buildings on the NORTH shore become white church office and ministry buildings; a modest white protestant church with a plain cross stands among them; the west corner near the road becomes a paved entrance plaza with parking and a white 3-story cafe at the water edge; a white statue of Jesus with outstretched arms stands in the shallow water just off the WESTERN shore near the cafe, NOT in the middle; the small pavilions at the SOUTH shore become a row of white lakefront retreat pavilions; a landscaped walking promenade rings the lake with small white sculptures; the south-east corner near the village gets a small school campus with its own gate. Golden hour warm light, long soft shadows, calm reflective water. Keep everything outside the lake area unchanged."
  },

  /* ── Генерации с нуля (провайдер cloudflare, бесплатно) ── */

  "aerial-concept": {
    provider: "cloudflare",
    out: "images/site/site-aerial-v42.png",
    width: 1344, height: 768, seed: 42,
    title: "Генплан-концепция (без спутника)",
    prompt: "Aerial bird's eye view of a bean-shaped tropical lake in Phuket at golden hour. The middle of the lake is empty calm water. A curving two-lane road runs along the western and north-western shore. On the WEST SHORE at the water edge: a white 3-story cafe with roof terraces, a stone plaza, and a white statue of Jesus with outstretched arms standing right at the shoreline in knee-deep water beside the cafe promenade, casting a long reflection. On the NORTH shore: a modest white protestant church with a simple gable roof and one low tower with a plain cross, and two long low white buildings beside it. Along the SOUTH-WEST shore: a row of small white lakefront pavilions on stilts over the water. South-east beyond trees: a village with orange roofs. A stone walking promenade rings the whole lake, dotted with small white sculptures. Lush tropical trees, green hills behind. Photorealistic aerial rendering, warm sunset light."
  },

  "church-interior": {
    provider: "cloudflare",
    out: "images/site/site-church-interior.png",
    width: 1344, height: 768, seed: 31,
    title: "Интерьер церкви (протестантский, Писание на стене)",
    prompt: "Interior of a bright modern PROTESTANT church sanctuary in Thailand, view toward the front: full-height glass wall opening onto a tropical lake with green hills, and in front of it a simple BARE EMPTY wooden cross — two plain wooden beams only, absolutely no figure, no sculpture, no body on the cross. Simple wooden communion table and pulpit below it. No statues anywhere, no icons, no candles. On the flat white stone side wall large elegant carved capital letters reading exactly GOD IS LOVE, subtly backlit, generous empty space around the words. Warm wooden pews, high gabled white ceiling with warm hidden cove lighting, soft golden light, two tropical plants near the glass. Serene minimal protestant atmosphere. Photorealistic architectural interior rendering."
  }
};
