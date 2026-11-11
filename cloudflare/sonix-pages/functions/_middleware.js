const PAGE_ORIGINS = new Set([
  "https://sonixdeveloper.github.io",
  "https://sonixapp-community.sonix-proxy.workers.dev",
]);
const SESSION_AGE = 60 * 60 * 24 * 30;
const PUBLIC = {
  overdrive: {
    name: "Sonix Official Server",
    description: "A home for creators, gamers, and everyone in between.",
    channels: ["general", "announcements", "introductions", "off-topic", "clips", "game-night"],
  },
  "sonix-developers": {
    name: "Sonix Developers",
    description: "Build apps, bots, and integrations with the Sonix community.",
    channels: ["general", "announcements", "app-development", "bot-development", "feedback"],
  },
};

const encoder = new TextEncoder();
const json = (value, status = 200, extra = {}) => new Response(JSON.stringify(value), {
  status,
  headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...extra },
});
const fail = (message, status = 400) => json({ error: message }, status);
const randomId = (size = 18) => {
  const bytes = crypto.getRandomValues(new Uint8Array(size));
  return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
};
const sha256 = async text => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(text))))
  .map(value => value.toString(16).padStart(2, "0")).join("");
const clean = (value, max = 100) => typeof value === "string" ? value.trim().slice(0, max) : "";
const parse = (value, fallback) => { try { return JSON.parse(value); } catch { return fallback; } };
const cookie = (request, name) => (request.headers.get("Cookie") || "").split(";").map(v => v.trim())
  .find(v => v.startsWith(name + "="))?.slice(name.length + 1) || "";
const withSession = (response, token) => {
  const headers = new Headers(response.headers);
  headers.append("Set-Cookie", `sonix_session=${token}; Path=/; Max-Age=${SESSION_AGE}; HttpOnly; Secure; SameSite=None; Partitioned`);
  return new Response(response.body, { status: response.status, headers });
};
const clearSession = response => {
  const headers = new Headers(response.headers);
  headers.append("Set-Cookie", "sonix_session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=None; Partitioned");
  return new Response(response.body, { status: response.status, headers });
};

async function accountFrom(request, env) {
  const token = cookie(request, "sonix_session");
  if (!token) return null;
  return await env.DB.prepare(
    "SELECT a.* FROM sessions s JOIN accounts a ON a.id=s.account WHERE s.token_hash=? AND s.expires>?"
  ).bind(await sha256(token), Math.floor(Date.now() / 1000)).first();
}

function profile(row, privateFields = true) {
  if (!row) return null;
  const data = {
    id: row.id, name: row.name, bio: row.bio, avatar: row.avatar, banner: row.banner,
    banner_source: row.banner_source, banner_position: row.banner_position,
    banner_horizontal: row.banner_horizontal, banner_zoom: row.banner_zoom,
    theme: row.theme, language: row.language, presence: row.presence,
    status_text: row.status_text, two_factor_enabled: false,
  };
  if (privateFields) data.email = row.email;
  return data;
}

function records(space) {
  const raw = parse(space.channels, ["general"]);
  return raw.map(item => typeof item === "string"
    ? { id: item, name: item, type: "text", parent: "" }
    : { id: item.id, name: item.name, type: item.type || "text", parent: item.parent || "" });
}

async function getSpace(env, id, user) {
  const row = await env.DB.prepare("SELECT * FROM spaces WHERE id=?").bind(id).first();
  if (!row) return null;
  if (PUBLIC[id]) return row;
  if (!user) return null;
  const member = await env.DB.prepare("SELECT 1 FROM members WHERE space=? AND account=?").bind(id, user).first();
  return member ? row : null;
}

async function sessionResponse(env, user) {
  const token = randomId(32);
  await env.DB.prepare("DELETE FROM sessions WHERE expires<=?").bind(Math.floor(Date.now() / 1000)).run();
  await env.DB.prepare("INSERT INTO sessions(token_hash,account,expires) VALUES(?,?,?)")
    .bind(await sha256(token), user, Math.floor(Date.now() / 1000) + SESSION_AGE).run();
  return withSession(json({ ok: true }), token);
}

async function hashPassword(password, saltHex) {
  const salt = Uint8Array.from(saltHex.match(/.{2}/g), pair => parseInt(pair, 16));
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: 18000 }, key, 256);
  return Array.from(new Uint8Array(bits)).map(value => value.toString(16).padStart(2, "0")).join("");
}

async function api(request, env, url, user) {
  const action = url.pathname.slice("/api/".length);
  const method = request.method;
  let data = {};
  if (method === "POST") {
    try { data = await request.json(); } catch { return fail("Send valid JSON."); }
    if (!data || typeof data !== "object" || Array.isArray(data)) return fail("Send a JSON object.");
  }
  const now = Math.floor(Date.now() / 1000);

  if (method === "GET") {
    if (action === "me") return json(profile(user));
    if (action === "spaces") {
      const owned = user ? await env.DB.prepare("SELECT s.* FROM spaces s JOIN members m ON m.space=s.id WHERE m.account=? ORDER BY s.created_at")
        .bind(user.id).all() : { results: [] };
      const all = await env.DB.prepare("SELECT * FROM spaces WHERE id IN ('overdrive','sonix-developers') ORDER BY id").all();
      const list = [...(all.results || []), ...(owned.results || [])];
      const seen = new Set();
      return json(list.filter(row => !seen.has(row.id) && seen.add(row.id)).map(row => ({
        ...row, channels: records(row), bots: parse(row.bots, []),
      })));
    }
    if (action === "friends") {
      if (!user) return fail("Sign in to continue.", 401);
      const rows = await env.DB.prepare(
        "SELECT f.sender,f.recipient,f.accepted,a.id,a.name,a.avatar,a.presence,a.last_active FROM friendships f " +
        "JOIN accounts a ON a.id=CASE WHEN f.sender=? THEN f.recipient ELSE f.sender END " +
        "WHERE f.sender=? OR f.recipient=? ORDER BY a.name"
      ).bind(user.id, user.id, user.id).all();
      return json(rows.results || []);
    }
    if (action === "user-profile") {
      if (!user) return fail("Sign in to continue.", 401);
      const target = url.searchParams.get("account") || "";
      const row = await env.DB.prepare("SELECT * FROM accounts WHERE id=?").bind(target).first();
      if (!row) return fail("That profile is not available.", 404);
      const relation = await env.DB.prepare(
        "SELECT sender,accepted FROM friendships WHERE (sender=? AND recipient=?) OR (sender=? AND recipient=?)"
      ).bind(user.id, target, target, user.id).first();
      const result = profile(row, false);
      result.friendship = relation ? (relation.accepted ? "friend" : relation.sender === user.id ? "sent" : "received") : null;
      return json(result);
    }
    if (action === "server-data") {
      if (!user) return fail("Sign in to continue.", 401);
      const space = await getSpace(env, url.searchParams.get("space") || "", user.id);
      if (!space) return fail("Server unavailable.", 404);
      await env.DB.prepare("INSERT OR IGNORE INTO members(space,account) VALUES(?,?)").bind(space.id,user.id).run();
      const members = await env.DB.prepare(
        "SELECT a.id,a.name,a.avatar,a.presence,a.last_active FROM members m JOIN accounts a ON a.id=m.account WHERE m.space=? ORDER BY a.name"
      ).bind(space.id).all();
      for (const item of members.results || []) {
        if (item.presence === "invisible" || item.last_active < now - 90) item.presence = "offline";
        item.roles = [];
      }
      const count = await env.DB.prepare("SELECT COUNT(*) AS n FROM messages WHERE space=?").bind(space.id).first();
      const permissions = space.owner === user.id ? ["invites","channels","profile","moderate"] : [];
      const result = { owner: space.owner, members: members.results || [], message_count: count?.n || 0, emojis: [], permissions };
      if (space.owner === user.id) {
        const invites = await env.DB.prepare("SELECT code,expires FROM space_invites WHERE space=? AND expires>? ORDER BY expires DESC")
          .bind(space.id, now).all();
        result.invites = invites.results || [];
        result.roles = [];
      }
      return json(result);
    }
    if (action === "messages") {
      if (!user) return fail("Sign in to continue.", 401);
      const spaceId = url.searchParams.get("space") || "";
      const channel = url.searchParams.get("channel") || "";
      const space = await getSpace(env, spaceId, user.id);
      if (!space || !records(space).some(item => item.id === channel && item.type === "text")) return fail("Text channel unavailable.", 404);
      await env.DB.prepare("INSERT OR IGNORE INTO members(space,account) VALUES(?,?)").bind(spaceId,user.id).run();
      const result = await env.DB.prepare(
        "SELECT m.id,m.space,m.channel,m.author,m.body,m.created,a.id AS account_id,a.name,a.avatar FROM messages m " +
        "JOIN accounts a ON a.id=m.author WHERE m.space=? AND m.channel=? ORDER BY m.id DESC LIMIT 100"
      ).bind(spaceId, channel).all();
      const messages = (result.results || []).reverse().map(item => ({ ...item, owner_rank: Boolean(space.owner && item.author === space.owner) }));
      const etag = '"' + await sha256(JSON.stringify(messages)) + '"';
      if (request.headers.get("If-None-Match") === etag) return new Response(null, { status: 304, headers: { ETag: etag } });
      return json(messages, 200, { ETag: etag });
    }
    if (action === "polls") return json([]);
    if (action === "rings-prices") return json({ USD: 20 });
    if (action === "shadow") return json({ generation: false });
    if (action === "discover") {
      const rows = await env.DB.prepare("SELECT * FROM spaces WHERE group_chat=0 ORDER BY created_at DESC LIMIT 100").all();
      return json(rows.results || []);
    }
    return fail("Unknown action.", 404);
  }

  if (method !== "POST") return fail("Method not allowed.", 405);
  if (action === "register" || action === "login") {
    const email = clean(data.email, 254).toLowerCase();
    const password = typeof data.password === "string" ? data.password : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < (action === "register" ? 12 : 1) || password.length > 256) {
      return fail(action === "register" ? "Enter a valid email and a password of at least 12 characters." : "Enter a valid email and password.");
    }
    if (action === "register") {
      const name = clean(data.name, 32);
      if (!name) return fail("Enter a display name.");
      const id = randomId(16);
      const salt = randomId(16);
      const passwordHash = await hashPassword(password, salt);
      try {
        await env.DB.prepare("INSERT INTO accounts(id,email,salt,password_hash,name,created_at,last_active) VALUES(?,?,?,?,?,?,?)")
          .bind(id,email,salt,passwordHash,name,now,now).run();
      } catch { return fail("An account already uses this email.", 409); }
      return sessionResponse(env,id);
    }
    const row = await env.DB.prepare("SELECT * FROM accounts WHERE email=? COLLATE NOCASE").bind(email).first();
    if (!row || await hashPassword(password,row.salt) !== row.password_hash) return fail("Incorrect email or password.", 401);
    return sessionResponse(env,row.id);
  }

  if (action === "logout") {
    const token = cookie(request,"sonix_session");
    if (token) await env.DB.prepare("DELETE FROM sessions WHERE token_hash=?").bind(await sha256(token)).run();
    return clearSession(json({ ok:true }));
  }
  if (!user) return fail("Sign in to continue.", 401);

  if (action === "heartbeat") {
    await env.DB.prepare("UPDATE accounts SET last_active=? WHERE id=?").bind(now,user.id).run();
    return json({ ok:true });
  }
  if (action === "presence") {
    const presence = clean(data.presence, 16);
    if (!["online","away","busy","invisible"].includes(presence)) return fail("Choose a valid presence.");
    await env.DB.prepare("UPDATE accounts SET presence=?,status_text=?,last_active=? WHERE id=?")
      .bind(presence,clean(data.status_text,80),now,user.id).run();
    return json({ ok:true });
  }
  if (action === "profile") {
    const name = clean(data.name,32);
    const theme = ["red","purple","cyan","green"].includes(data.theme) ? data.theme : user.theme;
    const language = ["en","es","fr","de","pl","it","pt","ja"].includes(data.language) ? data.language : user.language;
    const validPosition = value => Number.isInteger(value) && value >= 0 && value <= 100 ? value : 50;
    const zoom = Number.isFinite(data.banner_zoom) && data.banner_zoom >= 1 && data.banner_zoom <= 4 ? data.banner_zoom : 1;
    if (!name) return fail("Enter a display name.");
    await env.DB.prepare("UPDATE accounts SET name=?,bio=?,avatar=?,banner=?,banner_source=?,banner_position=?,banner_horizontal=?,banner_zoom=?,theme=?,language=? WHERE id=?")
      .bind(name,clean(data.bio,240),clean(data.avatar,2_000_000),clean(data.banner,2_000_000),clean(data.banner_source,2_000_000),validPosition(data.banner_position),validPosition(data.banner_horizontal),zoom,theme,language,user.id).run();
    return json({ ok:true });
  }
  if (action === "password") {
    const current = typeof data.current === "string" ? data.current : "";
    const next = typeof data.password === "string" ? data.password : "";
    if (await hashPassword(current, user.salt) !== user.password_hash) return fail("Current password is incorrect.", 401);
    if (next.length < 12 || next.length > 256) return fail("Use a new password between 12 and 256 characters.");
    const salt = randomId(16);
    const passwordHash = await hashPassword(next, salt);
    await env.DB.prepare("UPDATE accounts SET salt=?,password_hash=? WHERE id=?").bind(salt,passwordHash,user.id).run();
    const token = cookie(request,"sonix_session");
    await env.DB.prepare("DELETE FROM sessions WHERE account=? AND token_hash<>?").bind(user.id,await sha256(token)).run();
    return json({ok:true});
  }
  if (action === "delete-account") {
    const password = typeof data.password === "string" ? data.password : "";
    if (!password || await hashPassword(password,user.salt) !== user.password_hash) return fail("Password is incorrect.",401);
    const owned = await env.DB.prepare("SELECT id,name,group_chat FROM spaces WHERE owner=?").bind(user.id).all();
    const servers = (owned.results || []).filter(row => !row.group_chat);
    if (servers.length) return fail("Transfer ownership of your servers before deleting this account.",409);
    for (const space of owned.results || []) await env.DB.prepare("DELETE FROM spaces WHERE id=?").bind(space.id).run();
    await env.DB.prepare("DELETE FROM messages WHERE author=?").bind(user.id).run();
    await env.DB.prepare("DELETE FROM members WHERE account=?").bind(user.id).run();
    await env.DB.prepare("DELETE FROM friendships WHERE sender=? OR recipient=?").bind(user.id,user.id).run();
    await env.DB.prepare("DELETE FROM accounts WHERE id=?").bind(user.id).run();
    return clearSession(json({ ok:true }));
  }
  if (action === "friend") {
    if (data.accept === true) {
      const result = await env.DB.prepare("UPDATE friendships SET accepted=1 WHERE sender=? AND recipient=? AND accepted=0")
        .bind(clean(data.account,64),user.id).run();
      if (!result.meta.changes) return fail("Friend request unavailable.",404);
      return json({ ok:true });
    }
    let target = data.account ? await env.DB.prepare("SELECT id FROM accounts WHERE id=?").bind(clean(data.account,64)).first() : null;
    if (!target && data.email) target = await env.DB.prepare("SELECT id FROM accounts WHERE email=? COLLATE NOCASE").bind(clean(data.email,254)).first();
    if (!target || target.id === user.id) return fail("That Sonix account could not be added.",404);
    const exists = await env.DB.prepare("SELECT 1 FROM friendships WHERE (sender=? AND recipient=?) OR (sender=? AND recipient=?)")
      .bind(user.id,target.id,target.id,user.id).first();
    if (exists) return fail("A friendship or request already exists.",409);
    await env.DB.prepare("INSERT INTO friendships(sender,recipient,accepted) VALUES(?,?,0)").bind(user.id,target.id).run();
    return json({ ok:true });
  }
  if (action === "group") {
    const requested = Array.isArray(data.accounts) ? data.accounts.slice(0,20) : [];
    const name = clean(data.name,50);
    if (!name || requested.length < 1) return fail("Enter a group name and select accepted friends.");
    for (const id of requested) {
      const friend = await env.DB.prepare("SELECT 1 FROM friendships WHERE accepted=1 AND ((sender=? AND recipient=?) OR (sender=? AND recipient=?))")
        .bind(user.id,id,id,user.id).first();
      if (!friend) return fail("Group chats can include accepted friends only.");
    }
    const id = randomId(12);
    await env.DB.prepare("INSERT INTO spaces(id,owner,name,description,channels,group_chat,created_at) VALUES(?,?,?,?,?,1,?)")
      .bind(id,user.id,name,"Group chat",JSON.stringify(["general"]),now).run();
    await env.DB.prepare("INSERT OR IGNORE INTO members(space,account) VALUES(?,?)").bind(id,user.id).run();
    for (const member of requested) await env.DB.prepare("INSERT OR IGNORE INTO members(space,account) VALUES(?,?)").bind(id,member).run();
    return json({ space:id });
  }
  if (action === "join") {
    let id = clean(data.space,128);
    const invite = await env.DB.prepare("SELECT space FROM space_invites WHERE code=? AND expires>?").bind(id,now).first();
    if (invite) id = invite.space;
    const space = await env.DB.prepare("SELECT * FROM spaces WHERE id=?").bind(id).first();
    if (!space || space.group_chat) return fail("Invalid or expired invite code.",404);
    await env.DB.prepare("INSERT OR IGNORE INTO members(space,account) VALUES(?,?)").bind(id,user.id).run();
    return json({ space:id });
  }
  if (action === "space") {
    const name = clean(data.name,50);
    if (!name) return fail("Enter a server name.");
    const existing = clean(data.space,128);
    const channels = Array.isArray(data.channels) && data.channels.length ? data.channels.slice(0,100) : ["general"];
    if (existing) {
      const space = await env.DB.prepare("SELECT * FROM spaces WHERE id=? AND owner=?").bind(existing,user.id).first();
      if (!space) return fail("Only the server owner can change settings.",403);
      await env.DB.prepare("UPDATE spaces SET name=?,description=?,icon=?,banner=?,banner_source=?,banner_position=?,banner_horizontal=?,banner_zoom=? WHERE id=?")
        .bind(name,clean(data.description,240),clean(data.icon,2_000_000),clean(data.banner,2_000_000),clean(data.banner_source,2_000_000),data.banner_position||50,data.banner_horizontal||50,data.banner_zoom||1,existing).run();
      return json({ space:existing });
    }
    const id = randomId(12);
    await env.DB.prepare("INSERT INTO spaces(id,owner,name,description,channels,icon,banner,banner_source,created_at) VALUES(?,?,?,?,?,?,?,?,?)")
      .bind(id,user.id,name,clean(data.description,240),JSON.stringify(channels.map(c=>typeof c === "string" ? c : c.name).filter(Boolean)),clean(data.icon,2_000_000),clean(data.banner,2_000_000),clean(data.banner_source,2_000_000),now).run();
    await env.DB.prepare("INSERT INTO members(space,account) VALUES(?,?)").bind(id,user.id).run();
    return json({ space:id });
  }
  if (action === "server-admin") {
    const id = clean(data.space,128);
    const space = await env.DB.prepare("SELECT * FROM spaces WHERE id=? AND owner=? AND group_chat=0").bind(id,user.id).first();
    if (!space) return fail("Choose a server you own.",403);
    if (data.operation === "invite") {
      const code = randomId(16);
      await env.DB.prepare("INSERT INTO space_invites(code,space,expires) VALUES(?,?,?)").bind(code,id,now+7*86400).run();
      return json({ code, expires:now+7*86400 });
    }
    if (data.operation === "revoke") {
      await env.DB.prepare("DELETE FROM space_invites WHERE code=? AND space=?").bind(clean(data.code,128),id).run();
      return json({ ok:true });
    }
    return fail("This server action is not available yet.",501);
  }
  if (action === "message") {
    const id = clean(data.space,128), channel = clean(data.channel,100), body = clean(data.body,2000);
    const space = await getSpace(env,id,user.id);
    if (!space || !records(space).some(item => item.id===channel && item.type==="text")) return fail("Text channel unavailable.",404);
    if (!body) return fail("Enter a message.");
    await env.DB.prepare("INSERT OR IGNORE INTO members(space,account) VALUES(?,?)").bind(id,user.id).run();
    await env.DB.prepare("INSERT INTO messages(space,channel,author,body,created) VALUES(?,?,?,?,?)")
      .bind(id,channel,user.id,body,new Date().toISOString()).run();
    return json({ ok:true });
  }
  if (action === "export-data") {
    const memberships = await env.DB.prepare("SELECT s.id,s.name,s.description FROM spaces s JOIN members m ON m.space=s.id WHERE m.account=?").bind(user.id).all();
    const sent = await env.DB.prepare("SELECT sender,recipient,accepted FROM friendships WHERE sender=? OR recipient=?").bind(user.id,user.id).all();
    const messages = await env.DB.prepare("SELECT space,channel,body,created FROM messages WHERE author=? ORDER BY id").bind(user.id).all();
    return json({account:profile(user),memberships:memberships.results||[],friendships:sent.results||[],messages:messages.results||[]});
  }
  if (action === "channel") {
    const id=clean(data.space,128);
    const space=await env.DB.prepare("SELECT * FROM spaces WHERE id=? AND owner=?").bind(id,user.id).first();
    if (!space) return fail("Choose a server you own.",403);
    let items=records(space);
    if (data.delete) items=items.filter(x=>x.id!==data.channel);
    else {
      const name=clean(data.name,100);
      if (!name) return fail("Enter a channel name.");
      const channelId=randomId(9);
      items.push({id:channelId,name,type:["text","voice","poll"].includes(data.type)?data.type:"text",parent:""});
    }
    await env.DB.prepare("UPDATE spaces SET channels=? WHERE id=?").bind(JSON.stringify(items),id).run();
    return json({ ok:true });
  }
  return fail("This Sonix feature is not available in the free web deployment yet.",501);
}

export async function onRequest({ request, env, next }) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/")) return next();
  const origin = request.headers.get("Origin");
  if (!PAGE_ORIGINS.has(origin)) return new Response("Origin not allowed", { status: 403 });
  const cors = {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, If-None-Match",
    "Access-Control-Expose-Headers": "ETag",
    "Vary": "Origin",
  };
  if (request.method === "OPTIONS") return new Response(null,{status:204,headers:cors});
  try {
    const user=await accountFrom(request,env);
    const response=await api(request,env,url,user);
    for (const [key,value] of Object.entries(cors)) response.headers.set(key,value);
    return response;
  } catch (error) {
    return json({error:"Sonix could not complete that request."},500,cors);
  }
}
