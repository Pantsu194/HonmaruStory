// tools/disassemble-geometry-check.js
// 刀解界面（Scene_Disassemble）几何 + 数据流只读校验
//
// 用法: node tools/disassemble-geometry-check.js
//
// 为什么需要它：工程里 SimpleForge 的界面曾因「凭印象估算窗口几何」连挂五轮，
// 所以刀解界面同样按 js/rmmz_windows.js、js/rmmz_scenes.js 的真实源码取值核对，
// 不靠肉眼估。本脚本只读，不修改任何工程文件。

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const jsDir = path.join(__dirname, "..", "js");
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
        } catch (e) {
            console.error("载入 " + f + " 失败: " + e.message);
        }
    }
    return sandbox;
}

const SW = 816, SH = 624;   // data/System.json: screenWidth/screenHeight

const sandbox = loadMZ();
// rmmz_core.js L509/L517：Graphics.boxWidth / boxHeight 是「数字属性」，不是函数
// （插件的 mainAreaWidth()/mainAreaBottom() 直接 return 它们，写法正确）
const G = sandbox.Graphics;
G.boxWidth = SW;
G.boxHeight = SH;

vm.runInContext(fs.readFileSync(path.join(jsDir, "plugins", "DisassembleList.js"), "utf8"),
                sandbox, { filename: "DisassembleList.js" });

// 沙箱里的 PIXI.Rectangle 是桩件（字段读不出来）；这里换成能读字段的简单实现，
// 于是可以直接「真实调用」插件定义的 helpWindowRect() 拿到矩形。
sandbox.Rectangle = function (x, y, width, height) {
    this.x = x; this.y = y; this.width = width; this.height = height;
};

// 沙箱里的 PIXI.Rectangle 是桩件（字段读不出来）；这里换成能读字段的简单实现，
// 于是可以直接「真实调用」插件定义的 helpWindowRect() 拿到矩形。
sandbox.Rectangle = function (x, y, width, height) {
    this.x = x; this.y = y; this.width = width; this.height = height;
};

// 不走 initialize（那会创建 PIXI 滤镜，桩件环境不需要）；
// 只借原型上的几何方法，取值与游戏内一致。
const scene = Object.create(sandbox.Scene_Disassemble.prototype);

const fmt = r => "x=" + r.x + " y=" + r.y + " w=" + r.width + " h=" + r.height +
                 "  (右=" + (r.x + r.width) + ", 下=" + (r.y + r.height) + ")";
const inside = r => r.x >= 0 && r.y >= 0 && r.x + r.width <= SW && r.y + r.height <= SH;
const tag = r => (inside(r) ? "[屏内] ✅" : "[越界] ❌");

console.log("===== 刀解界面 Scene_Disassemble 几何校验（" + SW + "x" + SH + "）=====");
console.log("");
console.log("-- 区域函数（窗口纵向定位参考）--");
console.log("  isBottomHelpMode() = " + scene.isBottomHelpMode() + "   <- Scene_Base L175 恒 true");
console.log("  helpAreaTop()   = " + scene.helpAreaTop() + "   <- mainAreaBottom()（被插件覆盖）");
console.log("  helpAreaBottom()= " + scene.helpAreaBottom());
console.log("  mainAreaTop()   = " + scene.mainAreaTop());
console.log("  mainAreaBottom()= " + scene.mainAreaBottom() + "   <- 插件覆盖为 Graphics.boxHeight");
console.log("");

// 【v3.2.1】顶部素材窗的矩形由插件自己的 materialWindowRect() 给出；
// 它的 y 不再是 0（要让开右上角「返回」按钮所在的那一行），所以下面统一用「底边」定位
const helpRect = scene.materialWindowRect();
const materialBottom = helpRect.y + helpRect.height;
const infoH = scene.calcWindowHeight(4, false);
const listY = materialBottom + infoH;
const listH = scene.mainAreaBottom() - listY;
const infoRect = { x: 0, y: materialBottom, width: SW, height: infoH };
const listRect = { x: 0, y: listY, width: SW, height: listH };
const numH = scene.calcWindowHeight(6, false);
const numRect = { x: SW / 2 - 200, y: SH / 2 - 100, width: 400, height: numH };

console.log("-- 实际窗口矩形（按 create() 里的算式）--");
console.log("  素材窗      " + fmt(helpRect) + "  " + tag(helpRect) + "   <- 排在返回按钮下方");
console.log("  信息窗      " + fmt(infoRect) + "  " + tag(infoRect));
console.log("  列表窗      " + fmt(listRect) + "  " + tag(listRect));
console.log("  数量输入窗  " + fmt(numRect) + "  " + tag(numRect));
console.log("");

// 列表容量：按 MZ 真实公式算
const WS = sandbox.Window_Selectable.prototype;
const fakeWin = { lineHeight: () => 36, innerHeight: listH - 24, maxCols: () => 2, innerWidth: SW - 24 };
fakeWin.itemHeight = () => WS.itemHeight.call(fakeWin);
const itemH = fakeWin.itemHeight();
const itemW = WS.itemWidth.call(fakeWin);
const pageRows = WS.maxPageRows.call(fakeWin);
console.log("-- 列表窗容量（MZ 真实公式）--");
console.log("  Window_Base.lineHeight() = 36（硬编码，L46）");
console.log("  Window_Selectable.itemHeight() = lineHeight + 8 = " + itemH);
console.log("  innerHeight = " + fakeWin.innerHeight + "  -> 每屏 " + pageRows + " 行 x 2 列 = " + (pageRows * 2) + " 项，其余靠原生滚动");
console.log("  itemWidth = " + itemW);
console.log("  v3.2.1 列表项：名字区 = itemWidth - 8(colSpacing) - 80(数量区) = " + (itemW - 8 - 80) +
            "px，再扣图标 36px -> 文字可用约 " + (itemW - 8 - 80 - 36) + "px");
console.log("  最长刀身名「山姥切国广·刀身」9 个全角字 ≈ 9 x 26 = 234px -> " +
            ((itemW - 8 - 80 - 36) >= 234 ? "放得下 ✅" : "仍会溢出 ❌"));
console.log("");

console.log("-- 结论 --");
const clearsButton = helpRect.y >= scene.buttonAreaBottom();
const helpTouchesInfo = helpRect.y + helpRect.height === infoRect.y;
if (inside(helpRect) && clearsButton && helpTouchesInfo) {
    console.log("  ✅ 素材窗在返回按钮下方 " + helpRect.y + ".." + (helpRect.y + helpRect.height) +
                "，与信息窗首尾相接、无重叠。");
    console.log("     返回按钮占右上角 y=2..50（rmmz_scenes.js L1292-1293），");
    console.log("     素材窗从 buttonAreaBottom()=" + scene.buttonAreaBottom() + " 开始 -> 数字不会被按钮遮住。");
} else {
    console.log("  ❌ 素材窗位置异常：" + fmt(helpRect));
    console.log("     期望 y >= " + scene.buttonAreaBottom() + "（返回按钮下方）、高度为 1 行。");
}
console.log("");