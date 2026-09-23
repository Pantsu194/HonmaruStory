// tools/randomconvert-check.js
// 随机素材转换（js/plugins/RandomConvertList.js）校验台（只读）
//
// 用法: node tools/randomconvert-check.js
//
// 校验内容：
//   1. plugins.js 参数（可转换物品 / 产出素材与权重 / 抽取次数）解析
//   2. 加权随机：等权重分布是否均匀、改权重是否按比例生效、权重 0 是否抽不到
//   3. 列表过滤：持有 > 0 才显示、enabled:false 不显示
//   4. 99 上限保护：满仓时不会静默丢失
//   5. 界面布局（素材窗在返回按钮下方、信息窗 / 列表窗不越界）
//   6. 编辑器元数据（@param / struct 块 / CRLF）+ callUpdateHelp 覆盖
//
// 只读脚本：不修改任何工程文件，data/ 下的公共事件与地图事件一律只读。

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
    vm.createContext(sandbox);
    for (const f of MZ_FILES) {
        try {
            vm.runInContext(fs.readFileSync(path.join(jsDir, f), "utf8"), sandbox, { filename: f });
        } catch (e) { /* 桩件环境，个别核心文件可跳过 */ }
    }
    return sandbox;
}

let pass = 0, fail = 0;
function ok(cond, label) {
    if (cond) { pass++; console.log("  [OK]   " + label); }
    else { fail++; console.log("  [FAIL] " + label); }
}

const items = JSON.parse(fs.readFileSync(path.join(root, "data", "Items.json"), "utf8"));
const pluginSrc = fs.readFileSync(path.join(jsDir, "plugins", "RandomConvertList.js"), "utf8");

function loadPluginWith(paramsByPlugin) {
    const sb = loadMZ();
    sb.$dataItems = items;
    sb.$dataWeapons = [];
    sb.$dataArmors = [];
    sb.DataManager.isItem = obj => !!(obj && obj.id);
    sb.DataManager.isWeapon = () => false;
    sb.DataManager.isArmor = () => false;
    sb.PluginManager.parameters = name => (paramsByPlugin && paramsByPlugin[name]) || {};
    sb.Graphics.boxWidth = 816;
    sb.Graphics.boxHeight = 624;
    sb.$gameParty = {
        _items: {},
        numItems(it) { return it ? (this._items[it.id] || 0) : 0; },
        maxItems() { return 99; },
        gainItem(it, n) { this._items[it.id] = (this._items[it.id] || 0) + n; },
        loseItem(it, n) { this._items[it.id] = Math.max(0, (this._items[it.id] || 0) - n); }
    };
    vm.runInContext(pluginSrc, sb, { filename: "RandomConvertList.js" });
    // 插件加载后再换掉 Rectangle：MZ 核心文件会在载入时接管这个全局，
    // 插件里的 new Rectangle(...) 在调用时才查全局，所以这里装桩即可生效
    sb.Rectangle = function (x, y, w, h) { this.x = x; this.y = y; this.width = w; this.height = h; };
    return sb;
}

// ---------------------------------------------------------------- 1. 参数
const pluginsSrc = fs.readFileSync(path.join(jsDir, "plugins.js"), "utf8");
const entries = JSON.parse(pluginsSrc.substring(pluginsSrc.indexOf("["), pluginsSrc.lastIndexOf("];") + 1));
const entry = entries.find(e => e.name === "RandomConvertList");
const sandbox = loadPluginWith({ RandomConvertList: entry ? entry.parameters : {} });
const cfg = sandbox.window.RandomConvertListConfig;

console.log("===== 随机素材转换 校验台 =====");
console.log("");
console.log("-- 参数来源：js/plugins.js -> RandomConvertList.parameters --");
console.log("  convertList  = " + String(entry.parameters.convertList).slice(0, 56) + " ...");
console.log("  resultItems  = " + entry.parameters.resultItems);
console.log("  drawPerItem  = " + entry.parameters.drawPerItem);
console.log("");
console.log("-- 产出素材池 --");
cfg.pool().forEach(e => console.log("  Item[" + e.item.id + "] " + e.item.name + "  权重 " + e.weight));
console.log("");

console.log("-- 断言 --");
ok(!!entry, "plugins.js 里存在 RandomConvertList 条目");
ok(!!cfg, "插件加载成功并导出 RandomConvertListConfig");
ok(cfg.convertItems().length === 15, "参数解析出 15 种可转换物品（实际 " + cfg.convertItems().length + "）");
ok(cfg.pool().length === 8, "参数解析出 8 种产出素材（实际 " + cfg.pool().length + "）");
ok(cfg.drawPerItem === 1, "每个物品抽取次数 = 1");

// ---------------------------------------------------------------- 2. 随机分布
const N = 24000;
function sample(times) {
    const counts = {};
    for (let i = 0; i < times; i++) {
        const it = cfg.pick();
        if (!it) return null;
        counts[it.id] = (counts[it.id] || 0) + 1;
    }
    return counts;
}
let counts = sample(N);
ok(counts !== null && Object.keys(counts).length === 8, "等权重下 8 种素材都会被抽到");
const expected = N / 8;
const maxDev = Math.max.apply(null, Object.keys(counts).map(id => Math.abs(counts[id] - expected) / expected));
ok(maxDev < 0.15, "等权重分布均匀（最大偏差 " + (maxDev * 100).toFixed(1) + "% < 15%）");

cfg.resultTable[41].weight = 9;      // 41 权重 9，其余 7 种各 1 -> 期望 9/16
counts = sample(N);
const rate41 = counts[41] / N;
ok(Math.abs(rate41 - 9 / 16) < 0.05, "权重 9 时该素材出现率 ≈ 9/16（实测 " + (rate41 * 100).toFixed(1) + "%）");
cfg.resultTable[41].weight = 1;

cfg.resultTable[42].weight = 0;
counts = sample(5000);
ok(!counts[42], "权重 0 的素材永远抽不到");
cfg.resultTable[42].weight = 1;

// ---------------------------------------------------------------- 3. 列表过滤
function listData(heldMap) {
    sandbox.$gameParty._items = Object.assign({}, heldMap);
    const win = Object.create(sandbox.Window_RandomConvertList.prototype);
    win._data = [];
    win.makeItemList();
    return win._data;
}
let data = listData({ 50: 3, 58: 1 });
ok(data.length === 2 && data[0].id === 50 && data[1].id === 58, "持有 50x3、58x1 -> 列表两项（按 ID 升序）");
data = listData({ 50: 0 });
ok(data.length === 1 && data[0] === null, "持有 0 -> 不显示");
data = listData({});
ok(data.length === 1 && data[0] === null, "什么都没持有 -> 列表为空");
data = listData({ 64: 5, 41: 5 });
ok(data.length === 1 && data[0] === null, "持有非可转换物品（64 地图 / 41 素材）-> 不显示");
cfg.convertTable[50].enabled = false;
data = listData({ 50: 3, 51: 2 });
ok(data.length === 1 && data[0].id === 51, "enabled:false 的可转换物品不显示");
cfg.convertTable[50].enabled = true;

// ---------------------------------------------------------------- 4. 99 上限
sandbox.$gameParty._items = { 41: 99 };
ok(cfg.gain(items[41], 3) === 3, "素材已满 99 -> gain() 返回没收下的 3 个（不静默丢失）");
sandbox.$gameParty._items = { 41: 97 };
ok(cfg.gain(items[41], 5) === 3 && sandbox.$gameParty.numItems(items[41]) === 99,
   "只收下装得下的部分（97 + 5 -> 99，溢出 3）");
sandbox.$gameParty._items = {};
ok(cfg.gain(items[41], 2) === 0 && sandbox.$gameParty.numItems(items[41]) === 2, "正常情况全额进包");

// ---------------------------------------------------------------- 5. 布局
const scene = Object.create(sandbox.Scene_RandomConvert.prototype);
const mat = scene.materialWindowRect();
const infoH = scene.calcWindowHeight(3, false);
const listY = mat.y + mat.height + infoH;
const listH = scene.mainAreaBottom() - listY;
console.log("");
console.log("-- 界面布局（816x624）--");
console.log("  素材窗   x=" + mat.x + " y=" + mat.y + " w=" + mat.width + " h=" + mat.height);
console.log("  信息窗   y=" + (mat.y + mat.height) + " h=" + infoH + "（3 行）");
console.log("  列表窗   y=" + listY + " h=" + listH + "（底边 " + (listY + listH) + "）");
ok(mat.x === 0 && mat.y === scene.buttonAreaBottom(), "素材窗从返回按钮区下方开始（y=" + mat.y + "，按钮区底边 " + scene.buttonAreaBottom() + "）");
ok(mat.height === 96, "素材窗 2 行高 96");
ok(infoH === 132, "信息窗 3 行高 132");
ok(listY + listH === 624 && listH > 0, "列表窗贴屏幕底边、不越界");
ok(mat.y + mat.height + infoH + listH <= 624, "三窗纵向不超出屏幕");

// ---------------------------------------------------------------- 6. 元数据 / 行为
const bareLf = (pluginSrc.match(/(?<!\r)\n/g) || []).length;
ok(pluginSrc.indexOf("@param convertList") >= 0, "声明了 @param convertList");
ok(pluginSrc.indexOf("@type struct<ConvertEntry>[]") >= 0, "convertList 是 struct 数组");
ok(pluginSrc.indexOf("@param resultItems") >= 0, "声明了 @param resultItems");
ok(pluginSrc.indexOf("@type struct<ResultEntry>[]") >= 0, "resultItems 是 struct 数组");
ok(pluginSrc.indexOf("/*~struct~ConvertEntry:") >= 0 && pluginSrc.indexOf("/*~struct~ResultEntry:") >= 0, "两个 struct 定义块都在");
ok(bareLf === 0, "插件文件是纯 CRLF 换行（MZ 编辑器解析元数据的前提）");

const listProto = sandbox.Window_RandomConvertList.prototype;
const origCallUpdateHelp = sandbox.Window_Selectable.prototype.callUpdateHelp;
let origHit = false;
origCallUpdateHelp.call({ active: true, _helpWindow: undefined, updateHelp: () => { origHit = true; } });
ok(!origHit, "对照：MZ 原版 callUpdateHelp 在无 _helpWindow 时会跳过");
let hit = false;
listProto.callUpdateHelp.call({ active: true, updateHelp: () => { hit = true; } });
ok(hit, "本插件的 callUpdateHelp 覆盖：列表激活时刷新信息窗");

// ---------------------------------------------------------------- 7. 参数为空回退
const sbEmpty = loadPluginWith({ RandomConvertList: {} });
const cfgEmpty = sbEmpty.window.RandomConvertListConfig;
ok(cfgEmpty.convertItems().length === 15 && cfgEmpty.pool().length === 8, "参数为空时回退默认表（15 种物品 / 8 种素材）");
ok(cfgEmpty.pool().every(e => e.weight === 1), "回退后的默认权重都是 1（等概率）");

console.log("");
console.log("===== 结果：" + pass + " 项断言全绿" + (fail ? "，但有 " + fail + " 项失败" : "") + " =====");
process.exit(fail ? 1 : 0);