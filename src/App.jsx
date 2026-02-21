import { useState, useEffect, useRef } from "react";

const LIGHT = {
  bg:"#FAF9F5",surface:"#FFFFFF",surfaceAlt:"#F5F3ED",border:"#E8E3D8",
  text:"#1B2E1B",textSec:"#5C6B5C",textMuted:"#8F9C8F",
  green:"#006747",greenLight:"#E8F2EC",greenDark:"#004D35",
  yellow:"#FDCF00",yellowLight:"#FFF8DC",yellowSoft:"#F5E6A0",
  gold:"#C6A84B",azalea:"#D6447C",red:"#C0392B",
  birdie:"#006747",bogey:"#B8860B",eagle:"#004D35",dbl:"#C0392B",
  navBg:"#FFFFFF",navBorder:"#E8E3D8",
  shadow:"0 1px 4px rgba(27,46,27,0.06),0 4px 16px rgba(27,46,27,0.04)",
  grass:"#4A8C3F",fairway:"rgba(120,180,100,0.4)",mGreen:"#5AB850",
};
const DARK = {
  bg:"#0B1A0B",surface:"#142014",surfaceAlt:"#1A2B1A",border:"#2A3D2A",
  text:"#E8EDE8",textSec:"#9BAD9B",textMuted:"#6B7D6B",
  green:"#00A86B",greenLight:"#1A3325",greenDark:"#00D68F",
  yellow:"#FDCF00",yellowLight:"#2A2810",yellowSoft:"#3D3A1A",
  gold:"#D4B84D",azalea:"#E8558A",red:"#E74C3C",
  birdie:"#00D68F",bogey:"#D4A84B",eagle:"#00E89A",dbl:"#E74C3C",
  navBg:"#0F1C0F",navBorder:"#1F301F",
  shadow:"0 1px 4px rgba(0,0,0,0.3),0 4px 16px rgba(0,0,0,0.2)",
  grass:"#1A3D1A",fairway:"rgba(40,80,30,0.6)",mGreen:"#2D6B2D",
};

const PLAYERS=[
  {id:1,name:"Christo",av:"C",hcp:8.4,rank:"Scratch",col:"#006747",rounds:142},
  {id:2,name:"Scott",av:"S",hcp:12.1,rank:"Club Regular",col:"#2D8B57",rounds:89},
  {id:3,name:"Rakan",av:"R",hcp:5.7,rank:"Tour Pro",col:"#C6A84B",rounds:312},
  {id:4,name:"Aston",av:"A",hcp:15.3,rank:"Weekend Warrior",col:"#4A7C5A",rounds:47},
  {id:5,name:"JTK",av:"J",hcp:10.2,rank:"Club Regular",col:"#8B5E3C",rounds:76},
];

const CLUBS=["Driver","3W","5W","3H","4i","5i","6i","7i","8i","9i","PW","GW","SW","LW","Putter"];

const PROPS=[
  {id:"closest",name:"Closest to Pin",icon:"🎯",desc:"Closest approach to the flag"},
  {id:"longest",name:"Longest Drive",icon:"💣",desc:"Longest drive in the fairway"},
  {id:"first_on",name:"First on Green",icon:"🟢",desc:"First to hit the green"},
  {id:"one_putt",name:"One-Putt",icon:"🕳️",desc:"Only player to one-putt"},
  {id:"sandy",name:"Sandy",icon:"🏖️",desc:"Up and down from the sand"},
  {id:"greenie",name:"Greenie",icon:"⛳",desc:"GIR on a par 3"},
  {id:"brd",name:"Birdie+",icon:"🐦",desc:"Make birdie or better"},
  {id:"no3",name:"No 3-Putt",icon:"🚫",desc:"Avoid the three-putt"},
  {id:"fairway",name:"Fairway Finder",icon:"🎳",desc:"Hit the short grass"},
  {id:"low",name:"Low Score",icon:"👑",desc:"Lowest score wins"},
];

const DEFAULT_HOLES=Array.from({length:18},(_,i)=>({
  num:i+1,
  par:[4,5,3,4,4,3,5,4,4,4,3,5,4,4,3,4,5,4][i],
  yds:[405,542,178,388,432,165,518,375,410,392,195,530,415,368,152,445,555,430][i],
  hcp:[7,3,15,9,1,17,5,11,13,8,16,2,6,12,18,4,10,14][i],
  name:["Tea Olive","Pink Dogwood","Flowering Peach","Flowering Crab Apple","Magnolia","Juniper","Pampas","Yellow Jasmine","Carolina Cherry","Camellia","White Dogwood","Golden Bell","Azalea","Chinese Fir","Firethorn","Redbud","Nandina","Holly"][i],
}));

// Parse scorecard data from Golf Course API
function parseCourseData(course) {
  try {
    const scorecard = typeof course.scorecard === "string" ? JSON.parse(course.scorecard) : course.scorecard;
    if (!scorecard || !Array.isArray(scorecard) || scorecard.length === 0) return null;

    // Find par row, handicap row, and tee rows
    const parRow = scorecard.find(r => {
      const label = r["Hole:"] || r["Hole"] || "";
      return label.toLowerCase().includes("par");
    });
    const hcpRow = scorecard.find(r => {
      const label = r["Hole:"] || r["Hole"] || "";
      return label.toLowerCase().includes("handicap") || label.toLowerCase().includes("hcp");
    });
    const teeRows = scorecard.filter(r => {
      const label = r["Hole:"] || r["Hole"] || "";
      const lower = label.toLowerCase();
      return !lower.includes("par") && !lower.includes("handicap") && !lower.includes("hcp") && label !== "";
    });

    if (!parRow) return null;

    const numHoles = course.holes || 18;
    const holes = [];
    for (let i = 1; i <= numHoles; i++) {
      const key = String(i);
      holes.push({
        num: i,
        par: parseInt(parRow[key]) || 4,
        yds: 0, // filled per tee selection
        hcp: hcpRow ? (parseInt(hcpRow[key]) || i) : i,
        name: "Hole " + i,
      });
    }

    // Extract tee options with yardages per hole
    const tees = teeRows.map(row => {
      const label = (row["Hole:"] || row["Hole"] || "Unknown").replace(":", "").trim();
      const yardages = [];
      for (let i = 1; i <= numHoles; i++) {
        yardages.push(parseInt(row[String(i)]) || 0);
      }
      const total = yardages.reduce((a, b) => a + b, 0);
      return { name: label, yardages, total };
    }).filter(t => t.total > 0); // only tees with actual yardage data

    return { holes, tees, numHoles, name: course.courseName || course.name || "Unknown Course" };
  } catch (e) {
    console.error("Failed to parse course data:", e);
    return null;
  }
}

const GAMES=[
  {id:"nassau",name:"Nassau",icon:"🏆"},{id:"wolf",name:"Wolf",icon:"🐺"},
  {id:"skins",name:"Skins",icon:"💰"},{id:"match",name:"Match Play",icon:"⚔️"},
  {id:"bestball",name:"Best Ball",icon:"🤝"},{id:"stableford",name:"Stableford",icon:"📊"},
  {id:"bbb",name:"Bingo Bango Bongo",icon:"🎪"},{id:"hammer",name:"Hammer",icon:"🔨"},
  {id:"vegas",name:"Vegas",icon:"🎰"},{id:"snake",name:"Snake",icon:"🐍"},
  {id:"dots",name:"Dots / Trash",icon:"🗑️"},{id:"quota",name:"Quota",icon:"📋"},
];

function ToggleSwitch({on, onToggle, label, C}) {
  return (
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0"}}>
      <div style={{fontSize:14,fontWeight:600,color:C.text}}>{label}</div>
      <div onClick={onToggle} style={{width:48,height:28,borderRadius:14,background:on?C.green:C.border,display:"flex",alignItems:"center",padding:3,cursor:"pointer",transition:"background 0.3s"}}>
        <div style={{width:22,height:22,borderRadius:11,background:"#fff",marginLeft:on?"auto":0,boxShadow:"0 1px 4px rgba(0,0,0,0.2)",transition:"margin 0.3s"}} />
      </div>
    </div>
  );
}

export default function HammerApp() {
  const [dark, setDark] = useState(false);
  const [tab, setTab] = useState("round");
  const [screen, setScreen] = useState("home");
  const [curHole, setCurHole] = useState(1);
  const [scores, setScores] = useState(()=>{const s={};PLAYERS.forEach(p=>{s[p.id]=Array(18).fill(null)});return s;});
  const [showShot, setShowShot] = useState(false);
  const [selClub, setSelClub] = useState(null);
  const [propModal, setPropModal] = useState(false);
  const [holeProps, setHoleProps] = useState({});
  const [propAmt, setPropAmt] = useState(5);
  const [selProp, setSelProp] = useState(null);
  const [propVotes, setPropVotes] = useState({});
  const [randProps, setRandProps] = useState(true);
  const [selGame, setSelGame] = useState(null);
  const [stake, setStake] = useState(10);
  const [scoreModal, setScoreModal] = useState(false);
  const [scorePlayer, setScorePlayer] = useState(null);
  const [shotMarks, setShotMarks] = useState([]);
  const [sideBets, setSideBets] = useState([]);
  const [sbModal, setSbModal] = useState(false);
  const [sbText, setSbText] = useState("");
  const [sbAmt, setSbAmt] = useState(10);
  const [sbPlayers, setSbPlayers] = useState([]);
  const [sbEdit, setSbEdit] = useState(null);
  const [anim, setAnim] = useState(true);
  const [learnOpen, setLearnOpen] = useState(null);
  const [holes, setHoles] = useState(DEFAULT_HOLES);
  const [courseName, setCourseName] = useState("Augusta National");
  const [courseSearch, setCourseSearch] = useState("");
  const [courseResults, setCourseResults] = useState([]);
  const [courseLoading, setCourseLoading] = useState(false);
  const [courseError, setCourseError] = useState("");
  const [teeOptions, setTeeOptions] = useState([]);
  const [selectedTee, setSelectedTee] = useState(null);
  const [courseCity, setCourseCity] = useState("");
  const mapRef = useRef(null);
  const searchTimer = useRef(null);

  const C = dark ? DARK : LIGHT;
  const hole = holes[curHole - 1];

  useEffect(() => {
    setAnim(false);
    const t = setTimeout(() => setAnim(true), 50);
    return () => clearTimeout(t);
  }, [screen, curHole, tab]);

  const fd = anim
    ? {opacity:1, transform:"translateY(0)", transition:"all 0.4s cubic-bezier(0.23,1,0.32,1)"}
    : {opacity:0, transform:"translateY(14px)"};
  const fdd = (d) => ({...fd, transitionDelay: d + "s"});

  const totalScore = (pid) => scores[pid].filter(s => s !== null).reduce((a, b) => a + b, 0);
  const totalPar = (pid) => { let p = 0; scores[pid].forEach((s, i) => { if (s !== null) p += holes[i].par; }); return p; };
  const toPar = (pid) => { const t = totalScore(pid); if (t === 0) return "E"; const d = t - totalPar(pid); return d > 0 ? "+" + d : d === 0 ? "E" : "" + d; };
  const holesPlayed = (pid) => scores[pid].filter(s => s !== null).length;

  // Course search function
  const searchCourses = async (query) => {
    if (!query || query.length < 3) { setCourseResults([]); return; }
    setCourseLoading(true);
    setCourseError("");
    try {
      const res = await fetch(`/api/courses?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      setCourseResults(data.courses || []);
      if ((data.courses || []).length === 0) setCourseError("No courses found. Try a different name.");
    } catch (e) {
      setCourseError("Course search not available. Sign up at golfcourseapi.com and add your API key.");
      setCourseResults([]);
    }
    setCourseLoading(false);
  };

  const handleCourseSearch = (val) => {
    setCourseSearch(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => searchCourses(val), 500);
  };

  const selectCourse = (course) => {
    const parsed = parseCourseData(course);
    if (parsed) {
      setCourseName(parsed.name);
      setTeeOptions(parsed.tees);
      if (parsed.tees.length > 0) {
        // Auto-select first tee with reasonable yardage
        const defaultTee = parsed.tees.find(t => t.total > 5000) || parsed.tees[0];
        setSelectedTee(defaultTee);
        const updated = parsed.holes.map((h, i) => ({...h, yds: defaultTee.yardages[i] || 0}));
        setHoles(updated);
      } else {
        setHoles(parsed.holes);
        setSelectedTee(null);
      }
    } else {
      setCourseError("Could not load scorecard data for this course.");
    }
    setCourseResults([]);
    setCourseSearch("");
  };

  const selectTee = (tee) => {
    setSelectedTee(tee);
    setHoles(prev => prev.map((h, i) => ({...h, yds: tee.yardages[i] || 0})));
  };

  const resetToDefault = () => {
    setHoles(DEFAULT_HOLES);
    setCourseName("Augusta National");
    setTeeOptions([]);
    setSelectedTee(null);
    setCourseSearch("");
    setCourseResults([]);
    setCourseError("");
  };

  const handleMapTap = (e) => {
    if (!showShot || !selClub || !mapRef.current) return;
    const r = mapRef.current.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    setShotMarks(p => [...p, {x, y, club: selClub, hole: curHole}]);
    setSelClub(null);
    setShowShot(false);
  };

  const openPropBet = () => {
    if (randProps) {
      const used = Object.values(holeProps).map(h => h.bet.id);
      const avail = PROPS.filter(b => !used.includes(b.id));
      const pool = avail.length > 0 ? avail : PROPS;
      setSelProp(pool[Math.floor(Math.random() * pool.length)]);
    } else {
      setSelProp(null);
    }
    setPropVotes({});
    setPropModal(true);
  };

  const submitProp = () => {
    if (selProp) {
      setHoleProps(p => ({...p, [curHole]: {bet: selProp, amount: propAmt, votes: {...propVotes}}}));
      setPropModal(false);
    }
  };

  const enterScore = (pid, s) => {
    setScores(p => {const n = {...p}; n[pid] = [...n[pid]]; n[pid][curHole - 1] = s; return n;});
    setScoreModal(false);
    setScorePlayer(null);
  };

  const card = {background:C.surface, borderRadius:16, margin:"12px 16px", padding:20, boxShadow:C.shadow, border:"1px solid " + C.border};
  const pill = (a) => ({padding:"8px 16px", borderRadius:24, fontSize:13, fontWeight:600, border:a ? "2px solid " + C.green : "1px solid " + C.border, background:a ? C.green : C.surface, color:a ? "#fff" : C.text, cursor:"pointer", whiteSpace:"nowrap"});
  const btn = (pri) => ({padding:"14px 24px", borderRadius:12, fontSize:15, fontWeight:700, border:"none", background:pri ? C.green : C.surfaceAlt, color:pri ? "#fff" : C.text, cursor:"pointer", width:"100%", textAlign:"center"});
  const avs = (col, sz) => ({width:sz||40, height:sz||40, borderRadius:(sz||40)/2, background:col||C.green, display:"flex", alignItems:"center", justifyContent:"center", fontSize:(sz||40)*0.4, fontWeight:700, color:"#fff", flexShrink:0});
  const itag = {fontFamily:"Georgia, serif", fontStyle:"italic", fontSize:10, letterSpacing:1.5, textTransform:"uppercase", color:C.gold};

  const renderHome = () => (
    <div>
      <div style={{...card, background:"linear-gradient(145deg, " + C.green + " 0%, " + (dark ? "#003D28" : "#004D35") + " 100%)", color:"#fff", border:"none", ...fd}}>
        <div style={{display:"flex", alignItems:"center", gap:14, marginBottom:18}}>
          <div style={{width:52, height:52, borderRadius:26, background:"linear-gradient(135deg, " + C.yellow + ", " + C.gold + ")", display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, fontWeight:800, color:C.green}}>C</div>
          <div>
            <div style={{fontFamily:"Georgia, serif", fontSize:22, fontWeight:700}}>Christo</div>
            <div style={{fontSize:12, color:"rgba(255,255,255,0.5)", fontStyle:"italic"}}>{courseName}</div>
          </div>
          <div style={{marginLeft:"auto", textAlign:"right"}}>
            <div style={{...itag, color:"rgba(255,255,255,0.4)"}}>Current Rank</div>
            <div style={{fontSize:13, fontWeight:700, color:C.yellow}}>💎 Scratch</div>
          </div>
        </div>
        <div style={{display:"flex", gap:24}}>
          {[{v:"8.4",l:"Handicap",c:C.yellow},{v:"142",l:"Rounds",c:"#fff"},{v:"+$340",l:"Season P&L",c:"#7CDB8A"}].map((s,i)=>(
            <div key={i}><div style={{fontSize:30, fontWeight:800, color:s.c}}>{s.v}</div><div style={{...itag, color:"rgba(255,255,255,0.4)"}}>{s.l}</div></div>
          ))}
        </div>
      </div>

      <div style={{...card, ...fdd(0.08)}}>
        <button onClick={() => setScreen("setup")} style={{...btn(true), padding:"18px 24px", fontSize:16, background:"linear-gradient(135deg, " + C.green + ", " + (dark ? "#009960" : "#005C3A") + ")"}}>
          ⛳ Start New Round
        </button>
      </div>

      <div style={{padding:"12px 16px 4px"}}><div style={{fontFamily:"Georgia, serif", fontSize:20, fontWeight:700, color:C.text, fontStyle:"italic"}}>The Boys</div></div>
      <div style={{display:"flex", gap:12, padding:"10px 16px", overflowX:"auto"}}>
        {PLAYERS.map((p, i) => (
          <div key={p.id} style={{...fdd(0.12 + i * 0.04), minWidth:130, background:C.surface, borderRadius:16, padding:"16px 12px", boxShadow:C.shadow, border:"1px solid " + C.border, textAlign:"center"}}>
            <div style={{...avs(p.col, 44), margin:"0 auto 8px"}}>{p.av}</div>
            <div style={{fontSize:14, fontWeight:700, color:C.text}}>{p.name}</div>
            <div style={{fontSize:24, fontWeight:800, color:C.yellow, margin:"2px 0"}}>{p.hcp}</div>
            <div style={{...itag}}>{p.rank}</div>
          </div>
        ))}
      </div>

      <div style={{padding:"20px 16px 4px"}}><div style={{fontFamily:"Georgia, serif", fontSize:20, fontWeight:700, color:C.text, fontStyle:"italic"}}>Recent Rounds</div></div>
      {[{course:"Sugar Tree GC",date:"Feb 18",score:78,par:72},{course:"Olympic Club",date:"Feb 15",score:81,par:71},{course:"Peacock Gap",date:"Feb 12",score:76,par:71}].map((r, i) => (
        <div key={i} style={{...card, display:"flex", justifyContent:"space-between", alignItems:"center", ...fdd(0.25 + i * 0.06)}}>
          <div>
            <div style={{fontSize:15, fontWeight:700, color:C.text}}>{r.course}</div>
            <div style={{fontSize:12, color:C.textMuted, marginTop:2, fontStyle:"italic"}}>{r.date} · 18 holes</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:24, fontWeight:800, color:C.text}}>{r.score}</div>
            <div style={{fontSize:12, fontWeight:700, color:r.score - r.par > 0 ? C.bogey : C.birdie}}>{r.score - r.par > 0 ? "+" : ""}{r.score - r.par}</div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderSetup = () => (
    <div>
      <div style={{padding:"20px 20px 8px"}}>
        <div style={{fontFamily:"Georgia, serif", fontSize:28, fontWeight:700, color:C.text, fontStyle:"italic", ...fd}}>Round Setup</div>
        <div style={{fontSize:13, color:C.textMuted, fontStyle:"italic", ...fdd(0.03)}}>{courseName} · {holes.length} Holes</div>
      </div>

      {/* ──── COURSE SEARCH ──── */}
      <div style={{...card, ...fdd(0.04)}}>
        <div style={{...itag, marginBottom:10}}>Golf Course</div>
        <div style={{display:"flex", alignItems:"center", gap:8, marginBottom:10}}>
          <div style={{flex:1, position:"relative"}}>
            <input
              type="text"
              value={courseSearch}
              onChange={(e) => handleCourseSearch(e.target.value)}
              placeholder="Search courses (e.g. Sugar Tree)..."
              style={{width:"100%", padding:"12px 14px", borderRadius:12, border:"1.5px solid " + C.border, background:C.surfaceAlt, fontSize:14, color:C.text, outline:"none", boxSizing:"border-box", fontFamily:"inherit"}}
            />
            {courseLoading && <div style={{position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", fontSize:12, color:C.textMuted}}>...</div>}
          </div>
        </div>

        {/* Search results */}
        {courseResults.length > 0 && (
          <div style={{maxHeight:240, overflowY:"auto", borderRadius:12, border:"1px solid " + C.border, marginBottom:10}}>
            {courseResults.map((c, i) => (
              <div key={i} onClick={() => selectCourse(c)} style={{padding:"12px 14px", borderBottom:i < courseResults.length - 1 ? "1px solid " + C.surfaceAlt : "none", cursor:"pointer", background:C.surface, transition:"background 0.15s"}}
                onMouseEnter={(e) => e.currentTarget.style.background = C.surfaceAlt}
                onMouseLeave={(e) => e.currentTarget.style.background = C.surface}>
                <div style={{fontSize:14, fontWeight:700, color:C.text}}>{c.courseName || c.name}</div>
                <div style={{fontSize:11, color:C.textMuted, fontStyle:"italic", marginTop:2}}>
                  {[c.city, c.state, c.country].filter(Boolean).join(", ")} {c.holes ? `· ${c.holes} holes` : ""}
                </div>
              </div>
            ))}
          </div>
        )}

        {courseError && <div style={{fontSize:12, color:C.red, fontStyle:"italic", marginBottom:8}}>{courseError}</div>}

        {/* Selected course display */}
        <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px", borderRadius:12, background:C.greenLight, border:"1px solid " + (dark ? "#2A4D3A" : "#B2D8C4")}}>
          <div>
            <div style={{fontSize:14, fontWeight:700, color:C.birdie}}>⛳ {courseName}</div>
            {selectedTee && <div style={{fontSize:11, color:C.textMuted, marginTop:2}}>{selectedTee.name} tees · {selectedTee.total.toLocaleString()} yds</div>}
            {!selectedTee && <div style={{fontSize:11, color:C.textMuted, marginTop:2}}>Par {holes.reduce((a, h) => a + h.par, 0)} · {holes.reduce((a, h) => a + h.yds, 0).toLocaleString()} yds</div>}
          </div>
          {courseName !== "Augusta National" && (
            <div onClick={resetToDefault} style={{fontSize:11, color:C.textMuted, cursor:"pointer", textDecoration:"underline"}}>Reset</div>
          )}
        </div>

        {/* Tee box selector */}
        {teeOptions.length > 1 && (
          <div style={{marginTop:12}}>
            <div style={{fontSize:11, fontWeight:700, color:C.textMuted, textTransform:"uppercase", letterSpacing:1, marginBottom:8}}>Tee Box</div>
            <div style={{display:"flex", gap:6, flexWrap:"wrap"}}>
              {teeOptions.map((tee, i) => {
                const isActive = selectedTee && selectedTee.name === tee.name;
                const teeColor = tee.name.toLowerCase().includes("blue") ? "#2563EB" :
                  tee.name.toLowerCase().includes("white") ? "#9CA3AF" :
                  tee.name.toLowerCase().includes("red") ? "#DC2626" :
                  tee.name.toLowerCase().includes("gold") ? "#D97706" :
                  tee.name.toLowerCase().includes("black") ? "#1F2937" :
                  tee.name.toLowerCase().includes("green") ? "#16A34A" : C.green;
                return (
                  <div key={i} onClick={() => selectTee(tee)} style={{padding:"8px 14px", borderRadius:10, fontSize:12, fontWeight:700, background:isActive ? teeColor : C.surfaceAlt, color:isActive ? "#fff" : C.text, border:isActive ? "2px solid " + teeColor : "1px solid " + C.border, cursor:"pointer", textAlign:"center", minWidth:60}}>
                    <div>{tee.name}</div>
                    <div style={{fontSize:10, fontWeight:500, opacity:0.8, marginTop:2}}>{tee.total.toLocaleString()} yds</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div style={{...card, ...fdd(0.08)}}>
        <div style={{...itag, marginBottom:14}}>Players</div>
        {PLAYERS.map(p => (
          <div key={p.id} style={{display:"flex", alignItems:"center", gap:12, padding:"10px 0", borderBottom:"1px solid " + C.surfaceAlt}}>
            <div style={avs(p.col, 34)}>{p.av}</div>
            <div style={{flex:1}}><div style={{fontSize:14, fontWeight:600, color:C.text}}>{p.name}</div><div style={{fontSize:11, color:C.textMuted}}>HCP {p.hcp}</div></div>
            <div style={{fontSize:12, color:C.birdie, fontWeight:700}}>✓ In</div>
          </div>
        ))}
      </div>

      <div style={{...card, ...fdd(0.1)}}>
        <div style={{...itag, marginBottom:14}}>Game Type</div>
        <div style={{display:"flex", flexWrap:"wrap", gap:8}}>
          {GAMES.map(g => (
            <div key={g.id} onClick={() => setSelGame(g.id)} style={{...pill(selGame === g.id), display:"flex", alignItems:"center", gap:5}}>
              <span>{g.icon}</span>{g.name}
            </div>
          ))}
        </div>
      </div>

      <div style={{...card, ...fdd(0.14)}}>
        <div style={{...itag, marginBottom:14}}>Stakes</div>
        <div style={{display:"flex", gap:8}}>
          {[5, 10, 20, 50].map(a => (
            <div key={a} onClick={() => setStake(a)} style={{...pill(stake === a), flex:1, textAlign:"center"}}>${a}</div>
          ))}
        </div>
      </div>

      <div style={{...card, ...fdd(0.18)}}>
        <ToggleSwitch label="Hole-by-Hole Prop Bets" on={true} onToggle={() => {}} C={C} />
        <div style={{height:1, background:C.border, margin:"6px 0"}} />
        <ToggleSwitch label="🎲 Randomize Prop Each Hole" on={randProps} onToggle={() => setRandProps(p => !p)} C={C} />
        <div style={{fontSize:12, color:C.textMuted, marginTop:4, lineHeight:1.5, fontStyle:"italic"}}>
          {randProps ? "A random prop bet will be auto-selected at the start of each hole." : "You'll manually pick the prop bet for each hole."}
        </div>
      </div>

      <div style={{...card, ...fdd(0.22)}}>
        <ToggleSwitch label="🌙 Dark Mode" on={dark} onToggle={() => setDark(d => !d)} C={C} />
      </div>

      <div style={{padding:"8px 16px 30px"}}>
        <button onClick={() => setScreen("active")} style={{...btn(true), padding:18, fontSize:16, background:"linear-gradient(135deg, " + C.yellow + ", " + C.gold + ")", color:C.green, fontWeight:800}}>
          Let's Go — Hole 1
        </button>
      </div>
    </div>
  );

  const renderActive = () => {
    const prop = holeProps[curHole];
    const needsProp = !prop;
    return (
      <div>
        <div style={{padding:"10px 20px", display:"flex", justifyContent:"space-between", alignItems:"flex-end", ...fd}}>
          <div>
            <div style={{fontFamily:"Georgia, serif", fontSize:30, fontWeight:700, color:C.text, fontStyle:"italic"}}>Hole {curHole}</div>
            <div style={{fontSize:12, color:C.textMuted, fontStyle:"italic"}}>{hole.name} · Par {hole.par} · {hole.yds} yds</div>
          </div>
          <div style={{display:"flex", gap:6}}>
            <button disabled={curHole === 1} onClick={() => setCurHole(h => h - 1)} style={{width:36, height:36, borderRadius:18, border:"1px solid " + C.border, background:C.surface, fontSize:16, cursor:"pointer", color:C.text, opacity:curHole === 1 ? 0.3 : 1}}>‹</button>
            <button disabled={curHole === 18} onClick={() => setCurHole(h => h + 1)} style={{width:36, height:36, borderRadius:18, border:"1px solid " + C.border, background:C.surface, fontSize:16, cursor:"pointer", color:C.text, opacity:curHole === 18 ? 0.3 : 1}}>›</button>
          </div>
        </div>

        {needsProp ? (
          <div onClick={openPropBet} style={{margin:"0 16px 10px", padding:"14px 16px", background:C.yellowLight, border:"1px solid " + C.yellowSoft, borderRadius:14, display:"flex", alignItems:"center", gap:12, cursor:"pointer", ...fdd(0.04)}}>
            <div style={{fontSize:24}}>{randProps ? "🎲" : "🎯"}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:14, fontWeight:700, color:C.text}}>{randProps ? "Spin the Prop Bet" : "Set Prop Bet"} · Hole {curHole}</div>
              <div style={{fontSize:11, color:C.textMuted, fontStyle:"italic"}}>Everyone locks in before teeing off</div>
            </div>
            <div style={{fontSize:18, color:C.gold}}>→</div>
          </div>
        ) : (
          <div style={{margin:"0 16px 10px", padding:"12px 16px", background:C.greenLight, border:"1px solid " + (dark ? "#2A4D3A" : "#B2D8C4"), borderRadius:14, display:"flex", alignItems:"center", gap:12, ...fdd(0.04)}}>
            <div style={{fontSize:20}}>{prop.bet.icon}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:13, fontWeight:700, color:C.birdie}}>{prop.bet.name} · ${prop.amount}/person</div>
              <div style={{fontSize:10, color:C.textMuted, fontStyle:"italic"}}>Locked ✓ · {randProps ? "Randomized" : "Manual"}</div>
            </div>
          </div>
        )}

        <div ref={mapRef} onClick={handleMapTap} style={{margin:"0 16px", borderRadius:20, height:260, background:"linear-gradient(180deg, " + C.grass + " 0%, " + (dark ? "#0F2D0F" : "#3D7A34") + " 40%, " + (dark ? "#1A3D1A" : "#5A9C4F") + " 70%, " + C.grass + " 100%)", position:"relative", overflow:"hidden", cursor:showShot ? "crosshair" : "default", boxShadow:C.shadow, border:"1px solid " + C.border, ...fdd(0.08)}}>
          <div style={{position:"absolute", left:"28%", top:0, width:"44%", height:"100%", background:C.fairway, borderRadius:"0 0 45% 45%"}} />
          <div style={{position:"absolute", left:"33%", top:"6%", width:"34%", height:"16%", background:"radial-gradient(ellipse, " + C.mGreen + " 0%, " + (dark ? "#1A4D1A" : "#4AA840") + " 70%, transparent 100%)", borderRadius:"50%"}} />
          <div style={{position:"absolute", left:"49%", top:"10%", width:2, height:18, background:"#fff"}}>
            <div style={{position:"absolute", top:0, left:2, width:9, height:6, background:C.azalea, borderRadius:"0 3px 0 0"}} />
          </div>
          <div style={{position:"absolute", left:"20%", top:"18%", width:"9%", height:"5%", background:dark ? "#4A4020" : "#E8D8A0", borderRadius:"50%", opacity:0.7}} />
          <div style={{position:"absolute", left:"72%", top:"32%", width:"7%", height:"4%", background:dark ? "#4A4020" : "#E8D8A0", borderRadius:"50%", opacity:0.7}} />
          <div style={{position:"absolute", left:"12%", top:"40%", width:8, height:8, borderRadius:4, background:C.azalea, opacity:0.5}} />
          <div style={{position:"absolute", left:"85%", top:"55%", width:6, height:6, borderRadius:3, background:C.azalea, opacity:0.4}} />
          <div style={{position:"absolute", left:"40%", bottom:"6%", width:"20%", height:"5%", background:dark ? "rgba(40,80,30,0.7)" : "rgba(100,160,80,0.7)", borderRadius:4}} />
          {shotMarks.filter(s => s.hole === curHole).map((s, i) => (
            <div key={i} style={{position:"absolute", left:s.x + "%", top:s.y + "%", transform:"translate(-50%,-50%)"}}>
              <div style={{width:14, height:14, borderRadius:7, background:C.yellow, border:"2px solid #fff", boxShadow:"0 2px 8px rgba(0,0,0,0.4)"}} />
              <div style={{position:"absolute", top:-18, left:"50%", transform:"translateX(-50%)", fontSize:9, fontWeight:700, color:"#fff", background:"rgba(0,0,0,0.65)", padding:"1px 5px", borderRadius:4, whiteSpace:"nowrap"}}>{s.club}</div>
            </div>
          ))}
          <div style={{position:"absolute", bottom:8, right:10, background:"rgba(0,0,0,0.55)", padding:"4px 10px", borderRadius:8, fontSize:13, fontWeight:700, color:"#fff", fontFamily:"Georgia, serif", fontStyle:"italic"}}>{hole.yds} YDS</div>
          {showShot && <div style={{position:"absolute", top:8, left:"50%", transform:"translateX(-50%)", background:"rgba(0,0,0,0.75)", padding:"5px 14px", borderRadius:8, fontSize:12, fontWeight:600, color:C.yellow}}>Tap to place shot</div>}
        </div>

        <div style={{padding:"12px 16px", ...fdd(0.12)}}>
          {!showShot ? (
            <button onClick={() => setShowShot(true)} style={{...btn(false), display:"flex", alignItems:"center", justifyContent:"center", gap:8, border:"1.5px solid " + C.border}}>📍 Track Shot</button>
          ) : (
            <div>
              <div style={{...itag, marginBottom:10}}>Select Club</div>
              <div style={{display:"flex", gap:5, flexWrap:"wrap"}}>
                {CLUBS.map(c => (
                  <div key={c} onClick={() => setSelClub(c)} style={{padding:"6px 11px", borderRadius:8, fontSize:12, fontWeight:600, background:selClub === c ? C.green : C.surfaceAlt, color:selClub === c ? "#fff" : C.text, cursor:"pointer", border:"1px solid " + (selClub === c ? C.green : C.border)}}>{c}</div>
                ))}
              </div>
              <button onClick={() => setShowShot(false)} style={{...btn(false), marginTop:10, fontSize:13}}>Cancel</button>
            </div>
          )}
        </div>

        <div style={{padding:"0 16px 14px", ...fdd(0.16)}}>
          <div style={{...itag, marginBottom:10}}>Scores · Hole {curHole}</div>
          {PLAYERS.map(p => {
            const s = scores[p.id][curHole - 1];
            const diff = s != null ? s - hole.par : null;
            return (
              <div key={p.id} onClick={() => { setScorePlayer(p); setScoreModal(true); }} style={{display:"flex", alignItems:"center", gap:12, padding:"11px 0", borderBottom:"1px solid " + C.surfaceAlt, cursor:"pointer"}}>
                <div style={avs(p.col, 34)}>{p.av}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:14, fontWeight:600, color:C.text}}>{p.name}</div>
                  <div style={{fontSize:11, color:C.textMuted, fontStyle:"italic"}}>{toPar(p.id)} thru {holesPlayed(p.id)}</div>
                </div>
                <div style={{width:44, height:44, borderRadius:diff != null && diff <= -1 ? 22 : 12, background:s ? (diff < 0 ? C.greenLight : diff > 0 ? C.yellowLight : C.surfaceAlt) : C.surfaceAlt, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, fontWeight:800, color:s ? (diff < 0 ? C.birdie : diff > 0 ? C.bogey : C.text) : C.border, border:diff != null && diff <= -2 ? "2px solid " + C.eagle : "1px solid " + C.border}}>
                  {s || "—"}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{padding:"0 16px 24px"}}>
          <button onClick={() => { if (curHole < 18) setCurHole(c => c + 1); else { setTab("scorecard"); setScreen("home"); } }} style={{...btn(true), fontSize:15, background:"linear-gradient(135deg, " + C.green + ", " + (dark ? "#009960" : "#005C3A") + ")"}}>
            {curHole < 18 ? "Next → Hole " + (curHole + 1) : "Finish Round 🏆"}
          </button>
        </div>

        {scoreModal && scorePlayer && (
          <div onClick={(e) => { if (e.target === e.currentTarget) { setScoreModal(false); setScorePlayer(null); }}} style={{position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(0,0,0,0.5)", zIndex:200, display:"flex", alignItems:"flex-end", justifyContent:"center"}}>
            <div style={{background:C.surface, borderRadius:"24px 24px 0 0", width:"100%", maxWidth:430, padding:"20px 20px 36px"}}>
              <div style={{width:36, height:4, borderRadius:2, background:C.border, margin:"0 auto 18px"}} />
              <div style={{display:"flex", alignItems:"center", gap:12, marginBottom:18}}>
                <div style={avs(scorePlayer.col, 40)}>{scorePlayer.av}</div>
                <div>
                  <div style={{fontFamily:"Georgia, serif", fontSize:18, fontWeight:700, color:C.text}}>{scorePlayer.name}</div>
                  <div style={{fontSize:12, color:C.textMuted, fontStyle:"italic"}}>{hole.name} · Par {hole.par}</div>
                </div>
              </div>
              <div style={{display:"grid", gridTemplateColumns:"repeat(5, 1fr)", gap:8, marginBottom:14}}>
                {[1,2,3,4,5,6,7,8,9,10].map(n => {
                  const d = n - hole.par;
                  const lb = d === -3 ? "Albatross" : d === -2 ? "Eagle" : d === -1 ? "Birdie" : d === 0 ? "Par" : d === 1 ? "Bogey" : d === 2 ? "Double" : "";
                  return (
                    <div key={n} onClick={() => enterScore(scorePlayer.id, n)} style={{padding:"12px 0", borderRadius:d <= -2 ? 16 : 12, textAlign:"center", cursor:"pointer", background:d < 0 ? C.greenLight : d === 0 ? C.surfaceAlt : d <= 2 ? C.yellowLight : "rgba(192,57,43,0.1)", border:d <= -2 ? "2px solid " + C.green : "1px solid " + C.border}}>
                      <div style={{fontSize:20, fontWeight:800, color:d < 0 ? C.birdie : d === 0 ? C.text : d <= 2 ? C.bogey : C.red}}>{n}</div>
                      {lb && <div style={{fontSize:7, fontWeight:700, color:C.textMuted, marginTop:2, letterSpacing:0.5, textTransform:"uppercase"}}>{lb}</div>}
                    </div>
                  );
                })}
              </div>
              <button onClick={() => { setScoreModal(false); setScorePlayer(null); }} style={{...btn(false), fontSize:14}}>Cancel</button>
            </div>
          </div>
        )}

        {propModal && (
          <div onClick={(e) => { if (e.target === e.currentTarget) setPropModal(false); }} style={{position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(0,0,0,0.5)", zIndex:200, display:"flex", alignItems:"flex-end", justifyContent:"center"}}>
            <div style={{background:C.surface, borderRadius:"24px 24px 0 0", width:"100%", maxWidth:430, padding:"20px 20px 36px", maxHeight:"85vh", overflowY:"auto"}}>
              <div style={{width:36, height:4, borderRadius:2, background:C.border, margin:"0 auto 18px"}} />
              <div style={{fontFamily:"Georgia, serif", fontSize:22, fontWeight:700, color:C.text, fontStyle:"italic", marginBottom:4}}>
                {randProps ? "🎲 Random Prop" : "🎯 Pick Your Prop"} · Hole {curHole}
              </div>
              <div style={{fontSize:12, color:C.textMuted, fontStyle:"italic", marginBottom:18}}>
                {randProps ? "The golf gods have spoken. Lock it in or re-roll." : "Choose one prop — everyone pays in before the tee shot."}
              </div>

              <div style={{...itag, marginBottom:10}}>Per-Person Wager</div>
              <div style={{display:"flex", gap:8, marginBottom:6}}>
                {[2, 5, 10, 20, 50].map(a => (
                  <div key={a} onClick={() => setPropAmt(a)} style={{...pill(propAmt === a), flex:1, textAlign:"center", fontSize:14}}>${a}</div>
                ))}
              </div>
              <div style={{fontSize:11, color:C.textMuted, textAlign:"center", marginBottom:18, fontStyle:"italic"}}>Pot: ${propAmt * PLAYERS.length}</div>

              {randProps && selProp ? (
                <div style={{padding:20, background:C.yellowLight, border:"2px solid " + C.yellow, borderRadius:16, textAlign:"center", marginBottom:18}}>
                  <div style={{fontSize:40, marginBottom:8}}>{selProp.icon}</div>
                  <div style={{fontFamily:"Georgia, serif", fontSize:20, fontWeight:700, color:C.text, fontStyle:"italic"}}>{selProp.name}</div>
                  <div style={{fontSize:13, color:C.textMuted, marginTop:4}}>{selProp.desc}</div>
                  <button onClick={() => {
                    const pool = PROPS.filter(b => b.id !== selProp.id);
                    setSelProp(pool[Math.floor(Math.random() * pool.length)]);
                  }} style={{marginTop:14, padding:"8px 20px", borderRadius:10, fontSize:13, fontWeight:700, background:C.surfaceAlt, color:C.text, border:"1px solid " + C.border, cursor:"pointer"}}>
                    🎲 Re-Roll
                  </button>
                </div>
              ) : (
                <div style={{display:"flex", flexDirection:"column", gap:7, marginBottom:18}}>
                  <div style={{...itag, marginBottom:4}}>Choose One</div>
                  {PROPS.map(b => (
                    <div key={b.id} onClick={() => setSelProp(b)} style={{display:"flex", alignItems:"center", gap:12, padding:"12px 14px", borderRadius:14, background:selProp && selProp.id === b.id ? C.yellowLight : C.surfaceAlt, border:selProp && selProp.id === b.id ? "2px solid " + C.yellow : "1px solid " + C.border, cursor:"pointer"}}>
                      <div style={{fontSize:22}}>{b.icon}</div>
                      <div style={{flex:1}}><div style={{fontSize:13, fontWeight:700, color:C.text}}>{b.name}</div><div style={{fontSize:11, color:C.textMuted}}>{b.desc}</div></div>
                      {selProp && selProp.id === b.id && <div style={{color:C.yellow, fontSize:16, fontWeight:800}}>✓</div>}
                    </div>
                  ))}
                </div>
              )}

              {selProp && (
                <div style={{marginBottom:18}}>
                  <div style={{...itag, marginBottom:10}}>Players In</div>
                  {PLAYERS.map(p => (
                    <div key={p.id} onClick={() => setPropVotes(v => ({...v, [p.id]: !v[p.id]}))} style={{display:"flex", alignItems:"center", gap:12, padding:"9px 0", borderBottom:"1px solid " + C.surfaceAlt, cursor:"pointer"}}>
                      <div style={avs(p.col, 30)}>{p.av}</div>
                      <div style={{flex:1, fontSize:14, fontWeight:600, color:C.text}}>{p.name}</div>
                      <div style={{width:26, height:26, borderRadius:7, border:propVotes[p.id] ? "none" : "2px solid " + C.border, background:propVotes[p.id] ? C.green : C.surface, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, color:"#fff"}}>
                        {propVotes[p.id] ? "✓" : ""}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{display:"flex", gap:10}}>
                <button onClick={() => setPropModal(false)} style={{...btn(false), flex:1}}>Skip</button>
                <button onClick={submitProp} style={{...btn(true), flex:2, background:selProp ? "linear-gradient(135deg, " + C.yellow + ", " + C.gold + ")" : C.border, color:selProp ? C.green : "#999", fontWeight:800}}>Lock It In 🔒</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderScorecard = () => {
    const sorted = [...PLAYERS].sort((a, b) => (totalScore(a.id) || 999) - (totalScore(b.id) || 999));
    return (
      <div>
        <div style={{padding:"16px 16px 6px", ...fd}}><div style={{fontFamily:"Georgia, serif", fontSize:24, fontWeight:700, color:C.text, fontStyle:"italic"}}>Leaderboard</div></div>
        <div style={{...card, ...fdd(0.04)}}>
          {sorted.map((p, i) => (
            <div key={p.id} style={{display:"flex", alignItems:"center", gap:12, padding:"12px 0", borderBottom:i < 3 ? "1px solid " + C.surfaceAlt : "none"}}>
              <div style={{width:24, fontFamily:"Georgia, serif", fontSize:16, fontWeight:800, color:i === 0 ? C.yellow : C.textMuted, textAlign:"center", fontStyle:"italic"}}>{i + 1}</div>
              <div style={avs(p.col, 36)}>{p.av}</div>
              <div style={{flex:1}}><div style={{fontSize:15, fontWeight:700, color:C.text}}>{p.name}</div><div style={{fontSize:11, color:C.textMuted, fontStyle:"italic"}}>HCP {p.hcp}</div></div>
              <div style={{textAlign:"right"}}><div style={{fontSize:22, fontWeight:800, color:C.text}}>{totalScore(p.id) || "—"}</div><div style={{fontSize:12, fontWeight:700, color:toPar(p.id).includes("+") ? C.bogey : toPar(p.id).includes("-") ? C.birdie : C.textMuted}}>{toPar(p.id)}</div></div>
            </div>
          ))}
        </div>
        <div style={{...card, padding:0, overflowX:"auto", ...fdd(0.08)}}>
          <div style={{minWidth:560, padding:14}}>
            <div style={{display:"flex", borderBottom:"2px solid " + C.border, paddingBottom:6, marginBottom:6}}>
              <div style={{width:60, ...itag}}>Hole</div>
              {holes.slice(0, 9).map(h => <div key={h.num} style={{flex:1, textAlign:"center", ...itag}}>{h.num}</div>)}
              <div style={{width:36, textAlign:"center", fontSize:11, fontWeight:800, color:C.text}}>OUT</div>
            </div>
            <div style={{display:"flex", borderBottom:"1px solid " + C.surfaceAlt, paddingBottom:4, marginBottom:4}}>
              <div style={{width:60, ...itag}}>Par</div>
              {holes.slice(0, 9).map(h => <div key={h.num} style={{flex:1, textAlign:"center", fontSize:12, fontWeight:600, color:C.textMuted}}>{h.par}</div>)}
              <div style={{width:36, textAlign:"center", fontSize:12, fontWeight:800, color:C.text}}>{holes.slice(0, 9).reduce((a, h) => a + h.par, 0)}</div>
            </div>
            {PLAYERS.map(p => (
              <div key={p.id} style={{display:"flex", alignItems:"center", paddingBottom:4, marginBottom:4}}>
                <div style={{width:60, display:"flex", alignItems:"center", gap:4}}>
                  <div style={avs(p.col, 18)}><span style={{fontSize:8}}>{p.av}</span></div>
                  <span style={{fontSize:11, fontWeight:600, color:C.text}}>{p.name.slice(0, 5)}</span>
                </div>
                {holes.slice(0, 9).map(h => {
                  const s = scores[p.id][h.num - 1];
                  const d = s ? s - h.par : null;
                  return (
                    <div key={h.num} style={{flex:1, textAlign:"center"}}>
                      <span style={{fontSize:13, fontWeight:700, display:"inline-flex", alignItems:"center", justifyContent:"center", width:22, height:22, borderRadius:d != null && d <= -1 ? 11 : 4, color:d == null ? C.border : d < 0 ? C.birdie : d > 0 ? C.bogey : C.text, background:d != null && d <= -2 ? C.greenLight : "transparent", border:d != null && d <= -2 ? "1.5px solid " + C.green : "none"}}>
                        {s || "·"}
                      </span>
                    </div>
                  );
                })}
                <div style={{width:36, textAlign:"center", fontSize:13, fontWeight:800, color:C.text}}>{scores[p.id].slice(0, 9).filter(Boolean).reduce((a, b) => a + b, 0) || "—"}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderBets = () => {
    // Compute running game standings from actual scores
    const gameIcon = GAMES.find(g => g.id === selGame)?.icon || "🏆";
    const gameName = GAMES.find(g => g.id === selGame)?.name || "Nassau";

    // Calculate front 9, back 9, overall totals per player
    const front9 = {};
    const back9 = {};
    const overall = {};
    PLAYERS.forEach(p => {
      front9[p.id] = scores[p.id].slice(0, 9).filter(Boolean).reduce((a, b) => a + b, 0);
      back9[p.id] = scores[p.id].slice(9, 18).filter(Boolean).reduce((a, b) => a + b, 0);
      overall[p.id] = totalScore(p.id);
    });
    const front9Par = holes.slice(0, 9).reduce((a, h) => a + h.par, 0);
    const back9Par = holes.slice(9, 18).reduce((a, h) => a + h.par, 0);
    const front9Played = Math.max(...PLAYERS.map(p => scores[p.id].slice(0, 9).filter(Boolean).length));
    const back9Played = Math.max(...PLAYERS.map(p => scores[p.id].slice(9, 18).filter(Boolean).length));

    // Skins calculation
    const skinsWon = {};
    PLAYERS.forEach(p => { skinsWon[p.id] = 0; });
    let carryover = 0;
    for (let i = 0; i < 18; i++) {
      const holeScores = PLAYERS.map(p => ({id: p.id, s: scores[p.id][i]})).filter(x => x.s != null);
      if (holeScores.length === PLAYERS.length) {
        const min = Math.min(...holeScores.map(x => x.s));
        const winners = holeScores.filter(x => x.s === min);
        if (winners.length === 1) {
          skinsWon[winners[0].id] += 1 + carryover;
          carryover = 0;
        } else {
          carryover++;
        }
      }
    }

    // Leader for each segment
    const getLeader = (totals) => {
      const entries = PLAYERS.map(p => ({id: p.id, name: p.name, col: p.col, av: p.av, total: totals[p.id]})).filter(e => e.total > 0);
      if (entries.length === 0) return null;
      entries.sort((a, b) => a.total - b.total);
      return entries[0];
    };

    const propEntries = Object.entries(holeProps);
    const totalPropWagered = propEntries.reduce((a, [, d]) => a + d.amount * PLAYERS.length, 0);

    return (
      <div>
        <div style={{padding:"16px 16px 6px", ...fd}}><div style={{fontFamily:"Georgia, serif", fontSize:24, fontWeight:700, color:C.text, fontStyle:"italic"}}>Money Board</div></div>

        {/* ──── RUNNING GAME SECTION ──── */}
        <div style={{...card, border:"2px solid " + C.green, ...fdd(0.04)}}>
          <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16}}>
            <div style={{display:"flex", alignItems:"center", gap:10}}>
              <div style={{width:40, height:40, borderRadius:12, background:C.greenLight, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22}}>{gameIcon}</div>
              <div>
                <div style={{fontFamily:"Georgia, serif", fontSize:18, fontWeight:700, color:C.text, fontStyle:"italic"}}>{gameName}</div>
                <div style={{fontSize:11, color:C.textMuted, fontStyle:"italic"}}>Running Game · ${stake}/bet</div>
              </div>
            </div>
            <div style={{padding:"4px 12px", borderRadius:20, background:C.greenLight, border:"1px solid " + (dark ? "#2A4D3A" : "#B2D8C4")}}>
              <div style={{fontSize:11, fontWeight:700, color:C.birdie}}>LIVE</div>
            </div>
          </div>

          {/* Nassau-style breakdown */}
          {(selGame === "nassau" || !selGame) && (
            <div style={{display:"flex", flexDirection:"column", gap:8, marginBottom:16}}>
              {[
                {label:"Front 9", played:front9Played, of:9, totals:front9, par:front9Par},
                {label:"Back 9", played:back9Played, of:9, totals:back9, par:back9Par},
                {label:"Overall", played:Math.max(front9Played, 0) + Math.max(back9Played, 0), of:18, totals:overall, par:front9Par + back9Par},
              ].map((seg, i) => {
                const leader = getLeader(seg.totals);
                const active = seg.played > 0;
                return (
                  <div key={i} style={{padding:"12px 14px", borderRadius:12, background:C.surfaceAlt, border:"1px solid " + C.border}}>
                    <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                      <div>
                        <div style={{fontSize:13, fontWeight:700, color:C.text}}>{seg.label}</div>
                        <div style={{fontSize:10, color:C.textMuted, fontStyle:"italic"}}>{seg.played} of {seg.of} holes</div>
                      </div>
                      {active && leader ? (
                        <div style={{display:"flex", alignItems:"center", gap:8}}>
                          <div style={avs(leader.col, 24)}><span style={{fontSize:10}}>{leader.av}</span></div>
                          <div style={{textAlign:"right"}}>
                            <div style={{fontSize:14, fontWeight:800, color:C.birdie}}>{leader.name}</div>
                            <div style={{fontSize:10, color:C.textMuted}}>{leader.total - (seg.played > 0 ? Math.round(seg.par * seg.played / seg.of) : 0) <= 0 ? "" : "+"}{leader.total > 0 ? leader.total : "—"}</div>
                          </div>
                        </div>
                      ) : (
                        <div style={{fontSize:12, color:C.textMuted, fontStyle:"italic"}}>Not started</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Skins breakdown */}
          {selGame === "skins" && (
            <div style={{marginBottom:16}}>
              {PLAYERS.map(p => (
                <div key={p.id} style={{display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderBottom:"1px solid " + C.surfaceAlt}}>
                  <div style={avs(p.col, 28)}><span style={{fontSize:10}}>{p.av}</span></div>
                  <div style={{flex:1, fontSize:13, fontWeight:600, color:C.text}}>{p.name}</div>
                  <div style={{fontSize:16, fontWeight:800, color:skinsWon[p.id] > 0 ? C.yellow : C.textMuted}}>{skinsWon[p.id]} skin{skinsWon[p.id] !== 1 ? "s" : ""}</div>
                  <div style={{fontSize:14, fontWeight:800, color:skinsWon[p.id] > 0 ? C.birdie : C.textMuted}}>${skinsWon[p.id] * stake}</div>
                </div>
              ))}
              {carryover > 0 && <div style={{padding:"8px 0", fontSize:12, color:C.yellow, fontWeight:700, fontStyle:"italic"}}>🔥 {carryover} skin{carryover > 1 ? "s" : ""} carrying over!</div>}
            </div>
          )}

          {/* Generic game - player standings */}
          {selGame && selGame !== "nassau" && selGame !== "skins" && (
            <div style={{marginBottom:16}}>
              {[...PLAYERS].sort((a, b) => (totalScore(a.id) || 999) - (totalScore(b.id) || 999)).map((p, i) => (
                <div key={p.id} style={{display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderBottom:"1px solid " + C.surfaceAlt}}>
                  <div style={{width:20, fontFamily:"Georgia, serif", fontSize:14, fontWeight:800, color:i === 0 ? C.yellow : C.textMuted, fontStyle:"italic"}}>{i + 1}</div>
                  <div style={avs(p.col, 28)}><span style={{fontSize:10}}>{p.av}</span></div>
                  <div style={{flex:1, fontSize:13, fontWeight:600, color:C.text}}>{p.name}</div>
                  <div style={{fontSize:14, fontWeight:800, color:C.text}}>{totalScore(p.id) || "—"}</div>
                </div>
              ))}
            </div>
          )}

          {/* Player P&L from game */}
          <div style={{...itag, marginBottom:10}}>Game P&L</div>
          {PLAYERS.map((p, i) => {
            const net = [35, -15, 10, -30, 0][i];
            return (
              <div key={p.id} style={{display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderBottom:"1px solid " + C.surfaceAlt}}>
                <div style={avs(p.col, 28)}><span style={{fontSize:10}}>{p.av}</span></div>
                <div style={{flex:1, fontSize:13, fontWeight:600, color:C.text}}>{p.name}</div>
                <div style={{fontSize:16, fontWeight:800, color:net > 0 ? C.birdie : net < 0 ? C.red : C.textMuted}}>{net > 0 ? "+" : ""}${net}</div>
              </div>
            );
          })}
        </div>

        {/* ──── SIDE BETS SECTION ──── */}
        <div style={{padding:"16px 16px 6px", display:"flex", alignItems:"center", justifyContent:"space-between"}}>
          <div style={{fontFamily:"Georgia, serif", fontSize:20, fontWeight:700, color:C.text, fontStyle:"italic", ...fdd(0.1)}}>Side Bets</div>
          <div onClick={() => { setSbText(""); setSbAmt(10); setSbPlayers([]); setSbEdit(null); setSbModal(true); }} style={{padding:"6px 14px", borderRadius:20, background:C.green, cursor:"pointer", display:"flex", alignItems:"center", gap:5, ...fdd(0.1)}}>
            <span style={{color:"#fff", fontSize:16, fontWeight:800}}>+</span>
            <span style={{color:"#fff", fontSize:11, fontWeight:700}}>New Bet</span>
          </div>
        </div>

        {sideBets.length === 0 && <div style={{...card, textAlign:"center", color:C.textMuted, fontStyle:"italic", fontSize:13, ...fdd(0.12)}}>No side bets yet — challenge someone!</div>}

        {sideBets.map((sb, i) => {
          const resolved = sb.winner != null;
          const winnerP = resolved ? PLAYERS.find(p => p.id === sb.winner) : null;
          return (
            <div key={sb.id} style={{...card, padding:14, opacity:resolved ? 0.7 : 1, ...fdd(0.12 + i * 0.03)}}>
              <div style={{display:"flex", alignItems:"flex-start", gap:12}}>
                <div style={{width:38, height:38, borderRadius:10, background:resolved ? C.surfaceAlt : C.yellowLight, border:"1px solid " + (resolved ? C.border : C.yellow), display:"flex", alignItems:"center", justifyContent:"center", fontSize:18}}>{resolved ? "✅" : "🤝"}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:14, fontWeight:700, color:C.text}}>{sb.text}</div>
                  <div style={{fontSize:11, color:C.textMuted, fontStyle:"italic", marginTop:2}}>Hole {sb.hole} · ${sb.amount}/person · {sb.players.length} in</div>
                  <div style={{display:"flex", gap:4, marginTop:6, flexWrap:"wrap"}}>
                    {sb.players.map(pid => {
                      const pl = PLAYERS.find(p => p.id === pid);
                      return pl ? (
                        <div key={pid} style={{...avs(pl.col, 22), border:resolved && sb.winner === pid ? "2px solid " + C.yellow : "none"}}><span style={{fontSize:8}}>{pl.av}</span></div>
                      ) : null;
                    })}
                  </div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:16, fontWeight:800, color:C.yellow}}>${sb.amount * sb.players.length}</div>
                  {resolved ? (
                    <div style={{fontSize:10, fontWeight:700, color:C.birdie, marginTop:2}}>🏆 {winnerP?.name}</div>
                  ) : (
                    <div onClick={() => { setSbEdit(sb.id); setSbModal(true); setSbText(sb.text); setSbAmt(sb.amount); setSbPlayers(sb.players); }} style={{fontSize:10, fontWeight:700, color:C.azalea, cursor:"pointer", marginTop:4}}>Pick Winner</div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* ──── PROP BETS SECTION ──── */}
        <div style={{padding:"16px 16px 6px"}}><div style={{fontFamily:"Georgia, serif", fontSize:20, fontWeight:700, color:C.text, fontStyle:"italic", ...fdd(0.12)}}>Prop Bets</div></div>

        <div style={{...card, ...fdd(0.14)}}>
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14}}>
            <div>
              <div style={{fontSize:14, fontWeight:700, color:C.text}}>🎲 Auto-Select Props</div>
              <div style={{fontSize:11, color:C.textMuted, fontStyle:"italic"}}>{randProps ? "Random prop chosen each hole" : "You pick the prop each hole"}</div>
            </div>
            <div onClick={() => setRandProps(p => !p)} style={{width:48, height:28, borderRadius:14, background:randProps ? C.green : C.border, display:"flex", alignItems:"center", padding:3, cursor:"pointer", transition:"background 0.3s"}}>
              <div style={{width:22, height:22, borderRadius:11, background:"#fff", marginLeft:randProps ? "auto" : 0, boxShadow:"0 1px 4px rgba(0,0,0,0.2)", transition:"margin 0.3s"}} />
            </div>
          </div>

          {/* Summary stats */}
          <div style={{display:"flex", gap:12, marginBottom:14}}>
            <div style={{flex:1, padding:"10px 12px", borderRadius:10, background:C.surfaceAlt, textAlign:"center"}}>
              <div style={{fontSize:20, fontWeight:800, color:C.yellow}}>{propEntries.length}</div>
              <div style={{fontSize:9, color:C.textMuted, fontWeight:600, textTransform:"uppercase", letterSpacing:1}}>Props Set</div>
            </div>
            <div style={{flex:1, padding:"10px 12px", borderRadius:10, background:C.surfaceAlt, textAlign:"center"}}>
              <div style={{fontSize:20, fontWeight:800, color:C.text}}>${totalPropWagered}</div>
              <div style={{fontSize:9, color:C.textMuted, fontWeight:600, textTransform:"uppercase", letterSpacing:1}}>Total Pot</div>
            </div>
            <div style={{flex:1, padding:"10px 12px", borderRadius:10, background:C.surfaceAlt, textAlign:"center"}}>
              <div style={{fontSize:20, fontWeight:800, color:C.birdie}}>{18 - propEntries.length}</div>
              <div style={{fontSize:9, color:C.textMuted, fontWeight:600, textTransform:"uppercase", letterSpacing:1}}>Remaining</div>
            </div>
          </div>

          {/* Current hole prop status */}
          {!holeProps[curHole] ? (
            <div onClick={() => { setTab("round"); setScreen("active"); openPropBet(); }} style={{padding:"14px", borderRadius:12, background:C.yellowLight, border:"1px dashed " + C.yellow, textAlign:"center", cursor:"pointer", marginBottom:14}}>
              <div style={{fontSize:14, fontWeight:700, color:C.text}}>{randProps ? "🎲" : "🎯"} Hole {curHole} — Tap to {randProps ? "spin" : "pick"}</div>
              <div style={{fontSize:11, color:C.textMuted, fontStyle:"italic"}}>No prop set for current hole</div>
            </div>
          ) : (
            <div style={{padding:"14px", borderRadius:12, background:C.greenLight, border:"1px solid " + (dark ? "#2A4D3A" : "#B2D8C4"), display:"flex", alignItems:"center", gap:12, marginBottom:14}}>
              <div style={{fontSize:24}}>{holeProps[curHole].bet.icon}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:13, fontWeight:700, color:C.birdie}}>Hole {curHole}: {holeProps[curHole].bet.name}</div>
                <div style={{fontSize:11, color:C.textMuted}}>${holeProps[curHole].amount}/person · Pot: ${holeProps[curHole].amount * PLAYERS.length}</div>
              </div>
              <div style={{fontSize:12, fontWeight:700, color:C.birdie}}>ACTIVE</div>
            </div>
          )}
        </div>

        {/* Prop bet log */}
        {propEntries.length > 0 && (
          <div style={{padding:"8px 16px 2px"}}><div style={{...itag, ...fdd(0.18)}}>Prop Log</div></div>
        )}
        {propEntries.map(([h, data], i) => {
          const isCurrent = parseInt(h) === curHole;
          const isPast = parseInt(h) < curHole;
          return (
            <div key={h} style={{...card, padding:14, display:"flex", alignItems:"center", gap:12, opacity:isPast ? 0.7 : 1, ...fdd(0.2 + i * 0.03)}}>
              <div style={{width:36, height:36, borderRadius:10, background:isCurrent ? C.yellowLight : C.surfaceAlt, border:"1px solid " + (isCurrent ? C.yellow : C.border), display:"flex", alignItems:"center", justifyContent:"center", fontSize:18}}>{data.bet.icon}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:13, fontWeight:700, color:C.text}}>Hole {h} — {data.bet.name}</div>
                <div style={{fontSize:10, color:C.textMuted, fontStyle:"italic"}}>${data.amount}/person · {randProps ? "Auto" : "Manual"}{isPast ? " · Complete" : ""}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:15, fontWeight:800, color:C.yellow}}>${data.amount * PLAYERS.length}</div>
                <div style={{fontSize:9, color:isPast ? C.birdie : C.textMuted, fontWeight:600}}>{isPast ? "✓ DONE" : isCurrent ? "LIVE" : "UPCOMING"}</div>
              </div>
            </div>
          );
        })}
        {propEntries.length === 0 && <div style={{...card, textAlign:"center", color:C.textMuted, fontStyle:"italic", fontSize:14, ...fdd(0.18)}}>No props set yet — start your round!</div>}

        {/* Settle Up */}
        <div style={{padding:"16px 16px 24px"}}>
          <button style={{...btn(true), fontSize:15, background:"#3D95CE"}}>💸 Settle Up via Venmo</button>
        </div>
      </div>
    );
  };

  const renderStats = () => (
    <div>
      <div style={{padding:"16px 16px 6px", ...fd}}><div style={{fontFamily:"Georgia, serif", fontSize:24, fontWeight:700, color:C.text, fontStyle:"italic"}}>Your Game</div></div>
      <div style={{...card, background:"linear-gradient(145deg, " + C.green + ", " + (dark ? "#003D28" : "#004D35") + ")", color:"#fff", border:"none", ...fdd(0.04)}}>
        <div style={{display:"flex", alignItems:"center", gap:16}}>
          <div style={{fontSize:44}}>💎</div>
          <div>
            <div style={{...itag, color:"rgba(255,255,255,0.4)"}}>Current Rank</div>
            <div style={{fontFamily:"Georgia, serif", fontSize:26, fontWeight:700, color:C.yellow, fontStyle:"italic"}}>Scratch</div>
            <div style={{fontSize:12, color:"rgba(255,255,255,0.5)", fontStyle:"italic"}}>142 / 150 rounds — 8 to Tour Pro</div>
          </div>
        </div>
        <div style={{marginTop:14, height:6, borderRadius:3, background:"rgba(255,255,255,0.1)"}}>
          <div style={{width:"94.6%", height:"100%", borderRadius:3, background:"linear-gradient(90deg, " + C.yellow + ", " + C.gold + ")"}} />
        </div>
      </div>
      <div style={{...card, ...fdd(0.08)}}>
        <div style={{...itag, marginBottom:14}}>Season 2026</div>
        <div style={{display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:14}}>
          {[{l:"Avg Score",v:"79.2",s:"↓ 1.3"},{l:"Fairways",v:"62%",s:"↑ 4%"},{l:"GIR",v:"58%",s:"↑ 2%"},{l:"Putts/Rnd",v:"31.4",s:"↓ 0.8"},{l:"Birdies",v:"2.1",s:"/round"},{l:"Scramble",v:"47%",s:"↑ 5%"}].map((s, i) => (
            <div key={i} style={{textAlign:"center"}}>
              <div style={{fontSize:22, fontWeight:800, color:C.text}}>{s.v}</div>
              <div style={{...itag, marginTop:2}}>{s.l}</div>
              <div style={{fontSize:10, color:C.birdie, fontWeight:600}}>{s.s}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{...card, ...fdd(0.12)}}>
        <div style={{...itag, marginBottom:14}}>Head to Head</div>
        {PLAYERS.filter(p => p.id !== 1).map(p => (
          <div key={p.id} style={{display:"flex", alignItems:"center", gap:12, padding:"10px 0", borderBottom:"1px solid " + C.surfaceAlt}}>
            <div style={avs(p.col, 30)}>{p.av}</div>
            <div style={{flex:1, fontSize:14, fontWeight:600, color:C.text}}>vs {p.name}</div>
            <div style={{fontSize:14, fontWeight:800, color:C.birdie}}>14–8–2</div>
          </div>
        ))}
      </div>
      <div style={{...card, ...fdd(0.16)}}>
        <div style={{...itag, marginBottom:14}}>Betting P&L — Season</div>
        <div style={{display:"flex", gap:20, justifyContent:"center"}}>
          {[{v:"+$340",l:"Net Profit",c:C.birdie},{v:"$1,240",l:"Wagered",c:C.text},{v:"58%",l:"Win Rate",c:C.yellow}].map((s, i) => (
            <div key={i} style={{textAlign:"center"}}><div style={{fontSize:28, fontWeight:800, color:s.c}}>{s.v}</div><div style={{...itag}}>{s.l}</div></div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderLearn = () => {
    const Section = ({id, icon, title, tag: stag, children}) => {
      const open = learnOpen === id;
      return (
        <div style={{...card, padding:0, overflow:"hidden"}}>
          <div onClick={() => setLearnOpen(open ? null : id)} style={{padding:"16px 18px", display:"flex", alignItems:"center", gap:12, cursor:"pointer"}}>
            <div style={{fontSize:24}}>{icon}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:15, fontWeight:700, color:C.text}}>{title}</div>
              {stag && <div style={{fontSize:10, color:C.textMuted, fontStyle:"italic", marginTop:1}}>{stag}</div>}
            </div>
            <div style={{fontSize:18, color:C.textMuted, transform:open ? "rotate(90deg)" : "none", transition:"transform 0.2s"}}>›</div>
          </div>
          {open && <div style={{padding:"0 18px 18px", borderTop:"1px solid " + C.surfaceAlt}}>{children}</div>}
        </div>
      );
    };

    const Rule = ({title, text}) => (
      <div style={{padding:"10px 0", borderBottom:"1px solid " + C.surfaceAlt}}>
        <div style={{fontSize:13, fontWeight:700, color:C.text, marginBottom:3}}>{title}</div>
        <div style={{fontSize:12, color:C.textSec, lineHeight:1.6}}>{text}</div>
      </div>
    );

    const DegenCard = ({icon, name, heat, desc, mechanic}) => (
      <div style={{padding:"14px", borderRadius:14, background:C.surfaceAlt, border:"1px solid " + C.border, marginTop:10}}>
        <div style={{display:"flex", alignItems:"center", gap:10, marginBottom:6}}>
          <div style={{fontSize:22}}>{icon}</div>
          <div style={{flex:1}}>
            <div style={{fontSize:14, fontWeight:800, color:C.text}}>{name}</div>
          </div>
          <div style={{fontSize:11, letterSpacing:0.5}}>{"🔥".repeat(heat)}</div>
        </div>
        <div style={{fontSize:12, color:C.textSec, lineHeight:1.6, marginBottom:6}}>{desc}</div>
        <div style={{fontSize:11, color:C.gold, fontStyle:"italic", fontFamily:"Georgia, serif", lineHeight:1.5}}>{mechanic}</div>
      </div>
    );

    return (
      <div>
        <div style={{padding:"16px 16px 4px", ...fd}}>
          <div style={{fontFamily:"Georgia, serif", fontSize:24, fontWeight:700, color:C.text, fontStyle:"italic"}}>Learn the Game</div>
          <div style={{fontSize:12, color:C.textMuted, fontStyle:"italic", marginTop:2}}>Rules, strategy, and ways to make it interesting</div>
        </div>

        {/* ──── PGA / GOLF BASICS ──── */}
        <div style={{padding:"14px 16px 4px"}}><div style={{...itag, ...fdd(0.04)}}>The Fundamentals</div></div>

        <Section id="pga" icon="⛳" title="PGA Rules — The Basics" tag="What every golfer needs to know">
          <Rule title="Par" text="The expected number of strokes to complete a hole. Par 3 = short hole, Par 4 = medium, Par 5 = long. Your goal is to match or beat par." />
          <Rule title="Scoring Terms" text="Albatross (−3) → Eagle (−2) → Birdie (−1) → Par (E) → Bogey (+1) → Double Bogey (+2) → Triple+ (+3). Lower is always better." />
          <Rule title="Handicap Index" text="Your GHIN handicap measures your potential. An 8.4 handicap means on average you shoot about 8 over par. Used to level the playing field in match play." />
          <Rule title="Stroke Play vs Match Play" text="Stroke play = total strokes over 18 holes wins. Match play = win individual holes (1 up, 2 up, etc.). Most betting games use a variation of match play." />
          <Rule title="Preferred Lies / Winter Rules" text="When conditions are rough, your group can agree to 'lift, clean, and place' in the fairway. Always agree before hole 1." />
          <Rule title="Gimmes" text="Short putts (inside the leather of your putter grip) that your playing partners concede. Not official PGA rules, but standard in casual/betting rounds. Always clarify before the round." />
          <Rule title="OB & Penalty Strokes" text="Out of bounds = stroke + distance (re-hit from original spot, now lying 3). Water hazard = drop near entry point + 1 stroke. Lost ball = same as OB." />
          <Rule title="Ready Golf" text="Forget 'honors' — whoever is ready, hits. Keeps the pace up and keeps the boys happy. The only rule that truly matters." />
        </Section>

        <Section id="etiquette" icon="🤫" title="Course Etiquette" tag="Don't be that guy">
          <Rule title="Silence on the Tee" text="No talking, moving, or phone sounds during someone's swing. Stand still, stand to the side. This is non-negotiable." />
          <Rule title="Pace of Play" text="Keep up with the group ahead, not just ahead of the group behind. If you're looking for a ball, let faster groups play through. 4 hours 15 minutes max." />
          <Rule title="Fix Your Marks" text="Repair ball marks on greens, replace divots on fairways, rake bunkers. Leave the course better than you found it." />
          <Rule title="Cart Rules" text="90-degree rule: drive on the path, turn 90° to your ball, drive back. Never drive on the green surrounds or tee boxes." />
          <Rule title="Phone on Silent" text="Camera is fine. Phone calls are not. If you take a call on the course, you owe the group a round of drinks. House rule." />
        </Section>

        {/* ──── GAME TYPES ──── */}
        <div style={{padding:"18px 16px 4px"}}><div style={{...itag, ...fdd(0.08)}}>Game Types</div></div>

        <Section id="nassau" icon="🏆" title="Nassau" tag="The king of golf bets · 3 bets in 1">
          <Rule title="How It Works" text="Three separate bets: Front 9, Back 9, and Overall 18. Each bet is worth the agreed stake (e.g., $10 Nassau = $30 total at risk). Win the front, lose the back, split overall = you break even." />
          <Rule title="Presses" text="When you're down 2 holes in any of the 3 bets, you can 'press' — starting a new side bet for the remaining holes in that segment. Presses can be auto or manual. Auto-press at 2-down is standard." />
          <Rule title="Strategy" text="The beauty of Nassau is comeback potential. Down 3 on the front? Press and you've got a new game. Smart pressing can turn a losing round into a profitable one." />
        </Section>

        <Section id="skins" icon="💰" title="Skins" tag="Winner take all, hole by hole">
          <Rule title="How It Works" text="Each hole is worth one 'skin' (= the agreed stake). Lowest score on the hole wins the skin. If two or more players tie for low score, the skin carries over to the next hole." />
          <Rule title="Carryovers" text="This is where it gets spicy. Three ties in a row? Hole 4 is now worth 4 skins. A birdie on a carryover hole can be worth the entire round." />
          <Rule title="Validation" text="Some groups require a birdie or better to win a skin (especially on carryover holes). Agree on this before the round. 'Birdie to win' keeps it competitive." />
        </Section>

        <Section id="wolf" icon="🐺" title="Wolf" tag="Strategic. Political. Dangerous.">
          <Rule title="How It Works" text="Rotating tee order. The 'Wolf' tees off last and watches each player hit. After each shot, the Wolf can pick that player as their partner — or wait. If they wait through all players, they go 'Lone Wolf' (1 vs 3)." />
          <Rule title="Lone Wolf" text="Going alone means double payout if you win, double loss if you don't. The ultimate flex. Declare before seeing anyone's tee shot for triple payout ('Blind Wolf')." />
          <Rule title="Strategy" text="Pick partners based on tee shots, not friendships. The Wolf with the best read on the course has a massive edge. Political alliances form and break every 4 holes." />
        </Section>

        <Section id="match" icon="⚔️" title="Match Play" tag="Mano a mano, hole by hole">
          <Rule title="How It Works" text="Each hole is a separate battle. Lowest score wins the hole (1 up). Tie = halved. Match is won when one player is up by more holes than remain (e.g., 3&2 = 3 up with 2 to play)." />
          <Rule title="Handicap Strokes" text="The difference in handicaps determines stroke holes. If you're a 12 and they're an 8, you get 4 strokes on the 4 hardest holes (by handicap ranking)." />
          <Rule title="Dormie" text="When you're up by exactly the number of holes remaining. You can't lose — only win or halve. The pressure is on your opponent." />
        </Section>

        <Section id="stableford" icon="📊" title="Stableford" tag="Points-based · Rewards birdies, forgives blowups">
          <Rule title="Points System" text="Double bogey+ = 0 pts. Bogey = 1 pt. Par = 2 pts. Birdie = 3 pts. Eagle = 4 pts. Albatross = 5 pts. Highest total points wins." />
          <Rule title="Why It's Great" text="Bad hole? Pick up and move on — you just get 0. No more 10s destroying your scorecard. This format rewards aggressive play and birdie hunting." />
          <Rule title="Modified Stableford" text="PGA Tour version: Double bogey = −3, Bogey = −1, Par = 0, Birdie = +2, Eagle = +5. More volatile, more exciting." />
        </Section>

        <Section id="bestball" icon="🤝" title="Best Ball / Four-Ball" tag="Team format · Low ball counts">
          <Rule title="How It Works" text="2v2 teams. Each player plays their own ball. The lowest score between each pair counts as the team score for that hole. Great for mixed-skill groups." />
          <Rule title="Strategy" text="One player plays safe, one attacks. If your partner is in the fairway, you can go for the hero shot. Natural risk management built into the format." />
        </Section>

        <Section id="hammer" icon="🔨" title="Hammer" tag="For the fearless only">
          <Rule title="How It Works" text="At any point during a hole, you can slam the Hammer — doubling the value of that hole. Your opponent must either accept (play for double) or fold (pay current amount)." />
          <Rule title="Re-Hammer" text="If they accept your hammer, they can re-hammer you back. Stakes keep doubling. A hole can go from $10 to $80 fast." />
          <Rule title="When to Hammer" text="Just striped a drive 300 down the middle and your opponent's in the trees? HAMMER. Feeling lucky on a 15-footer for birdie? HAMMER. It's psychological warfare." />
        </Section>

        <Section id="snake" icon="🐍" title="Snake" tag="Three-putt and you're holding it">
          <Rule title="How It Works" text="The last person to three-putt 'holds the snake.' Whoever holds the snake at the end of 18 pays everyone the agreed amount." />
          <Rule title="The Pressure" text="You're holding the snake on 17 with a 20-footer for par. The boys are watching. Your hands are shaking. This is what golf is about." />
          <Rule title="Double Snake" text="Some groups play 'Double Snake' — 4-putt transfers the snake AND doubles the payout. Absolutely brutal." />
        </Section>

        <Section id="vegas_learn" icon="🎰" title="Vegas" tag="Team numbers · Math gets wild">
          <Rule title="How It Works" text="2v2 teams. Combine your team's scores into a two-digit number (lower score first). Team A shoots 4 and 5 = 45. Team B shoots 3 and 6 = 36. Difference (45-36 = 9) times the stake = payout." />
          <Rule title="The Flip" text="If one player makes birdie or better, their team's number FLIPS (lower in front becomes higher). Team A: 4,5 = 45. But if the 5 was a birdie? Now it's 54. Swing of 18 points." />
        </Section>

        <Section id="bbb_learn" icon="🎪" title="Bingo Bango Bongo" tag="Three ways to score each hole">
          <Rule title="Three Points Per Hole" text="BINGO: First on the green. BANGO: Closest to the pin once all balls are on the green. BONGO: First in the hole. Each is worth 1 point." />
          <Rule title="Why It's Fair" text="Skill matters less than timing and putting. A 20-handicapper can beat a scratch player by chipping close and putting first. Great equalizer." />
        </Section>

        {/* ──── DEGENERACY SECTION ──── */}
        <div style={{padding:"18px 16px 4px"}}><div style={{...itag, color:C.azalea, ...fdd(0.12)}}>House Rules — The Degenerate Section</div></div>
        <div style={{padding:"0 16px", marginBottom:4}}>
          <div style={{fontSize:12, color:C.textMuted, fontStyle:"italic", lineHeight:1.6, ...fdd(0.14)}}>For when regular golf bets aren't enough. Enable these in Round Setup to turn a casual round into an absolute war.</div>
        </div>

        <div style={{...card, border:"1px solid " + C.azalea + "40", ...fdd(0.16)}}>
          <DegenCard icon="💣" name="The Nuke" heat={3} 
            desc="Once per round, any player can declare a NUKE on their tee shot. That hole is now worth 5x the normal stake."
            mechanic="Declare before your backswing. No take-backs. If you nuke a hole and double bogey it, that's on you. Fortune favors the bold." />
          
          <DegenCard icon="🎯" name="Bounty Board" heat={2}
            desc="Before the round, each player puts a $5 bounty on one other player. Beat your target head-to-head on any hole and collect their bounty."
            mechanic="You don't know who's hunting you. Bounties are revealed after 18. Multiple people can target the same player. Stack bounties for maximum chaos." />

          <DegenCard icon="🃏" name="Joker Hole" heat={2}
            desc="Each player secretly picks one hole before the round. Their score on that hole counts DOUBLE toward overall standings."
            mechanic="Write it down, seal it in your phone. Reveal after 18. Pick a par 5 you always birdie? Smart. Pick wrong and your double bogey is a quad. High risk, high reward." />

          <DegenCard icon="🔥" name="Hot Streak Escalator" heat={2}
            desc="Make 3 pars or better in a row? Stakes automatically escalate 2x for your next hole. Keep the streak alive for 3x, 4x..."
            mechanic="The multiplier resets on any bogey or worse. A player on a 5-hole heater is playing for 4x stakes — and everyone knows it. Pressure cooker." />

          <DegenCard icon="💀" name="Assassin Mode" heat={3}
            desc="App randomly assigns each player a secret target before the round. Beat your target's score on any hole = $2 per kill. Most kills wins a bonus pot."
            mechanic="Targets are hidden until the end. You might be hunting JTK while Rakan is hunting you. Paranoia is part of the game." />

          <DegenCard icon="🍺" name="The Beer Fund" heat={1}
            desc="Mandatory contributions to the group beer fund: $1 per 3-putt. $2 per water ball. $5 per whiff. $10 per lost ball. End of round = beer run."
            mechanic="Non-negotiable. The fund is sacred. No IOUs. Cash in the hat or Venmo on the spot. Worst player buys first round — it's the law." />

          <DegenCard icon="🎪" name="Wheel of Misfortune" heat={2}
            desc="Loser of the round spins the Wheel. Punishments include: play hole 1 next round with a putter only, wear a ridiculous outfit, buy dinner, or the dreaded 'read your Hinge messages aloud.'"
            mechanic="The Wheel is random. The Wheel is final. Appeal to the group for mercy — they will show none." />

          <DegenCard icon="🦈" name="Shark Mode" heat={3}
            desc="The lowest handicap plays with ZERO strokes but gets 2x payout on every bet if they win. Lose? Pay 2x. High risk for the best player."
            mechanic="Only for true killers. Christo at 8.4 against JTK at 10.2 with no strokes? Fair. Against Marcus at 15.3? That's a donation. Choose wisely." />

          <DegenCard icon="⏰" name="Shot Clock" heat={1}
            desc="Everyone gets 45 seconds per shot. Go over? That's a stroke penalty AND $1 to the pot. No practice swings, no re-reads, no stalling."
            mechanic="One player keeps the timer. Promotes pace of play and punishes the guy who reads his putt from 7 angles. You know who you are, Scott." />

          <DegenCard icon="🎲" name="Chaos Card" heat={3}
            desc="Every 3 holes, the app deals a random Chaos Card that affects the NEXT hole. Examples: Everyone plays from the forward tees. All putts must be one-handed. Closest to the pin on approach skips the hole at par."
            mechanic="Can't be refused. Can't be planned for. Pure, beautiful chaos. The card is revealed on the tee box. Adapt or die." />

          <DegenCard icon="💎" name="The Vault" heat={2}
            desc="$1 per player per hole goes into The Vault. It grows all round. First player to make eagle wins the entire Vault. No eagle by 18? Carries to next round."
            mechanic="At $1/hole × 5 players × 18 holes = $90 Vault per round. It can carry for weeks. Legend has it the Vault once hit $450 before Trey eagled 7." />
        </div>

        <div style={{...card, background:"linear-gradient(145deg, " + C.green + ", " + (dark ? "#003D28" : "#004D35") + ")", border:"none", textAlign:"center", ...fdd(0.2)}}>
          <div style={{fontSize:32, marginBottom:8}}>🔨</div>
          <div style={{fontFamily:"Georgia, serif", fontSize:18, fontWeight:700, color:"#fff", fontStyle:"italic"}}>Born in Sugar Tree</div>
          <div style={{fontSize:12, color:"rgba(255,255,255,0.5)", fontStyle:"italic", marginTop:4}}>Fort Worth, Texas · Est. 2026</div>
          <div style={{fontSize:11, color:C.yellow, fontStyle:"italic", marginTop:8}}>Your crew. Your bets. Your bragging rights.</div>
          <div style={{fontSize:10, color:"rgba(255,255,255,0.3)", fontStyle:"italic", marginTop:6}}>hammergolf.app</div>
        </div>

        <div style={{height:30}} />
      </div>
    );
  };

  let content;
  if (tab === "round") {
    if (screen === "setup") content = renderSetup();
    else if (screen === "active") content = renderActive();
    else content = renderHome();
  } else if (tab === "scorecard") content = renderScorecard();
  else if (tab === "bets") content = renderBets();
  else if (tab === "stats") content = renderStats();
  else if (tab === "learn") content = renderLearn();
  else content = renderHome();

  const headerText = tab === "round" && screen === "setup" ? "Round Setup" : tab === "round" && screen === "active" ? hole.name : tab === "scorecard" ? "Scorecard" : tab === "bets" ? "Money Board" : tab === "stats" ? "Your Game" : tab === "learn" ? "Learn" : "Hammer";

  return (
    <div style={{maxWidth:430, margin:"0 auto", minHeight:"100vh", background:C.bg, fontFamily:"-apple-system, BlinkMacSystemFont, 'Segoe UI', Georgia, sans-serif", position:"relative"}}>
      <style>{`* { margin:0; padding:0; box-sizing:border-box; } ::-webkit-scrollbar { display:none; }`}</style>

      <div style={{height:44, background:C.surface, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 20px", fontSize:13, fontWeight:600, color:C.text, borderBottom:"1px solid " + C.border}}>
        <span>9:41</span>
        <span style={{fontFamily:"Georgia, serif", fontWeight:700, color:C.yellow, fontStyle:"italic", fontSize:11, letterSpacing:2}}>HAMMER</span>
        <div onClick={() => setDark(d => !d)} style={{cursor:"pointer", fontSize:16}}>{dark ? "☀️" : "🌙"}</div>
      </div>

      <div style={{padding:"12px 20px", background:C.surface, display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom:"1px solid " + C.border}}>
        {screen !== "home" && tab === "round" ? (
          <div onClick={() => setScreen(screen === "active" ? "setup" : "home")} style={{fontSize:14, fontWeight:600, color:C.green, cursor:"pointer"}}>← Back</div>
        ) : <div style={{width:40}} />}
        <div style={{textAlign:"center", flex:1}}>
          <div style={{fontFamily:"Georgia, serif", fontSize:17, fontWeight:700, color:C.text, fontStyle:"italic"}}>{headerText}</div>
          {tab === "round" && screen === "active" && <div style={{fontSize:11, color:C.textMuted, fontStyle:"italic"}}>Hole {curHole} of 18 · Par {hole.par}</div>}
        </div>
        <div style={{width:32, height:32, borderRadius:16, background:"linear-gradient(135deg, " + C.yellow + ", " + C.gold + ")", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:800, color:C.green}}>C</div>
      </div>

      <div style={{paddingBottom:90, minHeight:"calc(100vh - 104px)", overflow:"auto"}}>
        {content}
      </div>

      {/* ──── SIDE BET MODAL ──── */}
      {sbModal && (
        <div style={{position:"fixed", top:0, left:0, right:0, bottom:0, zIndex:200, display:"flex", flexDirection:"column", justifyContent:"flex-end"}}>
          <div onClick={() => setSbModal(false)} style={{flex:1, background:"rgba(0,0,0,0.5)"}} />
          <div style={{background:C.surface, borderTopLeftRadius:24, borderTopRightRadius:24, padding:"20px 20px 36px", maxWidth:430, margin:"0 auto", width:"100%"}}>
            <div style={{width:36, height:4, borderRadius:2, background:C.border, margin:"0 auto 16px"}} />
            <div style={{fontFamily:"Georgia, serif", fontSize:20, fontWeight:700, color:C.text, fontStyle:"italic", marginBottom:16}}>{sbEdit != null ? "Settle Bet" : "🤝 New Side Bet"}</div>

            {sbEdit == null ? (
              <div>
                {/* Bet description */}
                <div style={{marginBottom:14}}>
                  <div style={{fontSize:11, fontWeight:700, color:C.textMuted, textTransform:"uppercase", letterSpacing:1, marginBottom:6}}>What's the bet?</div>
                  <input value={sbText} onChange={e => setSbText(e.target.value)} placeholder="e.g. $20 says you can't hit this green" style={{width:"100%", padding:"12px 14px", borderRadius:12, border:"1px solid " + C.border, background:C.surfaceAlt, color:C.text, fontSize:14, fontFamily:"Georgia, serif", fontStyle:"italic", outline:"none"}} />
                </div>

                {/* Quick bet suggestions */}
                <div style={{display:"flex", gap:6, flexWrap:"wrap", marginBottom:14}}>
                  {["Closest to the pin from here", "Make this putt", "Hit the fairway", "Over/under 3 putts", "First one in the water"].map((s, i) => (
                    <div key={i} onClick={() => setSbText(s)} style={{padding:"5px 10px", borderRadius:16, background:sbText === s ? C.green : C.surfaceAlt, border:"1px solid " + (sbText === s ? C.green : C.border), cursor:"pointer"}}>
                      <span style={{fontSize:11, fontWeight:600, color:sbText === s ? "#fff" : C.textMuted}}>{s}</span>
                    </div>
                  ))}
                </div>

                {/* Amount */}
                <div style={{marginBottom:14}}>
                  <div style={{fontSize:11, fontWeight:700, color:C.textMuted, textTransform:"uppercase", letterSpacing:1, marginBottom:6}}>Per person</div>
                  <div style={{display:"flex", gap:8}}>
                    {[2, 5, 10, 20, 50].map(a => (
                      <div key={a} onClick={() => setSbAmt(a)} style={{flex:1, padding:"10px 0", borderRadius:10, background:sbAmt === a ? C.green : C.surfaceAlt, border:"1px solid " + (sbAmt === a ? C.green : C.border), textAlign:"center", cursor:"pointer"}}>
                        <span style={{fontSize:14, fontWeight:800, color:sbAmt === a ? "#fff" : C.text}}>${a}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Who's in */}
                <div style={{marginBottom:18}}>
                  <div style={{fontSize:11, fontWeight:700, color:C.textMuted, textTransform:"uppercase", letterSpacing:1, marginBottom:6}}>Who's in?</div>
                  <div style={{display:"flex", gap:8}}>
                    {PLAYERS.map(p => {
                      const isIn = sbPlayers.includes(p.id);
                      return (
                        <div key={p.id} onClick={() => setSbPlayers(prev => isIn ? prev.filter(x => x !== p.id) : [...prev, p.id])} style={{flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4, padding:"10px 4px", borderRadius:12, background:isIn ? C.greenLight : C.surfaceAlt, border:"2px solid " + (isIn ? C.green : "transparent"), cursor:"pointer"}}>
                          <div style={avs(p.col, 30)}><span style={{fontSize:11}}>{p.av}</span></div>
                          <span style={{fontSize:10, fontWeight:700, color:isIn ? C.birdie : C.textMuted}}>{p.name.split(" ")[0]}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Pot preview + Lock it in */}
                {sbPlayers.length >= 2 && sbText && (
                  <div style={{textAlign:"center", marginBottom:12}}>
                    <span style={{fontSize:12, color:C.textMuted}}>Pot: </span>
                    <span style={{fontSize:22, fontWeight:800, color:C.yellow}}>${sbAmt * sbPlayers.length}</span>
                  </div>
                )}

                <button onClick={() => {
                  if (sbText && sbPlayers.length >= 2) {
                    setSideBets(prev => [...prev, {id: Date.now(), text: sbText, amount: sbAmt, players: sbPlayers, hole: curHole, winner: null}]);
                    setSbModal(false);
                  }
                }} disabled={!sbText || sbPlayers.length < 2} style={{width:"100%", padding:"14px", borderRadius:14, background:sbText && sbPlayers.length >= 2 ? C.green : C.border, border:"none", color:sbText && sbPlayers.length >= 2 ? "#fff" : C.textMuted, fontSize:16, fontWeight:800, fontFamily:"Georgia, serif", fontStyle:"italic", cursor:sbText && sbPlayers.length >= 2 ? "pointer" : "default"}}>
                  {sbPlayers.length < 2 ? "Pick at least 2 players" : "Lock It In 🔨"}
                </button>
              </div>
            ) : (
              <div>
                {/* Settle mode — pick winner */}
                <div style={{fontSize:13, color:C.textMuted, fontStyle:"italic", marginBottom:14}}>"{sbText}" — ${sbAmt}/person</div>
                <div style={{fontSize:11, fontWeight:700, color:C.textMuted, textTransform:"uppercase", letterSpacing:1, marginBottom:10}}>Who won?</div>
                <div style={{display:"flex", flexDirection:"column", gap:8, marginBottom:18}}>
                  {sbPlayers.map(pid => {
                    const pl = PLAYERS.find(p => p.id === pid);
                    return pl ? (
                      <div key={pid} onClick={() => {
                        setSideBets(prev => prev.map(b => b.id === sbEdit ? {...b, winner: pid} : b));
                        setSbModal(false);
                      }} style={{display:"flex", alignItems:"center", gap:12, padding:"14px", borderRadius:14, background:C.surfaceAlt, border:"1px solid " + C.border, cursor:"pointer"}}>
                        <div style={avs(pl.col, 36)}><span style={{fontSize:13}}>{pl.av}</span></div>
                        <div style={{fontSize:15, fontWeight:700, color:C.text}}>{pl.name}</div>
                        <div style={{marginLeft:"auto", fontSize:14, fontWeight:800, color:C.birdie}}>+${sbAmt * (sbPlayers.length - 1)}</div>
                      </div>
                    ) : null;
                  })}
                </div>
                <div onClick={() => setSbModal(false)} style={{textAlign:"center", fontSize:13, color:C.textMuted, cursor:"pointer", fontStyle:"italic"}}>Cancel</div>
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:430, background:C.navBg, borderTop:"1px solid " + C.navBorder, display:"flex", justifyContent:"space-around", padding:"8px 0 28px", zIndex:100}}>
        {[{id:"round",icon:"⛳",label:"Round"},{id:"scorecard",icon:"📋",label:"Card"},{id:"bets",icon:"💰",label:"Bets"},{id:"stats",icon:"📊",label:"Stats"},{id:"learn",icon:"📖",label:"Learn"}].map(n => (
          <div key={n.id} onClick={() => { setTab(n.id); if (n.id !== "round") setScreen("home"); }} style={{display:"flex", flexDirection:"column", alignItems:"center", gap:2, cursor:"pointer", opacity:tab === n.id ? 1 : 0.4}}>
            <div style={{fontSize:20}}>{n.icon}</div>
            <div style={{fontSize:9, fontWeight:700, letterSpacing:0.3, color:tab === n.id ? C.green : C.textMuted}}>{n.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
