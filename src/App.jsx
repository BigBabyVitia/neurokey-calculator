import { useState, useMemo, useEffect } from "react";
import { isValidPhoneNumber } from "libphonenumber-js";
import { Analytics } from "@vercel/analytics/react";


const DC = { bankCommission: 0.03, openrouterCommission: 0.055, usdRub: 80, creditPriceUsd: 0.01, contactUrl: "https://t.me/Lud_AI", pricingMode: "openrouter" };
const DM = { "Базовый": 0.80, "Премиум": 0.55, "Ультра": 0.45, "Дизайн": 0.55 };
const SZ = {
  small:  { l: "Малый",   i: 1000,  o: 300 },
  medium: { l: "Средний", i: 6000,  o: 800 },
  large:  { l: "Большой", i: 30000, o: 2000 },
};
const DModels = [
  { id:1, n:"DeepSeek v3.2",     t:"Базовый",  i:0.25, o:0.4,  di:0.28, do_:0.42, tp:"text", desc:"Быстрые ответы на каждый день. Переводы, справки, простой код и рутинные рабочие задачи — при самой низкой стоимости запроса." },
  { id:2, n:"Grok 4.1 Fast",     t:"Базовый",  i:0.2,  o:0.5,  di:0.2,  do_:0.5,  tp:"text", desc:"Быстрая и креативная модель от xAI. Хороша для генерации идей, написания текстов и повседневного общения." },
  { id:3, n:"Claude Sonnet 4.6", t:"Премиум",  i:3.0,  o:15.0, di:3.0,  do_:15.0, tp:"text", desc:"Универсальный помощник от Anthropic. Отлично пишет код, анализирует документы, готовит отчёты и работает с большими текстами." },
  { id:4, n:"GPT-5.2",           t:"Премиум",  i:1.75, o:14.0, di:1.75, do_:14.0, tp:"text", desc:"Флагманская модель OpenAI. Подходит для аналитики, написания текстов, создания презентаций и работы с данными." },
  { id:5, n:"Gemini 3 Pro",      t:"Премиум",  i:2.0,  o:12.0, di:2.0,  do_:12.0, tp:"text", desc:"Модель Google, которая понимает текст, изображения, аудио и видео. Отличный выбор для анализа файлов разных форматов." },
  { id:6, n:"Claude Opus 4.6",   t:"Ультра",   i:5.0,  o:25.0, di:5.0,  do_:25.0, tp:"text", desc:"Самая мощная модель для самых сложных задач. Глубокий анализ, стратегия, исследования и масштабная работа с кодом." },
  { id:7, n:"Seedream 4.5",      t:"Дизайн",   i:0, o:0, tp:"image", p:0.04,  dp:0.04,  desc:"Быстрая генерация картинок от ByteDance. Хорошо рисует текст на изображениях и подходит для маркетинговых материалов." },
  { id:8, n:"Nano Banana Pro",   t:"Дизайн",   i:0, o:0, tp:"image", p:0.134, dp:0.134, desc:"Продвинутая модель от Google с высокой детализацией. Лучший выбор, когда нужно максимальное качество и точность изображения." },
  { id:9, n:"GPT Image 1.5",     t:"Дизайн",   i:0, o:0, tp:"image", p:0.04,  dp:0.04,  desc:"Модель OpenAI для создания и редактирования картинок. Быстро генерирует, точно вносит правки и сохраняет детали оригинала." },
];
const TIERS = ["Базовый","Премиум","Ультра","Дизайн"];

const LS_REQS = "nk-reqs";
function loadReqs(){try{return JSON.parse(localStorage.getItem(LS_REQS))||[];}catch{return [];}}
function saveReqs(reqs){localStorage.setItem(LS_REQS,JSON.stringify(reqs));}

const f=(n,d=2)=>{if(n>=1000)return Math.round(n).toLocaleString("ru-RU");if(n>=100)return n.toFixed(1);if(n>=10)return n.toFixed(d);if(n>=1)return n.toFixed(d);return n.toFixed(Math.max(d,3));};
const fi=n=>Math.floor(n).toLocaleString("ru-RU");

function NumIn({value,onChange,style:s={},className}){
  return <input type="text" inputMode="numeric" className={className} value={Number(value).toLocaleString("ru-RU")} onChange={e=>onChange(parseInt(e.target.value.replace(/\D/g,""))||0)} style={s}/>;
}

function useEng(mods,cfg,mg,modeOverride){
  const mode=modeOverride||cfg.pricingMode||"openrouter";
  const isDirect=mode==="direct";
  const pm=1+cfg.bankCommission+(isDirect?0:cfg.openrouterCommission);
  const txt=useMemo(()=>mods.filter(m=>m.tp==="text").map(m=>{
    const inP=isDirect?(m.di??m.i):m.i, outP=isDirect?(m.do_??m.o):m.o;
    const mr=mg[m.t]||0.5,sm=1/(1-mr),bI=inP*pm,bO=outP*pm,sI=bI*sm,sO=bO*sm;
    const sz={};Object.entries(SZ).forEach(([k,s])=>{const cc=(sI*s.i+sO*s.o)/1e6;sz[k]={ccR:cc*cfg.usdRub,cr:cc/cfg.creditPriceUsd};});
    return {...m,mr,sm,bI,bO,sI,sO,sIR:sI*cfg.usdRub,sOR:sO*cfg.usdRub,sz};
  }),[mods,cfg,mg,pm,isDirect]);
  const im=useMemo(()=>mods.filter(m=>m.tp==="image").map(m=>{
    const imgP=isDirect?(m.dp??m.p):(m.p||0);
    const mr=mg["Дизайн"]||0.55,sm=1/(1-mr),b=imgP*pm,s=b*sm;
    return {...m,mr,sm,b,s,bR:b*cfg.usdRub,sR:s*cfg.usdRub,cr:s/cfg.creditPriceUsd};
  }),[mods,cfg,mg,pm,isDirect]);
  return {pm,txt,im};
}

/* ── Logo ──────────────────────────────────────── */
function Logo({size=36}){
  return (
    <svg width={size} height={size} viewBox="21 7 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="nk-logo-grad" x1="35" y1="7" x2="35" y2="35" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FCDAB9"/>
          <stop offset="0.48" stopColor="#F18161"/>
          <stop offset="1" stopColor="#6464C7"/>
        </linearGradient>
      </defs>
      <rect x="21" y="7" width="28" height="28" rx="14" fill="url(#nk-logo-grad)"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M33.6134 15.7541C33.7864 15.7541 33.9266 15.8943 33.9266 16.0673V21.5567C33.9266 21.9256 34.4532 21.9911 34.5435 21.6334L35.9681 15.9905C36.0033 15.8515 36.1285 15.7541 36.2718 15.7541H37.6173C37.7902 15.7541 37.9305 15.8943 37.9305 16.0673V21.5567C37.9305 21.9256 38.4571 21.9911 38.5474 21.6334L39.972 15.9905C40.0072 15.8515 40.1323 15.7541 40.2757 15.7541H41.5618C41.7347 15.7542 41.875 15.8943 41.875 16.0673V25.9327C41.875 26.1056 41.7347 26.2459 41.5618 26.2459H40.3448C40.1719 26.2459 40.0317 26.1057 40.0316 25.9327V20.4431C40.0316 20.0742 39.505 20.009 39.4148 20.3666L37.9901 26.0092C37.955 26.1483 37.8298 26.2459 37.6864 26.2459H36.3413C36.1683 26.2459 36.0281 26.1057 36.0281 25.9327V20.4431C36.028 20.0743 35.5015 20.009 35.4112 20.3666L33.9865 26.0092C33.9514 26.1483 33.8262 26.2459 33.6828 26.2459H32.3967C32.2238 26.2459 32.0836 26.1057 32.0836 25.9327V22.2832C32.0836 21.9637 31.8245 21.7047 31.505 21.7047C31.241 21.7047 31.0168 21.887 30.9062 22.1267C30.5095 22.9868 29.6399 23.5838 28.6305 23.5838L28.5014 23.5805C27.1777 23.5133 26.125 22.4188 26.125 21.0783C26.125 19.6946 27.2468 18.5728 28.6305 18.5728L28.7596 18.5762C29.7137 18.6246 30.5269 19.2068 30.9066 20.0301C31.0171 20.2697 31.2413 20.4519 31.5052 20.4519C31.8246 20.4519 32.0836 20.193 32.0836 19.8735V16.0673C32.0836 15.8943 32.2238 15.7541 32.3967 15.7541H33.6134ZM28.6305 20.1387C28.1116 20.1387 27.6909 20.5594 27.6909 21.0783C27.6909 21.5972 28.1116 22.0179 28.6305 22.0179C29.1494 22.0179 29.5701 21.5972 29.5701 21.0783C29.5701 20.5594 29.1494 20.1387 28.6305 20.1387Z" fill="white"/>
    </svg>
  );
}

/* ── Shared UI ─────────────────────────────────── */
function Crd({title,sub,action,children}){
  return (
    <div style={{borderRadius:14,padding:"20px 22px",marginBottom:16,background:"#fff"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:sub?2:12}}>
        <div style={{fontSize:15,fontWeight:600,color:"#2a2a22"}}>{title}</div>
        {action}
      </div>
      {sub && <div style={{fontSize:13,color:"#b0b0a8",marginBottom:14}}>{sub}</div>}
      {children}
    </div>
  );
}
function Tbl({children}){return <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse"}}>{children}</table></div>;}
function THd({children}){return <thead><tr style={{borderBottom:"1px solid #eceae4"}}>{children}</tr></thead>;}
function Tc({children,r}){return <th style={{padding:"8px 12px",textAlign:r?"right":"left",fontSize:11,fontWeight:500,color:"#b0b0a8",textTransform:"uppercase",letterSpacing:"0.03em"}}>{children}</th>;}
function Rw({children}){return <tr style={{borderBottom:"1px solid #f5f4f0"}}>{children}</tr>;}
function Td({children,r,b,mn,g}){return <td style={{padding:"9px 12px",textAlign:r?"right":"left",fontWeight:b?600:400,fontFamily:mn?"'JetBrains Mono',monospace":"inherit",fontSize:mn?12:13,color:g?"#b0b0a8":"#3a3a32"}}>{children}</td>;}
function G({children}){return <span style={{color:"#c5c5bc"}}>{children}</span>;}

/* tier tag */
function Tag({tier}){
  return (
    <span style={{
      display:"inline-block",fontSize:11,fontWeight:500,padding:"2px 8px",
      borderRadius:6,background:"#F5F4F0",color:"#8a8a82",
    }}>{tier}</span>
  );
}

/* ── Client ────────────────────────────────────── */
function Client({mods,cfg,mg,addReq}){
  const [bud,setBud]=useState(100000);
  const [emp,setEmp]=useState(20);
  const [showPrices,setShowPrices]=useState(false);
  const [showReq,setShowReq]=useState(false);
  const [reqSent,setReqSent]=useState(false);
  const [modelName,setModelName]=useState("");
  const [companyName,setCompanyName]=useState("");
  const [contact,setContact]=useState("");
  const [comment,setComment]=useState("");
  const [consent,setConsent]=useState(false);
  const [formErr,setFormErr]=useState({});
  const validateContact=(v)=>{
    const s=v.trim();
    if(!s) return "required";
    if(s.startsWith("@")) return s.length>=6 ? null : "tg";
    if(/^[+\d]/.test(s)){try{return isValidPhoneNumber(s) ? null : "phone";}catch{return "phone";}}
    return "format";
  };
  const submitReq=()=>{
    const err={};
    if(!modelName.trim()) err.modelName=true;
    if(!companyName.trim()) err.companyName=true;
    const cErr=validateContact(contact);
    if(cErr) err.contact=cErr;
    setFormErr(err);
    if(Object.keys(err).length) return;
    addReq({modelName:modelName.trim(),companyName:companyName.trim(),contact:contact.trim(),comment:comment.trim()});
    setReqSent(true);setShowReq(false);setModelName("");setCompanyName("");setContact("");setComment("");setConsent(false);setFormErr({});
  };
  const {txt,im}=useEng(mods,cfg,mg);

  const lim=useMemo(()=>txt.map(m=>{
    const ps={};Object.keys(SZ).forEach(k=>{const t=Math.floor(bud/m.sz[k].ccR),pp=Math.floor(t/emp);ps[k]={t,pp,pd:pp/22};});return {...m,ps};
  }),[txt,bud,emp]);
  const imgL=useMemo(()=>im.map(m=>{const t=Math.floor(bud/m.sR);return {...m,t,pp:Math.floor(t/emp)};}),[im,bud,emp]);

  const perPerson = Math.round(bud/emp);
  const creditPriceRub = cfg.creditPriceUsd * cfg.usdRub;
  const totalCredits = Math.floor(bud / creditPriceRub);
  const creditsPerPerson = Math.floor(totalCredits / emp);

  return (
    <div>
      {/* Hero */}
      <div className="nk-hero" style={{padding:"56px 0 24px",maxWidth:720,marginInline:"auto",textAlign:"center"}}>
        <h1 className="nk-hero-title" style={{fontSize:36,fontWeight:700,margin:"0 0 8px",color:"#1a1a18",letterSpacing:"-0.03em",lineHeight:1.2}}>
          Единый доступ к нейросетям в вашей корпоративной среде
        </h1>
        <p className="nk-hero-sub" style={{fontSize:17,color:"#8a8a82",margin:"0 0 36px"}}>
          Рассчитайте, сколько получит каждый сотрудник
        </p>
        <div className="nk-hero-inputs" style={{display:"flex",gap:16,maxWidth:560,marginInline:"auto"}}>
          <div style={{flex:1,textAlign:"left"}}><label style={lbl}>Бюджет, ₽</label><NumIn value={bud} onChange={setBud} style={mInp} className="nk-main-input"/></div>
          <div style={{flex:1,textAlign:"left"}}><label style={lbl}>Сотрудников</label><NumIn value={emp} onChange={v=>setEmp(Math.max(1,v))} style={mInp} className="nk-main-input"/></div>
        </div>
      </div>

      {/* Credits card */}
      <div style={{padding:"16px 0 0",maxWidth:600,marginInline:"auto"}}>
        <div style={{background:"#fff",borderRadius:12,padding:"14px 20px"}}>
          <div style={{fontSize:12,color:"#a0a098",marginBottom:8}}>Кредитов на бюджет</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
            <div style={{background:"#fafaf8",borderRadius:8,padding:"8px 12px"}}>
              <div style={{fontSize:11,color:"#a0a098",marginBottom:4}}>всего</div>
              <div style={{fontSize:20,fontWeight:700,color:"#1a1a18",fontFamily:"'JetBrains Mono',monospace"}}>{fi(totalCredits)}</div>
            </div>
            <div style={{background:"#fafaf8",borderRadius:8,padding:"8px 12px"}}>
              <div style={{fontSize:11,color:"#a0a098",marginBottom:4}}>на сотрудника</div>
              <div style={{fontSize:20,fontWeight:700,color:"#1a1a18",fontFamily:"'JetBrains Mono',monospace"}}>{fi(creditsPerPerson)}</div>
            </div>
          </div>
          <div style={{fontSize:11,color:"#c5c5bc",marginTop:6}}>1 кредит = {creditPriceRub.toFixed(2)} ₽</div>
        </div>
      </div>

      {/* Per-person metric — requests card */}
      {(()=>{
        const featured=[1,3,4,6];
        const chips=featured.map(id=>lim.find(m=>m.id===id)).filter(Boolean).map(m=>{
          const pp=m.ps.medium.pp;
          return {n:m.n,v:"~"+fi(pp)};
        });
        return (
          <div className="nk-chips-wrap" style={{padding:"12px 0 32px",maxWidth:600,marginInline:"auto"}}>
            <div className="nk-chips-card" style={{background:"#fff",borderRadius:12,padding:"14px 20px"}}>
              <div style={{fontSize:12,color:"#a0a098",marginBottom:8}}>Средних запросов на сотрудника</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                {chips.map(c=>(
                  <div key={c.n} style={{background:"#fafaf8",borderRadius:8,padding:"8px 12px",display:"flex",alignItems:"baseline",gap:6}}>
                    <span className="nk-chip-val" style={{fontSize:18,fontWeight:700,color:"#1a1a18",fontFamily:"'JetBrains Mono',monospace"}}>{c.v}</span>
                    <span className="nk-chip-name" style={{fontSize:11,color:"#a0a098"}}>{c.n}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Size explainer cards */}
      <div className="nk-size-grid" style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:24}}>
        <div style={sizeCard}>
          <div style={{fontSize:14,fontWeight:600,color:"#3a3a32",marginBottom:4}}>Малый запрос</div>
          <div style={{fontSize:13,color:"#8a8a82",lineHeight:1.5}}>Короткий вопрос — ответ в пару абзацев. Перевод фразы, быстрая справка, генерация идеи.</div>
        </div>
        <div style={sizeCard}>
          <div style={{fontSize:14,fontWeight:600,color:"#3a3a32",marginBottom:4}}>Средний запрос</div>
          <div style={{fontSize:13,color:"#8a8a82",lineHeight:1.5}}>Работа с документом 3–15 страниц. Написание письма, анализ отчёта, суммаризация встречи.</div>
        </div>
        <div style={sizeCard}>
          <div style={{fontSize:14,fontWeight:600,color:"#3a3a32",marginBottom:4}}>Большой запрос</div>
          <div style={{fontSize:13,color:"#8a8a82",lineHeight:1.5}}>Анализ большого текста от 15 страниц. Разбор договора, ревью кодовой базы, исследование.</div>
        </div>
      </div>

      {/* Limits table — main value block */}
      <div className="nk-limits-card" style={{background:"#fff",borderRadius:16,padding:"28px 32px",marginBottom:20}}>
        <div className="nk-limits-title" style={{fontSize:18,fontWeight:700,color:"#1a1a18",marginBottom:2}}>Выберите одну из моделей</div>
        <div className="nk-limits-sub" style={{fontSize:14,color:"#a0a098",marginBottom:20}}>На ваш бюджет каждый сотрудник сможет сделать столько запросов</div>

        <div style={{display:"flex",flexDirection:"column",gap:0}}>
          {/* Header row */}
          <div className="nk-limits-header" style={{display:"flex",alignItems:"center",gap:16,padding:"0 20px 10px"}}>
            <div style={{width:220,flexShrink:0,fontSize:11,fontWeight:500,color:"#b0b0a8",textTransform:"uppercase",letterSpacing:"0.03em"}}>Модель</div>
            <div style={{display:"flex",flex:1,gap:8}}>
              {["Малых","Средних","Больших"].map(h=>(
                <div key={h} style={{flex:1,textAlign:"center",fontSize:11,fontWeight:500,color:"#b0b0a8",textTransform:"uppercase",letterSpacing:"0.03em"}}>{h}</div>
              ))}
            </div>
          </div>
          {/* Rows */}
          {lim.map((m,i)=>(
            <div key={i} className="nk-limits-row" style={{
              display:"flex",alignItems:"center",gap:16,
              background:"#fafaf8",borderRadius:12,padding:"14px 20px",marginBottom:6,
            }}>
              <div className="nk-limits-model" style={{width:220,flexShrink:0}}>
                <span className={m.desc?"nk-tooltip":""} data-tip={m.desc||""}>
                  <div style={{fontSize:15,fontWeight:600,color:"#1a1a18",marginBottom:3}}>{m.n}</div>
                  <Tag tier={m.t}/>
                </span>
              </div>
              <div className="nk-limits-nums" style={{display:"flex",flex:1,gap:8}}>
                {["small","medium","large"].map(k=>{
                  const d=m.ps[k];
                  const szLbl={small:"Малых",medium:"Средних",large:"Больших"};
                  return (
                    <div key={k} style={{flex:1,textAlign:"center",padding:"4px 0"}}>
                      <div className="nk-limits-num-val" style={{fontSize:20,fontWeight:700,color:"#1a1a18",fontFamily:"'JetBrains Mono',monospace"}}>
                        {fi(d.pp)}
                      </div>
                      <div className="nk-num-label">{szLbl[k]}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* OR separator text */}
        <div style={{textAlign:"center",padding:"12px 0 4px",fontSize:11,color:"#c5c5bc",letterSpacing:"0.05em"}}>
          Баланс расходуется по факту использования. Можно комбинировать модели — бюджет общий.
        </div>
      </div>

      {/* Images */}
      {imgL.length>0 && (
        <div className="nk-img-card" style={{background:"#fff",borderRadius:16,padding:"24px 32px",marginBottom:20}}>
          <div style={{fontSize:16,fontWeight:600,color:"#1a1a18",marginBottom:14}}>Генерация изображений</div>
          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            {imgL.map((m,i)=>(
              <div key={i} style={{flex:"1 1 180px",background:"#fafaf8",borderRadius:12,padding:"16px 20px",textAlign:"center"}}>
                <div className="nk-img-num" style={{fontSize:26,fontWeight:700,color:"#1a1a18",fontFamily:"'JetBrains Mono',monospace"}}>{fi(m.pp)}</div>
                <div style={{fontSize:12,color:"#a0a098",marginTop:3}}>картинок на сотрудника</div>
                <span className={m.desc?"nk-tooltip":""} data-tip={m.desc||""}><div style={{fontSize:13,fontWeight:500,color:"#5a5a52",marginTop:5}}>{m.n}</div></span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Prices — collapsed */}
      <button onClick={()=>setShowPrices(!showPrices)} style={{
        ...linkBtn,fontSize:14,marginBottom:showPrices?0:20,padding:"10px 0",display:"block",
      }}>
        {showPrices ? "Скрыть детализацию цен ↑" : "Подробнее о ценах →"}
      </button>

      {showPrices && (
        <Crd title="Стоимость запросов" sub="Цена за 1 запрос (₽ и кредиты)">
          <Tbl><THd><Tc>Модель</Tc><Tc>Уровень</Tc><Tc r>Малый</Tc><Tc r>Средний</Tc><Tc r>Большой</Tc></THd>
          <tbody>{txt.map((m,i)=>(
            <Rw key={i}><Td b>{m.n}</Td><Td g>{m.t}</Td>
              {["small","medium","large"].map(sz=>(
                <Td key={sz} r mn>{f(m.sz[sz].ccR)} ₽ <G>{f(m.sz[sz].cr)} кр</G></Td>
              ))}
            </Rw>
          ))}</tbody></Tbl>
        </Crd>
      )}

      {/* Request model */}
      <div className="nk-req-card" style={{borderRadius:16,padding:"24px 32px",background:"#fff",marginBottom:20}}>
        {!showReq && !reqSent && (
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontSize:14,fontWeight:600,color:"#1a1a18"}}>Не нашли нужную модель?</div>
              <div style={{fontSize:13,color:"#8a8a82",marginTop:3}}>Отправьте запрос — мы подключим</div>
            </div>
            <button onClick={()=>setShowReq(true)} style={gBtn}>Запросить</button>
          </div>
        )}
        {showReq && !reqSent && (
          <div>
            <div style={{fontSize:14,fontWeight:600,color:"#1a1a18",marginBottom:12}}>Запрос на подключение</div>
            <input placeholder="Название компании *" value={companyName} onChange={e=>{setCompanyName(e.target.value);setFormErr(p=>({...p,companyName:false}));}} style={{...rInp,border:formErr.companyName?"1.5px solid #ef4444":"1.5px solid transparent"}}/>
            <input placeholder="Название модели *" value={modelName} onChange={e=>{setModelName(e.target.value);setFormErr(p=>({...p,modelName:false}));}} style={{...rInp,border:formErr.modelName?"1.5px solid #ef4444":"1.5px solid transparent"}}/>
            <div>
              <input placeholder="Телефон или Telegram *" value={contact} onChange={e=>{setContact(e.target.value);setFormErr(p=>({...p,contact:false}));}} style={{...rInp,border:formErr.contact?"1.5px solid #ef4444":"1.5px solid transparent",marginBottom:formErr.contact?4:8}}/>
              {formErr.contact && <div style={{fontSize:11,color:"#ef4444",marginBottom:8,paddingLeft:2}}>
                {formErr.contact==="phone"?"Некорректный номер телефона":formErr.contact==="tg"?"Минимум 5 символов после @":formErr.contact==="format"?"Введите +7... (телефон) или @username (Telegram)":"Укажите контакт для связи"}
              </div>}
            </div>
            <textarea placeholder="Зачем вам эта модель? (необязательно)" value={comment} onChange={e=>setComment(e.target.value)} style={{...rInp,height:56,resize:"vertical",fontFamily:"inherit"}}/>
            <label style={{display:"flex",alignItems:"flex-start",gap:8,margin:"8px 0 12px",cursor:"pointer"}}>
              <input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} style={{marginTop:2,accentColor:"#16a34a",width:16,height:16,flexShrink:0}}/>
              <span style={{fontSize:12,color:"#8a8a82",lineHeight:1.4}}>Я согласен на <a href="#" style={{color:"#16a34a",textDecoration:"underline"}} onClick={e=>e.preventDefault()}>обработку персональных данных</a></span>
            </label>
            <div style={{display:"flex",gap:8}}>
              <button onClick={submitReq} disabled={!consent} style={{...gBtn,opacity:consent?1:0.45,cursor:consent?"pointer":"not-allowed"}}>Отправить</button>
              <button onClick={()=>{setShowReq(false);setFormErr({});setConsent(false);}} style={{...gBtn,background:"transparent",color:"#8a8a82"}}>Отмена</button>
            </div>
          </div>
        )}
        {reqSent && (
          <div style={{textAlign:"center",padding:"8px 0"}}>
            <div style={{fontSize:14,fontWeight:600,color:"#16a34a"}}>✓ Запрос отправлен</div>
            <div style={{fontSize:13,color:"#8a8a82",marginTop:3}}>Мы свяжемся с вами</div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Admin ──────────────────────────────────────── */
function Admin({mods,setMods,cfg,setCfg,mg,setMg,reqs,onSave,onReset,dirty,saving}){
  const [priceTab,setPriceTab]=useState(cfg.pricingMode||"openrouter");
  const {pm,txt,im}=useEng(mods,cfg,mg,priceTab);
  const [eId,setEId]=useState(null);
  const [fm,setFm]=useState({});
  const [saved,setSaved]=useState(false);
  const [adminTab,setAdminTab]=useState("settings");
  const [tblView,setTblView]=useState("full"); // "full" | "client"
  const sE=m=>{setEId(m.id);setFm({...m});};
  const cE=()=>{setEId(null);setFm({});};
  const sv=()=>{
    if(priceTab==="openrouter"){
      setMods(p=>p.map(m=>m.id===eId?{...m,...fm,i:+fm.i||0,o:+fm.o||0,p:+fm.p||0}:m));
    }else{
      setMods(p=>p.map(m=>m.id===eId?{...m,...fm,di:+fm.di||0,do_:+fm.do_||0,dp:+fm.dp||0}:m));
    }
    cE();
  };
  const dl=id=>setMods(p=>p.filter(m=>m.id!==id));
  const ad=tp=>{
    const nid=Math.max(0,...mods.map(m=>m.id))+1;
    const nm=tp==="text"?{id:nid,n:"Новая модель",t:"Премиум",i:1,o:5,di:1,do_:5,tp:"text",desc:""}:{id:nid,n:"Новая модель",t:"Дизайн",i:0,o:0,tp:"image",p:0.05,dp:0.05,desc:""};
    setMods(p=>[...p,nm]);sE(nm);
  };
  const mix={"Базовый":0.50,"Премиум":0.35,"Ультра":0.15};
  const avgM=Object.entries(mix).reduce((s,[t,w])=>s+(mg[t]||0)*w,0);

  return (
    <div>
      {/* Sticky save bar */}
      {(dirty||saved) && (
        <div className="nk-save-bar" style={{position:"sticky",top:0,zIndex:10,background:"#F5F4F0",padding:"12px 0",borderBottom:"1px solid #e8e6e0",marginInline:-48,paddingInline:48}}>
          <div style={{display:"flex",alignItems:"center",gap:10,justifyContent:"flex-end"}}>
            {saved && <span style={{fontSize:13,color:"#16a34a",fontWeight:500}}>✓ Сохранено</span>}
            {dirty && <>
              <span style={{fontSize:13,color:"#a0a098",marginRight:"auto"}}>Есть несохранённые изменения</span>
              <button className="nk-reset-btn" onClick={onReset}>Сбросить</button>
              <button className="nk-save-btn" disabled={saving} onClick={async()=>{await onSave();setSaved(true);setTimeout(()=>setSaved(false),2000);}} style={saving?{opacity:0.6}:{}}>{saving?"Сохранение...":"Сохранить"}</button>
            </>}
          </div>
        </div>
      )}

      <div style={{padding:"32px 0 20px"}}>
        <h2 style={{fontSize:20,fontWeight:700,margin:0,color:"#1a1a18"}}>Управление</h2>
        <p style={{fontSize:14,color:"#a0a098",margin:"2px 0 0"}}>Константы, маржа, модели</p>
      </div>

      {/* Admin sub-tabs */}
      <div style={{display:"flex",gap:4,marginBottom:20}}>
        {[{id:"settings",l:"Настройки"},{id:"requests",l:"Заявки"}].map(({id,l})=>(
          <button key={id} onClick={()=>setAdminTab(id)} style={{
            background:adminTab===id?"#fff":"transparent",border:"none",
            color:adminTab===id?"#1a1a18":"#b0b0a8",fontSize:13,fontWeight:adminTab===id?600:400,
            padding:"8px 18px",borderRadius:10,cursor:"pointer",display:"flex",alignItems:"center",gap:6,
          }}>
            {l}
            {id==="requests"&&reqs.length>0&&<span style={{
              width:18,height:18,borderRadius:9,
              background:"#16a34a",color:"#fff",fontSize:10,fontWeight:700,
              display:"inline-flex",alignItems:"center",justifyContent:"center",flexShrink:0,
            }}>{reqs.length}</span>}
          </button>
        ))}
      </div>

      {adminTab==="settings" && <>
        {/* Pricing mode toggle — one toggle controls everything */}
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
          <span style={{fontSize:13,fontWeight:500,color:"#8a8a82"}}>Источник цен:</span>
          <div style={{display:"flex",gap:2,background:"#F5F4F0",borderRadius:10,padding:3}}>
            {[{v:"openrouter",l:"OpenRouter"},{v:"direct",l:"Прямое API"}].map(({v,l})=>(
              <button key={v} onClick={()=>{setPriceTab(v);setCfg(c=>({...c,pricingMode:v}));cE();}} style={{
                border:"none",padding:"7px 20px",borderRadius:8,fontSize:13,fontWeight:priceTab===v?600:400,
                cursor:"pointer",background:priceTab===v?"#fff":"transparent",
                color:priceTab===v?"#1a1a18":"#b0b0a8",
                boxShadow:priceTab===v?"0 1px 3px rgba(0,0,0,.06)":"none",
              }}>{l}</button>
            ))}
          </div>
        </div>

        <div className="nk-admin-grid" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
          <div style={crd}>
            <div style={crdT}>Константы</div>
            {[{k:"bankCommission",l:"Комиссия банка",s:"%",m:100},{k:"openrouterCommission",l:"OpenRouter",s:"%",m:100},{k:"usdRub",l:"Курс USD/RUB",s:"₽"},{k:"creditPriceUsd",l:"1 кредит",s:"$"}].filter(({k})=>priceTab==="openrouter"||k!=="openrouterCommission").map(({k,l,s,m})=>(
              <div key={k} style={aR}>
                <span style={aL}>{l}</span>
                <input type="number" step="any" value={m?+(cfg[k]*m).toFixed(2):cfg[k]} onChange={e=>setCfg({...cfg,[k]:m?(+e.target.value||0)/m:+e.target.value||0})} style={aI}/>
                <span style={{fontSize:12,color:"#b0b0a8"}}>{s}</span>
              </div>
            ))}
            <div style={{marginTop:8,fontSize:12,color:"#b0b0a8"}}>Множитель: <b style={{color:"#5a5a52"}}>{pm.toFixed(3)}</b></div>
          </div>
          <div style={crd}>
            <div style={crdT}>Маржа</div>
            {TIERS.map(t=>(
              <div key={t} style={aR}>
                <span style={{...aL,width:72}}>{t}</span>
                <input type="number" step="1" min="0" max="99" value={Math.round((mg[t]||0)*100)} onChange={e=>setMg({...mg,[t]:Math.min(99,Math.max(0,+e.target.value||0))/100})} style={{...aI,width:48}}/>
                <span style={{fontSize:12,color:"#b0b0a8"}}>%</span>
                <span style={{fontSize:12,color:"#8a8a82",marginLeft:4}}>×{(1/(1-(mg[t]||0))).toFixed(2)}</span>
              </div>
            ))}
            <div style={{marginTop:8,fontSize:12,color:"#b0b0a8"}}>Средняя: <b style={{color:"#5a5a52"}}>{(avgM*100).toFixed(0)}%</b></div>
          </div>
        </div>

        <div style={crd}>
          <div style={crdT}>Контакты</div>
          <div style={aR}>
            <span style={aL}>Ссылка сэйлза</span>
            <input type="url" value={cfg.contactUrl||""} onChange={e=>setCfg({...cfg,contactUrl:e.target.value})} placeholder="https://t.me/..." style={{...aI,width:"auto",flex:1,fontFamily:"'Inter',sans-serif"}}/>
          </div>
          <a href={cfg.contactUrl} target="_blank" rel="noopener noreferrer" style={{display:"inline-flex",alignItems:"center",gap:6,marginTop:8,fontSize:13,color:"#16a34a",textDecoration:"none",fontWeight:500}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
            Проверить ссылку →
          </a>
        </div>

        {/* Table view toggle */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
          <div/>
          <div style={{display:"flex",gap:2,background:"#F5F4F0",borderRadius:8,padding:2}}>
            {[{v:"full",l:"Полная"},{v:"client",l:"Для клиента"}].map(({v,l})=>(
              <button key={v} onClick={()=>setTblView(v)} style={{
                border:"none",padding:"5px 14px",borderRadius:7,fontSize:12,fontWeight:tblView===v?600:400,
                cursor:"pointer",background:tblView===v?"#fff":"transparent",
                color:tblView===v?"#1a1a18":"#b0b0a8",
                boxShadow:tblView===v?"0 1px 3px rgba(0,0,0,.06)":"none",
              }}>{l}</button>
            ))}
          </div>
        </div>

        <Crd title="Текстовые модели" action={<button onClick={()=>ad("text")} style={addB}>+ Добавить</button>}>
          {tblView==="full"?(
          <Tbl><THd><Tc>Модель</Tc><Tc>Тир</Tc><Tc r>{priceTab==="openrouter"?"OpenRouter":"API"} $/M</Tc><Tc r>Себест. ₽/M</Tc><Tc r>Клиент ₽/M</Tc><Tc r>Маржа</Tc><Tc r>Ср. запрос</Tc><Tc></Tc></THd>
          <tbody>{txt.map(m=>eId===m.id?(
            <tr key={m.id} style={{background:"#faf9f5"}}>
              <td style={tdc}><input value={fm.n} onChange={e=>setFm({...fm,n:e.target.value})} style={{...aI,width:130}}/></td>
              <td style={tdc}><select value={fm.t} onChange={e=>setFm({...fm,t:e.target.value})} style={{...aI,width:90}}>{["Базовый","Премиум","Ультра"].map(t=><option key={t}>{t}</option>)}</select></td>
              {priceTab==="openrouter"?(
                <td style={{...tdc,textAlign:"right"}}><input type="number" step="0.01" value={fm.i} onChange={e=>setFm({...fm,i:e.target.value})} style={{...aI,width:50}}/><span style={{color:"#d0d0c8"}}> / </span><input type="number" step="0.01" value={fm.o} onChange={e=>setFm({...fm,o:e.target.value})} style={{...aI,width:50}}/></td>
              ):(
                <td style={{...tdc,textAlign:"right"}}><input type="number" step="0.01" value={fm.di??fm.i} onChange={e=>setFm({...fm,di:e.target.value})} style={{...aI,width:50}}/><span style={{color:"#d0d0c8"}}> / </span><input type="number" step="0.01" value={fm.do_??fm.o} onChange={e=>setFm({...fm,do_:e.target.value})} style={{...aI,width:50}}/></td>
              )}
              <td colSpan={3}><input value={fm.desc||""} onChange={e=>setFm({...fm,desc:e.target.value})} placeholder="Описание для тултипа" style={{...aI,width:"100%",fontFamily:"'Inter',sans-serif"}}/></td>
              <td style={tdc}><div style={{display:"flex",gap:4}}><button onClick={sv} style={svB}>✓</button><button onClick={cE} style={cnB}>✕</button></div></td>
            </tr>
          ):(
            <Rw key={m.id}>
              <Td b><div>{m.n}</div>{m.desc?<div style={{fontSize:11,fontWeight:400,color:"#b0b0a8",marginTop:2,maxWidth:140,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.desc}</div>:<div style={{fontSize:11,color:"#ddddd5",marginTop:2,fontStyle:"italic"}}>Нет описания</div>}</Td><Td g>{m.t}</Td>
              <Td r mn>{priceTab==="openrouter"?`$${m.i} / $${m.o}`:`$${m.di??m.i} / $${m.do_??m.o}`}</Td>
              <Td r mn><G>{f(m.bI*cfg.usdRub,1)} / {f(m.bO*cfg.usdRub,0)}</G></Td>
              <Td r mn>{f(m.sIR,1)} / {f(m.sOR,0)}</Td>
              <Td r mn>{(m.mr*100).toFixed(0)}%</Td>
              <Td r mn>{f(m.sz.medium.ccR)} ₽</Td>
              <td><button onClick={()=>sE(m)} style={eB}>✎</button><button onClick={()=>dl(m.id)} style={dB}>✕</button></td>
            </Rw>
          ))}</tbody></Tbl>
          ):(
          <Tbl><THd><Tc>Модель</Tc><Tc>Тир</Tc><Tc r>Input ₽/M</Tc><Tc r>Output ₽/M</Tc><Tc r>Ср. запрос</Tc></THd>
          <tbody>{txt.map((m,i)=>(
            <Rw key={i}>
              <Td b>{m.n}</Td><Td g>{m.t}</Td>
              <Td r mn>{f(m.sIR,1)}</Td>
              <Td r mn>{f(m.sOR,0)}</Td>
              <Td r mn>{f(m.sz.medium.ccR)} ₽</Td>
            </Rw>
          ))}</tbody></Tbl>
          )}
        </Crd>

        <Crd title="Модели изображений" action={<button onClick={()=>ad("image")} style={addB}>+ Добавить</button>}>
          {tblView==="full"?(
          <Tbl><THd><Tc>Модель</Tc><Tc r>{priceTab==="openrouter"?"OpenRouter":"API"} $/шт</Tc><Tc r>Себест. ₽</Tc><Tc r>Клиент ₽</Tc><Tc r>Кредитов</Tc><Tc></Tc></THd>
          <tbody>{im.map(m=>eId===m.id?(
            <tr key={m.id} style={{background:"#faf9f5"}}>
              <td style={tdc}><input value={fm.n} onChange={e=>setFm({...fm,n:e.target.value})} style={{...aI,width:130}}/></td>
              {priceTab==="openrouter"?(
                <td style={{...tdc,textAlign:"right"}}><input type="number" step="0.001" value={fm.p} onChange={e=>setFm({...fm,p:e.target.value})} style={{...aI,width:70}}/></td>
              ):(
                <td style={{...tdc,textAlign:"right"}}><input type="number" step="0.001" value={fm.dp??fm.p} onChange={e=>setFm({...fm,dp:e.target.value})} style={{...aI,width:70}}/></td>
              )}
              <td colSpan={3}></td>
              <td style={tdc}><div style={{display:"flex",gap:4}}><button onClick={sv} style={svB}>✓</button><button onClick={cE} style={cnB}>✕</button></div></td>
            </tr>
          ):(
            <Rw key={m.id}>
              <Td b>{m.n}</Td>
              <Td r mn>{priceTab==="openrouter"?`$${m.p||0}`:`$${(m.dp??m.p)||0}`}</Td>
              <Td r mn><G>{f(m.bR,2)} ₽</G></Td>
              <Td r mn><b>{f(m.sR,2)} ₽</b></Td>
              <Td r mn>{f(m.cr,1)}</Td>
              <td><button onClick={()=>sE(m)} style={eB}>✎</button><button onClick={()=>dl(m.id)} style={dB}>✕</button></td>
            </Rw>
          ))}</tbody></Tbl>
          ):(
          <Tbl><THd><Tc>Модель</Tc><Tc r>Клиент ₽/шт</Tc><Tc r>Кредитов</Tc></THd>
          <tbody>{im.map((m,i)=>(
            <Rw key={i}>
              <Td b>{m.n}</Td>
              <Td r mn><b>{f(m.sR,2)} ₽</b></Td>
              <Td r mn>{f(m.cr,1)}</Td>
            </Rw>
          ))}</tbody></Tbl>
          )}
        </Crd>

        {tblView==="full" && <div style={crd}>
          <div style={crdT}>Формулы</div>
          <div style={{fontSize:12,color:"#8a8a82",lineHeight:2,fontFamily:"'JetBrains Mono',monospace"}}>
            <div>себестоимость = {priceTab==="openrouter"?"OpenRouter":"API"} × {pm.toFixed(3)}{priceTab==="direct"?" (без комиссии OR)":""}</div>
            <div>клиент = себест. × множитель тира</div>
            <div>₽/запрос = (in × токены + out × токены) / 1 000 000</div>
          </div>
        </div>}
      </>}

      {adminTab==="requests" && (
        reqs.length===0
          ? <div style={{background:"#fff",borderRadius:14,padding:"40px 24px",textAlign:"center"}}>
              <div style={{fontSize:15,color:"#b0b0a8"}}>Заявок пока нет</div>
            </div>
          : <div>
              <div style={{fontSize:15,fontWeight:600,color:"#1a1a18",marginBottom:12}}>Заявки ({reqs.length})</div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {reqs.map(r=>(
                  <div key={r.id} style={{background:"#fff",borderRadius:12,padding:"14px 18px",display:"flex",alignItems:"center",gap:16}}>
                    <div style={{flex:"0 0 90px"}}>
                      <div style={{fontSize:11,color:"#b0b0a8",marginBottom:2}}>Дата</div>
                      <div style={{fontSize:13,color:"#8a8a82"}}>{r.date}</div>
                    </div>
                    <div style={{flex:"1 1 140px"}}>
                      <div style={{fontSize:11,color:"#b0b0a8",marginBottom:2}}>Компания</div>
                      <div style={{fontSize:14,fontWeight:600,color:"#1a1a18"}}>{r.companyName}</div>
                    </div>
                    <div style={{flex:"0 0 140px"}}>
                      <div style={{fontSize:11,color:"#b0b0a8",marginBottom:2}}>Контакт</div>
                      <div style={{fontSize:13,fontFamily:"'JetBrains Mono',monospace",color:"#3a3a32"}}>{r.contact}</div>
                    </div>
                    <div style={{flex:"0 0 120px"}}>
                      <div style={{fontSize:11,color:"#b0b0a8",marginBottom:2}}>Модель</div>
                      <div style={{fontSize:13,fontWeight:500,color:"#3a3a32"}}>{r.modelName}</div>
                    </div>
                    {r.comment && <div style={{flex:"1 1 120px"}}>
                      <div style={{fontSize:11,color:"#b0b0a8",marginBottom:2}}>Комментарий</div>
                      <div style={{fontSize:12,color:"#8a8a82"}}>{r.comment}</div>
                    </div>}
                  </div>
                ))}
              </div>
            </div>
      )}
    </div>
  );
}

/* ── Root ───────────────────────────────────────── */
export default function App(){
  const [mods,setMods]=useState(DModels);
  const [cfg,setCfg]=useState(DC);
  const [mg,setMg]=useState(DM);
  const [settingsLoaded,setSettingsLoaded]=useState(false);
  const [saving,setSaving]=useState(false);
  const [reqs,setReqs]=useState(loadReqs);
  const addReq=r=>setReqs(p=>{const n=[...p,{...r,id:Date.now(),date:new Date().toLocaleDateString("ru-RU")}];saveReqs(n);return n;});
  const [dirty,setDirty]=useState(false);
  const setModsD=v=>{setMods(v);setDirty(true);};
  const setCfgD=v=>{setCfg(v);setDirty(true);};
  const setMgD=v=>{setMg(v);setDirty(true);};

  // Load settings from server on mount
  useEffect(()=>{
    fetch("/api/settings").then(r=>r.json()).then(data=>{
      if(data&&data.mods){
        const merged=data.mods.map(m=>{const d=DModels.find(dm=>dm.id===m.id);return {...m,desc:m.desc??(d?.desc??""),di:m.di??(d?.di??m.i),do_:m.do_??(d?.do_??m.o),dp:m.dp??(d?.dp??m.p)};});
        setMods(merged);
        setCfg({...DC,...data.cfg});
        setMg({...DM,...data.mg});
      }
      setSettingsLoaded(true);
    }).catch(()=>setSettingsLoaded(true));
  },[]);

  const onSave=async()=>{
    setSaving(true);
    try{
      const pw=sessionStorage.getItem("nk-admin-pw")||"";
      const res=await fetch("/api/settings",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password:pw,settings:{mods,cfg,mg}})});
      const data=await res.json();
      if(data.ok)setDirty(false);
      else alert("Ошибка сохранения: "+((data).error||"Неизвестная ошибка"));
    }catch(e){alert("Ошибка сети при сохранении");}
    finally{setSaving(false);}
  };
  const onReset=()=>{if(!window.confirm("Сбросить все настройки к значениям по умолчанию?"))return;setMods(DModels);setCfg(DC);setMg(DM);setDirty(true);};

  const [authed,setAuthed]=useState(()=>sessionStorage.getItem("nk-admin")==="1");
  const [pg,setPg]=useState(()=>window.location.hash==="#admin"?(sessionStorage.getItem("nk-admin")==="1"?"admin":"login"):"client");
  const [pw,setPw]=useState("");
  const [pwErr,setPwErr]=useState(false);
  const [loginLoading,setLoginLoading]=useState(false);
  const [menuOpen,setMenuOpen]=useState(false);

  useEffect(()=>{
    const onHash=()=>{
      const h=window.location.hash==="#admin";
      if(h){setPg(sessionStorage.getItem("nk-admin")==="1"?"admin":"login");}
      else{setPg("client");}
    };
    window.addEventListener("hashchange",onHash);
    return ()=>window.removeEventListener("hashchange",onHash);
  },[]);

  const tryLogin=async()=>{
    if(loginLoading)return;
    setLoginLoading(true);
    setPwErr(false);
    try{
      const res=await fetch("/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password:pw})});
      const data=await res.json();
      if(data.ok){setAuthed(true);sessionStorage.setItem("nk-admin","1");sessionStorage.setItem("nk-admin-pw",pw);setPg("admin");}
      else setPwErr(true);
    }catch(e){console.error("Login error:",e);setPwErr(true);}
    finally{setLoginLoading(false);}
  };
  const logout=()=>{setAuthed(false);sessionStorage.removeItem("nk-admin");sessionStorage.removeItem("nk-admin-pw");window.location.hash="";setPg("client");};

  const navBtn=(id,label)=>(<button key={id} onClick={()=>{setPg(id);setMenuOpen(false);}} className={`nk-nav ${pg===id?"nk-nav-active":"nk-nav-idle"}`}>{label}</button>);

  return (
    <div style={{fontFamily:"'Inter',-apple-system,sans-serif",background:"#F5F4F0",color:"#3a3a32",minHeight:"100vh"}}>
      <style>{`
        html,body{margin:0;padding:0;background:#F5F4F0}*{box-sizing:border-box}input,select,textarea{outline:none;font-family:inherit}
        input[type=number]{-moz-appearance:textfield}input::-webkit-outer-spin-button,input::-webkit-inner-spin-button{-webkit-appearance:none}
        table{border-collapse:collapse;width:100%}
        .nk-wrap{max-width:1280px;margin:0 auto;padding:0 48px 60px}
        .nk-wrap-nav{max-width:1280px;margin:0 auto;padding:14px 48px 10px}
        .nk-num-label{display:none;font-size:10px;color:#b0b0a8;margin-top:2px;text-align:center}
        .nk-contact-btn{display:inline-flex;align-items:center;gap:6px;background:#16a34a;color:#fff;border:none;border-radius:10px;padding:8px 18px;font-size:13px;font-weight:600;cursor:pointer;text-decoration:none;transition:background .15s;margin-left:8px;white-space:nowrap}
        .nk-contact-btn:hover{background:#15803d}
        .nk-contact-short{display:none}
        .nk-burger{display:none}
        .nk-nav-menu{display:flex;align-items:center;gap:4px}
        .nk-tooltip{position:relative;cursor:help}
        .nk-tooltip::after{content:attr(data-tip);position:absolute;left:0;top:calc(100% + 6px);background:#1a1a18;color:#fff;font-size:12px;font-weight:400;line-height:1.4;padding:8px 12px;border-radius:8px;white-space:normal;width:240px;opacity:0;visibility:hidden;transition:opacity .15s;z-index:100;pointer-events:none}
        .nk-tooltip:hover::after{opacity:1;visibility:visible}
        @media(max-width:768px){.nk-wrap{padding:0 20px 40px}.nk-wrap-nav{padding:14px 20px 10px}.nk-save-bar{margin-inline:-20px !important;padding-inline:20px !important}}
        @media(max-width:600px){
          .nk-hero{padding:32px 0 16px !important}
          .nk-hero-title{font-size:22px !important;line-height:1.25 !important}
          .nk-hero-sub{font-size:14px !important;margin-bottom:24px !important}
          .nk-hero-inputs{flex-direction:column !important;gap:10px !important;max-width:100% !important}
          .nk-main-input{font-size:18px !important;padding:12px 14px !important}
          .nk-size-grid{grid-template-columns:1fr !important;gap:8px !important}
          .nk-limits-card{padding:16px !important;border-radius:12px !important}
          .nk-limits-header{display:none !important}
          .nk-limits-row{flex-direction:column !important;align-items:stretch !important;gap:8px !important;padding:12px 14px !important}
          .nk-limits-model{width:100% !important}
          .nk-limits-nums{gap:4px !important}
          .nk-num-label{display:block !important}
          .nk-limits-num-val{font-size:17px !important}
          .nk-img-card{padding:16px !important;border-radius:12px !important}
          .nk-img-num{font-size:22px !important}
          .nk-req-card{padding:16px !important;border-radius:12px !important}
          .nk-chips-wrap{padding:8px 0 20px !important;max-width:100% !important}
          .nk-chips-card{padding:10px 14px !important}
          .nk-chip-val{font-size:15px !important}
          .nk-chip-name{font-size:10px !important}
          .nk-limits-title{font-size:16px !important}
          .nk-limits-sub{font-size:13px !important}
          .nk-nav-brand{font-size:15px !important}
          .nk-burger{display:flex !important;flex-direction:column;gap:4px;background:none;border:none;cursor:pointer;padding:8px;z-index:51}
          .nk-burger span{display:block;width:20px;height:2px;background:#3a3a32;border-radius:1px}
          .nk-nav-menu{display:none !important;position:absolute;top:100%;right:20px;background:#fff;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,.12);padding:8px;flex-direction:column;gap:2px;z-index:50;min-width:180px}
          .nk-menu-open{display:flex !important}
          .nk-nav{font-size:15px !important;padding:12px 16px !important;border-radius:10px !important;width:100%;text-align:left}
          .nk-admin-grid{grid-template-columns:1fr !important}
          .nk-contact-btn{padding:6px 12px !important;font-size:12px !important;margin-left:4px !important}
          .nk-contact-full{display:none !important}
          .nk-contact-short{display:inline !important}
        }
        .nk-nav{background:none;border:none;font-size:13px;padding:8px 14px;border-radius:8px;cursor:pointer;transition:background .15s,color .15s}
        .nk-nav:hover{background:rgba(0,0,0,.05)}
        .nk-nav-active{font-weight:600;color:#2a2a22}
        .nk-nav-idle{font-weight:400;color:#b0b0a8}
        .nk-save-btn{background:#16a34a;border:none;color:#fff;padding:8px 20px;border-radius:10px;cursor:pointer;font-size:13px;font-weight:600;transition:background .15s}
        .nk-save-btn:hover{background:#15803d}
        .nk-reset-btn{background:none;border:none;color:#b0b0a8;font-size:12px;cursor:pointer;padding:8px 10px;border-radius:8px;transition:background .15s,color .15s}
        .nk-reset-btn:hover{background:rgba(239,68,68,.08);color:#ef4444}
      `}</style>

      <nav style={{borderBottom:"1px solid #e8e6e0",position:"relative"}}>
        <div className="nk-wrap-nav" style={{display:"flex",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginRight:"auto"}}>
            <Logo size={36}/>
            <span className="nk-nav-brand" style={{fontSize:18,fontWeight:700,color:"#2a2a22",letterSpacing:"-0.02em"}}>Нейроключ</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:4}}>
            {authed && <>
              <button className="nk-burger" onClick={()=>setMenuOpen(!menuOpen)}>
                <span/><span/><span/>
              </button>
              <div className={`nk-nav-menu${menuOpen?" nk-menu-open":""}`}>
                {navBtn("client","Калькулятор")}
                {navBtn("admin","Управление")}
                <button onClick={()=>{logout();setMenuOpen(false);}} className="nk-nav nk-nav-idle" style={{fontSize:12}}>Выйти</button>
              </div>
            </>}
            {!authed && <a href={cfg.contactUrl} target="_blank" rel="noopener noreferrer" className="nk-contact-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
              <span className="nk-contact-full">Связаться с нами</span>
              <span className="nk-contact-short">Написать</span>
            </a>}
          </div>
        </div>
      </nav>

      <div className="nk-wrap">
      {pg==="login" ? (
        <div style={{maxWidth:340,margin:"120px auto",textAlign:"center"}}>
          <div style={{fontSize:18,fontWeight:600,color:"#1a1a18",marginBottom:4}}>Управление</div>
          <div style={{fontSize:13,color:"#a0a098",marginBottom:20}}>Введите пароль для доступа</div>
          <input type="password" value={pw} onChange={e=>{setPw(e.target.value);setPwErr(false);}}
            onKeyDown={e=>e.key==="Enter"&&tryLogin()}
            placeholder="Пароль"
            style={{...rInp,textAlign:"center",border:pwErr?"1.5px solid #ef4444":"1.5px solid transparent",marginBottom:12}}/>
          {pwErr && <div style={{fontSize:12,color:"#ef4444",marginBottom:12}}>Неверный пароль</div>}
          <button onClick={tryLogin} disabled={loginLoading} style={{...gBtn,opacity:loginLoading?0.6:1}}>{loginLoading?"...":"Войти"}</button>
        </div>
      ) : pg==="admin" ? (
        <Admin mods={mods} setMods={setModsD} cfg={cfg} setCfg={setCfgD} mg={mg} setMg={setMgD} reqs={reqs} onSave={onSave} onReset={onReset} dirty={dirty} saving={saving}/>
      ) : (
        <Client mods={mods} cfg={cfg} mg={mg} addReq={addReq}/>
      )}
      </div>
      <Analytics />
    </div>
  );
}

/* ── Styles ─────────────────────────────────────── */
const lbl={display:"block",fontSize:12,color:"#a0a098",marginBottom:4,fontWeight:500};
const mInp={width:"100%",padding:"14px 18px",fontSize:24,fontWeight:600,fontFamily:"'Inter',sans-serif",border:"none",borderRadius:12,background:"#fff",color:"#1a1a18"};
const sizeCard={background:"#fff",borderRadius:14,padding:"16px 20px"};
const crd={background:"#fff",borderRadius:14,padding:"18px 22px",marginBottom:16};
const crdT={fontSize:11,fontWeight:600,color:"#b0b0a8",marginBottom:10,textTransform:"uppercase",letterSpacing:"0.04em"};
const aR={display:"flex",alignItems:"center",gap:8,marginBottom:5};
const aL={fontSize:13,color:"#8a8a82",width:120,flexShrink:0};
const aI={border:"none",borderRadius:6,padding:"5px 8px",fontSize:13,fontFamily:"'JetBrains Mono',monospace",color:"#3a3a32",background:"#F5F4F0",width:72};
const tdc={padding:"6px 12px"};
const gBtn={background:"#16a34a",border:"none",color:"#fff",padding:"8px 20px",borderRadius:10,cursor:"pointer",fontSize:13,fontWeight:600};
const addB={background:"#eceae4",border:"none",color:"#5a5a52",padding:"5px 14px",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:500};
const eB={background:"none",border:"none",color:"#c5c5bc",cursor:"pointer",fontSize:14,padding:"2px 5px"};
const dB={background:"none",border:"none",color:"#ddddd5",cursor:"pointer",fontSize:14,padding:"2px 5px"};
const svB={width:28,height:28,borderRadius:8,border:"none",background:"#16a34a",color:"#fff",fontSize:14,cursor:"pointer",display:"inline-flex",alignItems:"center",justifyContent:"center"};
const cnB={width:28,height:28,borderRadius:8,border:"none",background:"#eceae4",color:"#8a8a82",fontSize:14,cursor:"pointer",display:"inline-flex",alignItems:"center",justifyContent:"center"};
const rInp={width:"100%",padding:"10px 14px",fontSize:14,border:"none",borderRadius:10,background:"#F5F4F0",color:"#3a3a32",marginBottom:8,display:"block"};
const linkBtn={background:"none",border:"none",color:"#16a34a",cursor:"pointer",fontSize:12,fontWeight:500,padding:0,textDecoration:"none"};
