import"./assets/modulepreload-polyfill-B5Qt9EMX.js";import{h as g,g as r,s as m,a as v,b as h}from"./assets/supabaseClient-4YmXM5yq.js";const d=document.getElementById("app"),e={isAuthenticated:!1,isSelecting:!1,isSaving:!1,fields:[]},i=async()=>{let s=null;if(await g())try{s=await r(),e.isAuthenticated=!!s?.user}catch{e.isAuthenticated=!1,e.error="Supabase not configured. Open Options and set SUPABASE_URL and SUPABASE_ANON_KEY."}else e.isAuthenticated=!1,e.error="Supabase not configured. Open Options and set SUPABASE_URL and SUPABASE_ANON_KEY.";d.innerHTML=`
    <div class="container">
      <header>
        <div class="brand">AgentHub Extractor</div>
        ${e.isAuthenticated?'<button id="logoutBtn" class="btn ghost">Logout</button>':""}
      </header>

      ${e.isAuthenticated?`
      <section class="card">
        <div class="row">
          <button id="selectBtn" class="btn secondary">${e.isSelecting?"Selecting…":"Start Selecting"}</button>
          <button id="saveBtn" class="btn primary" ${e.fields.length===0||e.isSaving?"disabled":""}>${e.isSaving?"Saving…":"Save and Sync to AgentHub"}</button>
        </div>
      </section>

      <section class="card">
        <h2>Selected Fields (${e.fields.length})</h2>
        <div class="list">
          ${e.fields.map(t=>`
            <div class="list-item">
              <div class="meta">
                <div class="label">${t.label}</div>
                <div class="hint">${t.xpath}</div>
              </div>
              <div class="text">${y(t.text).slice(0,240)}</div>
              <button data-id="${t.id}" class="btn xs ghost remove">Remove</button>
            </div>
          `).join("")}
        </div>
      </section>
      `:`
      <section class="card">
        <h2>Sign in</h2>
        <label>Email <input id="email" type="email" placeholder="you@company.com" /></label>
        <label>Password <input id="password" type="password" placeholder="••••••••" /></label>
        <button id="loginBtn" class="btn primary">Login</button>
        ${e.error?`<div class="error">${e.error}</div>`:""}
        <p class="hint" style="margin-top:8px;opacity:.8">If login fails immediately, set Supabase config in Options.</p>
        <div style="margin-top:8px">
          <a id="openOptions" class="btn ghost" href="#">Open Options</a>
        </div>
      </section>
      `}
    </div>
  `,e.isAuthenticated?(document.getElementById("logoutBtn")?.addEventListener("click",async()=>{await v(),await i()}),document.getElementById("selectBtn")?.addEventListener("click",async()=>{e.isSelecting=!0,await i(),chrome.tabs.query({active:!0,currentWindow:!0},t=>{const a=t[0]?.id;a&&chrome.tabs.sendMessage(a,{type:"ah:startSelecting"})})}),document.getElementById("saveBtn")?.addEventListener("click",async()=>{e.isSaving=!0,await i();try{const a=(await r())?.user?.id;if(!a)throw new Error("No user");const n={userId:a,createdAt:new Date().toISOString(),meta:{source:"chrome-extension"},fields:e.fields,autoLabels:!0},l=new Blob([JSON.stringify(n,null,2)],{type:"application/json"}),p=`extracts/${a}/${Date.now()}.json`,u=await h(),{error:c}=await u.storage.from("agenthub-extracts").upload(p,l,{contentType:"application/json",upsert:!1});if(c)throw c;e.fields=[]}catch(t){console.error(t)}finally{e.isSaving=!1,await i()}}),d.querySelectorAll(".remove").forEach(t=>{t.addEventListener("click",async a=>{const n=a.currentTarget.getAttribute("data-id");n&&(e.fields=e.fields.filter(l=>l.id!==n),await i())})})):(document.getElementById("loginBtn")?.addEventListener("click",async()=>{const t=document.getElementById("email")?.value,a=document.getElementById("password")?.value;try{await m(t,a),e.error=void 0,await i()}catch(n){e.error=n?.message||"Login failed",await i()}}),document.getElementById("openOptions")?.addEventListener("click",t=>{t.preventDefault(),chrome.runtime.openOptionsPage()}))};chrome.runtime.onMessage.addListener(s=>{if(s?.type==="ah:selectionUpdate"){e.isSelecting=!1;const o=(s.payload||[]).map(t=>({id:crypto.randomUUID(),label:t.label||"Field",text:t.text,xpath:t.xpath}));e.fields=f(e.fields,o),i()}});const f=(s,o)=>{const t=new Map;for(const a of[...s,...o])t.set(a.xpath,a);return Array.from(t.values())},y=s=>s.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");i();
