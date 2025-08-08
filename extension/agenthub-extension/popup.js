import"./assets/modulepreload-polyfill-B5Qt9EMX.js";import{g as c,s as g,a as m,b as p}from"./assets/supabaseClient-jzzwAuCW.js";const r=document.getElementById("app"),e={isAuthenticated:!1,isSelecting:!1,isSaving:!1,fields:[]},i=async()=>{const n=await c();e.isAuthenticated=!!n?.user,r.innerHTML=`
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
              <div class="text">${h(t.text).slice(0,240)}</div>
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
      </section>
      `}
    </div>
  `,e.isAuthenticated?(document.getElementById("logoutBtn")?.addEventListener("click",async()=>{await m(),await i()}),document.getElementById("selectBtn")?.addEventListener("click",async()=>{e.isSelecting=!0,await i(),chrome.tabs.query({active:!0,currentWindow:!0},t=>{const a=t[0]?.id;a&&chrome.tabs.sendMessage(a,{type:"ah:startSelecting"})})}),document.getElementById("saveBtn")?.addEventListener("click",async()=>{e.isSaving=!0,await i();try{const a=(await c())?.user?.id;if(!a)throw new Error("No user");const s={userId:a,createdAt:new Date().toISOString(),meta:{source:"chrome-extension"},fields:e.fields,autoLabels:!0},o=new Blob([JSON.stringify(s,null,2)],{type:"application/json"}),d=`extracts/${a}/${Date.now()}.json`,u=await p(),{error:l}=await u.storage.from("agenthub-extracts").upload(d,o,{contentType:"application/json",upsert:!1});if(l)throw l;e.fields=[]}catch(t){console.error(t)}finally{e.isSaving=!1,await i()}}),r.querySelectorAll(".remove").forEach(t=>{t.addEventListener("click",async a=>{const s=a.currentTarget.getAttribute("data-id");s&&(e.fields=e.fields.filter(o=>o.id!==s),await i())})})):document.getElementById("loginBtn")?.addEventListener("click",async()=>{const t=document.getElementById("email")?.value,a=document.getElementById("password")?.value;try{await g(t,a),e.error=void 0,await i()}catch(s){e.error=s?.message||"Login failed",await i()}})};chrome.runtime.onMessage.addListener(n=>{if(n?.type==="ah:selectionUpdate"){e.isSelecting=!1;const t=(n.payload||[]).map(a=>({id:crypto.randomUUID(),label:a.label||"Field",text:a.text,xpath:a.xpath}));e.fields=v(e.fields,t),i()}});const v=(n,t)=>{const a=new Map;for(const s of[...n,...t])a.set(s.xpath,s);return Array.from(a.values())},h=n=>n.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");i();
