// VERBATIM copy of the current unit draw routine lS (and its helpers) from release/R1c/dist/assets/index-2531699e.js
// (pretty-printed with terser, nothing else changed; source lines 55597-55817 of tmp/pitch-anim/arch/r1c-pretty.js).
// Only the three outside names it calls are stubbed: Yx (fps readout), N4 (sound flag), jk (cannon sound).
const Yx = () => 60, N4 = () => false, jk = () => {};
const Lp = {
    "Line of Battle": null,
    "Charging Line": "#ff4422",
    "Skirmish Line": "#66aaff",
    "Chaotic Retreat": "#ff8800",
    "Line of March": "#aaaaaa",
    Reserve: "#226622",
    Bivouac: "#555555",
    "Deployed Artillery": "#f5c518",
    "Limbered Artillery": "#c8a84a",
    "Mounted Cavalry": "#44aa44",
    "Dismounted Cavalry": "#88cc88"
};
const sA = "#3a6bc4", aA = "#c43a3a", V4 = "#1a3a7a", G4 = "#7a1a1a", H4 = "#88ccff", W4 = "#ff9944";

function lA(c, f) {
    return Math.max(10, Math.min(f ? 60 : 120, Math.round((c || 200) / (f ? 6 : 4))));
}

function $4(c) {
    return c.disposition === "Deployed Artillery" || c.disposition === "Limbered Artillery" || c.unit_id && c.unit_id.includes("ART");
}

function q4(c) {
    return c.disposition === "Mounted Cavalry" || c.disposition === "Dismounted Cavalry" || c.unit_id && c.unit_id.includes("CAV");
}

function Z4(c) {
    return c.disposition === "Skirmish Line";
}

function cx(c) {
    const x = (c.unit_id || "").replace(/^[UC]-/, ""), M = x.match(/^(\d+)([A-Z]{2,})$/);
    return M ? M[1] + " " + M[2] : x.includes("-") ? x.replace(/-/g, "/").slice(0, 10) : x.slice(0, 8);
}

function Y4(c, f, x) {
    const M = x && x[c.unit_id] || {};
    if (f >= 16.5) {
        const P = M.designation || M.name || cx(c), z = c.strength ? " " + c.strength : "";
        return P + z;
    }
    return f >= 15 ? M.designation || M.name || cx(c) : f >= 14 ? cx(c) : f >= 12 ? cx(c).slice(0, 6) : null;
}

function X4(c, f) {
    const x = new Set, M = c.filter(z => {
        var H;
        return (H = z.unit_id) == null ? void 0 : H.startsWith("U-");
    }), P = c.filter(z => {
        var H;
        return (H = z.unit_id) == null ? void 0 : H.startsWith("C-");
    });
    return M.forEach(z => {
        const H = f[z.unit_id];
        H && P.forEach(l => {
            const R = f[l.unit_id];
            if (!R) return;
            const he = H.x - R.x, Ee = H.y - R.y;
            Math.sqrt(he * he + Ee * Ee) < 40 && (x.add(z.unit_id), x.add(l.unit_id));
        });
    }), x;
}

function lS(c, f, x, M, P, z, H, l, R) {
    if (!c || !f || !x) return;
    const he = c.getContext("2d"), Ee = f.getZoom(), {width: Se, height: Ie} = c.getBoundingClientRect();
    if ((c.width !== Se || c.height !== Ie) && (c.width = Se, c.height = Ie), !x || x.length === 0) return;
    he.clearRect(0, 0, c.width, c.height);
    const {sides: ze = [ "Union", "Confederate" ], dispositions: st, minStrength: ut = 0} = z || {}, xe = [ ...x.filter(Xe => {
        var Jt;
        const It = ((Jt = Xe.unit_id) == null ? void 0 : Jt.startsWith("U-")) ? "Union" : "Confederate";
        return !(!ze.includes(It) || st && !st.includes(Xe.disposition) || Xe.strength != null && Xe.strength < ut);
    }) ].sort((Xe, xt) => Xe.unit_id === M || Xe.unit_id === P ? 1 : xt.unit_id === M || xt.unit_id === P ? -1 : 0), pe = [];
    xe.forEach(Xe => {
        try {
            const xt = f.project([ Xe.lng, Xe.lat ]);
            xt.x > -200 && xt.x < c.width + 200 && xt.y > -40 && xt.y < c.height + 40 && pe.push({
                p: Xe,
                x: xt.x,
                y: xt.y,
                dx: 0,
                dy: 0
            });
        } catch {}
    });
    const Pe = X4(xe, Object.fromEntries(pe.map(Xe => [ Xe.p.unit_id, Xe ])));
    if (Pe.size > 0 && N4() && (!lS._lastSoundMs || l - lS._lastSoundMs > 4e3) && (jk(), 
    lS._lastSoundMs = l), Ee >= 11 && pe.length > 1) {
        const Xe = Jt => lA(Jt.p.strength);
        for (let Jt = 0; Jt < 8; Jt++) for (let Lt = 0; Lt < pe.length; Lt++) {
            const sn = pe[Lt], $n = Xe(sn) / 2 + 2;
            for (let Ci = Lt + 1; Ci < pe.length; Ci++) {
                const yi = pe[Ci], vn = Xe(yi) / 2 + 2, er = sn.x + sn.dx, Zn = sn.y + sn.dy, Dt = yi.x + yi.dx, Vt = yi.y + yi.dy, Ut = $n + vn - Math.abs(er - Dt), An = 12 - Math.abs(Zn - Vt);
                if (Ut > 0 && An > 0) {
                    const pi = Ut > An ? 0 : er < Dt ? -Ut / 2 : Ut / 2, Yn = Ut > An ? Zn < Vt ? -An / 2 : An / 2 : 0;
                    sn.dx += pi, sn.dy += Yn, yi.dx -= pi, yi.dy -= Yn;
                }
            }
        }
    }
    pe.forEach(({p: Xe, x: xt, y: It, dx: Jt, dy: Lt}) => {
        var $n;
        if (Math.abs(Jt) < 3 && Math.abs(Lt) < 3) return;
        const sn = ($n = Xe.unit_id) == null ? void 0 : $n.startsWith("U-");
        he.beginPath(), he.moveTo(xt, It), he.lineTo(xt + Jt, It + Lt), he.strokeStyle = sn ? "rgba(80,120,200,0.4)" : "rgba(180,80,60,0.4)", 
        he.lineWidth = .5, he.stroke();
    }), pe.forEach(({p: Xe, x: xt, y: It, dx: Jt, dy: Lt}) => {
        var hi;
        const sn = xt + Jt, $n = It + Lt, Ci = (hi = Xe.unit_id) == null ? void 0 : hi.startsWith("U-"), yi = Xe.unit_id === M || Xe.unit_id === P, vn = H && H[Xe.unit_id] && l < H[Xe.unit_id], er = Pe.has(Xe.unit_id);
        let Zn = Ci ? sA : aA;
        vn && (Zn = Ci ? H4 : W4);
        const Dt = Ci ? V4 : G4, Vt = c.width < 500, Ut = lA(Xe.strength, Vt), An = q4(Xe) ? 4 : 8, pi = Xe.bearing || 0;
        if (he.save(), he.translate(sn, $n), he.rotate((pi - 90) * Math.PI / 180), yi && (he.shadowColor = "#e8d5a3", 
        he.shadowBlur = 14), er && !yi) {
            const Pn = .4 + .6 * (window.__gtbgReduceMotion ? .7 : Math.abs(Math.sin(l / 300)));
            he.shadowColor = `rgba(255,255,255,${Pn})`, he.shadowBlur = 8;
        }
        $4(Xe) ? (he.strokeStyle = Zn, he.lineWidth = 2, he.strokeRect(-Ut / 2, -An / 2 - 1, Ut, An + 2), 
        he.beginPath(), he.moveTo(-Ut / 4, 0), he.lineTo(Ut / 4, 0), he.stroke()) : Z4(Xe) ? (he.setLineDash([ 4, 3 ]), 
        he.strokeStyle = Zn, he.lineWidth = 2, he.beginPath(), he.moveTo(-Ut / 2, 0), he.lineTo(Ut / 2, 0), 
        he.stroke(), he.setLineDash([])) : (he.fillStyle = Zn, he.globalAlpha = yi ? 1 : .88, 
        he.fillRect(-Ut / 2, -An / 2, Ut, An), he.strokeStyle = Dt, he.lineWidth = 1, he.strokeRect(-Ut / 2, -An / 2, Ut, An)), 
        he.shadowBlur = 0, he.globalAlpha = 1, he.restore();
        const Yn = Lp[Xe.disposition] || (Ci ? sA : aA);
        he.beginPath(), he.arc(sn, $n - 7, 3.5, 0, Math.PI * 2), he.fillStyle = Yn, he.fill(), 
        he.strokeStyle = "rgba(0,0,0,0.8)", he.lineWidth = 1, he.stroke();
    });
    const it = c.width < 500 ? 14 : 12;
    Ee >= 11 && pe.forEach(({p: Xe, x: xt, y: It, dx: Jt, dy: Lt}) => {
        var An;
        const sn = xt + Jt, $n = It + Lt, Ci = Xe.unit_id === M || Xe.unit_id === P;
        if (!Ci && Ee < it) return;
        const yi = Y4(Xe, Ee, {});
        if (!yi) return;
        const vn = Ci || Ee >= 16 ? 10 : Ee >= 14 ? 9 : 8;
        he.save(), he.font = `bold ${vn}px sans-serif`, he.textAlign = "center", he.textBaseline = "middle";
        const er = $n - 13, Zn = he.measureText(yi).width, Dt = 3, Vt = 2;
        he.fillStyle = "rgba(0,0,0,0.72)", he.fillRect(sn - Zn / 2 - Dt, er - vn / 2 - Vt, Zn + Dt * 2, vn + Vt * 2);
        const Ut = (An = Xe.unit_id) == null ? void 0 : An.startsWith("U-");
        he.fillStyle = Ut ? "#aaccff" : "#ffbbaa", he.fillText(yi, sn, er), he.restore();
    }), Yx() < 45 && (he.fillStyle = "rgba(255,100,0,0.7)", he.font = "10px monospace", 
    he.fillText(`${Yx()} fps`, 10, c.height - 10));
}

export { lS, lA };
