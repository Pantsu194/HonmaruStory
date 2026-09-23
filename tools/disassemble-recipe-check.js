// tools/disassemble-recipe-check.js
// 刀解配方校验台（只读）
//
// 用法: node tools/disassemble-recipe-check.js
//
// v3.1.0 起配方来自「插件管理器参数」，所以本脚本先从 js/plugins.js 取出
// DisassembleList.parameters，再按游戏真实加载顺序喂给插件（stub PluginManager.parameters）。
//
// 校验内容：
//   1. 参数里配了哪些物品、每个的锻造消耗 / 启用状态
//   2. 回收量 = 该物品锻造消耗的一半（向下取整），且四种素材等量
//   3. 回收变量 = 参数 materialVarIds（默认 V70/V71/V72/V73）
//   4. 列表过滤：背包持有 > 0 才显示；持有 0 / 非配方物品都不显示
//   5. 关掉某条配方后既不产出也不显示；参数为空时回退默认表
//
// 只读脚本，不修改任何工程文件（data/ 下的事件一律只读）。

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const jsDir = path.join(root, "js");
const MZ_FILES = ["rmmz_core.js", "rmmz_managers.js", "rmmz_objects.js",
                  "rmmz_windows.js", "rmmz_scenes.js", "rmmz_sprites.js"];

function loadMZ() {
    const sandbox = {};
    sandbox.window = sandbox;
    sandbox.global = sandbox;
    sandbox.console = { log() {}, warn() {}, error() {}, info() {}, debug() {} };
    ["Math", "JSON", "Date", "Number", "String", "Array", "Object", "Error",
     "RegExp", "Function", "Boolean"].forEach(k => { sandbox[k] = global[k]; });
    sandbox.setTimeout = () => 0;
    sandbox.clearTimeout = () => {};
    sandbox.setInterval = () => 0;
    sandbox.clearInterval = () => {};
    sandbox.parseInt = parseInt;
    sandbox.parseFloat = parseFloat;
    sandbox.isNaN = isNaN;
    sandbox.isFinite = isFinite;

    function stub() {}
    function Ctor() {}
    Ctor.prototype = Object.create(stub.prototype);
    Ctor.prototype.constructor = Ctor;
    Ctor.registerPlugin = function () {};
    sandbox.PIXI = new Proxy({}, {
        get(t, k) {
            if (k === "utils") return { isMobile: { any: false } };
            if (k === "settings") return { SCALE_MODE: 0 };
            if (k === "BLEND_MODES") return { NORMAL: 0 };
            if (k === "SCALE_MODES") return { LINEAR: 1, NEAREST: 0 };
            if (!t[k]) t[k] = Ctor;
            return t[k];
        },
    });
    const fakeCanvas = () => ({
        width: 0, height: 0, style: {},
        getContext: () => new Proxy({}, {
            get(tt, k) {
                if (k === "measureText") return () => ({ width: 0 });
                if (k === "canvas") return { width: 0, height: 0 };
                return () => {};
            },
            set() { return true; },
        }),
    });
    sandbox.document = {
        createElement: tag => (tag === "canvas" ? fakeCanvas() : { style: {}, appendChild() {} }),
        createElementNS: () => fakeCanvas(),
        body: { appendChild() {}, style: {} },
        addEventListener() {}, removeEventListener() {},
        documentElement: { style: {} },
    };
    sandbox.navigator = { userAgent: "node" };
    sandbox.location = { href: "" };
    sandbox.innerWidth = 816;
    sandbox.innerHeight = 624;
    sandbox.devicePixelRatio = 1;
    sandbox.requestAnimationFrame = () => 0;
    sandbox.cancelAnimationFrame = () => {};
    sandbox.addEventListener = () => {};
    sandbox.removeEventListener = () => {};
    sandbox.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
    sandbox.XMLHttpRequest = function () { this.open = () => {}; this.send = () => {}; };
    sandbox.Image = function () {};
    sandbox.PerformanceObserver = function () { this.observe = () => {}; };
    sandbox.Rectangle = function (x, y, w, h) { this.x = x; this.y = y; this.width = w; this.height = h; };

    vm.createContext(sandbox);
    for (const f of MZ_FILES) {
        try {
            vm.runInContext(fs.readFileSync(path.join(jsDir, f), "utf8"), sandbox, { filename: f });
        } catch (e) { /* 桩件环境，个别文件可跳过 */ }
    }
    return sandbox;
}

let pass = 0, fail = 0;
function ok(cond, label) {
    if (cond) { pass++; console.log("  [OK]   " + label); }
    else { fail++; console.log("  [FAIL] " + label); }
}

const items = JSON.parse(fs.readFileSync(path.join(root, "data", "Items.json"), "utf8"));
const systemJson = JSON.parse(fs.readFileSync(path.join(root, "data", "System.json"), "utf8"));
const varNames = systemJson.variables;
const pluginSrc = fs.readFileSync(path.join(jsDir, "plugins", "DisassembleList.js"), "utf8");

// 按游戏真实加载顺序：PluginManager.parameters(插件名) 返回 plugins.js 里的 parameters
function loadPluginWith(paramsByPlugin) {
    const sb = loadMZ();
    sb.$dataItems = items;
    sb.$dataWeapons = [];
    sb.$dataArmors = [];
    sb.DataManager.isItem = obj => !!(obj && obj.id);   // 桩：只判断 ID 是否存在
    sb.DataManager.isWeapon = () => false;
    sb.DataManager.isArmor = () => false;
    sb.PluginManager.parameters = function (name) {
        return (paramsByPlugin && paramsByPlugin[name]) || {};
    };
    vm.runInContext(pluginSrc, sb, { filename: "DisassembleList.js" });
    return sb;
}

// ---------------------------------------------------------------- 1. 读 plugins.js 参数
const pluginsSrc = fs.readFileSync(path.join(jsDir, "plugins.js"), "utf8");
const pluginsJson = pluginsSrc.substring(pluginsSrc.indexOf("["), pluginsSrc.lastIndexOf("]") + 1);
const pluginEntries = JSON.parse(pluginsJson);
const entry = pluginEntries.find(e => e.name === "DisassembleList");

console.log("===== 刀解配方校验台（v3.2.0 四素材独立版）=====");
console.log("");
console.log("-- 参数来源：js/plugins.js -> DisassembleList.parameters --");
if (!entry) throw new Error("plugins.js 里找不到 DisassembleList");
console.log("  recipeList    = " + entry.parameters.recipeList.slice(0, 60) + " ...");
console.log("  materialVarIds= " + entry.parameters.materialVarIds);
console.log("");

const sandbox = loadPluginWith({ DisassembleList: entry.parameters });
const cfg = sandbox.window.DisassembleListConfig;
if (!cfg) throw new Error("插件未导出 DisassembleListConfig");

// ---------------------------------------------------------------- 2. 读刀匠事件（只读）
const map012 = JSON.parse(fs.readFileSync(path.join(root, "data", "Map012.json"), "utf8"));
const ev8 = map012.events.find(e => e && e.id === 8);
const forgeCost = {};
const forgePool = new Set();
for (const page of ev8.pages) {
    for (const c of page.list) {
        if (c.code !== 357 || c.parameters[0] !== "SimpleForge") continue;
        const cmd = c.parameters[1];
        const a = c.parameters[3] || {};
        if (cmd === "setCost") {
            // v3.2.0：四种素材的消耗分别取值（例如 "10 20 0 5"）
            forgeCost[Number(a.itemId)] = String(a.costs).trim().split(/\s+/).map(Number);
        } else if (cmd === "setRange") {
            for (let i = Number(a.start); i <= Number(a.end); i++) forgePool.add(i);
        } else if (cmd === "setList") {
            String(a.items).split(/\s+/).forEach(s => { if (s) forgePool.add(Number(s)); });
        }
    }
}

const recipeIds = Object.keys(cfg.recipes).map(Number).sort((a, b) => a - b);
const poolIds = Array.from(forgePool).sort((a, b) => a - b);

console.log("-- 刀匠事件里的可锻造池（" + poolIds.length + " 种，仅作对照，脚本不修改它）--");
console.log("  " + poolIds.join(" "));
console.log("");
console.log("-- 参数里的配方（" + recipeIds.length + " 条）：四种素材分别对照 --");
console.log("  素材顺序 = " + cfg.materialVarIds.map(i => ("V" + i + " " + (varNames[i] || ""))).join("  /  "));
console.log("  ID  名称                四种锻造消耗        四种刀解回收         启用  判定");
for (const id of recipeIds) {
    const name = items[id] ? items[id].name : "(无此物品)";
    const fc = forgeCost[id];
    const res = cfg.resultsOf(id) || [];
    const enabled = cfg.recipes[id].enabled !== false;
    const costTxt = fc ? fc.join("/") : "-";
    const gainTxt = cfg.materialVarIds.map((varId, i) => {
        const hit = res.filter(r => r.varId === varId)[0];
        return hit ? hit.count : 0;
    }).join("/");
    let okRow = true;
    if (fc) {
        for (let i = 0; i < 4; i++) {
            const expect = Math.floor((fc[i] || 0) / 2);
            const hit = res.filter(r => r.varId === cfg.materialVarIds[i])[0];
            if ((hit ? hit.count : 0) !== expect) okRow = false;
        }
    }
    console.log("  " + String(id).padEnd(4) +
                name.padEnd(20) +
                costTxt.padEnd(20) +
                gainTxt.padEnd(21) +
                (enabled ? "开" : "关").padEnd(6) +
                (okRow ? "OK" : "NG"));
}
console.log("");

// ---------------------------------------------------------------- 3. 断言
console.log("-- 断言 --");
ok(!!entry && !!entry.parameters.recipeList, "plugins.js 里存在 DisassembleList 的 recipeList 参数");
ok(recipeIds.length === 15, "参数解析出 15 条配方（实际 " + recipeIds.length + "）");
ok(JSON.stringify(cfg.materialVarIds) === JSON.stringify([70, 71, 72, 73]),
   "materialVarIds 解析为 [70,71,72,73]（实际 " + JSON.stringify(cfg.materialVarIds) + "）");

const noCost = recipeIds.filter(id => forgeCost[id] === undefined);
ok(noCost.length === 0, "每条配方都能在刀匠事件里找到锻造消耗（找不到的：[" + noCost.join(",") + "]）");

let allHalf = true, mismatch = "";
for (const id of recipeIds) {
    const fc = forgeCost[id];
    if (fc === undefined) continue;
    const res = cfg.resultsOf(id) || [];
    for (let i = 0; i < 4; i++) {
        const expect = Math.floor((fc[i] || 0) / 2);
        const hit = res.filter(r => r.varId === cfg.materialVarIds[i])[0];
        if ((hit ? hit.count : 0) !== expect) {
            allHalf = false;
            mismatch = id + " 第" + (i + 1) + "种素材（期望 " + expect + "）";
        }
    }
}
ok(allHalf, "每条配方：每种素材的回收量 = 该素材锻造消耗的一半（向下取整）" + (mismatch ? " —— 不符：" + mismatch : ""));
ok(cfg.resultsOf(57)[0].count === 2, "5 档（今剑 57）四种素材各回收 2 —— 2.5 向下取整");
ok(cfg.resultsOf(56)[0].count === 7, "15 档（和泉守兼定 56）四种素材各回收 7 —— 7.5 向下取整");
ok(cfg.resultsOf(59)[0].count === 25, "50 档（石切丸 59）四种素材各回收 25");
ok(cfg.resultsOf(64) === null, "非配方物品（64 本丸地图）不产出");
ok(cfg.resultsOf(999) === null, "不存在的 ID 不产出");

// 列表过滤（直接调用插件里的 makeItemList）
let held = {};
sandbox.$gameParty = { numItems: item => held[item.id] || 0 };
function listWith(heldMap) {
    held = heldMap;
    const win = Object.create(sandbox.Window_DisassembleList.prototype);
    win._data = [];
    win.makeItemList();
    return win._data;
}
let data = listWith({ 50: 3, 58: 1 });
ok(data.length === 2 && data[0].id === 50 && data[1].id === 58, "持有 50×3、58×1 -> 列表显示这两项（按 ID 升序）");
data = listWith({ 50: 0 });
ok(data.length === 1 && data[0] === null, "配方物品持有 0 -> 不显示");
data = listWith({});
ok(data.length === 1 && data[0] === null, "什么都没持有 -> 列表为空");
data = listWith({ 64: 5, 74: 5 });
ok(data.length === 1 && data[0] === null, "持有非配方物品（64/74）-> 一概不显示");
data = listWith({ 50: 1, 51: 1, 52: 1, 53: 1, 54: 1, 55: 1, 56: 1, 57: 1, 58: 1, 59: 1,
                  60: 1, 61: 1, 62: 1, 63: 1, 65: 1 });
ok(data.length === 15, "15 种全持有 -> 15 项全显示");

// enabled 内存开关
cfg.recipes[58].enabled = false;
ok(cfg.resultsOf(58) === null, "把三日月(58) 设为 enabled:false -> 不产出");
ok(cfg.enabledIds().indexOf(58) < 0, "enabled:false 的配方不出现在列表候选里");
data = listWith({ 58: 3, 59: 1 });
ok(data.length === 1 && data[0].id === 59, "关掉 58 后即使持有它也不显示");
cfg.recipes[58].enabled = true;
ok(cfg.resultsOf(58) !== null, "恢复 enabled:true 后重新生效");

// 四种素材不等量：10 / 20 / 0 / 5 -> 5 / 10 / 0 / 2
const sbMix = loadPluginWith({ DisassembleList: {
    recipeList: JSON.stringify([JSON.stringify({
        itemId: "50", cost1: "10", cost2: "20", cost3: "0", cost4: "5", enabled: "true"
    })]),
    materialVarIds: "70,71,72,73"
} });
const cfgMix = sbMix.window.DisassembleListConfig;
const mix = cfgMix.resultsOf(50);
ok(mix.length === 3, "素材3 填 0 -> 该种素材不产出（结果只剩 3 项）");
ok(mix[0].varId === 70 && mix[0].count === 5, "素材1 消耗 10 -> 回收 5");
ok(mix[1].varId === 71 && mix[1].count === 10, "素材2 消耗 20 -> 回收 10（不再强制与素材1 等量）");
ok(mix[2].varId === 73 && mix[2].count === 2, "素材4 消耗 5 -> 回收 2（2.5 向下取整）");
const sbOne = loadPluginWith({ DisassembleList: {
    recipeList: JSON.stringify([JSON.stringify({
        itemId: "50", cost1: "1", cost2: "0", cost3: "0", cost4: "0", enabled: "true"
    })]),
    materialVarIds: "70,71,72,73"
} });
ok(sbOne.window.DisassembleListConfig.resultsOf(50) === null, "四种消耗都算不出 1 以上时 -> 不产出（返回 null）");

// 参数为空 -> 回退默认表
const sbEmpty = loadPluginWith({ DisassembleList: {} });
const cfgEmpty = sbEmpty.window.DisassembleListConfig;
ok(Object.keys(cfgEmpty.recipes).length === 15, "参数为空时回退默认表（15 条）");
ok(JSON.stringify(cfgEmpty.materialVarIds) === JSON.stringify([70, 71, 72, 73]), "参数为空时素材变量也回退默认值");

// 编辑器写回的字符串布尔
const sbStr = loadPluginWith({ DisassembleList: {
    recipeList: JSON.stringify([
        JSON.stringify({ itemId: "58", cost: "30", enabled: "false" }),
        JSON.stringify({ itemId: "59", cost: "50", enabled: "true" })
    ]),
    materialVarIds: "70,71,72,73"
} });
const cfgStr = sbStr.window.DisassembleListConfig;
ok(cfgStr.resultsOf(58) === null, "enabled 写成字符串 \"false\" 时被正确识别为关闭");
ok(cfgStr.resultsOf(59) !== null && cfgStr.resultsOf(59)[0].count === 25, "enabled 写成字符串 \"true\" 时正常生效");
ok(cfgStr.enabledIds().length === 1, "关闭的配方不进入列表候选（只剩 1 条）");

// 自定义素材变量
const sbTwo = loadPluginWith({ DisassembleList: {
    recipeList: JSON.stringify([JSON.stringify({ itemId: "50", cost: "10", enabled: "true" })]),
    materialVarIds: "70,71"
} });
const cfgTwo = sbTwo.window.DisassembleListConfig;
ok(cfgTwo.resultsOf(50).length === 2 && cfgTwo.materialVarIds.join(",") === "70,71",
   "materialVarIds 填两种时只产两种素材");

// ---- 界面刷新链路（v3.2.1 修复的回归测试）----
const listProto = sandbox.Window_DisassembleList.prototype;
const origCallUpdateHelp = sandbox.Window_Selectable.prototype.callUpdateHelp;
let origHit = false;
origCallUpdateHelp.call({ active: true, _helpWindow: undefined, updateHelp: () => { origHit = true; } });
ok(!origHit, "对照：MZ 原版 callUpdateHelp 在没有 _helpWindow 时不调 updateHelp（这正是旧版信息窗不刷新的根因）");
let hit = false;
listProto.callUpdateHelp.call({ active: true, updateHelp: () => { hit = true; } });
ok(hit, "插件覆盖的 callUpdateHelp：列表激活时会刷新信息窗");
hit = false;
listProto.callUpdateHelp.call({ active: false, updateHelp: () => { hit = true; } });
ok(!hit, "列表未激活时不刷新信息窗");
// 编辑器元数据检查（防止 MZ 插件管理器里参数区显示为空）
ok(pluginSrc.indexOf("@param recipeList") >= 0, "插件头部声明了 @param recipeList");
ok(pluginSrc.indexOf("@type struct<DisassembleRecipe>[]") >= 0, "recipeList 的类型是 struct 数组");
ok(pluginSrc.indexOf("/*~struct~DisassembleRecipe:") >= 0, "存在 struct 定义块 /*~struct~DisassembleRecipe:");
ok(pluginSrc.indexOf("@param materialVarIds") >= 0, "插件头部声明了 @param materialVarIds");
const crlfCount = (pluginSrc.match(/\r\n/g) || []).length;
const bareLf = (pluginSrc.match(/(?<!\r)\n/g) || []).length;
ok(crlfCount > 0 && bareLf === 0, "插件文件是纯 CRLF 换行（MZ 编辑器解析插件元数据的前提）");

console.log("");
console.log("===== 结果：" + pass + " 项断言全绿" + (fail ? "，但有 " + fail + " 项失败" : "") + " =====");
process.exit(fail ? 1 : 0);