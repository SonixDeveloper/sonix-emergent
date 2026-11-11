"use strict";

const SONIX_API_BASE = (window.SONIX_API_BASE || location.origin).replace(/\/$/, "");
const SONIX_BASE_PATH = (window.SONIX_BASE_PATH || "").replace(/\/$/, "");
function sonixResourceUrl(value) {
  if (typeof value !== "string" || !value.startsWith("/")) return value;
  if (value.startsWith("/media/")) return SONIX_API_BASE + value;
  if (value.startsWith("/assets/")) return SONIX_BASE_PATH + value;
  return value;
}

const icons = {
  plus: "M12 5v14M5 12h14", hash: "M10 3 8 21M16 3l-2 18M4 9h16M3 15h16",
  zap: "M13 2 4 14h7l-1 8 10-12h-7z", chevron: "m6 9 6 6 6-6",
  right: "m9 6 6 6-6 6", close: "m6 6 12 12M18 6 6 18",
  ring: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 4a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z",
  compass: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm3 6-2 4-4 2 2-4z",
  people: "M15 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM5 20v-2a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v2M19 6v6m-3-3h6",
  user: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a5 5 0 0 1 5-5h6a5 5 0 0 1 5 5v2",
  grid: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
  upload: "M12 16V3M7 8l5-5 5 5M4 15v6h16v-6",
  settings: "m9 3-1 3-3 1-2 3 2 2v3l2 3 3-1 2 3 3-1 1-3 3-1 2-3-2-2V7l-2-3-3 1-2-3zM15 11a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
  search: "M16 10a6 6 0 1 1-12 0 6 6 0 0 1 12 0Zm-1 5 5 5",
  panel: "M3 5h18v14H3zM15 5v14", menu: "M3 6h18M3 12h18M3 18h18",
  login: "M14 4h6v16h-6M3 12h12m-4-4 4 4-4 4",
  smile: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM8 14s1 3 4 3 4-3 4-3M9 9h.01M15 9h.01",
  screen: "M3 4h18v13H3zM8 21h8m-4-7V7m-3 3 3-3 3 3",
  camera: "M3 6h12v12H3zM15 10l6-4v12l-6-4",
  mic: "M9 5a3 3 0 0 1 6 0v7a3 3 0 0 1-6 0zM5 11v1a7 7 0 0 0 14 0v-1m-7 8v3m-3 0h6",
  headphones: "M4 14v-2a8 8 0 0 1 16 0v2M4 13h4v7H4zm12 0h4v7h-4z",
  phone: "M3 13c0-3 4-5 9-5s9 2 9 5v3h-5v-3H8v3H3z",
  sound: "M3 9h4l5-4v14l-5-4H3zM16 9a4 4 0 0 1 0 6m2-8a7 7 0 0 1 0 10",
  poll: "M4 4h16v16H4zM8 16v-3m4 3V8m4 8v-5",
  send: "m3 4 18 8-18 8 4-8zM7 12h14",
  info: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM12 11v5m0-8h.01",
  link: "m10 14 4-4m-6 6-1 1a3 3 0 0 1-4-4l4-4a3 3 0 0 1 4 0m2 6a3 3 0 0 0 4 0l4-4a3 3 0 0 0-4-4l-1 1",
};
const $ = id => document.getElementById(id);
const svg = name => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + icons[name] + '"/></svg>';
function paintIcons(root = document) {
  root.querySelectorAll("[data-icon]").forEach(node => {
    node.innerHTML = svg(node.dataset.icon);
    if (node.title && !node.hasAttribute("aria-label")) node.setAttribute("aria-label", node.title);
  });
}
const community = {
  id: "overdrive", name: "Sonix Official Server", description: "A home for creators, gamers, and everyone in between.",
  channels: ["general", "announcements", "introductions", "off-topic", "clips", "game-night"], bots: ["Pulse"],
};
const developers = {
  id:"sonix-developers", name:"Sonix Developers",
  description:"Discuss Sonix apps, bots, integrations, and feedback.",
  channels:["general","announcements","app-development","bot-development","feedback"], bots:["Pulse"],
};
const officialSpaces = [community, developers];
const isOfficial = space => officialSpaces.some(item => item.id === space.id);
function mergeSpaces(joined) {
  const byId = new Map(officialSpaces.map(space => [space.id, space]));
  for (const space of joined) byId.set(space.id, space);
  return [...byId.values()];
}
const topics = {
  general: "The main hangout for everything Sonix.", announcements: "News and updates from Sonix Official Server.",
  introductions: "Say hello and share what brought you here.", "off-topic": "Talk about whatever is on your mind.",
  clips: "Share your highlights.", "game-night": "Find a group for your next game.",
};
const sample = [
  {name:"Nova", body:"Welcome to Sonix Official Server! Drop a hello in #introductions and tell us what you’re playing lately. 👋", time:"10:24 AM", color:1},
  {name:"Pixel", body:"Anyone up for game night later? I’m putting together a lobby. 🎮", time:"10:28 AM", color:2},
  {name:"Kairo", body:"I’m in! I’ll post the details in #game-night when we’re ready.", time:"10:31 AM", color:3},
];
const botCommands = {Pulse:"ping", Welcome:"welcome", Quest:"quest", Focus:"focus", Rules:"rules",
  Dice:"roll", Coin:"flip", Break:"break", Icebreaker:"icebreaker", Studio:"prompt", Spotlight:"shoutout", Guide:"help",
  "Eight Ball":"eightball", "Number Draw":"draw", Party:"party", Gratitude:"thanks",
  Standup:"standup", Retro:"retro", Checklist:"checklist", Safety:"safety"};
const labels = {
  en: ["Text channels","Server tools","App Directory","Import from Discord","Sign in","Server details","Invite people","Quick actions","Customize profile","Message"],
  es: ["Canales de texto","Herramientas","Directorio de apps","Importar de Discord","Iniciar sesión","Detalles del servidor","Invitar","Acciones rápidas","Personalizar perfil","Mensaje"],
  fr: ["Salons textuels","Outils du serveur","Répertoire d’apps","Importer de Discord","Se connecter","Détails du serveur","Inviter","Actions rapides","Personnaliser le profil","Message"],
  de: ["Textkanäle","Serverwerkzeuge","App-Verzeichnis","Aus Discord importieren","Anmelden","Serverdetails","Einladen","Schnellaktionen","Profil anpassen","Nachricht"],
  pl: ["Kanały tekstowe","Narzędzia serwera","Katalog aplikacji","Importuj z Discorda","Zaloguj się","Szczegóły serwera","Zaproś","Szybkie akcje","Dostosuj profil","Wiadomość"],
  it: ["Canali testuali","Strumenti del server","Directory app","Importa da Discord","Accedi","Dettagli del server","Invita","Azioni rapide","Personalizza profilo","Messaggio"],
  pt: ["Canais de texto","Ferramentas do servidor","Diretório de apps","Importar do Discord","Entrar","Detalhes do servidor","Convidar","Ações rápidas","Personalizar perfil","Mensagem"],
  ja: ["テキストチャンネル","サーバーツール","アプリ一覧","Discordからインポート","ログイン","サーバー詳細","招待","クイック操作","プロフィールを編集","メッセージ"],
};
const keys = ["channels","tools","apps","import","login","details","invite","quick","profile","message"];
const languages = {en:"English",es:"Español",fr:"Français",de:"Deutsch",pl:"Polski",it:"Italiano",pt:"Português",ja:"日本語"};
const serverMemberCopy = {
  en:{heading:"Ranks & members",owner:"Owner",member:"member",members:"members",online:"Online",away:"Away",busy:"Busy",offline:"Offline"},
  pl:{heading:"Rangi i członkowie",owner:"Właściciel",member:"członek",members:"członków",online:"Online",away:"Zaraz wracam",busy:"Nie przeszkadzać",offline:"Offline"},
  es:{heading:"Rangos y miembros",owner:"Propietario",member:"miembro",members:"miembros",online:"En línea",away:"Ausente",busy:"No molestar",offline:"Desconectado"},
  fr:{heading:"Rangs et membres",owner:"Propriétaire",member:"membre",members:"membres",online:"En ligne",away:"Absent",busy:"Ne pas déranger",offline:"Hors ligne"},
  de:{heading:"Ränge & Mitglieder",owner:"Eigentümer",member:"Mitglied",members:"Mitglieder",online:"Online",away:"Abwesend",busy:"Nicht stören",offline:"Offline"},
  it:{heading:"Ruoli e membri",owner:"Proprietario",member:"membro",members:"membri",online:"Online",away:"Assente",busy:"Non disturbare",offline:"Offline"},
  pt:{heading:"Cargos e membros",owner:"Proprietário",member:"membro",members:"membros",online:"Online",away:"Ausente",busy:"Não incomodar",offline:"Offline"},
  ja:{heading:"ランクとメンバー",owner:"オーナー",member:"メンバー",members:"メンバー",online:"オンライン",away:"離席中",busy:"取り込み中",offline:"オフライン"},
};
const themes = {red:["Crimson","255,70,87"],purple:["Violet","183,141,255"],cyan:["Ice","97,216,244"],green:["Mint","104,227,168"]};
let me = null;
let spaces = [...officialSpaces];
let active = community;
let channel = "general";
const channelTypes = {text:"Text",poll:"Polls",voice:"Voice",category:"Category"};
const records = space => space.channels.map(item => typeof item === "string" ? {id:item,name:item,type:"text",parent:""} : item);
const selectedChannel = () => records(active).find(item => item.id === channel);
const bannerStyle = (vertical, horizontal) => (horizontal ?? 50) + "% " + (vertical ?? 50) + "%";
let timeline = [];
let lastMessageKey = "";
let chatGeneration = 0;
let nextChatRequest = 0;
let appliedChatRequest = 0;
const drafts = new Map();
const draftKey = () => active.id + ":" + channel;
function chatRequest() {
  const generation = chatGeneration;
  const request = ++nextChatRequest;
  return () => {
    if (currentView !== "chat" || generation !== chatGeneration || request < appliedChatRequest) return false;
    appliedChatRequest = request;
    return true;
  };
}
let toastTimer;
let currentView = "home";
let voiceSession;
let joiningVoice;
let voiceRoom;
let voicePending = 0;
let stopVoiceMeter;
const lastTextChannel = new Map();
let currentEmojis = [];
let discoveryCategory = "servers";
let invite = new URLSearchParams(location.search).get("invite");
let qrApprovalId = new URLSearchParams(location.search).get("login-qr");
let stopQrLogin;
let authFlow = 0;
let presenceHeartbeat;
const messageEtags = new Map();

async function api(action, data) {
  const options = data ? {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(data)} : {};
  const messages = !data && action.startsWith("messages?");
  if (messages && messageEtags.has(action)) options.headers = {"If-None-Match":messageEtags.get(action)};
  options.credentials = "include";
  const response = await fetch(SONIX_API_BASE + "/api/" + action, options);
  if (response.status === 304) return null;
  const result = await response.json();
  if (messages && response.ok && response.headers.has("ETag")) messageEtags.set(action,response.headers.get("ETag"));
  if (!response.ok) {
    if (response.status === 401 && me) {
      me = null;
      closeModal();
      auth(false);
    }
    throw new Error(result.error || "Sonix couldn’t complete the request.");
  }
  return result;
}
function startPresenceHeartbeat() {
  clearInterval(presenceHeartbeat);
  if (!me) return;
  const beat = async () => {
    if (!me || (document.hidden && !voiceSession)) return;
    try {
      await api("heartbeat", {});
      await refreshServerPresence();
    } catch {}
  };
  beat();
  presenceHeartbeat = setInterval(beat, 30000);
}
async function refreshServerPresence() {
  if (!me || currentView !== "chat") return;
  const space = active.id;
  const data = await api("server-data?space=" + encodeURIComponent(space));
  if (active.id !== space) return;
  active.permissions = data.permissions;
  active.message_count = data.message_count || 0;
  renderServerLevel(active, data);
  renderServerPeople(space, data);
}
document.addEventListener("visibilitychange", () => { if (!document.hidden) startPresenceHeartbeat(); });
function element(tag, name, content) {
  const node = document.createElement(tag);
  if (name) node.className = name;
  if (content !== undefined) node.textContent = content;
  return node;
}
function avatar(node, name, src, color) {
  node.replaceChildren();
  node.dataset.color = color || 0;
  if (!src) {
    node.textContent = (name || "?").slice(0, 2).toUpperCase();
    return;
  }
  const img = element("img");
  img.alt = "";
  img.src = sonixResourceUrl(src);
  node.append(img);
}
function notice(text) {
  const toast = $("toast");
  toast.textContent = text;
  toast.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("visible"), 4000);
}
function translate() {
  const language = me?.language || "en";
  document.documentElement.lang = language;
  document.querySelectorAll("[data-t]").forEach(node => {
    node.textContent = labels[language][keys.indexOf(node.dataset.t)];
  });
  $("draft").placeholder = labels[language][9] + " #" + (selectedChannel()?.name || "");
  const rgb = themes[me?.theme || "red"][1];
  document.documentElement.style.setProperty("--accent-rgb", rgb);
  document.documentElement.style.setProperty("--accent", "rgb(" + rgb + ")");
}
function renderWorkspace() {
  const isCommunity = active.id === community.id;
  renderDesktopTabs();
  $("server-list").replaceChildren(...spaces.map(space => {
    const button = element("button", "server-icon" + (active.id === space.id ? " active" : ""));
    button.title = space.name;
    button.setAttribute("aria-label", space.name);
    button.setAttribute("aria-pressed", String(active.id === space.id));
    if (space.icon) avatar(button,space.name,space.icon);
    else if (isOfficial(space)) button.innerHTML = svg("zap");
    else button.textContent = space.name.slice(0, 2).toUpperCase();
    button.onclick = () => selectSpace(space.id);
    return button;
  }));
  $("space-name").textContent = active.name;
  if (active.icon) avatar($("space-symbol"),active.name,active.icon);
  else $("space-symbol").innerHTML = svg("zap");
  $("space-type").textContent = isOfficial(active) ? "Verified community" : active.group_chat ? "Group chat" : "Private server";
  const channels = records(active);
  const list = $("channels");
  list.replaceChildren();
  const appendChannel = item => {
    const button = element("button", "channel" + (item.id === channel ? " active" : "") + (item.parent ? " nested" : ""));
    button.innerHTML = svg(({voice:"sound",poll:"poll",text:"hash"})[item.type]);
    button.append(element("span", "", item.name));
    button.setAttribute("aria-pressed", String(item.id === channel));
    const spaceId = active.id;
    button.onclick = async () => {
      selectSpace(spaceId,item.id);
      if (item.type !== "voice") return;
      try { await joinVoice({space:spaceId,channel:item.id,name:item.name}); }
      catch (error) { notice(error.message || "Could not access your microphone."); }
    };
    list.append(button);
    if (isVoiceRoom(active.id, item.id)) {
      button.classList.add("voice-connected");
      const participant = element("div", "voice-participant");
      const image = element("div", "avatar");
      avatar(image, me.name, me.avatar);
      image.classList.add("profile-clickable");
      image.onclick = showProfileMenu;
      participant.append(image, element("span", "", me.name));
      list.append(participant);
    }
  };
  for (const item of channels.filter(item => !item.parent)) {
    if (item.type === "category") {
      list.append(element("div", "section-title channel-category", item.name));
      channels.filter(child => child.parent === item.id).forEach(appendChannel);
    } else appendChannel(item);
  }
  const selected = selectedChannel();
  $("header-channel").textContent = selected?.name || "Channels";
  $("topic").textContent = (isCommunity ? topics[channel] : active.description) || (selected ? channelTypes[selected.type] : "");
  $("hero").style.backgroundImage = active.banner ? 'url("' + sonixResourceUrl(active.banner) + '")' : isCommunity ? "" : "linear-gradient(110deg,#371923,#1c1726)";
  $("hero").style.backgroundPosition = active.banner ? active.banner_source ? "center" : bannerStyle(active.banner_position, active.banner_horizontal) : "";
  $("hero").hidden = !selected || selected.type !== "text" || channel !== channels.find(item => item.type === "text")?.id;
  $("chat-heading").hidden = selected?.type !== "text";
  document.querySelector(".compose-wrap").hidden = selected?.type !== "text";
  $("hero-kicker").textContent = isCommunity ? "SONIX COMMUNITY" : "SONIX SERVER";
  $("hero-title").textContent = active.name;
  $("hero-description").textContent = isCommunity ? "Your hub for games, builds, and late-night conversations." : active.description;
  $("card-name").textContent = active.name;
  const emblem = document.querySelector(".card-emblem");
  if (active.icon) avatar(emblem,active.name,active.icon);
  else emblem.innerHTML = svg("zap");
  $("card-description").textContent = active.description;
  renderServerLevel(active, {message_count:active.message_count || 0});
  if ($("server-members")) {
    $("server-members").replaceChildren();
    $("server-members-title").textContent = serverMemberCopy[me?.language || "en"].heading;
    $("server-member-count").textContent = "";
  }
  $("account-name").textContent = me?.name || "Guest";
  $("account-status").textContent = me ? "Signed in" : "Browsing Sonix";
  if (me) avatar($("account-avatar"), me.name, me.avatar);
  else $("account-avatar").innerHTML = svg("user");
  $("auth-button").dataset.action = me ? "profile" : "login";
  $("auth-button").classList.toggle("profile-trigger", Boolean(me));
  $("auth-button").setAttribute("aria-label", me ? "My profile" : "Sign in");
  $("auth-button").title = me ? "My profile" : "Sign in";
  $("auth-button").innerHTML = svg(me ? "user" : "login");
  const label = element("span", "", me ? "My profile" : "Sign in");
  if (!me) label.dataset.t = "login";
  $("auth-button").append(label);
  translate();
}
function renderServerPeople(space, data) {
  if (active.id !== space.id) return;
  const copy = serverMemberCopy[me?.language || "en"];
  const list = $("server-members");
  const members = [...(data.members || [])].sort((a,b) => Number(b.id === data.owner) - Number(a.id === data.owner) || a.name.localeCompare(b.name));
  $("server-members-title").textContent = copy.heading;
  $("server-member-count").textContent = members.length + " " + (members.length === 1 ? copy.member : copy.members);
  list.replaceChildren();
  if (!members.length) {
    list.append(element("p", "server-members-empty", "No members yet."));
    return;
  }
  for (const member of members) {
    const row = element("button", "server-member");
    row.type = "button";
    row.title = "View " + member.name + "’s profile";
    const picture = element("span", "avatar server-member-avatar");
    avatar(picture, member.name, member.avatar);
    const identity = element("span", "server-member-identity");
    identity.append(element("strong", "", member.name));
    const ranks = element("span", "server-member-ranks");
    if (member.id === data.owner) ranks.append(element("span", "owner-rank", copy.owner));
    for (const role of member.roles || []) ranks.append(element("span", "member-rank", role));
    if (ranks.childElementCount) identity.append(ranks);
    const presence = element("span", "server-member-presence");
    presence.dataset.presence = member.presence || "offline";
    const status = element("small", "server-member-status", copy[member.presence] || copy.offline);
    presence.title = status.textContent;
    row.append(picture, identity, status, presence);
    row.onclick = () => showMemberProfile(member.id).catch(error => notice(error.message));
    list.append(row);
  }
}
function renderServerLevel(space, data) {
  const count = Math.max(0, Number(data.message_count) || 0);
  const level = Math.floor(count / 25);
  const progress = count % 25;
  $("server-level-name").textContent = "LEVEL " + level;
  $("server-level-progress").textContent = progress + " / 25 XP";
  $("server-level-fill").style.width = progress / 25 * 100 + "%";
  $("server-level-track").setAttribute("aria-valuenow", String(progress));
  $("server-level").title = space.name + " level " + level + ". One XP per message; 25 XP per level.";
}
function renderMessages(container, items) {
  container.replaceChildren();
  if (!items.length) container.append(element("p", "empty", "No messages yet. Start the conversation."));
  for (const message of items) {
    const row = element("article", "message");
    const image = element("div", "avatar");
    const author = message.bot || message.name || "Member";
    avatar(image, author, message.avatar, message.color);
    if (message.account_id && message.account_id !== me?.id) {
      image.classList.add("profile-clickable");
      image.title = "View " + author + "’s profile";
      image.onclick = () => showMemberProfile(message.account_id).catch(error => notice(error.message));
    }
    const content = element("div", "message-content");
    const title = element("div", "message-title");
    title.append(element("strong", "", author));
    if (message.account_id && message.account_id !== me?.id) {
      title.querySelector("strong").classList.add("profile-clickable");
      title.querySelector("strong").title = "View profile";
      title.querySelector("strong").onclick = () => showMemberProfile(message.account_id).catch(error => notice(error.message));
    }
    if (message.owner_rank) title.append(element("span", "owner-rank", "Owner"));
    if (message.bot) title.append(element("span", "bot-badge", "APP"));
    const timestamp = message.time || new Date(message.created).toLocaleTimeString([], {hour:"numeric", minute:"2-digit"});
    title.append(element("time", "", timestamp));
    const body = element("p");
    for (const part of message.body.split(/(:[a-z0-9_-]{1,24}:)/g)) {
      const emoji = currentEmojis.find(item => ":" + item.name + ":" === part);
      if (emoji) {
        const image = element("img", "inline-emoji");
        image.src = sonixResourceUrl(emoji.image);
        image.alt = part;
        body.append(image);
      } else body.append(part);
    }
    content.append(title, body);
    row.append(image, content);
    container.append(row);
  }
}
async function refreshMessages(jump = false) {
  const space = active.id;
  const selected = channel;
  const query = new URLSearchParams({space, channel:selected});
  const type = selectedChannel()?.type;
  if (type === "poll") return refreshPolls(query, space, selected);
  if (type === "voice") return renderVoiceRoom();
  if (type !== "text") return;
  const accept = chatRequest();
  const records = await api("messages?" + query);
  if (!accept() || records === null) return;
  const key = space + ":" + selected + ":" + JSON.stringify(records);
  if (key === lastMessageKey) return;
  lastMessageKey = key;
  timeline = space === community.id && selected === "general" ? [...sample, ...records] : records;
  const scroll = $("chat-scroll");
  const nearEnd = scroll.scrollHeight - scroll.clientHeight - scroll.scrollTop < 65;
  renderMessages($("messages"), timeline);
  if (jump || (records.length && nearEnd)) scroll.scrollTop = scroll.scrollHeight;
}
function selectSpace(id, nextChannel) {
  if (currentView === "chat") drafts.set(draftKey(), $("draft").value);
  chatGeneration++;
  messageEtags.clear();
  setView("chat");
  active = spaces.find(space => space.id === id) || community;
  if (me && !tabIds().includes(active.id)) saveTabs([...tabIds(), active.id]);
  const available = records(active).filter(item => item.type !== "category");
  channel = (available.find(item => item.id === nextChannel) || available[0])?.id || "";
  if (selectedChannel()?.type === "text") lastTextChannel.set(active.id, channel);
  $("draft").value = drafts.get(draftKey()) || "";
  lastMessageKey = "";
  timeline = [];
  currentEmojis = [];
  $("messages").replaceChildren();
  $("chat-scroll").scrollTop = 0;
  document.querySelector(".layout").classList.remove("show-nav");
  renderWorkspace();
  if (!channel) $("messages").append(element("p", "empty", "This server has no channels yet."));
  const space = active.id;
  api("server-data?space=" + encodeURIComponent(space)).then(data => {
    if (active.id !== space) return;
    active.permissions = data.permissions;
    active.message_count = data.message_count || 0;
    renderServerLevel(active, data);
    renderServerPeople(space === active.id ? active : {id:space}, data);
    currentEmojis = data.emojis;
    if (timeline.length && currentView === "chat" && selectedChannel()?.type === "text") {
      renderMessages($("messages"), timeline);
    }
  }).catch(() => {});
  refreshMessages().catch(error => notice(error.message));
}
async function reloadSpaces(selected = active.id) {
  spaces = mergeSpaces(me ? await api("spaces") : []);
  selectSpace(selected, selected === active.id ? channel : null);
}

function openModal(title, body) {
  $("modal").classList.remove("wide-modal", "profile-modal", "user-settings-modal", "member-profile-modal");
  $("modal-title").textContent = title;
  $("modal-body").innerHTML = body;
  $("modal-error").textContent = "";
  paintIcons($("modal-body"));
  if (!$("modal").open) $("modal").showModal();
}
function closeModal() {
  $("modal").close();
}
function modalForm(handler) {
  const form = $("modal-body").querySelector("form");
  form.onsubmit = async event => {
    event.preventDefault();
    const submit = event.submitter || form.querySelector('button[type="submit"]');
    if (submit) submit.disabled = true;
    $("modal-error").textContent = "";
    try { await handler(new FormData(form)); }
    catch (error) { $("modal-error").textContent = error.message; }
    finally { if (submit) submit.disabled = false; }
  };
}
function requireAccount() {
  if (me) return true;
  auth(false);
  return false;
}
function auth(register) {
  stopQrLogin?.();
  authFlow++;
  leaveVoice();
  lastTextChannel.clear();
  document.querySelector(".layout").hidden = true;
  $("auth-screen").hidden = false;
  $("draft").value = "";
  drafts.clear();
  messageEtags.clear();
  chatGeneration++;
  $("auth-title").textContent = register ? "Create your account" : "Welcome back";
  $("auth-error").textContent = "";
  $("auth-form").innerHTML = `
    <form class="form">
      ${register ? '<label>Display name<input name="name" required maxlength="32" autocomplete="nickname"></label>' : ""}
      <label>Email<input type="email" name="email" required maxlength="254" autocomplete="email"></label>
      <label>Password<input type="password" name="password" required ${register ? 'minlength="12" placeholder="At least 12 characters"' : ""} maxlength="256" autocomplete="${register ? "new-password" : "current-password"}"></label>
      <button class="button primary full" type="submit">${register ? "Create account" : "Sign in"}</button>
    </form>${register ? "" : '<button class="button secondary full qr-login-trigger" data-action="qrlogin">Sign in with QR code</button>'}<p><button class="button secondary full" data-action="${register ? "login" : "register"}">${register ? "Already have an account? Sign in" : "Create an account"}</button></p>`;
  const form = $("auth-form").querySelector("form");
  form.onsubmit = async event => {
    event.preventDefault();
    const submit = form.querySelector('button[type="submit"]');
    if (submit.disabled) return;
    submit.disabled = true;
    $("auth-error").textContent = "";
    try {
      const result = await api(register ? "register" : "login", Object.fromEntries(new FormData(form)));
      if (result.mfa_required) {
        showMfaLogin(result.challenge);
        return;
      }
      await enterWorkspace(await api("me"));
    } catch (error) {
      $("auth-error").textContent = error.message;
    } finally {
      submit.disabled = false;
    }
  };
}
const factorInput = () => '<label>Authenticator or recovery code<input name="code" autocomplete="one-time-code" maxlength="28" required placeholder="6-digit code or recovery code"></label>';
function showMfaLogin(challenge) {
  $("auth-title").textContent = "Two-factor authentication";
  $("auth-error").textContent = "";
  $("auth-form").innerHTML = '<p>Enter a fresh code from Google Authenticator, or an unused recovery code.</p><form class="form">' + factorInput() + '<button class="button primary" type="submit">Verify and sign in</button></form><p><button class="button secondary" data-action="login">Back to sign in</button></p>';
  const form = $("auth-form").querySelector("form");
  form.onsubmit = async event => {
    event.preventDefault();
    const button = form.querySelector("button");
    button.disabled = true;
    $("auth-error").textContent = "";
    try {
      await api("mfa-login",{challenge,code:form.elements.code.value.trim()});
      await enterWorkspace(await api("me"));
    } catch (error) { $("auth-error").textContent = error.message; }
    finally { button.disabled = false; }
  };
  form.elements.code.focus();
}
async function showQrLogin() {
  auth(false);
  const flow = authFlow;
  $("auth-title").textContent = "Sign in with your phone";
  $("auth-form").innerHTML = '<p>Generating QR code…</p>';
  try {
    const challenge = await api("qr-create",{});
    if (flow !== authFlow) {
      await api("qr-cancel",{id:challenge.id,poll:challenge.poll}).catch(() => {});
      return;
    }
    const content = $("auth-form");
    content.replaceChildren();
    const picture = element("img","auth-qr");
    picture.src = challenge.qr;
    picture.alt = "Scan with a phone already signed in to Sonix";
    content.append(picture,element("p","","Scan with your phone camera, sign in to Sonix on the phone if needed, then approve this browser."),
      element("p","qr-match","Confirmation: " + challenge.match),
      element("p","","Only approve a sign-in you requested. This QR code expires in two minutes."));
    const back = element("button","button secondary","Back to sign in");
    back.onclick = () => auth(false);
    content.append(back);
    let cancelled = false;
    let timer;
    stopQrLogin = () => {
      cancelled = true;
      clearTimeout(timer);
      stopQrLogin = null;
      api("qr-cancel",{id:challenge.id,poll:challenge.poll}).catch(() => {});
    };
    const poll = async () => {
      if (cancelled) return;
      try {
        const result = await api("qr-poll",{id:challenge.id,poll:challenge.poll});
        if (cancelled || flow !== authFlow) return;
        if (result.ok) {
          cancelled = true;
          clearTimeout(timer);
          stopQrLogin = null;
          await enterWorkspace(await api("me"));
          return;
        }
        timer = setTimeout(poll,2000);
      } catch (error) {
        if (cancelled) return;
        stopQrLogin?.();
        picture.remove();
        $("auth-error").textContent = error.message;
        const regenerate = element("button","button primary","Generate another QR code");
        regenerate.onclick = showQrLogin;
        content.prepend(regenerate);
      }
    };
    timer = setTimeout(poll,1500);
  } catch (error) { $("auth-error").textContent = error.message; }
}
async function showQrApproval(identifier) {
  const info = await api("qr-info",{id:identifier});
  openModal("Approve browser sign-in", '<div id="qr-approval-details"></div><form class="form">' +
    (me.two_factor_enabled ? factorInput() : "") +
    '<button class="button primary" type="submit">Approve sign-in</button></form><p><button class="button secondary" data-action="close">Cancel</button></p>');
  const details = $("qr-approval-details");
  details.append(element("p","","Approve only if you just requested this sign-in and the confirmation matches your other screen."),
    element("strong","qr-match",info.match),element("p","",info.device));
  modalForm(async data => {
    await api("qr-approve",{id:identifier,code:data.get("code")});
    qrApprovalId = null;
    const url = new URL(location.href);
    url.searchParams.delete("login-qr");
    history.replaceState(null,"",url);
    closeModal();
    notice("Sign-in approved. Continue on the other device.");
  });
}
function startAuthenticator() {
  openModal("Set up two-factor authentication", '<form class="form"><label>Current password<input type="password" name="password" autocomplete="current-password" required maxlength="256"></label><button class="button primary" type="submit">Continue</button></form>');
  modalForm(async data => {
    const setup = await api("mfa-start",{password:data.get("password")});
    openModal("Add Sonix to Google Authenticator", '<div id="authenticator-setup"></div><form class="form"><label>Six-digit authenticator code<input name="code" inputmode="numeric" pattern="[0-9]{6}" autocomplete="one-time-code" required maxlength="6"></label><button class="button primary" type="submit">Enable two-factor authentication</button></form>');
    const image = element("img","auth-qr");
    image.src = setup.qr;
    image.alt = "Scan this setup QR code in Google Authenticator";
    $("authenticator-setup").append(image,element("p","","Scan using Google Authenticator or another compatible authenticator. You can also enter this setup key manually."),
      element("code","setup-key",setup.secret));
    modalForm(async values => {
      const result = await api("mfa-enable",{code:values.get("code")});
      me = await api("me");
      openModal("Save your recovery codes", '<p>Store these codes somewhere private. Each code can be used once when you cannot use your authenticator. These codes are shown only now.</p><div id="recovery-codes"></div><button class="button secondary" id="download-recovery">Download codes</button><button class="button primary" id="saved-recovery">I saved my codes</button>');
      const list = element("pre","recovery-code-list",result.recovery.join("\n"));
      $("recovery-codes").append(list);
      $("download-recovery").onclick = () => {
        const url = URL.createObjectURL(new Blob([result.recovery.join("\n")],{type:"text/plain"}));
        const link = element("a");
        link.href = url;
        link.download = "sonix-recovery-codes.txt";
        link.click();
        setTimeout(() => URL.revokeObjectURL(url),1000);
      };
      $("saved-recovery").onclick = () => showUserSettings("Account security");
      refreshAccountUI();
    });
  });
}
function disableAuthenticator() {
  openModal("Disable two-factor authentication", '<form class="form"><label>Current password<input name="password" type="password" autocomplete="current-password" maxlength="256" required></label>' +
    factorInput() + '<button class="button primary" type="submit">Disable two-factor authentication</button></form>');
  modalForm(async data => {
    await api("mfa-disable",Object.fromEntries(data));
    me = await api("me");
    showUserSettings("Account security");
    notice("Two-factor authentication disabled. Other sessions were signed out.");
  });
}
async function enterWorkspace(account) {
  if (!account) return auth(qrApprovalId ? false : true);
  stopQrLogin?.();
  authFlow++;
  const joined = await api("spaces");
  me = account;
  startPresenceHeartbeat();
  spaces = mergeSpaces(joined);
  active = community;
  channel = records(community)[0].id;
  $("auth-screen").hidden = true;
  document.querySelector(".layout").hidden = false;
  renderWorkspace();
  showHome();
  if (qrApprovalId) {
    try { await showQrApproval(qrApprovalId); }
    catch (error) {
      qrApprovalId = null;
      const url = new URL(location.href);
      url.searchParams.delete("login-qr");
      history.replaceState(null,"",url);
      notice(error.message);
    }
  } else if (invite) actions.join();
}
const imageReads = new WeakMap();
function fileImage(file, previous) {
  if (!file?.size) return Promise.resolve(previous || "");
  if (imageReads.has(file)) return imageReads.get(file);
  const read = async () => {
    const extension = file.name?.split(".").pop()?.toLowerCase();
    const kind = file.type || ({jpg:"image/jpeg",jpeg:"image/jpeg",png:"image/png",gif:"image/gif",webp:"image/webp"})[extension];
    if (!["image/png","image/jpeg","image/webp","image/gif"].includes(kind)) throw new Error("Choose a PNG, JPEG, WebP or GIF image.");
    if (file.size > (kind === "image/gif" ? 24 : 50) * 1024 * 1024) {
      throw new Error(kind === "image/gif" ? "Choose a GIF under 24 MB." : "Choose an image under 50 MB.");
    }
    const asDataUrl = blob => new Promise((resolve,reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Couldn’t read that image."));
      reader.readAsDataURL(blob);
    });
    if (kind === "image/gif") return asDataUrl(new Blob([file],{type:kind}));
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    try {
      image.src = objectUrl;
      await image.decode();
      const scale = Math.min(1,1600 / Math.max(image.naturalWidth,image.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1,Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1,Math.round(image.naturalHeight * scale));
      canvas.getContext("2d").drawImage(image,0,0,canvas.width,canvas.height);
      const blob = await new Promise(resolve => canvas.toBlob(resolve,"image/webp",.9));
      if (!blob) throw new Error("This image could not be resized.");
      return asDataUrl(blob);
    } finally { URL.revokeObjectURL(objectUrl); }
  };
  const promise = read();
  imageReads.set(file,promise);
  return promise;
}
const imageInput = "accept='image/png,image/jpeg,image/webp,image/gif'";
function options(items, current) {
  return Object.entries(items).map(([value, label]) => '<option value="' + value + '"' + (value === current ? " selected" : "") + '>' + label + '</option>').join("");
}
function bannerControls(label) {
  return `<div class="banner-field">
    <button type="button" class="profile-banner banner-edit-button" aria-label="Adjust ${label.toLowerCase()}"><span>Edit banner</span></button>
    <div class="banner-field-actions"><button type="button" class="button secondary banner-replace">Choose image</button><button type="button" class="icon-button banner-remove" title="Remove banner" data-icon="close"></button></div>
    <small>Recommended 600 × 240 px · 5:2</small>
    <input type="file" name="banner" ${imageInput} hidden>
    <input type="checkbox" name="clearBanner" hidden>
  </div>`;
}
function setupBanner(form, saved) {
  const preview = form.querySelector(".profile-banner");
  const input = form.elements.banner;
  form._bannerState = {
    banner:saved?.banner || "", banner_source:saved?.banner_source || saved?.banner || "",
    banner_position:saved?.banner_position ?? 50, banner_horizontal:saved?.banner_horizontal ?? 50,
    banner_zoom:saved?.banner_zoom || 1,
  };
  const show = () => {
    const state = form._bannerState;
    preview.style.backgroundImage = state.banner ? 'url("' + state.banner + '")' : "";
    preview.style.backgroundPosition = state.banner_source === state.banner ?
      bannerStyle(state.banner_position,state.banner_horizontal) : "center";
    preview.querySelector("span").textContent = state.banner ? "Adjust banner" : "Add banner";
    form.querySelector(".banner-remove").hidden = !state.banner;
  };
  const edit = source => openBannerEditor(source,form._bannerState,result => {
    form._bannerState = result;
    form.elements.clearBanner.checked = false;
    show();
  });
  preview.onclick = () => {
    if (form._bannerState.banner_source) edit(form._bannerState.banner_source);
    else input.click();
  };
  form.querySelector(".banner-replace").onclick = () => input.click();
  form.querySelector(".banner-remove").onclick = () => {
    form._bannerState = {banner:"",banner_source:"",banner_position:50,banner_horizontal:50,banner_zoom:1};
    form.elements.clearBanner.checked = true;
    input.value = "";
    show();
  };
  input.onchange = async () => {
    const file = input.files[0];
    if (!file) return;
    const controls = form.querySelectorAll('button[type="submit"],.banner-replace,.banner-edit-button');
    controls.forEach(button => { button.disabled = true; });
    $("modal-error").textContent = "";
    try {
      const source = await fileImage(file);
      if (input.files[0] === file && form.isConnected) edit(source);
    } catch (error) { $("modal-error").textContent = error.message; }
    finally {
      controls.forEach(button => { button.disabled = false; });
      input.value = "";
    }
  };
  show();
  paintIcons(form.querySelector(".banner-field"));
}
async function openBannerEditor(source, saved, apply) {
  const editor = $("banner-editor");
  const token = Symbol("banner crop");
  editor._cropToken = token;
  editor.innerHTML = `<div class="crop-layout">
    <section class="crop-main"><h2 id="banner-editor-title">Adjust banner</h2>
      <div class="crop-stage" tabindex="0" role="img" aria-label="Banner crop. Drag to reposition or use arrow keys."><img class="crop-image" alt="" draggable="false"><div class="crop-guides"></div></div>
      <p class="crop-hint">Drag to reposition</p>
      <div class="crop-zoom"><button type="button" id="crop-minus" aria-label="Zoom out">−</button><input type="range" id="crop-zoom" min="1" max="4" step=".01" aria-label="Banner zoom"><button type="button" id="crop-plus" aria-label="Zoom in">+</button></div>
    </section>
    <aside class="crop-side"><div class="crop-side-heading"><strong>Preview</strong><button type="button" class="icon-button" id="crop-close" aria-label="Cancel banner changes">×</button></div>
      <div class="crop-mini"><div class="crop-preview-window"><img class="crop-image" alt="Live banner preview"></div><div class="crop-mini-profile"><span></span><i></i></div></div>
      <p id="crop-error" role="alert"></p><button type="button" class="button primary" id="crop-apply">Apply</button>
    </aside></div>`;
  const stage = editor.querySelector(".crop-stage");
  const miniature = editor.querySelector(".crop-preview-window");
  const picture = stage.querySelector("img");
  const miniPicture = miniature.querySelector("img");
  const slider = $("crop-zoom");
  const cropError = $("crop-error");
  const previous = source === saved.banner_source;
  let horizontal = previous ? saved.banner_horizontal : 50;
  let vertical = previous ? saved.banner_position : 50;
  slider.value = previous ? saved.banner_zoom : 1;
  let size = {width:1,height:1};
  let drag;
  const clamp = value => Math.max(0,Math.min(100,value));
  const geometry = container => {
    const width = container.clientWidth, height = container.clientHeight;
    const scale = Math.max(width / size.width,height / size.height) * Number(slider.value);
    return {width,height,drawWidth:size.width * scale,drawHeight:size.height * scale};
  };
  const draw = () => {
    for (const container of [stage,miniature]) {
      const {width,height,drawWidth,drawHeight} = geometry(container);
      const image = container.querySelector("img");
      Object.assign(image.style,{width:drawWidth+"px",height:drawHeight+"px",
        left:(width-drawWidth)*horizontal/100+"px",top:(height-drawHeight)*vertical/100+"px"});
    }
  };
  const observer = new ResizeObserver(draw);
  observer.observe(stage);
  const close = () => editor.close();
  editor.onclose = () => {
    observer.disconnect();
    picture.src = "";
    miniPicture.src = "";
    if (editor._cropToken === token) {
      editor._cropToken = null;
      editor.replaceChildren();
      editor.onclose = null;
    }
  };
  $("crop-close").onclick = close;
  stage.onpointerdown = event => {
    if (event.button !== 0) return;
    stage.setPointerCapture(event.pointerId);
    drag = {x:event.clientX,y:event.clientY,horizontal,vertical,...geometry(stage)};
    event.preventDefault();
  };
  stage.onpointermove = event => {
    if (!drag) return;
    if (drag.width-drag.drawWidth < -.1) horizontal = clamp(drag.horizontal + (event.clientX-drag.x)/(drag.width-drag.drawWidth)*100);
    if (drag.height-drag.drawHeight < -.1) vertical = clamp(drag.vertical + (event.clientY-drag.y)/(drag.height-drag.drawHeight)*100);
    draw();
  };
  stage.onpointerup = stage.onpointercancel = () => { drag = null; };
  stage.onkeydown = event => {
    const changes = {ArrowLeft:[2,0],ArrowRight:[-2,0],ArrowUp:[0,2],ArrowDown:[0,-2]};
    if (!changes[event.key]) return;
    event.preventDefault();
    horizontal = clamp(horizontal+changes[event.key][0]);
    vertical = clamp(vertical+changes[event.key][1]);
    draw();
  };
  slider.oninput = draw;
  $("crop-minus").onclick = () => { slider.value = Math.max(1,Number(slider.value)-.1); draw(); };
  $("crop-plus").onclick = () => { slider.value = Math.min(4,Number(slider.value)+.1); draw(); };
  const applyButton = $("crop-apply");
  applyButton.disabled = true;
  applyButton.onclick = async () => {
    applyButton.disabled = true;
    cropError.textContent = "";
    try {
      const result = await api("crop-banner",{source,banner_position:Math.round(vertical),
        banner_horizontal:Math.round(horizontal),banner_zoom:Number(slider.value)});
      if (editor.open && editor._cropToken === token) { apply(result); close(); }
    } catch (error) { cropError.textContent = error.message; }
    finally { applyButton.disabled = false; }
  };
  editor.showModal();
  try {
    picture.src = source;
    await picture.decode();
    if (!editor.open || editor._cropToken !== token) return;
    size = {width:picture.naturalWidth,height:picture.naturalHeight};
    miniPicture.src = source;
    draw();
    applyButton.disabled = false;
  } catch { cropError.textContent = "This banner could not be opened. Choose another image."; }
}
function manageChannels() {
  if (active.owner !== me?.id && !active.permissions?.includes("channels")) {
    openModal("Manage channels", '<p>You need permission to manage channels.</p>');
    return;
  }
  const space = active.id;
  openModal("Manage channels", `<form class="form">
    <label>Channel name<input name="name" required maxlength="100"></label>
    <label>Type<select name="type">${options(channelTypes, "text")}</select></label>
    <label>Category<select name="parent"><option value="">No category</option></select></label>
    <button class="button primary" type="submit">Create channel</button>
  </form><h3>Existing channels</h3><div id="managed-channels"></div>`);
  const form = $("modal-body").querySelector("form");
  form.elements.type.onchange = () => { form.elements.parent.disabled = form.elements.type.value === "category"; };
  for (const item of records(active)) {
    if (item.type === "category") {
      const option = element("option", "", item.name);
      option.value = item.id;
      form.elements.parent.append(option);
    }
    const row = element("div", "modal-row");
    const label = element("div");
    label.append(element("strong", "", item.name), element("small", "", channelTypes[item.type]));
    const button = element("button", "button secondary", "Delete");
    button.setAttribute("aria-label", "Delete " + item.name);
    button.onclick = () => {
      openModal("Delete " + item.name + "?", '<p>Deleting a channel removes its messages or polls. Deleting a category moves its channels to the top level.</p><form class="form"><div class="hub-tabs"><button class="button secondary" type="button" data-action="channels">Cancel</button><button class="button primary" type="submit">Delete</button></div></form>');
      modalForm(async () => {
        await api("channel", {space,channel:item.id,delete:true});
        await reloadSpaces(space);
        manageChannels();
      });
    };
    row.append(label, button);
    $("managed-channels").append(row);
  }
  modalForm(async data => {
    const result = await api("channel", {...Object.fromEntries(data),space});
    await reloadSpaces(space);
    if (data.get("type") !== "category") selectSpace(space, result.channel);
    manageChannels();
  });
}
async function refreshPolls(query, space, selected) {
  const accept = chatRequest();
  const polls = await api("polls?" + query);
  if (!accept() || active.id !== space || channel !== selected) return;
  const key = "polls:" + space + ":" + selected + ":" + JSON.stringify(polls);
  if (lastMessageKey === key) return;
  lastMessageKey = key;
  const create = element("button", "button primary", "Create a poll");
  create.onclick = () => {
    openModal("Create a poll", '<form class="form"><label>Question<input name="question" maxlength="200" required></label><label>Choices (one per line)<textarea name="choices" required></textarea></label><button class="button primary" type="submit">Publish poll</button></form>');
    modalForm(async data => {
      await api("poll", {space,channel:selected,question:data.get("question"),choices:data.get("choices").split("\n").map(choice => choice.trim()).filter(Boolean)});
      closeModal();
      await refreshPolls(query, space, selected);
    });
  };
  $("messages").replaceChildren(create);
  if (!polls.length) $("messages").append(element("p", "empty", "No polls yet."));
  for (const poll of polls) {
    const card = element("article", "hub-card poll-card");
    card.append(element("h2", "", poll.question));
    poll.choices.forEach((choice, index) => {
      const button = element("button", "button secondary", choice + " · " + poll.counts[index]);
      button.setAttribute("aria-pressed", String(poll.vote === index));
      button.onclick = async () => {
        try {
          await api("vote", {space,channel:selected,poll:poll.id,choice:index});
          await refreshPolls(query, space, selected);
        } catch (error) { notice(error.message); }
      };
      card.append(button);
    });
    $("messages").append(card);
  }
}
function isVoiceRoom(space, selected) {
  return voiceRoom?.space === space && voiceRoom?.channel === selected;
}
function updateVoiceView() {
  const connected = Boolean(voiceSession && voiceRoom);
  $("call-dock").hidden = !connected;
  document.querySelector(".layout").classList.toggle("in-call", connected);
  if (connected) {
    $("call-channel").textContent = voiceRoom.name;
    $("call-user").textContent = me.name;
    avatar($("call-avatar"), me.name, me.avatar);
    $("call-share").hidden = false;
    $("call-share").setAttribute("aria-disabled",String(!navigator.mediaDevices?.getDisplayMedia));
    setCallControl("call-mic", !voiceSession.stream.getAudioTracks()[0].enabled, "Mute microphone", "Unmute microphone");
    setCallControl("call-deafen", voiceSession.deafened, "Deafen", "Undeafen");
    setCallControl("call-camera", Boolean(voiceSession.videoTrack), "Turn on camera", "Turn off camera");
    setCallControl("call-share", Boolean(voiceSession.screenTrack), "Share screen", "Stop sharing");
  } else {
    setCallMedia(false);
    $("call-videos").replaceChildren();
  }
  if (me && currentView === "chat") {
    renderWorkspace();
    if (selectedChannel()?.type === "voice") {
      $("messages").replaceChildren();
      renderVoiceRoom();
    }
  }
}
function setCallControl(id, pressed, inactive, active) {
  const button = $(id);
  button.setAttribute("aria-pressed", String(Boolean(pressed)));
  button.title = pressed ? active : inactive;
  button.setAttribute("aria-label", button.title);
}
function setCallMedia(open) {
  $("call-media").hidden = !open;
  setCallControl("call-video", open, "Show call video", "Hide call video");
}
function leaveVoice() {
  voicePending++;
  stopVoiceMeter?.();
  stopVoiceMeter = null;
  voiceSession?.stop();
  voiceSession = null;
  voiceRoom = null;
  updateVoiceView();
}
function startVoiceMeter(stream, context) {
  if (!context) return null;
  const input = context.createMediaStreamSource(stream);
  const analyser = context.createAnalyser();
  analyser.fftSize = 512;
  input.connect(analyser);
  const samples = new Float32Array(analyser.fftSize);
  const layout = document.querySelector(".layout");
  const [track] = stream.getAudioTracks();
  let frame;
  let level = 0;
  const render = () => {
    analyser.getFloatTimeDomainData(samples);
    const rms = Math.sqrt(samples.reduce((sum, sample) => sum + sample * sample, 0) / samples.length);
    level = track.enabled && !track.muted && track.readyState === "live"
      ? Math.max(Math.min(1, rms * 9), level * .8) : 0;
    layout.style.setProperty("--voice-level", level.toFixed(3));
    layout.classList.toggle("voice-speaking", level > .11);
    frame = requestAnimationFrame(render);
  };
  render();
  return () => {
    cancelAnimationFrame(frame);
    input.disconnect();
    analyser.disconnect();
    context.close().catch(() => {});
    layout.style.removeProperty("--voice-level");
    layout.classList.remove("voice-speaking");
  };
}
function joinVoice(room) {
  if (isVoiceRoom(room.space,room.channel)) return Promise.resolve();
  const key = room.space + ":" + room.channel;
  if (joiningVoice?.key === key) return joiningVoice.promise;
  const operation = {key};
  operation.promise = connectVoice(room).finally(() => {
    if (joiningVoice === operation) joiningVoice = null;
  });
  joiningVoice = operation;
  return operation.promise;
}
async function connectVoice(room) {
  if (isVoiceRoom(room.space, room.channel)) return;
  if (!navigator.mediaDevices?.getUserMedia) throw new Error("Microphone access requires HTTPS or localhost.");
  const attempt = ++voicePending;
  const context = typeof AudioContext === "function" ? new AudioContext() : null;
  const closeMeterContext = () => context?.close().catch(() => {});
  context?.resume().catch(() => {});
  let stream;
  try { stream = await navigator.mediaDevices.getUserMedia({audio:true}); }
  catch (error) { closeMeterContext(); throw error; }
  if (attempt !== voicePending || !me) {
    stream.getTracks().forEach(track => track.stop());
    closeMeterContext();
    return;
  }
  leaveVoice();
  const endpoint = new URL("/voice", SONIX_API_BASE);
  endpoint.protocol = location.protocol === "https:" ? "wss:" : "ws:";
  endpoint.search = new URLSearchParams({space:room.space,channel:room.channel});
  let session;
  try {
    session = new SonixVoice(stream, endpoint, message => {
      if (voiceSession !== session) return;
      if (session.stopped) {
        leaveVoice();
        notice(message);
        return;
      }
      if (message === "Connected to voice") {
        $("call-status").textContent = "Connected";
        $("call-status").classList.add("connected");
        if (currentView === "chat" && active.id === room.space && channel === room.channel) {
          const textChannel = lastTextChannel.get(room.space) || records(active).find(item => item.type === "text")?.id;
          if (textChannel) selectSpace(room.space, textChannel);
        }
      } else notice(message);
    }, $("call-videos"));
  } catch (error) {
    stream.getTracks().forEach(track => track.stop());
    closeMeterContext();
    throw error;
  }
  voiceSession = session;
  voiceRoom = room;
  try { stopVoiceMeter = startVoiceMeter(stream, context); }
  catch { closeMeterContext(); }
  $("call-status").textContent = "Connecting";
  $("call-status").classList.remove("connected");
  updateVoiceView();
}
function renderVoiceRoom() {
  if ($("messages").querySelector(".voice-room")) return;
  const item = selectedChannel();
  const room = {space:active.id, channel:item.id, name:item.name};
  const connected = isVoiceRoom(room.space, room.channel);
  const card = element("article", "hub-card voice-room");
  const icon = element("div", "voice-room-icon");
  icon.innerHTML = svg("sound");
  const status = element("p", "", connected ? "Your call controls are in the bar below." : "Join to talk, turn on your camera, or share your screen.");
  const join = element("button", "button primary", connected ? "Show call video" : "Join voice");
  join.onclick = async () => {
    if (connected) return setCallMedia(true);
    join.disabled = true;
    try { await joinVoice(room); }
    catch (error) { status.textContent = error.message || "Could not access your microphone."; }
    finally { join.disabled = false; }
  };
  card.append(icon, element("h2", "", item.name), status, join);
  $("messages").replaceChildren(card);
}
async function useCallVideo(mode) {
  const session = voiceSession;
  if (!session) return;
  if (mode === "screen" && !navigator.mediaDevices?.getDisplayMedia) {
    notice("Screen sharing is unavailable in this app or browser. Use Sonix in a supported desktop browser.");
    return;
  }
  const camera = $("call-camera");
  const share = $("call-share");
  camera.disabled = share.disabled = true;
  try {
    const currentTrack = () => mode === "screen" ? session.screenTrack : session.videoTrack;
    if (currentTrack()) {
      await session.setVideo(null,mode);
      if (voiceSession === session) showCallPreview(null,mode);
      return;
    }
    const media = mode === "camera" ? await navigator.mediaDevices.getUserMedia({video:true}) :
      await navigator.mediaDevices.getDisplayMedia({video:true});
    const track = media.getVideoTracks()[0];
    if (!track) return;
    await session.setVideo(track,mode);
    if (voiceSession !== session) return;
    showCallPreview(track, mode);
    setCallMedia(true);
    track.onended = async () => {
      if (voiceSession !== session || currentTrack() !== track) return;
      try {
        await session.setVideo(null,mode);
        if (voiceSession === session) showCallPreview(null,mode);
      } catch (error) { notice(error.message); }
    };
  } catch {
    notice(mode === "camera" ? "Camera unavailable or permission denied." : "Screen sharing was unavailable or cancelled.");
  } finally { camera.disabled = share.disabled = false; }
}
function showCallPreview(track, mode = "camera") {
  const id = mode === "screen" ? "local-screen-preview" : "local-call-preview";
  $(id)?.remove();
  if (track) {
    const preview = element("video");
    preview.id = id;
    preview.muted = true;
    preview.autoplay = true;
    preview.playsInline = true;
    preview.setAttribute("aria-label", mode === "screen" ? "Your shared screen" : "Your webcam");
    preview.srcObject = new MediaStream([track]);
    $("call-videos").prepend(preview);
  }
  updateVoiceView();
}
function bindCallControls() {
  $("call-room").onclick = () => {
    if (voiceRoom) selectSpace(voiceRoom.space, voiceRoom.channel);
  };
  $("call-disconnect").onclick = leaveVoice;
  $("call-camera").onclick = () => useCallVideo("camera");
  $("call-share").onclick = () => useCallVideo("screen");
  $("call-video").onclick = () => setCallMedia($("call-media").hidden);
  $("hide-call-media").onclick = () => setCallMedia(false);
  $("call-mic").onclick = () => {
    if (!voiceSession) return;
    const track = voiceSession.stream.getAudioTracks()[0];
    track.enabled = !track.enabled;
    playCallFeedback(track.enabled);
    setCallControl("call-mic", !track.enabled, "Mute microphone", "Unmute microphone");
  };
  $("call-deafen").onclick = () => {
    if (!voiceSession) return;
    voiceSession.setDeafened(!voiceSession.deafened);
    playCallFeedback(!voiceSession.deafened, true);
    setCallControl("call-deafen", voiceSession.deafened, "Deafen", "Undeafen");
  };
}
const presenceLabels = {online:"Online",away:"Away",busy:"Do not disturb",invisible:"Invisible"};
function refreshAccountUI() {
  renderWorkspace();
  if (currentView === "home") showHome();
  if (currentView === "discovery") showDiscovery(discoveryCategory);
  refreshServerPresence().catch(() => {});
}
function accountPanelContent(panel) {
  const banner = element("div", "profile-menu-banner");
  if (me.banner) {
    banner.style.backgroundImage = 'url("' + sonixResourceUrl(me.banner) + '")';
    banner.style.backgroundPosition = me.banner_source ? "center" : bannerStyle(me.banner_position, me.banner_horizontal);
  }
  banner.setAttribute("aria-label", "Your profile banner");
  const portrait = element("div", "profile-portrait");
  const picture = element("div", "avatar");
  avatar(picture, me.name, me.avatar);
  const dot = element("span", "presence-dot");
  dot.dataset.presence = me.presence || "online";
  portrait.append(picture, dot);
  const header = element("div", "account-panel-heading");
  header.append(portrait, element("h2", "", me.name));
  const status = element("button", "button secondary account-status-chip", me.status_text || "Set a status");
  status.onclick = () => {
    openModal("Set a status", '<form class="form"><label>Status<input name="status_text" maxlength="80" placeholder="What are you up to?"></label><button class="button primary" type="submit">Save status</button></form>');
    $("modal-body").querySelector("input").value = me.status_text || "";
    modalForm(async data => {
      await api("presence",{presence:me.presence || "online",status_text:data.get("status_text")});
      me = await api("me");
      refreshAccountUI();
      showProfileMenu();
    });
  };
  header.append(status);
  const select = element("select", "presence-select");
  select.setAttribute("aria-label", "Set presence");
  select.innerHTML = options(presenceLabels, me.presence || "online");
  select.onchange = async () => {
    select.disabled = true;
    try {
      await api("presence",{presence:select.value,status_text:me.status_text || ""});
      me = await api("me");
      dot.dataset.presence = me.presence;
      refreshAccountUI();
    } catch (error) {
      select.value = me.presence || "online";
      notice(error.message);
    } finally { select.disabled = false; }
  };
  const controls = [
    ["settings","Settings",() => showUserSettings("User profile")],
    ["people","Friends and group chats",() => showFriends().catch(error => notice(error.message))],
    ["link","Join by invite",actions.join],
  ];
  const menuButton = (icon, label, handler, style = "secondary") => {
    const button = element("button", "button full profile-menu-button " + style);
    button.innerHTML = svg(icon);
    button.append(element("span", "", label));
    button.onclick = handler;
    return button;
  };
  panel.append(banner, header);
  if (me.bio) panel.append(element("p", "profile-menu-bio", me.bio));
  panel.append(select);
  for (const [icon,label,handler] of controls) panel.append(menuButton(icon,label,handler));
  const footer = element("div", "profile-menu-footer");
  const rings = element("div", "profile-rings");
  rings.append(element("strong", "", "Sonix Rings"),
    menuButton("ring","Explore Rings",() => actions.boost().catch(error => notice(error.message)),"primary"));
  footer.append(rings, menuButton("login","Sign out",() => actions.logout().catch(error => notice(error.message))));
  panel.append(footer);
}
async function showMemberProfile(accountId) {
  if (!requireAccount()) return;
  const person = accountId === me.id ? me : await api("user-profile?account=" + encodeURIComponent(accountId));
  openModal(person.name + "’s profile", "");
  $("modal").classList.add("member-profile-modal");
  const body = $("modal-body");
  const banner = element("div", "member-profile-banner");
  if (person.banner) {
    banner.style.backgroundImage = 'url("' + sonixResourceUrl(person.banner) + '")';
    banner.style.backgroundPosition = person.banner_source ? "center" : bannerStyle(person.banner_position, person.banner_horizontal);
  }
  const identity = element("div", "member-profile-identity");
  const actionButton = (label, handler) => {
    const control = element("button", "button primary", label);
    control.onclick = handler;
    return control;
  };
  const picture = element("div", "avatar");
  avatar(picture, person.name, person.avatar);
  identity.append(picture, element("h2", "", person.name));
  if (person.id === me.id) identity.append(element("span", "", "This is your profile"));
  else if (person.friendship === "friend") identity.append(element("span", "", "Friend"));
  else if (person.friendship === "sent") identity.append(element("span", "", "Friend request sent"));
  else if (person.friendship === "received") identity.append(actionButton("Accept request", async () => {
    try { await api("friend", {account:person.id,accept:true}); showMemberProfile(person.id); }
    catch (error) { $("modal-error").textContent = error.message; }
  }, "primary"));
  else if (person.id !== me.id) identity.append(actionButton("Add friend", async () => {
    try { await api("friend", {account:person.id}); showMemberProfile(person.id); }
    catch (error) { $("modal-error").textContent = error.message; }
  }, "primary"));
  body.append(banner, identity);
  if (person.bio) body.append(element("p", "member-profile-bio", person.bio));
  if (person.status_text) body.append(element("p", "member-profile-status", person.status_text));
}
function showProfileMenu() {
  openModal("My profile", "");
  $("modal").classList.add("profile-modal");
  accountPanelContent($("modal-body"));
}
function showUserSettings(section) {
  openModal("Settings", '<div class="user-settings-shell"><nav id="user-settings-nav" aria-label="User settings"></nav><section id="user-settings-page"></section></div>');
  $("modal").classList.add("user-settings-modal");
  const nav = $("user-settings-nav");
  const page = $("user-settings-page");
  const identity = element("div", "settings-identity");
  const picture = element("div", "avatar");
  avatar(picture,me.name,me.avatar);
  const details = element("div");
  details.append(element("strong", "", me.name), element("small", "", presenceLabels[me.presence] || "Online"));
  identity.append(picture,details);
  nav.append(identity);
  for (const [heading, entries] of [
    ["User settings",["User profile","Privacy","Account security"]],
    ["App settings",["Audio and video","Theme and language"]],
    ["Billing",["Sonix Rings"]],
  ]) {
    nav.append(element("h3", "", heading));
    for (const name of entries) {
      const button = element("button", "button secondary", name);
      button.setAttribute("aria-pressed", String(section === name));
      button.onclick = () => showUserSettings(name);
      nav.append(button);
    }
  }
  page.append(element("h2", "", section));
  if (section === "User profile") return editProfile(page);
  if (section === "Privacy") {
    const info = element("div","settings-card privacy-copy");
    info.append(
      element("p","","Sonix stores your account email, a password hash, profile settings, memberships, friend requests, votes and messages so your account and chats can work. Other members see your profile and messages in shared spaces."),
      element("p","","Sonix has no analytics or advertising scripts. Fonts load from the Sonix host. This server disables routine access logging. Sign-in uses a session cookie; tabs and sound settings are stored on your device."),
      element("p","","If enabled, two-factor authentication stores an encrypted authenticator seed and recovery-code hashes. QR login requests expire after two minutes."),
      element("p","","Microphone and camera access begins when you choose the call controls and allow access. Sonix does not record calls. Direct voice connections can reveal your network address to call participants. Google’s STUN service helps establish the connection."),
      element("p","","The public preview passes through Cloudflare, and its launcher and download pages use GitHub. These services receive network information such as your IP address. Discord template lookup and exchange-rate lookup run only when you use those features."),
      element("p","","Messages are stored on the Sonix server without end-to-end encryption. Deleting your account removes its profile, messages, votes and friendships from the active Sonix database. Copies kept by recipients or other services may remain."),
    );
    const exportButton = element("button","button secondary","Download my data");
    exportButton.onclick = async () => {
      exportButton.disabled = true;
      try {
        const data = await api("export-data");
        const url = URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}));
        const link = element("a");
        link.href = url;
        link.download = "sonix-data.json";
        link.click();
        setTimeout(() => URL.revokeObjectURL(url),1000);
      } catch (error) { $("modal-error").textContent = error.message; }
      finally { exportButton.disabled = false; }
    };
    const clearButton = element("button","button secondary","Clear local preferences");
    clearButton.onclick = () => {
      try {
        for (const key of Object.keys(localStorage)) if (key.startsWith("sonix-")) localStorage.removeItem(key);
        drafts.clear();
        $("draft").value = "";
        notice("Local tabs, drafts and sound preferences cleared.");
      } catch { $("modal-error").textContent = "Your browser could not clear local preferences."; }
    };
    const deleteButton = element("button","button secondary danger-button","Delete my account");
    deleteButton.onclick = () => {
      openModal("Delete your account", '<p>Your profile, messages, polls, votes and friendships will be removed from Sonix. Transfer ownership of shared servers first.</p><form class="form"><label>Confirm your password<input name="password" type="password" autocomplete="current-password" maxlength="256" required></label>' + (me.two_factor_enabled ? factorInput() : "") + '<button class="button primary" type="submit">Permanently delete my account</button></form>');
      modalForm(async data => {
        const id = me.id;
        await api("delete-account",{password:data.get("password"),code:data.get("code")});
        try {
          localStorage.removeItem("sonix-tabs:" + id);
          localStorage.removeItem("sonix-shadow-draft:" + id);
        } catch {}
        leaveVoice();
        me = null;
        spaces = [...officialSpaces];
        active = community;
        closeModal();
        auth(true);
        notice("Your account and messages were deleted.");
      });
    };
    page.append(info,exportButton,clearButton,deleteButton);
  } else   if (section === "Account security") {
    const button = element("button","button secondary","Change password");
    button.onclick = actions.security;
    page.append(element("p","","Your email: " + me.email),button);
    const authenticator = element("article","settings-card security-card");
    authenticator.append(element("h3","","Two-factor authentication"),
      element("p","",me.two_factor_enabled ? "Enabled. New password sign-ins require an authenticator or recovery code." :
        "Add Google Authenticator or another compatible authenticator to protect sign-in."));
    const configure = element("button","button secondary",me.two_factor_enabled ? "Disable authenticator" : "Set up Google Authenticator");
    configure.onclick = me.two_factor_enabled ? disableAuthenticator : startAuthenticator;
    authenticator.append(configure);
    const qr = element("article","settings-card security-card");
    qr.append(element("h3","","Approve a QR sign-in"),element("p","","Use your phone camera to scan the QR on another device’s Sonix sign-in screen. Then compare the confirmation and approve. You can also paste the QR link below."));
    const approve = element("button","button secondary","Enter QR sign-in link");
    approve.onclick = () => {
      openModal("Approve QR sign-in", '<form class="form"><label>Scanned Sonix link<input name="url" type="url" required placeholder="https://…/?login-qr=…"></label><button class="button primary" type="submit">Review sign-in</button></form>');
      modalForm(async data => {
        const url = new URL(data.get("url"));
        const identifier = url.searchParams.get("login-qr");
        if (url.origin !== location.origin || !identifier) throw new Error("Use a QR link from this Sonix instance.");
        await showQrApproval(identifier);
      });
    };
    qr.append(approve);
    page.append(authenticator,qr);
  } else if (section === "Audio and video") {
    const label = element("label","settings-check","Play microphone and headphone feedback tones");
    const toggle = element("input");
    toggle.type = "checkbox";
    toggle.checked = localStorage.getItem("sonix-call-sounds") !== "off";
    toggle.onchange = () => localStorage.setItem("sonix-call-sounds", toggle.checked ? "on" : "off");
    label.prepend(toggle);
    page.append(label);
  } else if (section === "Theme and language") {
    const form = element("form", "form settings-card");
    form.innerHTML = `<label>Accent color<select name="theme">${options(Object.fromEntries(Object.entries(themes).map(([key,value]) => [key,value[0]])),me.theme)}</select></label>
      <label>Language<select name="language">${options(languages,me.language)}</select></label>
      <button class="button primary" type="submit">Save preferences</button>`;
    page.append(form);
    modalForm(async data => {
      await api("profile",{...me,...Object.fromEntries(data)});
      me = await api("me");
      refreshAccountUI();
      notice("Preferences saved.");
    });
  } else {
    const button = element("button","button primary","Explore Sonix Rings");
    button.onclick = () => actions.boost().catch(error => notice(error.message));
    page.append(button);
  }
}
function editProfile(page) {
  page.insertAdjacentHTML("beforeend", `<form class="form user-profile-form">
    <div class="settings-card">
      <h3>How others see you</h3>
      <div class="settings-profile-preview">
        ${bannerControls("Profile banner")}
        <div class="avatar profile-preview" aria-label="Profile picture preview"></div>
      </div>
      <label>Profile picture<input type="file" name="avatar" ${imageInput}></label>
      <label class="settings-check"><input type="checkbox" name="clearAvatar"> Remove profile picture</label>
      <label>Display name<input name="name" required maxlength="32"></label>
      <label>Bio<textarea name="bio" maxlength="240" placeholder="Tell us about yourself"></textarea></label>
      <button class="button primary" type="submit">Save profile</button>
    </div>
  </form><div class="settings-card"><h3>Sign-in</h3><p id="settings-email"></p><button class="button secondary" data-action="security">Change password</button></div>`);
  $("settings-email").textContent = me.email;
  const form = page.querySelector("form");
  form.elements.name.value = me.name;
  form.elements.bio.value = me.bio;
  setupBanner(form, me);
  avatar(form.querySelector(".profile-preview"), me.name, me.avatar);
  form.elements.avatar.onchange = async () => {
    const file = form.elements.avatar.files[0];
    try {
      const source = await fileImage(file,me.avatar);
      if (form.elements.avatar.files[0] === file) avatar(form.querySelector(".profile-preview"),me.name,source);
    }
    catch (error) { $("modal-error").textContent = error.message; }
  };
  modalForm(async data => {
    const values = Object.fromEntries(data);
    values.avatar = data.has("clearAvatar") ? "" : await fileImage(values.avatar, me.avatar);
    Object.assign(values,form._bannerState);
    await api("profile", {...me,...values});
    me = await api("me");
    refreshAccountUI();
    showUserSettings("User profile");
    notice("Profile saved.");
  });
}
function editSpace(existing) {
  openModal(existing ? "Server settings" : "Create a server", `<form class="form">
    <label>Server name<input name="name" required maxlength="50"></label>
    <div class="server-icon-preview avatar"></div>
    <label>Server logo<input type="file" name="icon" ${imageInput}></label>
    <label class="settings-check"><input type="checkbox" name="clearIcon"> Remove server logo</label>
    <label>Description<textarea name="description" maxlength="240"></textarea></label>
    ${bannerControls("Server banner")}
    <button class="button primary" type="submit">${existing ? "Save server" : "Create server"}</button>
  </form>`);
  const form = $("modal-body").querySelector("form");
  form.elements.name.value = existing?.name || "";
  form.elements.description.value = existing?.description || "";
  setupBanner(form, existing);
  const iconPreview = form.querySelector(".server-icon-preview");
  avatar(iconPreview,existing?.name || "S",existing?.icon);
  form.elements.icon.onchange = async () => {
    const file = form.elements.icon.files[0];
    try {
      const picture = await fileImage(file,existing?.icon);
      if (form.elements.icon.files[0] === file) avatar(iconPreview,existing?.name || "S",picture);
    } catch (error) { $("modal-error").textContent = error.message; }
  };
  modalForm(async data => {
    const result = await api("space", {
      space:existing?.id, name:data.get("name"), description:data.get("description"),
      icon:data.has("clearIcon") ? "" : await fileImage(data.get("icon"),existing?.icon),
      ...form._bannerState,
    });
    await reloadSpaces(result.space);
    closeModal();
    notice(existing ? "Server updated." : "Server created.");
  });
}

function tabIds() {
  if (!me) return [];
  try {
    const value = JSON.parse(localStorage.getItem("sonix-tabs:" + me.id) || "null");
    return Array.isArray(value) ? value.filter(id => spaces.some(space => space.id === id)) : [];
  } catch { return []; }
}
function saveTabs(ids) {
  try { localStorage.setItem("sonix-tabs:" + me.id, JSON.stringify(ids)); } catch {}
}
function renderDesktopTabs() {
  const tabs = $("workspace-tabs");
  tabs.replaceChildren();
  const home = element("button", "desktop-tab", "Home");
  home.setAttribute("aria-pressed", String(currentView === "home"));
  home.onclick = showHome;
  tabs.append(home);
  for (const id of tabIds()) {
    const space = spaces.find(item => item.id === id);
    const tab = element("div", "workspace-tab");
    const button = element("button", "desktop-tab");
    if (space.icon) {
      const image = element("img","tab-server-logo");
      image.src = sonixResourceUrl(space.icon);
      image.alt = "";
      button.append(image);
    }
    button.append(element("span","",space.name));
    button.title = space.name;
    button.setAttribute("aria-pressed", String(currentView === "chat" && active.id === space.id));
    button.onclick = () => selectSpace(space.id);
    const close = element("button", "tab-close");
    close.innerHTML = svg("close");
    close.setAttribute("aria-label", "Close " + space.name + " tab");
    close.onclick = () => {
      saveTabs(tabIds().filter(item => item !== id));
      if (currentView === "chat" && active.id === id) showHome();
      else renderDesktopTabs();
    };
    tab.append(button, close);
    tabs.append(tab);
  }
}
function newTab() {
  openModal("Open a workspace tab", '<div id="tab-picker"></div>');
  const list = $("tab-picker");
  for (const space of spaces) {
    const button = element("button", "button secondary full picker-item", space.name);
    button.onclick = () => { closeModal(); selectSpace(space.id); };
    list.append(button);
  }
}
function createCommunity() {
  openModal("Create community", '<div class="hub-tabs"><button class="button primary" id="blank-community">Create a blank server</button><button class="button secondary" data-action="import">Import Discord template</button></div>');
  $("blank-community").onclick = () => editSpace();
}
function setView(view) {
  if (view !== "chat") {
    if (currentView === "chat") drafts.set(draftKey(), $("draft").value);
    chatGeneration++;
  }
  currentView = view;
  renderDesktopTabs();
  document.querySelector(".layout").dataset.view = view;
  $("hub").hidden = view === "chat";
  document.querySelector(".workspace").hidden = view !== "chat";
  document.querySelector(".layout").classList.remove("show-nav");
  for (const action of ["search", "details"]) {
    document.querySelector('.topbar [data-action="' + action + '"]').hidden = view !== "chat";
  }
  if (view !== "chat") {
    $("header-channel").textContent = view === "home" ? "Home" : "Discovery";
    $("topic").textContent = view === "home" ? "Your Sonix workspace" : "Servers, apps, and bots";
    $("hub").scrollTop = 0;
  }
}
function hubCard(icon, title, description, buttonText, handler) {
  const card = element("article", "hub-card");
  const badge = element("span", "quick-icon violet");
  badge.innerHTML = svg(icon);
  const button = element("button", "button secondary", buttonText);
  button.onclick = handler;
  card.append(badge, element("h2", "", title), element("p", "", description), button);
  return card;
}
function hubGrid(...cards) {
  const grid = element("div", "hub-grid");
  grid.append(...cards);
  return grid;
}
function showHome() {
  setView("home");
  const hub = $("hub");
  const shell = element("div", "home-shell");
  const main = element("div", "home-content");
  const cards = hubGrid(
    hubCard("compass", "Explore servers", "Find communities and open the official Sonix server.", "Explore servers", actions.discover),
    hubCard("grid", "Explore apps & bots", "Find tools and slash commands for your server.", "Explore apps", () => showDiscovery("apps")),
    hubCard("plus", "Create community", "Start from scratch or bring a Discord server template.", "Create or import", actions.create),
  );
  cards.classList.add("home-shortcuts");
  const heading = element("div", "directory-toolbar");
  const filter = element("input", "directory-search");
  filter.type = "search";
  filter.placeholder = "Filter your servers";
  filter.setAttribute("aria-label", "Filter your servers");
  heading.append(element("h1", "", "Your servers"), filter);
  const directory = hubGrid();
  directory.classList.add("community-grid");
  const draw = () => {
    const matching = spaces.filter(space => space.name.toLowerCase().includes(filter.value.trim().toLowerCase()));
    directory.replaceChildren(...matching.map(communityCard));
    if (!matching.length) directory.append(element("p", "empty", "No matching servers."));
  };
  filter.oninput = draw;
  draw();
  main.append(cards, heading, directory);
  shell.append(main);
  hub.replaceChildren(shell);
}
function communityCard(space) {
  const card = element("article", "hub-card community-card");
  const cover = element("div", "community-cover");
  if (isOfficial(space)) cover.classList.add("official-cover");
  if (space.banner) {
    cover.style.backgroundImage = 'url("' + sonixResourceUrl(space.banner) + '")';
    cover.style.backgroundPosition = space.banner_source ? "center" : bannerStyle(space.banner_position, space.banner_horizontal);
  }
  const button = element("button", "button secondary", "Open server");
  button.onclick = () => selectSpace(space.id);
  const content = element("div", "community-body");
  const image = element("div", "avatar");
  avatar(image, space.name, space.icon || (isOfficial(space) ? "/assets/sonix.svg" : ""));
  content.append(image, element("h2", "", space.name));
  if (isOfficial(space)) content.append(element("small", "verified-label", "✓ Verified community"));
  if (space.owner === me?.id) content.append(element("span", "owner-rank", "Owner"));
  content.append(element("p", "", space.description || "Open this server’s channels."), button);
  card.append(cover, content);
  return card;
}
function showDiscovery(category) {
  discoveryCategory = category;
  setView("discovery");
  const shell = element("div", "discovery-shell");
  const tabs = element("nav", "discovery-nav");
  tabs.setAttribute("aria-label", "Discovery categories");
  tabs.append(element("h1", "", "Discovery"));
  for (const [name, label] of [["servers","Communities"],["apps","Apps"],["bots","Bots"]]) {
    const button = element("button", "button secondary", label);
    button.setAttribute("aria-pressed", String(category === name));
    button.onclick = () => {
      showDiscovery(name);
      $("hub").querySelector('.discovery-nav [aria-pressed="true"]').focus();
    };
    tabs.append(button);
  }
  const main = element("div", "discovery-content");
  const header = element("div", "discovery-intro");
  const titles = {servers:"Find your community",apps:"Apps for your workspace",bots:"Find a bot for your server"};
  const filter = element("input", "directory-search");
  filter.type = "search";
  filter.placeholder = "Search " + (category === "servers" ? "communities" : category);
  filter.setAttribute("aria-label", filter.placeholder);
  const toolbar = element("div", "catalog-toolbar");
  const chips = element("div", "catalog-chips");
  toolbar.append(chips, filter);
  const exit = element("button", "icon-button");
  exit.innerHTML = svg("close");
  exit.setAttribute("aria-label", "Close Discovery");
  exit.onclick = showHome;
  toolbar.append(exit);
  header.append(element("h2", "", titles[category]));
  if (category === "servers") {
    const verified = element("div", "verified-communities");
    verified.append(element("strong", "", "Verified communities"));
    for (const space of spaces.filter(isOfficial)) {
      const link = element("button", "button secondary", space.name);
      link.onclick = () => selectSpace(space.id);
      verified.append(link);
    }
    header.append(verified);
  } else if (category === "bots") {
    const builder = element("button", "button secondary", "Build with Shadow Bot");
    builder.onclick = () => actions.shadow().catch(error => notice(error.message));
    header.append(builder);
  }
  const directory = hubGrid();
  directory.classList.add(category === "servers" ? "community-grid" : "catalog-grid");
  const descriptions = {
    Pulse:["Tools","Check if the bot is responding."], Welcome:["Tools","Greet new members."],
    Quest:["Entertainment","Get a community challenge."], Focus:["Productivity","Start a focus session."],
    Rules:["Tools","Share basic community rules."], Dice:["Entertainment","Roll a six-sided die."],
    Coin:["Entertainment","Flip a coin."], Break:["Productivity","Take a short screen break."],
    Icebreaker:["Entertainment","Ask a conversation starter."], Studio:["Entertainment","Get a creative prompt."],
    Spotlight:["Entertainment","Invite people to share their work."], Guide:["Tools","Find installed commands."],
    "Eight Ball":["Entertainment","Get an answer to a yes-or-no question."], "Number Draw":["Entertainment","Draw a number from 1 to 100."],
    Party:["Entertainment","Get a game night check-in."], Gratitude:["Entertainment","Share something that made your day better."],
    Standup:["Productivity","Get a daily standup prompt."], Retro:["Productivity","Run a quick team retrospective."],
    Checklist:["Productivity","Get a checklist for posting an event."], Safety:["Tools","Share an account safety reminder."],
  };
  const openChannelType = type => {
    const match = records(active).find(item => item.type === type);
    if (match) selectSpace(active.id, match.id);
    else if (active.owner === me.id) manageChannels();
    else notice("Open a server with a " + channelTypes[type].toLowerCase() + " channel first.");
  };
  const apps = [
    ["Discord Import","Tools","upload","Bring channels and categories from a Discord template.","Open import",actions.import],
    ["Message Search","Productivity","search","Find recent messages in a text channel.","Open search",async () => {
      const textChannel = records(active).find(item => item.id === channel && item.type === "text") ||
        records(active).find(item => item.type === "text");
      if (!textChannel) return notice("Open a server with a text channel first.");
      selectSpace(active.id, textChannel.id);
      try { await refreshMessages(); actions.search(); } catch (error) { notice(error.message); }
    }],
    ["Polls","Productivity","poll","Publish a question and collect votes in a poll channel.","Open polls",() => openChannelType("poll")],
    ["Voice Rooms","Tools","sound","Talk, turn on a camera, or share your screen.","Open voice",() => openChannelType("voice")],
    ["Community Emoji","Entertainment","smile","Upload custom emoji for your server.","Manage emoji",() => serverSettings("Emoji").catch(error => notice(error.message))],
    ["Group Chat","Tools","people","Start a private conversation with accepted friends.","Open friends",() => showFriends().catch(error => notice(error.message))],
    ["Invite Manager","Tools","link","Create and revoke free server invite links.","Manage invites",() => serverSettings("Invites").catch(error => notice(error.message))],
    ["Shadow Bot","Productivity","zap","Build a custom slash command for your community.","Open builder",() => actions.shadow().catch(error => notice(error.message))],
  ];
  let entries;
  if (category === "servers") entries = spaces.filter(isOfficial).map(space => [space.name, "Official", () => communityCard(space)]);
  else if (category === "apps") entries = apps.map(([name,kind,icon,description,label,action],index) => [
    name, kind, () => catalogCard(icon,name,kind,description,label,action,index),
  ]);
  else entries = Object.entries(botCommands).map(([name, command],index) => [
    name + " /" + command, descriptions[name][0], () => catalogCard("zap",name,descriptions[name][0],
      "/" + command + " · " + descriptions[name][1],"Add to server",() => installFromDiscovery(name),index),
  ]);
  let selectedKind = "All";
  const kinds = category === "servers" ? ["All", "Official"] : ["All", "Entertainment", "Productivity", "Tools"];
  const draw = () => {
    const matches = entries.filter(([name, kind]) => (selectedKind === "All" || kind === selectedKind) &&
      name.toLowerCase().includes(filter.value.trim().toLowerCase()));
    directory.replaceChildren(...matches.map(([, , render]) => render()));
    if (!matches.length) directory.append(element("p", "empty", "No matching results."));
  };
  for (const kind of kinds) {
    const chip = element("button", "button secondary", kind);
    chip.setAttribute("aria-pressed", String(kind === selectedKind));
    chip.onclick = () => {
      selectedKind = kind;
      for (const child of chips.children) child.setAttribute("aria-pressed", String(child === chip));
      draw();
    };
    chips.append(chip);
  }
  filter.oninput = draw;
  draw();
  main.append(toolbar, header, directory);
  shell.append(tabs, main);
  $("hub").replaceChildren(shell);
}
function catalogCard(icon, title, kind, description, label, action, index) {
  const card = element("article", "hub-card catalog-card");
  const cover = element("div", "catalog-cover");
  cover.dataset.color = index % 6;
  cover.innerHTML = svg(icon);
  const body = element("div", "community-body");
  const button = element("button", "button secondary", label);
  button.onclick = action;
  body.append(element("h2", "", title), element("small", "", kind), element("p", "", description), button);
  card.append(cover, body);
  return card;
}
function installFromDiscovery(name) {
  const owned = spaces.filter(space => space.owner === me.id);
  if (!owned.length) {
    openModal("Add " + name, '<p>Create a server to install this bot.</p><button class="button primary" data-action="create">Create server</button>');
    return;
  }
  openModal("Add " + name, '<form class="form"><label>Server<select name="space" required></select></label><button class="button primary" type="submit">Install bot</button></form>');
  const select = $("modal-body").querySelector("select");
  for (const space of owned) {
    const option = element("option", "", space.name);
    option.value = space.id;
    select.append(option);
  }
  modalForm(async data => {
    const id = data.get("space");
    await api("bot", {space:id, bot:name, enabled:true});
    spaces = mergeSpaces(await api("spaces"));
    active = spaces.find(space => space.id === active.id) || community;
    closeModal();
    notice(name + " installed. Type /" + botCommands[name] + " in a channel to use it.");
  });
}

async function serverSettings(section) {
  const space = active;
  const data = await api("server-data?space=" + encodeURIComponent(space.id));
  const owner = space.owner === me.id;
  const permissions = data.permissions;
  const available = ["Profile", "Members"];
  if (!space.group_chat) {
    for (const [name, allowed] of [
      ["Channels", permissions.includes("channels")], ["Invites", permissions.includes("invites")],
      ["Roles", owner], ["Emoji", permissions.includes("emoji")], ["Apps & bots", permissions.includes("apps")],
      ["Sonix Rings", true], ["Protection", owner], ["Action logs", permissions.includes("moderate")],
      ["Banned members", permissions.includes("moderate")],
    ]) if (allowed) available.push(name);
  }
  if (!available.includes(section)) section = "Profile";
  openModal(space.name, '<div class="settings-shell"><nav id="settings-nav" aria-label="Server settings"></nav><section id="settings-page"></section></div>');
  $("modal").classList.add("wide-modal");
  const page = $("settings-page");
  page.append(element("h3", "", section));
  for (const name of available) {
    const button = element("button", "button secondary", name);
    button.setAttribute("aria-pressed", String(name === section));
    button.onclick = () => serverSettings(name).catch(error => notice(error.message));
    $("settings-nav").append(button);
  }
  const submit = async (operation, fields = {}) => {
    try {
      await api("server-admin", {space:space.id,operation,...fields});
      await serverSettings(section);
    } catch (error) { $("modal-error").textContent = error.message; }
  };
  const button = (label, click) => {
    const control = element("button", "button secondary", label);
    control.onclick = click;
    return control;
  };
  const row = (label, ...controls) => {
    const container = element("div", "modal-row");
    container.append(element("span", "", label), ...controls);
    page.append(container);
  };
  const form = (markup, handler) => {
    const control = element("form", "form settings-form");
    control.innerHTML = markup;
    control.onsubmit = async event => {
      event.preventDefault();
      const submitButton = control.querySelector('[type="submit"]');
      if (submitButton.disabled) return;
      submitButton.disabled = true;
      try { await handler(new FormData(control)); }
      catch (error) { $("modal-error").textContent = error.message; }
      finally { submitButton.disabled = false; }
    };
    page.append(control);
    return control;
  };
  if (section === "Profile") {
    const preview = element("div", "profile-banner");
    if (space.banner) {
      preview.style.backgroundImage = 'url("' + space.banner + '")';
      preview.style.backgroundPosition = space.banner_source ? "center" : bannerStyle(space.banner_position, space.banner_horizontal);
    } else if (isOfficial(space)) preview.classList.add("official-cover");
    const serverIcon = element("div","avatar server-icon-preview");
    avatar(serverIcon,space.name,space.icon || (isOfficial(space) ? "/assets/sonix.svg" : ""));
    page.append(preview,serverIcon,element("p", "", space.description || "No description yet."));
    if (owner && !space.group_chat) page.append(button("Edit server profile", () => editSpace(space)));
    if (owner && data.members.some(member => member.id !== me.id)) {
      page.append(button("Transfer ownership", () => {
        openModal("Transfer ownership", '<p>The selected member will receive full control of this server.</p><form class="form"><label>New owner<select name="account" required></select></label><button class="button primary" type="submit">Transfer ownership</button></form>');
        const select = $("modal-body").querySelector("select");
        for (const member of data.members.filter(member => member.id !== me.id)) {
          const option = element("option","",member.name);
          option.value = member.id;
          select.append(option);
        }
        modalForm(async values => {
          await api("server-admin",{space:space.id,operation:"transfer",account:values.get("account")});
          await reloadSpaces(space.id);
          closeModal();
          notice("Server ownership transferred.");
        });
      }));
    }
  } else if (section === "Channels") page.append(button("Manage channels", manageChannels));
  else if (section === "Apps & bots") page.append(button("Manage installed bots", actions.apps), button("Discover apps & bots", () => { closeModal(); showDiscovery("apps"); }));
  else if (section === "Sonix Rings") page.append(button("Open Sonix Rings", () => actions.boost().catch(error => notice(error.message))));
  else if (section === "Protection") {
    page.append(element("p", "", "Invite-only protection blocks joins using the server ID. Active invite links still work."));
    page.append(button(space.protected ? "Disable invite-only protection" : "Enable invite-only protection", async () => {
      try {
        await api("server-admin", {space:space.id,operation:"protection",enabled:!space.protected});
        space.protected = !space.protected;
        await serverSettings(section);
      } catch (error) { $("modal-error").textContent = error.message; }
    }));
  } else if (section === "Invites") {
    page.append(element("p", "", "Invite links are free and expire after seven days."));
    page.append(button("Create invite link", () => submit("invite")));
    for (const invite of data.invites || []) {
      const link = new URL((SONIX_BASE_PATH || "") + "/", location.origin);
      link.searchParams.set("invite", invite.code);
      const input = element("input", "invite-link");
      input.value = link.href;
      input.readOnly = true;
      input.setAttribute("aria-label", "Invite link");
      input.onfocus = () => input.select();
      const copy = button("Copy link", async () => {
        try { await navigator.clipboard.writeText(link.href); notice("Invite link copied."); }
        catch { input.focus(); }
      });
      const container = element("div", "invite-row");
      container.append(input, copy, button("Revoke", () => submit("revoke",{code:invite.code})));
      page.append(container);
    }
  } else if (section === "Members") {
    if (space.group_chat && owner) page.append(button("Add friends to group", async () => {
      try { groupForm(await api("friends"),space,data.members); }
      catch (error) { $("modal-error").textContent = error.message; }
    }));
    if (!data.members.length) page.append(element("p", "", "No member list is available for this server."));
    for (const member of data.members) {
      const controls = [];
      if (!space.group_chat && permissions.includes("moderate") && member.id !== me.id && member.id !== space.owner) {
        controls.push(button("Ban", () => {
          if (window.confirm("Ban " + member.name + " from this server?")) submit("ban",{account:member.id});
        }));
      }
      if (member.id === data.owner) controls.unshift(element("span", "owner-rank", "Owner"));
      const memberName = element("button", "profile-clickable", member.name);
      memberName.onclick = () => showMemberProfile(member.id).catch(error => notice(error.message));
      row(memberName, ...controls);
    }
  } else if (section === "Banned members") {
    if (!data.bans?.length) page.append(element("p", "", "No banned members."));
    for (const member of data.bans || []) row(member.name, button("Unban", () => submit("unban",{account:member.id})));
  } else if (section === "Action logs") {
    if (!data.logs?.length) page.append(element("p", "", "No moderation or settings actions yet."));
    for (const entry of data.logs || []) row((entry.name || "Member") + " · " + entry.action, element("small", "", new Date(entry.created).toLocaleString()));
  } else if (section === "Emoji") {
    form(`<label>Emoji name<input name="name" required maxlength="24" pattern="[a-z0-9_-]{1,24}"></label><label>Image under 250 KB<input type="file" name="image" ${imageInput} required></label><button class="button primary" type="submit">Upload emoji</button>`, async values =>
      submit("emoji",{name:values.get("name"),image:await fileImage(values.get("image"))}));
    for (const item of data.emojis) {
      const image = element("img", "inline-emoji");
      image.alt = item.name;
      image.src = sonixResourceUrl(item.image);
      row(":" + item.name + ":", image, button("Remove", () => submit("remove-emoji",{name:item.name})));
    }
  } else if (section === "Roles") {
    const ownerName = data.members.find(member => member.id === data.owner)?.name;
    if (ownerName) row("Owner · " + ownerName, element("span", "owner-rank", "Full permissions"));
    const labels = {channels:"Manage channels",invites:"Create invites",emoji:"Manage emoji",moderate:"Moderate members",apps:"Manage apps"};
    form('<label>Role name<input name="name" required maxlength="40"></label>' +
      Object.entries(labels).map(([id,label]) => `<label class="check-row"><input type="checkbox" name="permission" value="${id}">${label}</label>`).join("") +
      '<button class="button primary" type="submit">Create role</button>',
      values => submit("role",{name:values.get("name"),permissions:values.getAll("permission")}));
    for (const role of data.roles || []) {
      row(role.name + " · " + (role.permissions.map(id => labels[id]).join(", ") || "No extra permissions"));
      const select = element("select");
      select.setAttribute("aria-label", "Member for " + role.name);
      for (const member of data.members.filter(item => item.id !== me.id)) {
        const choice = element("option", "", member.name + (role.members.includes(member.id) ? " · assigned" : ""));
        choice.value = member.id;
        select.append(choice);
      }
      if (select.options.length) row("Membership", select,
        button("Assign", () => submit("assign",{role:role.id,account:select.value})),
        button("Remove", () => submit("unassign",{role:role.id,account:select.value})));
    }
  }
}
function groupForm(friends, space, members = []) {
    openModal(space ? "Add people to group" : "Create group chat", `<form class="form">
      ${space ? "" : '<label>Group name<input name="name" maxlength="50" required></label>'}
      <div id="group-friends"></div><button class="button primary" type="submit">${space ? "Add people" : "Create group"}</button></form>`);
    const accepted = friends.filter(item => item.accepted && !members.some(member => member.id === item.id));
    if (!accepted.length) $("group-friends").append(element("p", "", "Add a friend and wait for them to accept first."));
    for (const friend of accepted) {
      const label = element("label", "check-row");
      const choice = element("input");
      choice.type = "checkbox";
      choice.name = "account";
      choice.value = friend.id;
      label.append(choice, friend.name);
      $("group-friends").append(label);
    }
    modalForm(async data => {
      const result = await api("group",{space:space?.id,name:data.get("name"),accounts:data.getAll("account")});
      await reloadSpaces(result.space);
      closeModal();
    });
  }
async function showFriends() {
  const [friends, joined] = await Promise.all([api("friends"),api("spaces")]);
  spaces = mergeSpaces(joined);
  active = spaces.find(space => space.id === active.id) || community;
  openModal("Friends", '<div class="friend-tools"><input id="friend-filter" type="search" aria-label="Search friends" placeholder="Search friends"><button class="icon-button" id="create-group" title="Create group chat" data-icon="grid"></button><button class="icon-button" id="add-friend" title="Add friend" data-icon="people"></button></div><div id="friend-list"></div>');
  $("add-friend").onclick = () => {
    openModal("Add friend", '<form class="form"><label>Friend’s Sonix email<input name="email" type="email" required></label><button class="button primary" type="submit">Send friend request</button></form>');
    modalForm(async data => {
      await api("friend",{email:data.get("email")});
      notice("Friend request sent.");
      await showFriends();
    });
  };
  $("create-group").onclick = () => groupForm(friends);
  const draw = () => {
    const list = $("friend-list");
    const query = $("friend-filter").value.trim().toLowerCase();
    const results = friends.filter(item => item.name.toLowerCase().includes(query));
    list.replaceChildren();
    if (!results.length) list.append(element("p", "", "No matching friends or requests."));
    for (const friend of results) {
      const row = element("div", "modal-row");
      const pic = element("div", "avatar");
      avatar(pic,friend.name,friend.avatar);
      pic.classList.add("profile-clickable");
      pic.onclick = () => showMemberProfile(friend.id).catch(error => notice(error.message));
      row.append(pic, element("strong", "friend-name", friend.name));
      if (friend.accepted) row.append(element("small", "", "Friend"));
      else if (friend.sender === me.id) row.append(element("small", "", "Request sent"));
      else {
        const accept = element("button", "button primary", "Accept");
        accept.onclick = async () => {
          try { await api("friend",{account:friend.id,accept:true}); await showFriends(); }
          catch (error) { $("modal-error").textContent = error.message; }
        };
        row.append(accept);
      }
      list.append(row);
    }
    for (const space of spaces.filter(item => item.group_chat && item.name.toLowerCase().includes(query))) {
      const button = element("button", "button secondary full picker-item", "Open group · " + space.name);
      button.onclick = () => { closeModal(); selectSpace(space.id); };
      list.append(button);
    }
  };
  $("friend-filter").oninput = draw;
  draw();
}

const actions = {
  home: showHome,
  discover: () => showDiscovery("servers"),
  nav: () => document.querySelector(".layout").classList.toggle("show-nav"),
  details: () => document.querySelector(".workspace").classList.toggle(matchMedia("(max-width:900px)").matches ? "show-details" : "hide-details"),
  close: closeModal,
  login: () => auth(false),
  qrlogin: showQrLogin,
  register: () => auth(true),
  profile: () => { if (requireAccount()) showProfileMenu(); },
  security: () => {
    openModal("Account security", `<p>Changing your password signs out your other sessions.</p><form class="form">
      <label>Current password<input type="password" name="current" required autocomplete="current-password"></label>
      <label>New password<input type="password" name="password" required minlength="12" maxlength="256" autocomplete="new-password"></label>
      ${me.two_factor_enabled ? factorInput() : ""}
      <button class="button primary" type="submit">Change password</button></form>`);
    modalForm(async data => {
      await api("password", Object.fromEntries(data));
      closeModal();
      notice("Password changed. Other sessions were signed out.");
    });
  },
  logout: async () => {
    await api("logout", {});
    me = null;
    leaveVoice();
    spaces = [...officialSpaces];
    active = community;
    closeModal();
    auth(false);
    notice("Signed out.");
  },
  create: createCommunity,
  newtab: newTab,
  friends: showFriends,
  channels: manageChannels,
  server: () => serverSettings("Profile"),
  join: () => {
    if (!requireAccount()) return;
    openModal("Join a server", '<form class="form"><label>Invite code or link<input name="invite" required></label><button class="button primary" type="submit">Join server</button></form>');
    $("modal-body").querySelector("input").value = invite || "";
    modalForm(async data => {
      let code = data.get("invite").trim();
      if (code.includes("://")) code = new URL(code).searchParams.get("invite") || "";
      const result = await api("join", {space:code});
      await reloadSpaces(result.space);
      invite = null;
      history.replaceState(null, "", location.pathname);
      closeModal();
      notice("Server joined.");
    });
  },
  invite: () => serverSettings("Invites"),
  apps: () => {
    openModal("App Directory", '<p>Install built-in bots on servers you own, or use commands from apps already installed.</p>');
    const space = active;
    for (const [name, command] of Object.entries(botCommands)) {
      const row = element("div", "modal-row");
      const label = element("div");
      label.append(element("strong", "", name), element("small", "", "/" + command));
      row.append(label);
      const installed = space.bots.includes(name);
      if (space.owner === me?.id || space.permissions?.includes("apps")) {
        const button = element("button", "button secondary", installed ? "Remove" : "Install");
        button.onclick = async () => {
          button.disabled = true;
          try {
            await api("bot", {space:space.id, bot:name, enabled:!installed});
            await reloadSpaces(space.id);
            actions.apps();
          } catch (error) { $("modal-error").textContent = error.message; button.disabled = false; }
        };
        row.append(button);
      }
      if (installed) {
        const button = element("button", "button secondary", "Use");
        button.onclick = () => {
          $("draft").value = "/" + command;
          closeModal();
          $("draft").focus();
        };
        row.append(button);
      }
      $("modal-body").append(row);
    }
  },
  import: () => {
    openModal("Import Discord template", '<form class="form"><label>Discord template link or code<input name="code" placeholder="https://discord.new/…" required></label><button class="button primary" type="submit">Import server</button></form>');
    modalForm(async form => {
      let code = form.get("code").trim();
      if (code.includes("://")) {
        const url = new URL(code);
        const match = url.hostname === "discord.new" ? url.pathname.match(/^\/([^/]+)\/?$/) :
          ["discord.com","discordapp.com"].includes(url.hostname) ? url.pathname.match(/^\/template\/([^/]+)\/?$/) : null;
        if (!match) throw new Error("Use a Discord server template link, such as https://discord.new/…");
        code = match[1];
      }
      const result = await api("discord-template", {code});
      await reloadSpaces(result.space);
      closeModal();
      notice("Discord template imported.");
    });
  },
  boost: async () => {
    openModal("Sonix Rings", '<article class="hub-card"><h2>Shadow Bot</h2><p>Design a custom slash-command bot with AI assistance.</p><strong>US$20</strong><p>Checkout is unavailable. Try the builder preview below.</p><button class="button secondary" data-action="shadow">Open bot builder</button></article><div id="rings-prices" class="form"><p>Loading currency estimates…</p></div>');
    const output = $("rings-prices");
    try {
      const prices = await api("rings-prices");
      if (!output.isConnected) return;
      if (Object.keys(prices).length <= 1) {
        output.replaceChildren(element("p", "", "Local currency estimates are unavailable right now."));
        return;
      }
      const select = element("select");
      const label = element("label", "", "Estimate in another currency");
      const names = new Intl.DisplayNames([me.language], {type:"currency"});
      for (const code of Object.keys(prices).sort()) {
        const option = element("option", "", code + " · " + names.of(code));
        option.value = code;
        select.append(option);
      }
      select.value = "USD";
      const estimate = element("p");
      select.onchange = () => {
        estimate.textContent = "Approx. " + new Intl.NumberFormat(me.language, {
          style:"currency", currency:select.value,
        }).format(prices[select.value]);
      };
      select.onchange();
      const credit = element("a", "rate-credit", "Rates By Exchange Rate API");
      credit.href = "https://www.exchangerate-api.com";
      credit.target = "_blank";
      credit.rel = "noopener noreferrer";
      label.append(select);
      output.replaceChildren(label, estimate, credit);
    } catch {
      if (output.isConnected) output.replaceChildren(element("p", "", "Local currency estimates are unavailable right now."));
    }
  },
  shadow: async () => {
    const owned = spaces.filter(space => space.owner === me.id);
    if (!owned.length) {
      openModal("Shadow Bot", '<p>Create a server to install custom bot commands.</p><button class="button primary" data-action="create">Create server</button>');
      return;
    }
    const config = await api("shadow");
    openModal("Shadow Bot", `<form class="form">
      <label>Server<select name="space" required></select></label>
      <label>Bot name<input name="name" maxlength="40" required></label>
      <label>What should your bot do?<textarea name="purpose" maxlength="1000"></textarea></label>
      ${config.generation ? '<button class="button secondary" id="generate-bot" type="button">Generate with AI</button>' : '<p>AI generation needs a configured model. You can write a command and reply below.</p>'}
      <label>Slash command (without /)<input name="command" required maxlength="24" pattern="[a-z][a-z0-9-]{0,23}"></label>
      <label>Bot reply<textarea name="reply" maxlength="600" required></textarea></label>
      <button class="button primary" type="submit">Install command</button>
    </form>`);
    const form = $("modal-body").querySelector("form");
    for (const space of owned) {
      const option = element("option", "", space.name);
      option.value = space.id;
      form.elements.space.append(option);
    }
    if (config.generation) $("generate-bot").onclick = async event => {
      const button = event.currentTarget;
      button.disabled = true;
      $("modal-error").textContent = "";
      try {
        const values = Object.fromEntries(new FormData(form));
        const result = await api("shadow-generate", values);
        form.elements.command.value = result.command;
        form.elements.reply.value = result.reply;
      } catch (error) { $("modal-error").textContent = error.message; }
      finally { button.disabled = false; }
    };
    modalForm(async data => {
      await api("shadow-install", Object.fromEntries(data));
      closeModal();
      notice("Installed. Type /" + data.get("command") + " in your server to use it.");
    });
  },
  emoji: () => {
    openModal("Add emoji", "");
    for (const item of currentEmojis) {
      const button = element("button", "button secondary");
      const image = element("img", "inline-emoji");
      image.src = sonixResourceUrl(item.image);
      image.alt = item.name;
      button.append(image);
      button.onclick = () => {
        const text = ":" + item.name + ":";
        if ($("draft").value.length + text.length <= $("draft").maxLength) $("draft").value += text;
        closeModal();
        $("draft").focus();
      };
      $("modal-body").append(button, " ");
    }
    for (const emoji of ["🙂","👋","❤️","🔥","⚡","🎮","🎉","👀","👍","✨"]) {
      const button = element("button", "button secondary", emoji);
      button.onclick = () => {
        if ($("draft").value.length + emoji.length <= $("draft").maxLength) $("draft").value += emoji;
        closeModal();
        $("draft").focus();
      };
      $("modal-body").append(button, " ");
    }
  },
  search: () => {
    openModal("Search recent messages", '<form class="form"><label>Search this channel<input type="search" name="query" autocomplete="off"></label></form><div id="search-results" class="messages"></div>');
    const form = $("modal-body").querySelector("form");
    form.onsubmit = event => event.preventDefault();
    form.elements.query.oninput = event => {
      const query = event.target.value.trim().toLowerCase();
      if (query) renderMessages($("search-results"), timeline.filter(message => message.body.toLowerCase().includes(query)));
      else $("search-results").replaceChildren();
    };
  },
};

document.addEventListener("click", async event => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  try { await actions[button.dataset.action](); }
  catch (error) {
    if ($("modal").open) $("modal-error").textContent = error.message;
    else notice(error.message);
  }
});
$("composer").onsubmit = async event => {
  event.preventDefault();
  const draft = $("draft");
  const body = draft.value.trim();
  if (!body || !requireAccount()) return;
  const submit = event.currentTarget.querySelector(".send");
  if (submit.disabled) return;
  submit.disabled = true;
  try {
    const target = draftKey();
    await api("message", {space:active.id, channel, body});
    if (currentView !== "chat" || draftKey() !== target) {
      if (drafts.get(target)?.trim() === body) drafts.delete(target);
      return;
    }
    if (draft.value.trim() === body) draft.value = "";
    chatGeneration++;
    messageEtags.clear();
    await refreshMessages(true);
  } catch (error) { notice(error.message); }
  finally { submit.disabled = false; }
};

paintIcons();
bindCallControls();
async function restoreSession() {
  try { await enterWorkspace(await api("me")); }
  catch {
    $("auth-title").textContent = "Connection unavailable";
    $("auth-error").textContent = "Sonix could not reach the server. Your saved sign-in stays on this device.";
    const retry = element("button","button primary","Try again");
    retry.onclick = restoreSession;
    $("auth-form").replaceChildren(retry);
  }
}
restoreSession();
async function pollChat() {
  try {
    if (me && currentView === "chat" && !document.hidden && !$("modal").open && !$("banner-editor").open) {
      await refreshMessages();
    }
  } catch {}
  setTimeout(pollChat,2500);
}
setTimeout(pollChat,2500);
if ("serviceWorker" in navigator) navigator.serviceWorker.register(SONIX_BASE_PATH + "/sw.js").catch(() => {});
