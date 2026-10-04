/* Nazwane — logika strony. Działa jako plik i na GitHub Pages, bez bundlera. */

var STORAGE_KEY = "nazwane.feed.v1";
var PREMIUM_KEY = "nazwane.premium";
var MIN_THOUGHT = 15;

function fold(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/ą/g, "a")
    .replace(/ć/g, "c")
    .replace(/ę/g, "e")
    .replace(/ł/g, "l")
    .replace(/ń/g, "n")
    .replace(/ó/g, "o")
    .replace(/ś/g, "s")
    .replace(/ź/g, "z")
    .replace(/ż/g, "z");
}

function harden(value) {
  return fold(value)
    .replace(/[@4]/g, "a")
    .replace(/3/g, "e")
    .replace(/0/g, "o")
    .replace(/[1!|]/g, "i")
    .replace(/\$/g, "s")
    .replace(/v/g, "w")
    .replace(/q/g, "k")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function looksSpacedOut(compact) {
  var parts = compact.split(" ").filter(Boolean);
  return parts.length >= 4 && parts.every(function (part) { return part.length === 1; });
}

/**
 * moderate(text) -> { ok, reason }
 * Zatrzymuje wulgaryzmy, obelgi użyte jako atak, wezwania do przemocy
 * i oczywiste zachęty do czynów zabronionych. Powód jest spokojny
 * i nie powtarza zablokowanego tekstu. Krótki wpis nie jest tu odrzucany:
 * prośba o pełniejszą myśl należy do analizy, nie do komentarza.
 */
function moderate(text) {
  var trimmed = String(text || "").trim();
  if (!trimmed) {
    return { ok: false, reason: "Wpis jest pusty. Napisz kilka słów." };
  }

  var compact = harden(trimmed);
  var forms = [compact, compact.replace(/\s+/g, "")];
  if (looksSpacedOut(compact)) {
    forms.push(compact.replace(/\s+/g, ""));
  }

  var reasons = {
    violence: "Nie publikujemy wezwań do przemocy ani instrukcji krzywdzenia. O przemocy można pisać jako o problemie, bez groźby i bez przepisu.",
    illegal: "Nie publikujemy zachęt do czynów zabronionych.",
    slur: "Nie publikujemy obelg wymierzonych w ludzi. Możesz nazwać problem, nie atakując osoby.",
    profanity: "Ta wypowiedź zawiera słowa, których tu nie zostawiamy. Ujmij myśl spokojniej."
  };

  var violenceRules = [
    /\b(zabije|zabijemy|zabijcie|zatluke|udusze|zastrzele|poderzne)\b/,
    /\b(zabij|zabijaj|pobij|udusz|zastrzel|poderznij)\b/,
    /\bchce\W+(cie|go|ja|ich|was|wszystkich|ciebie|ludzi)\W+(zabic|pobic|skrzywdzic|udusic|spalic)\b/,
    /\bchce\W+(zabic|pobic|skrzywdzic|udusic)\W+(cie|go|ja|ich|was|ludzi)\b/,
    /\b(trzeba|nalezy|powinnismy|musicie|powinien|powinna|powinni)\W+(go|ja|ich|was|ludzi)?\W*(zabic|wykonczyc|zgladzic|wymordowac)\b/,
    /\bjak\W+(zabic|otruc|pobic|wysadzic|podpalic|skrzywdzic)\b/,
    /\b(strzelaj|strzelic|strzel)\W+(do\W+)?(ludzi|niego|niej|nich|cywil)\b/,
    /\b(podlozyc|zrobic|odpalic)\W+(bombe|ladunek)\b/
  ];

  var illegalRules = [
    /\bjak\W+(ukrasc|wlamac|okradac|sfalszowac|podrobic|wyludzic)\W+(pieniadze|portfel|mieszkanie|dokument|dowod|tozsamosc|auto|samochod|karte|konto)\b/,
    /\b(zrobic|wyprodukowac|spreparowac|ugotowac)\W+(bombe|ladunek|narkotyk|amfetamine|metamfetamine|heroine)\b/,
    /\bjak\W+zrobic\W+(bombe|narkotyk|amfetamine|metamfetamine)\b/,
    /\b(sprzedam|kupie|handluje)\W+(narkotyk\w*|heroine|kokaine|amfetamine|metamfetamine|bron palna)\b/
  ];

  var slurRules = [
    /\b(cwel\w*|pedzio\w*|czarnuch\w*|zydlak\w*|ciapak\w*)\b/,
    /\bciot[aeoy]\b/,
    /\bcioty\b/,
    /\b(ty|wy|jestes|jestescie|glupi|taki)\W+(pedal\w*|down\w*|mongol\w*|debil\w*)\b/,
    /\bdebil(em|a|e|owi|u|i)?\b/
  ];

  var profanityRules = [
    /kurw\w*/,
    /chuj\w*/,
    /\bhuj\w*/,
    /pierdol\w*/,
    /pierdal\w*/,
    /jeb\w*/,
    /\bkutas\w*/,
    /dziwk\w*/,
    /\bcip(a|e|y|ka|ke|ki|ko)\w*/,
    /skurw\w*/,
    /spierd\w*/,
    /wypierd\w*/,
    /rozpierd\w*/,
    /\bfiut\w*/,
    /sukinsyn\w*/,
    /pizd\w*/
  ];

  function scrubViolence(sample) {
    return sample
      .replace(/\bnie\s+zabij\w*/g, " ")
      .replace(/\bzabij\w*\s+(czas|nude|nuda|nudy)\b/g, " ")
      .replace(/\bjak\s+zabic\s+(czas|nude|nuda|nudy)\b/g, " ")
      .replace(/\bzabic\s+(czas|nude|nuda|nudy)\b/g, " ");
  }

  var i;
  var form;
  for (i = 0; i < forms.length; i += 1) {
    form = forms[i];
    if (violenceRules.some(function (rule) { return rule.test(scrubViolence(form)); })) {
      return { ok: false, reason: reasons.violence };
    }
    if (illegalRules.some(function (rule) { return rule.test(form); })) {
      return { ok: false, reason: reasons.illegal };
    }
    if (slurRules.some(function (rule) { return rule.test(form); })) {
      return { ok: false, reason: reasons.slur };
    }
    if (profanityRules.some(function (rule) { return rule.test(form); })) {
      return { ok: false, reason: reasons.profanity };
    }
  }

  return { ok: true, reason: "" };
}

function themeScore(theme) {
  var folded = fold(theme);
  if (folded.indexOf(" ") !== -1) return 4;
  if (folded.length >= 8) return 3;
  if (folded.length >= 5) return 2;
  return 1;
}

function themeHits(textFolded, theme) {
  var needle = fold(theme).replace(/\s+/g, " ").trim();
  if (!needle) return false;
  var escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  var exact = new RegExp("(^|[^a-z])" + escaped + "([^a-z]|$)");
  if (exact.test(textFolded)) return true;
  if (needle.length >= 7 && needle.indexOf(" ") === -1) {
    var stem = needle.slice(0, Math.max(6, needle.length - 2));
    var stemmed = new RegExp("(^|[^a-z])" + stem + "[a-z]*");
    return stemmed.test(textFolded);
  }
  return false;
}

/**
 * Miejsce, w którym później można wywołać model.
 * Obecny wynik to wyłącznie lokalny katalog z data.js
 * (nakładanie słów i tematów). Gdy nic nie pasuje, funkcja
 * nie wymyśla myśliciela.
 */
function analyzeThought(text, options) {
  var premium = !!(options && options.premium);
  var moderation = moderate(text);
  if (!moderation.ok) {
    return { ok: false, blocked: true, reason: moderation.reason };
  }

  var trimmed = String(text || "").trim();
  if (trimmed.length < MIN_THOUGHT) {
    return {
      ok: false,
      blocked: false,
      reason: "Napisz pełniejszą myśl. Kilka słów to za mało, żeby szukać dla niej nazwy."
    };
  }

  var foldedText = fold(trimmed);
  var thinkers = (window.NAZWANE_DATA && window.NAZWANE_DATA.thinkers) || [];
  var best = null;

  thinkers.forEach(function (thinker) {
    var score = 0;
    var matched = [];
    (thinker.themes || []).forEach(function (theme) {
      if (themeHits(foldedText, theme)) {
        score += themeScore(theme);
        matched.push(theme);
      }
    });
    if (!best || score > best.score) {
      best = { thinker: thinker, score: score, matched: matched };
    }
  });

  if (!best || best.score < 3) {
    return {
      ok: true,
      matched: false,
      message: "Katalog nie ma nazwanej paraleli dla tej myśli. Nie dopisuję imienia, którego tu nie ma."
    };
  }

  return {
    ok: true,
    matched: true,
    id: best.thinker.id,
    name: best.thinker.name,
    era: best.thinker.era,
    connection: best.thinker.connection,
    matchedThemes: best.matched,
    premium: premium ? best.thinker.premium : null,
    premiumText: best.thinker.premium
  };
}

function pickWords(text) {
  var stop = {
    oraz: 1, albo: 1, tylko: 1, jeszcze: 1, bardzo: 1, ktory: 1, ktora: 1,
    ktore: 1, tego: 1, tej: 1, tych: 1, sobie: 1, moja: 1, moj: 1, mnie: 1,
    jest: 1, sa: 1, byc: 1, nie: 1, sie: 1, jak: 1, ale: 1, czy: 1, dla: 1,
    juz: 1, tez: 1, gdy: 1, kiedy: 1, wiec: 1, jestem: 1, bywa: 1, czyli: 1
  };
  var words = String(text || "")
    .replace(/[„”"“.,;:!?()—–\-]/g, " ")
    .split(/\s+/)
    .filter(function (word) {
      var clean = word.trim();
      return clean.length > 3 && !stop[fold(clean)];
    });
  var unique = [];
  words.forEach(function (word) {
    if (unique.length >= 7) return;
    if (unique.indexOf(word) === -1) unique.push(word);
  });
  if (!unique.length) unique = ["myśl", "imię", "ślad"];
  return unique;
}

function readStore() {
  var empty = { posts: [], comments: {} };
  try {
    var raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty;
    var parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return empty;
    parsed.posts = Array.isArray(parsed.posts) ? parsed.posts : [];
    parsed.comments = parsed.comments && typeof parsed.comments === "object" ? parsed.comments : {};
    return parsed;
  } catch (error) {
    return empty;
  }
}

function writeStore(store) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    return true;
  } catch (error) {
    return false;
  }
}

function newId(prefix) {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return prefix + window.crypto.randomUUID();
  }
  return prefix + String(Date.now()) + "-" + String(Math.random()).slice(2, 8);
}

function thinkerById(id) {
  var thinkers = (window.NAZWANE_DATA && window.NAZWANE_DATA.thinkers) || [];
  for (var i = 0; i < thinkers.length; i += 1) {
    if (thinkers[i].id === id) return thinkers[i];
  }
  return null;
}

function el(tag, className, text) {
  var node = document.createElement(tag);
  if (className) node.className = className;
  if (typeof text === "string") node.textContent = text;
  return node;
}

function field(labelText, control) {
  var wrap = el("label", "field");
  wrap.appendChild(el("span", "field-label", labelText));
  wrap.appendChild(control);
  return wrap;
}

var lastAnalysis = null;
var animating = false;

function renderResult(analysis) {
  var section = document.getElementById("result-section");
  var card = document.getElementById("result");
  card.textContent = "";
  section.hidden = false;

  if (!analysis || !analysis.ok) {
    card.appendChild(el("p", "refusal", (analysis && analysis.reason) || "Nie udało się odczytać myśli."));
    document.getElementById("share-form").hidden = true;
    return;
  }

  if (!analysis.matched) {
    card.appendChild(el("p", "kicker", "Bez dopisanej nazwy"));
    card.appendChild(el("p", "plain", analysis.message));
  } else {
    card.appendChild(el("p", "kicker", "Nazwane imię"));
    card.appendChild(el("h3", "thinker-name", analysis.name));
    card.appendChild(el("p", "era", analysis.era));
    var quote = el("blockquote");
    quote.textContent = analysis.connection;
    card.appendChild(quote);
    if (analysis.matchedThemes && analysis.matchedThemes.length) {
      var themes = el("p", "themes");
      themes.appendChild(el("span", "themes-label", "Powiązane słowa z katalogu: "));
      themes.appendChild(document.createTextNode(analysis.matchedThemes.join(", ")));
      card.appendChild(themes);
    }
    if (analysis.premium) {
      var aside = el("aside", "premium-reading");
      aside.appendChild(el("p", "premium-label", "Ostrożne odczytanie, nie diagnoza"));
      aside.appendChild(el("p", "premium-line", analysis.premium));
      card.appendChild(aside);
    }
  }

  card.appendChild(el("p", "source-note", "Wynik z lokalnego katalogu, nie z modelu."));
  document.getElementById("share-form").hidden = false;
  var heading = document.getElementById("result-heading");
  if (heading) heading.focus();
}

function showMessage(analysis) {
  var section = document.getElementById("result-section");
  var card = document.getElementById("result");
  card.textContent = "";
  section.hidden = false;
  card.appendChild(el("p", "refusal", analysis.reason));
  document.getElementById("share-form").hidden = true;
}

function svgIcon(kind) {
  var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 48 48");
  svg.setAttribute("aria-hidden", "true");
  svg.classList.add("glyph");
  var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  var shapes = {
    quill: "M10 40c8-2 12-10 14-18 2-8 6-14 14-16-6 6-8 12-10 18-4 8-10 14-18 16z M24 22c2 4 2 8 0 12",
    seal: "M24 6a12 12 0 1 0 0 24 12 12 0 0 0 0-24z M16 36h16 M20 40h8",
    leaf: "M12 36c2-12 8-22 24-26-2 14-8 24-24 26z M16 32c6-6 12-10 18-12",
    book: "M8 12h14c4 3 4 3 4 8v16H12c-3 0-4-1-4-4V12z M40 12H26c-4 3-4 3-4 8v16h14c3 0 4-1 4-4V12z"
  };
  path.setAttribute("d", shapes[kind] || shapes.seal);
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-width", "1.6");
  path.setAttribute("stroke-linejoin", "round");
  svg.appendChild(path);
  return svg;
}

function showAnimation(words) {
  var section = document.getElementById("stage-section");
  var stage = document.getElementById("stage");
  var status = document.getElementById("stage-status");
  stage.textContent = "";
  section.hidden = false;
  status.textContent = "Słowa układają się w wynik.";

  var symbols = ["❧", "§", "¶", "✦"];
  var icons = ["quill", "seal", "leaf", "book"];
  var pieces = words.slice();
  symbols.forEach(function (symbol) { pieces.push(symbol); });

  pieces.forEach(function (piece, index) {
    var node = el("span", "chip" + (symbols.indexOf(piece) !== -1 ? " chip-symbol" : ""));
    node.textContent = piece;
    placeChip(node, index, pieces.length);
    stage.appendChild(node);
  });

  icons.forEach(function (kind, index) {
    var wrap = el("span", "chip chip-icon");
    wrap.appendChild(svgIcon(kind));
    placeChip(wrap, pieces.length + index, pieces.length + icons.length);
    stage.appendChild(wrap);
  });
}

function placeChip(node, index, total) {
  var startX = (index * 37) % 78 + 4;
  var startY = (index * 23) % 62 + 6;
  var endX = ((index * 53) + 18) % 76 + 6;
  var endY = ((index * 29) + 10) % 58 + 12;
  node.style.setProperty("--x0", startX + "%");
  node.style.setProperty("--y0", startY + "%");
  node.style.setProperty("--x1", endX + "%");
  node.style.setProperty("--y1", endY + "%");
  node.style.setProperty("--r0", ((index % 5) - 2) * 8 + "deg");
  node.style.setProperty("--r1", ((index % 3) - 1) * 4 + "deg");
  node.style.animationDelay = (index * 0.05) + "s";
}

function wait(ms) {
  return new Promise(function (resolve) { window.setTimeout(resolve, ms); });
}

function motionDelay() {
  var media = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)");
  if (media && media.matches) return 200;
  return 2000;
}

function currentPremium() {
  var box = document.getElementById("premium");
  return !!(box && box.checked);
}

function onPremiumChange() {
  try {
    window.localStorage.setItem(PREMIUM_KEY, currentPremium() ? "1" : "0");
  } catch (error) {
    /* przełącznik i tak działa do odświeżenia */
  }
  if (!lastAnalysis || !lastAnalysis.ok || !lastAnalysis.matched || animating) return;
  lastAnalysis.premium = currentPremium() ? lastAnalysis.premiumText : null;
  renderResult(lastAnalysis);
}

async function onSubmit(event) {
  event.preventDefault();
  if (animating) return;
  var input = document.getElementById("thought");
  var text = input.value;
  var notice = document.getElementById("composer-notice");
  notice.textContent = "";

  var moderation = moderate(text);
  if (!moderation.ok) {
    lastAnalysis = { ok: false, blocked: true, reason: moderation.reason };
    document.getElementById("stage-section").hidden = true;
    showMessage(lastAnalysis);
    return;
  }
  if (String(text || "").trim().length < MIN_THOUGHT) {
    lastAnalysis = {
      ok: false,
      blocked: false,
      reason: "Napisz pełniejszą myśl. Kilka słów to za mało, żeby szukać dla niej nazwy."
    };
    document.getElementById("stage-section").hidden = true;
    showMessage(lastAnalysis);
    return;
  }

  animating = true;
  document.getElementById("submit-thought").disabled = true;
  document.getElementById("result-section").hidden = true;
  showAnimation(pickWords(text));
  await wait(motionDelay());
  document.getElementById("stage-section").hidden = true;
  document.getElementById("stage-status").textContent = "";
  lastAnalysis = analyzeThought(text, { premium: currentPremium() });
  if (lastAnalysis.ok) lastAnalysis.thought = String(text).trim();
  renderResult(lastAnalysis);
  animating = false;
  document.getElementById("submit-thought").disabled = false;
}

function authorOrAnon(value) {
  var name = String(value || "").trim();
  if (!name) return "Anonim";
  return name.slice(0, 40);
}

function onShare(event) {
  event.preventDefault();
  var notice = document.getElementById("share-notice");
  notice.textContent = "";
  if (!lastAnalysis || !lastAnalysis.ok) return;
  var nameCheck = moderate(authorOrAnon(document.getElementById("share-author").value));
  if (!nameCheck.ok && document.getElementById("share-author").value.trim()) {
    notice.textContent = nameCheck.reason;
    return;
  }
  var post = {
    id: newId("post-"),
    example: false,
    author: authorOrAnon(document.getElementById("share-author").value),
    thought: lastAnalysis.thought,
    matched: lastAnalysis.matched,
    thinkerName: lastAnalysis.matched ? lastAnalysis.name : "",
    era: lastAnalysis.matched ? lastAnalysis.era : "",
    connection: lastAnalysis.matched ? lastAnalysis.connection : lastAnalysis.message,
    premiumLine: lastAnalysis.matched && lastAnalysis.premium ? lastAnalysis.premium : "",
    createdAt: new Date().toISOString(),
    comments: []
  };
  var store = readStore();
  store.posts.unshift(post);
  var saved = writeStore(store);
  notice.textContent = saved
    ? "Zapisane na tym urządzeniu."
    : "Nie udało się zapisać w tej przeglądarce. Wynik został tylko na ekranie.";
  renderFeed();
}

function allPosts() {
  var store = readStore();
  var seeds = ((window.NAZWANE_DATA && window.NAZWANE_DATA.seedPosts) || []).map(function (seed) {
    var thinker = thinkerById(seed.thinkerId);
    var extra = store.comments[seed.id] || [];
    return {
      id: seed.id,
      example: true,
      author: seed.author,
      thought: seed.thought,
      note: seed.note,
      matched: true,
      thinkerName: thinker ? thinker.name : "",
      era: thinker ? thinker.era : "",
      connection: thinker ? thinker.connection : "",
      premiumLine: "",
      comments: (seed.comments || []).concat(extra)
    };
  });
  return store.posts.concat(seeds);
}

function renderFeed() {
  var feed = document.getElementById("feed");
  feed.textContent = "";
  allPosts().forEach(function (post) {
    feed.appendChild(renderPost(post));
  });
}

function renderPost(post) {
  var article = el("article", "post");
  article.setAttribute("aria-labelledby", "post-title-" + post.id);

  var meta = el("p", "post-meta");
  meta.appendChild(el("span", "author", post.author || "Anonim"));
  if (post.example) {
    meta.appendChild(el("span", "badge", "przykład"));
  } else {
    meta.appendChild(el("span", "badge badge-local", "na tym urządzeniu"));
  }
  article.appendChild(meta);

  var title = el("h3", "post-title");
  title.id = "post-title-" + post.id;
  title.textContent = post.matched && post.thinkerName ? post.thinkerName : "Bez nazwy w katalogu";
  article.appendChild(title);
  if (post.era) article.appendChild(el("p", "era", post.era));

  var thought = el("blockquote");
  thought.textContent = post.thought || "";
  article.appendChild(thought);
  if (post.connection) article.appendChild(el("p", "plain", post.connection));
  if (post.note) article.appendChild(el("p", "note-inline", post.note));
  if (post.premiumLine) {
    var aside = el("aside", "premium-reading");
    aside.appendChild(el("p", "premium-label", "Ostrożne odczytanie, nie diagnoza"));
    aside.appendChild(el("p", "premium-line", post.premiumLine));
    article.appendChild(aside);
  }

  var commentsWrap = el("div", "comments");
  commentsWrap.appendChild(el("h4", "comments-title", "Komentarze"));
  if (!post.comments || !post.comments.length) {
    commentsWrap.appendChild(el("p", "quiet", "Jeszcze bez komentarza."));
  } else {
    var list = el("ul", "comment-list");
    post.comments.forEach(function (comment) {
      var item = el("li");
      var who = el("span", "author", comment.author || "Anonim");
      item.appendChild(who);
      item.appendChild(el("span", "comment-text", " " + comment.text));
      list.appendChild(item);
    });
    commentsWrap.appendChild(list);
  }

  var form = document.createElement("form");
  form.className = "comment-form";
  var nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.maxLength = 40;
  nameInput.autocomplete = "nickname";
  nameInput.setAttribute("aria-label", "Imię przy komentarzu");
  nameInput.placeholder = "Imię, opcjonalnie";
  var commentInput = document.createElement("textarea");
  commentInput.rows = 2;
  commentInput.maxLength = 500;
  commentInput.required = true;
  commentInput.setAttribute("aria-label", "Komentarz do wpisu");
  commentInput.placeholder = "Krótki komentarz do tej myśli lub do poglądu";
  var submit = document.createElement("button");
  submit.type = "submit";
  submit.textContent = "Dodaj komentarz";
  var error = el("p", "refusal comment-error");
  error.setAttribute("role", "alert");
  form.appendChild(nameInput);
  form.appendChild(commentInput);
  form.appendChild(submit);
  form.appendChild(error);
  form.addEventListener("submit", function (event) {
    event.preventDefault();
    error.textContent = "";
    var body = commentInput.value;
    var verdict = moderate(body);
    if (!verdict.ok) {
      error.textContent = verdict.reason;
      return;
    }
    if (nameInput.value.trim()) {
      var nameVerdict = moderate(nameInput.value);
      if (!nameVerdict.ok) {
        error.textContent = nameVerdict.reason;
        return;
      }
    }
    var comment = {
      id: newId("comment-"),
      author: authorOrAnon(nameInput.value),
      text: body.trim()
    };
    var store = readStore();
    if (post.example) {
      if (!Array.isArray(store.comments[post.id])) store.comments[post.id] = [];
      store.comments[post.id].push(comment);
    } else {
      store.posts = store.posts.map(function (item) {
        if (item.id !== post.id) return item;
        item.comments = (item.comments || []).concat([comment]);
        return item;
      });
    }
    if (!writeStore(store)) {
      error.textContent = "Nie udało się zapisać komentarza w tej przeglądarce.";
      return;
    }
    renderFeed();
  });
  commentsWrap.appendChild(form);
  article.appendChild(commentsWrap);
  return article;
}

function init() {
  var premium = document.getElementById("premium");
  try {
    premium.checked = window.localStorage.getItem(PREMIUM_KEY) === "1";
  } catch (error) {
    premium.checked = false;
  }
  premium.addEventListener("change", onPremiumChange);
  document.getElementById("thought-form").addEventListener("submit", onSubmit);
  document.getElementById("share-form").addEventListener("submit", onShare);
  renderFeed();
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
}
