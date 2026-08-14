
const CULTURES = [
  {name:"Alface", min:70, max:85},
  {name:"Tomate", min:60, max:80},
  {name:"Cebola", min:70, max:85},
  {name:"Cebolinha", min:70, max:85},
  {name:"Coentro", min:65, max:80},
  {name:"Cenoura", min:65, max:85},
  {name:"Batata", min:65, max:80},
  {name:"Batata-doce", min:40, max:70},
  {name:"Pimentão", min:70, max:85},
  {name:"Pimenta", min:55, max:75},
  {name:"Abóbora", min:60, max:80},
  {name:"Abobrinha", min:50, max:75},
  {name:"Couve", min:55, max:80},
  {name:"Beterraba", min:50, max:75},
  {name:"Alho", min:70, max:85},
  {name:"Feijão", min:55, max:80},
  {name:"Milho", min:45, max:75},
  {name:"Trigo", min:45, max:75},
  {name:"Mandioca", min:45, max:70},
  {name:"Arroz", min:75, max:90},
  {name:"Soja", min:50, max:75},
  {name:"Outra / Personalizada", min:null, max:null, custom:true}
];

const DEFAULT_STATE = {
  zones:[
    {name:"Tomate", culture:"Tomate", min:60, max:80, active:true, humidity:67, pump:false},
    {name:"Feijão", culture:"Feijão", min:55, max:80, active:true, humidity:54, pump:true}
  ],
  history:[
    {time:"14:32", date:"13/08/2026", zone:"Zona 2 — Feijão", text:"Irrigação automática iniciada", tag:"Automático"},
    {time:"14:20", date:"13/08/2026", zone:"Zona 1 — Tomate", text:"Umidade atualizada para 67%", tag:"Leitura"},
    {time:"14:05", date:"13/08/2026", zone:"Sistema", text:"ESP-01 conectado ao Wi-Fi", tag:"Conectividade"}
  ],
  profiles:[
    {id:1,name:"Horta Escolar",zones:[{name:"Alface",culture:"Alface",min:70,max:85},{name:"Coentro",culture:"Coentro",min:65,max:80}]},
    {id:2,name:"Experimento",zones:[{name:"Milho",culture:"Milho",min:45,max:75},{name:"Feijão",culture:"Feijão",min:55,max:80}]}
  ],
  calibration:{sensor1:{dry:"",wet:""},sensor2:{dry:"",wet:""}}
};

let state = loadState();
let manualUnlocked = false;
let manualTimer = null;
const DEMO_PIN = "2026";

function loadState(){
  try{
    const raw = localStorage.getItem("irrigasense2_state");
    return raw ? {...structuredClone(DEFAULT_STATE), ...JSON.parse(raw)} : structuredClone(DEFAULT_STATE);
  }catch(e){ return structuredClone(DEFAULT_STATE); }
}
function saveState(){ localStorage.setItem("irrigasense2_state", JSON.stringify(state)); }
function toast(msg){
  const el=document.getElementById("toast");
  el.textContent=msg; el.classList.add("show");
  clearTimeout(el._t); el._t=setTimeout(()=>el.classList.remove("show"),2600);
}
function navigate(view){
  document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));
  document.getElementById(`view-${view}`).classList.add("active");
  document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.view===view));
  const label=document.querySelector(`.nav-item[data-view="${view}"] em`);
  document.getElementById("pageTitle").textContent=label?label.textContent:"IrrigaSense";
  document.getElementById("sidebar").classList.remove("mobile-open");
  const menuStateEl=document.getElementById("menuState");
  if(menuStateEl) menuStateEl.checked=false;
  window.scrollTo({top:0,behavior:"smooth"});
  if(view==="graficos") setTimeout(drawChart,80);
  if(view==="historico") renderHistory();
  if(view==="perfis") renderProfiles();
}
document.querySelectorAll(".nav-item").forEach(b=>{
  b.addEventListener("click",(e)=>{
    e.preventDefault();
    const view=b.dataset.view;
    if(view) navigate(view);

    // Sempre fecha o menu lateral ao selecionar uma opção no celular.
    const menuState=document.getElementById("menuState");
    if(menuState) menuState.checked=false;
    sidebar.classList.remove("mobile-open");
  });
});
document.querySelectorAll("[data-jump]").forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.jump)));

const sidebar=document.getElementById("sidebar");
const menuState=document.getElementById("menuState");
document.addEventListener("click",(e)=>{
  if(window.innerWidth<=850 && menuState && menuState.checked && !sidebar.contains(e.target) && e.target.id!=="mobileMenu"){
    const isMenuLabel = e.target.closest && e.target.closest('label[for="menuState"]');
    if(!isMenuLabel) menuState.checked=false;
  }
});
document.getElementById("themeToggle").addEventListener("click",()=>{
  document.body.classList.toggle("dark");
  localStorage.setItem("irrigasense_theme",document.body.classList.contains("dark")?"dark":"light");
  drawChart();
});
if(localStorage.getItem("irrigasense_theme")==="dark") document.body.classList.add("dark");

function fillCultureOptions(){
  [1,2].forEach(z=>{
    const select=document.getElementById(`culture${z}`);
    if(!select) return;

    select.innerHTML = "";

    CULTURES.forEach(c=>{
      const option=document.createElement("option");
      option.value=c.name;
      option.textContent = c.custom
        ? `${c.name} — definir valores`
        : `${c.name} — ${c.min}% a ${c.max}%`;
      select.appendChild(option);
    });

    const current=state.zones?.[z-1]?.culture || (z===1 ? "Tomate" : "Feijão");
    select.value=current;

    select.addEventListener("change",()=>onCultureChange(z));
  });

  const chips=document.getElementById("cultureChips");
  if(chips){
    chips.innerHTML=CULTURES.map(c=>{
      if(c.custom) return `<span class="culture-chip"><b>+</b> Outra / Personalizada</span>`;
      return `<span class="culture-chip"><b>${c.name}</b> ${c.min}%–${c.max}%</span>`;
    }).join("");
  }
}
function onCultureChange(z){
  const selected=CULTURES.find(c=>c.name===document.getElementById(`culture${z}`).value);
  const customWrap=document.getElementById(`customWrap${z}`);
  if(selected.custom){
    customWrap.classList.remove("hidden");
    document.getElementById(`customCulture${z}`).focus();
  }else{
    customWrap.classList.add("hidden");
    document.getElementById(`zoneName${z}`).value=selected.name;
    document.getElementById(`min${z}`).value=selected.min;
    document.getElementById(`max${z}`).value=selected.max;
  }
}
function syncForms(){
  state.zones.forEach((zone,i)=>{
    const z=i+1;
    document.getElementById(`zoneName${z}`).value=zone.name;
    document.getElementById(`culture${z}`).value=zone.culture;
    document.getElementById(`min${z}`).value=zone.min;
    document.getElementById(`max${z}`).value=zone.max;
    document.getElementById(`active${z}`).checked=zone.active;
    document.getElementById(`customWrap${z}`).classList.toggle("hidden",zone.culture!=="Outra / Personalizada");
  });
}
document.querySelectorAll("[data-zone-form]").forEach(form=>{
  form.addEventListener("submit",e=>{
    e.preventDefault();
    const z=Number(form.dataset.zoneForm);
    const min=Number(document.getElementById(`min${z}`).value);
    const max=Number(document.getElementById(`max${z}`).value);
    if(!Number.isFinite(min)||!Number.isFinite(max)||min<0||max>100||min>=max){
      toast("Verifique os limites: mínimo deve ser menor que o máximo.");
      return;
    }
    let culture=document.getElementById(`culture${z}`).value;
    let name=document.getElementById(`zoneName${z}`).value.trim();
    if(culture==="Outra / Personalizada"){
      const custom=document.getElementById(`customCulture${z}`).value.trim();
      if(!custom){ toast("Digite o nome da cultura personalizada."); return; }
      name=name||custom;
    }
    if(!name) name=culture;
    state.zones[z-1]={...state.zones[z-1],name,culture,min,max,active:document.getElementById(`active${z}`).checked};
    addHistory(`Zona ${z} — ${name}`,"Configuração atualizada","Configuração");
    saveState(); renderDashboard(); renderHistory(); toast(`Zona ${z} salva.`);
  });
});

function soilStatus(zone){
  if(zone.humidity<zone.min) return "Abaixo do ideal";
  if(zone.humidity>zone.max) return "Acima do ideal";
  return "Adequado";
}
function renderDashboard(){
  state.zones.forEach((zone,i)=>{
    const z=i+1;
    const pct=Math.max(0,Math.min(100,zone.humidity));
    document.getElementById(`dashName${z}`).textContent=zone.name;
    document.getElementById(`dashHumidity${z}`).textContent=`${pct}%`;
    document.getElementById(`dashRange${z}`).textContent=`${zone.min}%–${zone.max}%`;
    document.getElementById(`soilStatus${z}`).textContent=soilStatus(zone);
    document.getElementById(`meter${z}`).style.width=`${pct}%`;
    document.getElementById(`ring${z}`).style.background=`conic-gradient(var(--green) 0 ${pct}%,var(--surface-2) ${pct}% 100%)`;
    const badge=document.getElementById(`pumpBadge${z}`);
    badge.textContent=zone.pump?"Bomba ligada":"Bomba desligada";
    badge.className=`pump-badge ${zone.pump?"on":"off"}`;
    document.getElementById(`manualName${z}`).textContent=zone.name;
    document.getElementById(`manualHumidity${z}`).textContent=`${pct}%`;
    document.getElementById(`heroCulture${z}`).textContent=zone.name;
    document.getElementById(`heroHumidity${z}`).textContent=`${pct}%`;
    document.getElementById(`legendName${z}`).textContent=zone.name;
  });
  const avg=Math.round((state.zones[0].humidity+state.zones[1].humidity)/2);
  document.getElementById("avgHumidity").textContent=`${avg}%`;
  document.getElementById("activePumps").textContent=`${state.zones.filter(z=>z.pump).length}/2`;
}
document.getElementById("modeManualQuick").addEventListener("click",()=>navigate("manual"));
document.getElementById("modeAuto").addEventListener("click",()=>toast("Modo automático selecionado na demonstração."));

function openManualModal(){
  const modal=document.getElementById("manualModal");
  const pin=document.getElementById("manualPin");
  const error=document.getElementById("pinError");
  if(!modal) return;

  modal.classList.add("open");
  modal.setAttribute("aria-hidden","false");
  document.body.style.overflow="hidden";

  if(pin) pin.value="";
  if(error) error.textContent="";

  setTimeout(()=>{
    if(pin) pin.focus();
  },120);
}

function closeManualModal(){
  const modal=document.getElementById("manualModal");
  if(!modal) return;
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden","true");
  document.body.style.overflow="";
}

const unlockManualBtn=document.getElementById("unlockManual");
const closeManualBtn=document.getElementById("closeManualModal");
const manualModalEl=document.getElementById("manualModal");
const confirmPinBtn=document.getElementById("confirmPin");
const manualPinInput=document.getElementById("manualPin");

if(unlockManualBtn) unlockManualBtn.addEventListener("click",openManualModal);
if(closeManualBtn) closeManualBtn.addEventListener("click",closeManualModal);
if(manualModalEl) manualModalEl.addEventListener("click",e=>{
  if(e.target===manualModalEl) closeManualModal();
});
if(confirmPinBtn) confirmPinBtn.addEventListener("click",confirmPin);
if(manualPinInput) manualPinInput.addEventListener("keydown",e=>{
  if(e.key==="Enter") confirmPin();
});
function confirmPin(){
  const pin=document.getElementById("manualPin").value;
  if(pin!==DEMO_PIN){document.getElementById("pinError").textContent="PIN de demonstração incorreto.";return;}
  manualUnlocked=true; closeManualModal();
  document.getElementById("lockPanel").style.display="none";
  document.getElementById("manualGrid").classList.remove("locked");
  document.getElementById("manualLockPill").textContent="🔓 Desbloqueado";
  document.getElementById("manualLockPill").className="pill success";
  resetManualTimer();
  toast("Modo manual desbloqueado por 5 minutos.");
}
function resetManualTimer(){
  clearTimeout(manualTimer);
  manualTimer=setTimeout(lockManual,5*60*1000);
}
function lockManual(){
  manualUnlocked=false;
  const lockPanel=document.getElementById("lockPanel");
  const manualGrid=document.getElementById("manualGrid");
  const pill=document.getElementById("manualLockPill");
  if(lockPanel) lockPanel.style.display="";
  if(manualGrid) manualGrid.classList.add("locked");
  if(pill){
    pill.textContent="🔒 Bloqueado";
    pill.className="pill warning";
  }
  const inlinePin=document.getElementById("manualPinInline");
  if(inlinePin) inlinePin.value="";
}
document.getElementById("lockManual").addEventListener("click",()=>{lockManual();toast("Modo manual bloqueado.");});
document.querySelectorAll(".pump-action").forEach(btn=>btn.addEventListener("click",()=>{
  if(!manualUnlocked) return;
  resetManualTimer();
  const z=Number(btn.dataset.pump), action=btn.dataset.action, zone=state.zones[z-1];
  if(action==="pulse"){
    zone.pump=true;
    addHistory(`Zona ${z} — ${zone.name}`,"Irrigação manual de 15 s solicitada","Manual");
    renderDashboard(); saveState(); toast(`Irrigação da Zona ${z} simulada.`);
    setTimeout(()=>{zone.pump=false;renderDashboard();saveState();},15000);
  }else{
    zone.pump=false;
    addHistory(`Zona ${z} — ${zone.name}`,"Parada manual solicitada","Manual");
    renderDashboard(); saveState(); toast(`Bomba da Zona ${z} parada.`);
  }
}));

function addHistory(zone,text,tag){
  const d=new Date();
  state.history.unshift({
    date:d.toLocaleDateString("pt-BR"),
    time:d.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}),
    zone,text,tag
  });
  state.history=state.history.slice(0,60);
}
function renderHistory(){
  const list=document.getElementById("historyList");
  if(!state.history.length){list.innerHTML=`<div class="notice info">Nenhum registro de demonstração.</div>`;return;}
  list.innerHTML=state.history.map(item=>`
    <article class="history-item">
      <div class="history-time"><strong>${item.time}</strong><small>${item.date}</small></div>
      <div class="history-main"><strong>${item.zone}</strong><small>${item.text}</small></div>
      <span class="history-tag">${item.tag}</span>
    </article>
  `).join("");
}
document.getElementById("clearHistory").addEventListener("click",()=>{state.history=[];saveState();renderHistory();toast("Histórico demonstrativo limpo.");});

function drawChart(){
  const canvas=document.getElementById("humidityChart");
  if(!canvas) return;
  const ctx=canvas.getContext("2d"), W=canvas.width,H=canvas.height;
  const dark=document.body.classList.contains("dark");
  const grid=dark?"#294037":"#dce8df", text=dark?"#9cb0a6":"#657a70";
  ctx.clearRect(0,0,W,H);
  const pad={l:62,r:25,t:30,b:48}, cw=W-pad.l-pad.r,ch=H-pad.t-pad.b;
  ctx.strokeStyle=grid;ctx.fillStyle=text;ctx.lineWidth=1;ctx.font="13px system-ui";
  for(let v=0;v<=100;v+=20){
    const y=pad.t+ch-(v/100)*ch;
    ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(W-pad.r,y);ctx.stroke();
    ctx.fillText(`${v}%`,16,y+4);
  }
  const labels=["08h","10h","12h","14h","16h","18h","20h"];
  labels.forEach((l,i)=>{const x=pad.l+(i/(labels.length-1))*cw;ctx.fillText(l,x-12,H-16);});
  const d1=[72,70,68,67,64,66,69], d2=[63,61,59,54,57,62,65];
  function line(data,color){
    ctx.strokeStyle=color;ctx.lineWidth=4;ctx.lineJoin="round";ctx.lineCap="round";
    ctx.beginPath();
    data.forEach((v,i)=>{
      const x=pad.l+(i/(data.length-1))*cw,y=pad.t+ch-(v/100)*ch;
      if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
    });ctx.stroke();
    data.forEach((v,i)=>{const x=pad.l+(i/(data.length-1))*cw,y=pad.t+ch-(v/100)*ch;ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,5,0,Math.PI*2);ctx.fill();});
  }
  line(d1,"#0b6b45");line(d2,"#d0a126");
}
document.getElementById("chartPeriod").addEventListener("change",()=>{drawChart();toast("Período alterado na demonstração.");});

function renderProfiles(){
  const grid=document.getElementById("profilesGrid");
  if(!state.profiles.length){grid.innerHTML=`<div class="notice info">Nenhum perfil salvo.</div>`;return;}
  grid.innerHTML=state.profiles.map(p=>`
    <article class="profile-card">
      <h3>${escapeHtml(p.name)}</h3>
      <div class="profile-zone"><span>Zona 1</span><b>${escapeHtml(p.zones[0].name)}</b></div>
      <div class="profile-zone"><span>Zona 2</span><b>${escapeHtml(p.zones[1].name)}</b></div>
      <div class="profile-actions">
        <button class="btn primary" onclick="loadProfile(${p.id})">Carregar</button>
        <button class="btn danger" onclick="deleteProfile(${p.id})">Excluir</button>
      </div>
    </article>`).join("");
}
window.loadProfile=function(id){
  const p=state.profiles.find(x=>x.id===id); if(!p)return;
  p.zones.forEach((pz,i)=>{state.zones[i]={...state.zones[i],...pz,active:true};});
  saveState();syncForms();renderDashboard();toast(`Perfil "${p.name}" carregado.`);
};
window.deleteProfile=function(id){
  state.profiles=state.profiles.filter(x=>x.id!==id);saveState();renderProfiles();toast("Perfil excluído.");
};
document.getElementById("saveProfile").addEventListener("click",()=>{
  const name=prompt("Nome do novo perfil:");
  if(!name||!name.trim()) return;
  state.profiles.push({
    id:Date.now(),name:name.trim(),
    zones:state.zones.map(z=>({name:z.name,culture:z.culture,min:z.min,max:z.max}))
  });
  saveState();renderProfiles();toast("Perfil salvo.");
});

document.querySelectorAll(".calibration-form").forEach(form=>form.addEventListener("submit",e=>{
  e.preventDefault();
  const s=form.dataset.sensor;
  const dry=document.getElementById(`dry${s}`).value, wet=document.getElementById(`wet${s}`).value;
  if(dry===""||wet===""){toast("Preencha as duas referências.");return;}
  if(Number(dry)===Number(wet)){toast("Solo seco e úmido não podem ter o mesmo valor.");return;}
  state.calibration[`sensor${s}`]={dry:Number(dry),wet:Number(wet)};
  saveState();toast(`Calibração do Sensor ${s} armazenada localmente.`);
}));
function syncCalibration(){
  [1,2].forEach(s=>{
    const c=state.calibration?.[`sensor${s}`]||{};
    document.getElementById(`dry${s}`).value=c.dry??"";
    document.getElementById(`wet${s}`).value=c.wet??"";
  });
}
document.querySelectorAll("[data-photo]").forEach(input=>input.addEventListener("change",()=>{
  const file=input.files?.[0];if(!file)return;
  const img=document.getElementById(input.dataset.photo);
  img.src=URL.createObjectURL(file);
  img.alt="Pré-visualização selecionada";
  input.closest(".photo-slot").classList.add("has-image");
}));
function escapeHtml(str){
  return String(str).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
}

document.addEventListener("DOMContentLoaded",()=>{
  fillCultureOptions();
  syncForms();
  syncCalibration();
  renderDashboard();
  renderHistory();
  renderProfiles();
  setTimeout(drawChart,50);
});

setInterval(()=>{
  const el=document.getElementById("lastCommunication");
  if(el) el.textContent="há poucos segundos";
},5000);


// ===== Correções v4 =====
function applyCulturePreset(zoneNumber){
  const select = document.getElementById(`culture${zoneNumber}`);
  if(!select) return;

  const preset = CULTURES.find(c => c.name === select.value);
  const customWrap = document.getElementById(`customWrap${zoneNumber}`);
  const nameInput = document.getElementById(`zoneName${zoneNumber}`);
  const minInput = document.getElementById(`min${zoneNumber}`);
  const maxInput = document.getElementById(`max${zoneNumber}`);

  if(!preset) return;

  if(preset.custom){
    if(customWrap) customWrap.classList.remove("hidden");
    if(minInput) minInput.value = "";
    if(maxInput) maxInput.value = "";
  } else {
    if(customWrap) customWrap.classList.add("hidden");
    if(nameInput) nameInput.value = preset.name;
    if(minInput) minInput.value = preset.min;
    if(maxInput) maxInput.value = preset.max;
  }
}

document.addEventListener("change",(e)=>{
  if(e.target && e.target.id === "culture1") applyCulturePreset(1);
  if(e.target && e.target.id === "culture2") applyCulturePreset(2);
});

function unlockManualFromInline(){
  const pin = document.getElementById("manualPinInline");
  const err = document.getElementById("pinErrorInline");
  if(!pin) return;

  if(pin.value !== DEMO_PIN){
    if(err) err.textContent = "PIN incorreto.";
    return;
  }

  if(err) err.textContent = "";
  manualUnlocked = true;
  const lockPanel = document.getElementById("lockPanel");
  const manualGrid = document.getElementById("manualGrid");
  const pill = document.getElementById("manualLockPill");

  if(lockPanel) lockPanel.style.display = "none";
  if(manualGrid) manualGrid.classList.remove("locked");
  if(pill){
    pill.textContent = "🔓 Desbloqueado";
    pill.className = "pill success";
  }
  resetManualTimer();
  toast("Modo manual desbloqueado por 5 minutos.");
}

document.addEventListener("click",(e)=>{
  if(e.target && e.target.id === "unlockManualInline"){
    unlockManualFromInline();
  }
});

document.addEventListener("keydown",(e)=>{
  if(e.key === "Enter" && document.activeElement && document.activeElement.id === "manualPinInline"){
    unlockManualFromInline();
  }
});

// ===== CORREÇÃO DEFINITIVA DO MENU MOBILE =====
(() => {
  const sidebar = document.getElementById("sidebar");
  const menuBtn = document.getElementById("mobileMenu");
  const closeBtn = document.getElementById("sidebarToggle");
  const menuState = document.getElementById("menuState");

  if (!sidebar || !menuBtn) return;

  function abrirMenu() {
    if (menuState) menuState.checked = false;
    sidebar.classList.add("mobile-open");
    document.body.style.overflow = "hidden";
  }

  function fecharMenu() {
    sidebar.classList.remove("mobile-open");
    if (menuState) menuState.checked = false;
    document.body.style.overflow = "";
  }

  menuBtn.addEventListener(
    "click",
    (e) => {
      if (window.innerWidth > 850) return;

      e.preventDefault();
      e.stopPropagation();

      if (sidebar.classList.contains("mobile-open")) {
        fecharMenu();
      } else {
        abrirMenu();
      }
    },
    true
  );

  if (closeBtn) {
    closeBtn.addEventListener(
      "click",
      (e) => {
        if (window.innerWidth <= 850) {
          e.preventDefault();
          e.stopPropagation();
          fecharMenu();
        }
      },
      true
    );
  }

  document.querySelectorAll(".nav-item").forEach((item) => {
    item.addEventListener("click", (e) => {
      if (window.innerWidth <= 850) {
        e.preventDefault();
        e.stopPropagation();
        fecharMenu();
      }
    });
  });

  document.addEventListener("click", (e) => {
    if (
      window.innerWidth <= 850 &&
      sidebar.classList.contains("mobile-open") &&
      !sidebar.contains(e.target) &&
      !menuBtn.contains(e.target)
    ) {
      fecharMenu();
    }
  });
})();
