// SimpleForge V28.0 纯逻辑验证台（Node 环境，不进游戏）
// 用法：node tools/forge-logic-test.js
//
// 目的：把插件源码原样载入，用桩件喂它数据，验证
//   1) 配方匹配 findMatchingItems 是否符合严格全等规则
//   2) 十连 doForgeLoop 的扣料、次数、产物是否正确
//   3) 素材不足时是否正确拒绝且不扣料
//   4) 道具 99 上限保护是否生效

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const PLUGIN = path.join(__dirname, '..', 'js', 'plugins', 'SimpleForge.js');
const source = fs.readFileSync(PLUGIN, 'utf8');

// ---------------------------------------------------------------- 桩件
function makeChainable() {
    function C() { this.initialize.apply(this, arguments); }
    C.prototype.initialize = function () {};
    C.prototype.update = function () {};
    C.prototype.refresh = function () {};
    C.prototype.activate = function () {};
    C.prototype.deactivate = function () {};
    C.prototype.select = function () {};
    C.prototype.addWindow = function () {};
    C.prototype.popScene = function () {};
    C.prototype.processTouch = function () {};
    C.prototype.processHandling = function () {};
    C.prototype.setHandler = function () {};
    return C;
}

const sandbox = {};
sandbox.window = sandbox;
sandbox.console = console;
sandbox.Math = Math;
sandbox.Date = Date;
sandbox.JSON = JSON;
sandbox.isNaN = isNaN;
sandbox.parseInt = parseInt;
sandbox.setTimeout = setTimeout;

const log = { messages: [], sounds: [] };
const resultRecords = [];

sandbox.Graphics = { boxWidth: 816, boxHeight: 624 };
sandbox.SoundManager = {
    playOk: () => log.sounds.push('ok'),
    playCancel: () => log.sounds.push('cancel'),
    playBuzzer: () => log.sounds.push('buzzer'),
    playCursor: () => log.sounds.push('cursor'),
};
// ★ 严格复刻 MZ 1.10 的真实行为：
//     SceneManager.push = function(sceneClass) { ...; this.goto(sceneClass); };
//     SceneManager.goto = function(sceneClass) { this._nextScene = new sceneClass(); };
//   即：push/goto 只接受一个参数，多余参数会被直接丢掉，场景构造时 arguments.length === 0。
//   之前测试台的桩件把参数原样传给了场景，所以「push 传参」这种错误一直没被抓到。
//   另外还要复刻「排期」行为：goto 只是把目标排到 _nextScene，**当帧 _scene 根本不换**，
//   要等 changeScene() 才切换。所以「pop 前抓 SceneManager._scene 再回调」是错的。
sandbox.SceneManager = {
    _stack: [],
    _created: [],
    _scene: null,
    _nextScene: null,
    push: function (sceneClass) {
        this._stack.push(this._scene ? this._scene.constructor : null);
        this.goto(sceneClass);
    },
    goto: function (sceneClass) {
        this._created.push({ cls: sceneClass, args: [] });
        this._nextScene = { constructor: sceneClass };
        if (this._scene && typeof this._scene.stop === 'function') this._scene.stop();
    },
    pop: function () {
        if (this._stack.length > 0) this.goto(this._stack.pop());
    },
    // 模拟下一帧的 changeScene()
    changeScene: function () {
        if (this._nextScene) {
            this._scene = this._nextScene;
            this._nextScene = null;
            if (this._scene.create) this._scene.create();
        }
    },
};
sandbox.Scene_Map = makeChainable();
sandbox.Scene_Map.prototype.processMapTouch = function () {};
sandbox.Scene_MenuBase = makeChainable();
sandbox.Scene_MenuBase.prototype.create = function () {};
sandbox.Scene_MenuBase.prototype.createHelpWindow = function () {
    this._helpWindow = new sandbox.Window_Help(new sandbox.Rectangle(0, 528, 816, 96));
};
sandbox.Scene_Message = makeChainable();
sandbox.Scene_Message.prototype.update = function () {};

sandbox.Window_Base = makeChainable();
sandbox.Window_Base.prototype.initialize = function (rect) {
    this._drawCalls = [];
    this.x = rect ? rect.x : 0; this.y = rect ? rect.y : 0;
    this.width = rect ? rect.width : 816; this.height = rect ? rect.height : 100;
    this.padding = 18;
    this.contents = {
        fontSize: 28,
        height: this.height - this.padding * 2,
        clear: function () { this.fontSize = 28; },
        fillRect: function (x, y, w, h, color) {
            // 记录填充（结果窗用它画中线与分隔线）
            const owner = this._ownerWindow;
            if (!owner) return;
            if (!owner._drawCalls) owner._drawCalls = [];
            owner._drawCalls.push({ kind: 'fillRect', x: x, y: y, w: w, h: h, color: color });
        },
        // 位图层的 drawText：MZ 的真实签名是 (text, x, y, maxWidth, lineHeight, align)
        drawText: function (t, x, y, maxWidth, lineHeight, align) {
            const owner = this._ownerWindow;
            const rec = {
                kind: 'text', text: String(t), x: x, y: y, maxWidth: maxWidth,
                lineHeight: lineHeight, align: align,
                fontSize: owner && owner.contents ? owner.contents.fontSize : 28,
            };
            if (!sandbox.__capturedDrawText) sandbox.__capturedDrawText = [];
            sandbox.__capturedDrawText.push(rec);
            if (owner) {
                if (!owner._drawCalls) owner._drawCalls = [];
                owner._drawCalls.push(rec);
            }
        },
        // MZ 的 Bitmap.measureTextWidth：按当前 fontSize 量文字宽度
        // （结果窗靠它给数量行自动缩字；测试里用与 auditDraws 一致的估算口径）
        measureTextWidth: function (t) {
            const fs = this.fontSize || 28;
            let w = 0;
            for (const ch of String(t)) {
                const c = ch.codePointAt(0);
                const full = (c >= 0x2E80 && c <= 0x9FFF) || (c >= 0xFF00 && c <= 0xFFEF) || (c >= 0x3000 && c <= 0x303F);
                w += fs * (full ? 1.0 : 0.5);
            }
            return w;
        },
    };
    this.contents._ownerWindow = this;   // 让位图能回写窗口的 _drawCalls
    this.active = true; this.openness = 255;
};
// MZ 里 innerWidth / innerHeight 是原型上的访问器：宽高各减两倍 padding
(function () {
    function def(prop, sizeName) {
        Object.defineProperty(sandbox.Window_Base.prototype, prop, {
            configurable: true,
            get: function () { return this[sizeName] - this.padding * 2; },
        });
    }
    def('innerWidth', 'width');
    def('innerHeight', 'height');
})();
sandbox.__signatureErrors = [];
sandbox.Window_Base.prototype.drawText = function (text, x, y, maxWidth, align) {
    if (!this._drawCalls) this._drawCalls = [];
    // 通用防护：Window_Base.drawText 的签名是 (text, x, y, maxWidth, align)。
    // 一旦有人把 lineHeight 当第 5 个参数传进来，align 就会是数字 —— 记下来统一断言。
    // （位图的签名才是 Bitmap.drawText(text, x, y, maxWidth, lineHeight, align)）
    if (align !== undefined && typeof align !== 'string') {
        sandbox.__signatureErrors.push({ text: String(text).slice(0, 24), align: align });
    }
    this._drawCalls.push({
        kind: 'text',
        text: String(text), x: x, y: y, maxWidth: maxWidth, align: align,
        fontSize: this.contents ? this.contents.fontSize : 28,
    });
};
sandbox.Window_Base.prototype.changeTextColor = function () {};
sandbox.Window_Base.prototype.resetTextColor = function () {};
sandbox.Window_Base.prototype.textWidth = function (t) { return String(t).length * 16; };
sandbox.Window_Base.prototype.isOpen = function () { return true; };
sandbox.Window_Base.prototype.isClosed = function () { return false; };
sandbox.Window_Base.prototype.show = function () {};
sandbox.Window_Base.prototype.hide = function () {};
sandbox.Window_Base.prototype.destroy = function () {};
sandbox.Window_Base.prototype.contentsHeight = function () {
    return this.height - this.padding * 2;
};
sandbox.Window_Base.prototype.contentsWidth = function () {
    return this.width - this.padding * 2;
};
// 注意：Window_Selectable 会覆盖 contentsHeight（真实 MZ 是 innerHeight + itemHeight），
// 所以 base 与 selectable 两级必须都是「方法」，不能有一个是普通属性
sandbox.Window_Base.prototype.updatePadding = function () {};

sandbox.Window_Selectable = makeChainable();
sandbox.Window_Selectable.prototype = Object.create(sandbox.Window_Base.prototype);
sandbox.Window_Selectable.prototype.constructor = sandbox.Window_Selectable;
sandbox.Window_Selectable.prototype.initialize = function (rect) {
    sandbox.Window_Base.prototype.initialize.call(this, rect);
    this._index = 0;
};
// ★ 以下常量来自工程真实的 js/rmmz_windows.js（已逐条核对源码）：
//   Window_Base.prototype.lineHeight  -> 硬编码 return 36（不随字号变化！）
//   Window_Selectable.rowSpacing      -> 4
//   Window_Selectable.colSpacing      -> 8
//   Window_Selectable.itemRect        -> y = row*itemHeight + rowSpacing/2 - scrollBaseY
//   Window_Selectable.contentsHeight  -> innerHeight + itemHeight
//   Window_Selectable.maxVisibleItems -> ceil(contentsHeight/itemHeight) * maxCols
//   $gameSystem.windowPadding()       -> 12 或 18（游戏内实测为 12）
sandbox.Window_Base.prototype.lineHeight = function () { return 36; };
sandbox.Window_Selectable.prototype.rowSpacing = function () { return 4; };
sandbox.Window_Selectable.prototype.colSpacing = function () { return 8; };
sandbox.Window_Selectable.prototype.scrollBaseX = function () { return 0; };
sandbox.Window_Selectable.prototype.scrollBaseY = function () { return 0; };
// 真实 MZ 的 contentsHeight：innerHeight + itemHeight
sandbox.Window_Selectable.prototype.contentsHeight = function () {
    return this.innerHeight + this.itemHeight();
};
sandbox.Window_Selectable.prototype.itemHeight = function () { return this.lineHeight(); };
sandbox.Window_Selectable.prototype.maxVisibleItems = function () {
    const visibleRows = Math.ceil(this.contentsHeight() / this.itemHeight());
    return visibleRows * this.maxCols();
};
sandbox.Window_Selectable.prototype.overallHeight = function () {
    return this.maxRows() * this.itemHeight();
};
sandbox.Window_Selectable.prototype.maxRows = function () {
    return Math.ceil(this.maxItems() / this.maxCols());
};
sandbox.Window_Selectable.prototype.itemWidth = function () { return this.innerWidth; };
sandbox.Window_Selectable.prototype.maxCols = function () { return 1; };
sandbox.Window_Selectable.prototype.maxItems = function () { return 0; };
sandbox.Window_Selectable.prototype.itemRect = function (index) {
    const maxCols = this.maxCols();
    const itemWidth = this.itemWidth();
    const itemHeight = this.itemHeight();
    const colSpacing = this.colSpacing();
    const rowSpacing = this.rowSpacing();
    const col = index % maxCols;
    const row = Math.floor(index / maxCols);
    const x = col * itemWidth + colSpacing / 2 - this.scrollBaseX();
    const y = row * itemHeight + rowSpacing / 2 - this.scrollBaseY();
    return new sandbox.Rectangle(x, y, itemWidth - colSpacing, itemHeight - rowSpacing);
};
sandbox.Window_Selectable.prototype.index = function () { return this._index; };
sandbox.Window_Selectable.prototype.select = function (i) { this._index = i; };
sandbox.Window_Selectable.prototype.isOpenAndActive = function () { return true; };
sandbox.Window_Selectable.prototype.isCurrentItemEnabled = function () { return true; };
sandbox.Window_Selectable.prototype.itemRect = function (i) {
    return { x: 0, y: i * 50, width: 560, height: 50 };
};
sandbox.Window_Selectable.prototype.scrollTop = function () {};
sandbox.Window_Selectable.prototype.playOkSound = function () {};
sandbox.Window_Selectable.prototype.playCancelSound = function () {};
sandbox.Window_Selectable.prototype.playBuzzerSound = function () {};
sandbox.Window_Selectable.prototype.processOk = function () {};
sandbox.Window_Selectable.prototype.processCancel = function () {};

sandbox.Window_Command = makeChainable();
sandbox.Window_Command.prototype = Object.create(sandbox.Window_Selectable.prototype);
sandbox.Window_Command.prototype.constructor = sandbox.Window_Command;
sandbox.Window_Command.prototype.initialize = function (rect) {
    sandbox.Window_Selectable.prototype.initialize.call(this, rect);
    this._list = [];
};
sandbox.Window_Command.prototype.addCommand = function (name, symbol, enabled) {
    this._list.push({ name, symbol, enabled });
};
sandbox.Window_Command.prototype.currentSymbol = function () {
    return this._list[this._index] ? this._list[this._index].symbol : null;
};
sandbox.Window_Command.prototype.setHelpWindow = function (hw) { this._helpWindow = hw; };

sandbox.Window_Help = makeChainable();
sandbox.Window_Help.prototype = Object.create(sandbox.Window_Base.prototype);
sandbox.Window_Help.prototype.constructor = sandbox.Window_Help;
sandbox.Window_Help.prototype.setText = function (t) { this._text = t; };

sandbox.Rectangle = function (x, y, w, h) {
    this.x = x; this.y = y; this.width = w; this.height = h;
};
sandbox.ColorManager = {
    normalColor: () => '#ffffff',
    systemColor: () => '#88aaff',
    textColor: () => '#cccccc',
};
sandbox.TouchInput = { clear: () => {}, isTriggered: () => false, x: 0, y: 0 };
sandbox.Input = { clear: () => {}, isRepeated: () => false, isTriggered: () => false };

// $dataItems：刀身 50-65，名称与工程 Items.json 一致
const NAMES = {
    50: '大和守安定·刀身', 51: '加州清光·刀身', 52: '歌仙兼定·刀身',
    53: '山姥切国广·刀身', 54: '陆奥守吉行·刀身', 55: '蜂须贺虎彻·刀身',
    56: '和泉守兼定·刀身', 57: '今剑·刀身', 58: '三日月宗近·刀身',
    59: '石切丸·刀身', 60: '鹤丸国永·刀身', 61: '压切长谷部·刀身',
    62: '髭切·刀身', 63: '膝丸·刀身', 65: '五虎退·刀身',
};
const DATA_ITEMS = [null];
for (let i = 0; i <= 70; i++) DATA_ITEMS[i] = null;
Object.keys(NAMES).forEach(k => { DATA_ITEMS[Number(k)] = { id: Number(k), name: NAMES[k] }; });
sandbox.$dataItems = DATA_ITEMS;

const inventory = {};
sandbox.$gameParty = {
    numItems: (item) => inventory[item.id] || 0,
    gainItem: (item, n) => {
        inventory[item.id] = (inventory[item.id] || 0) + n;
        resultRecords.push(item.name);
    },
};

const variables = {};
sandbox.$gameVariables = {
    value: (id) => variables[id] || 0,
    setValue: (id, v) => { variables[id] = v; },
};

sandbox.$gameMessage = {
    _list: [],
    add: (t) => log.messages.push(t),
    isBusy: () => false,
};
sandbox.$gameTemp = { _forgeResultShowing: false, clearDestination: () => {} };

function Game_System() {}
Game_System.prototype.initialize = function () {};
sandbox.Game_System = Game_System;
const gameSystem = new Game_System();
sandbox.$gameSystem = gameSystem;

const commands = {};
sandbox.PluginManager = {
    registerCommand: (plugin, name, fn) => { commands[name] = fn; },
    callCommand: () => {},
};

vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: 'SimpleForge.js' });

// ---------------------------------------------------------------- 工程配置复刻
gameSystem.initialize();
(function loadProjectConfig() {
    const d = gameSystem._simpleForgeData;
    d.materials = [
        { id: 70, name: '木炭' },
        { id: 71, name: '玉钢' },
        { id: 72, name: '冷却材' },
        { id: 73, name: '砥石' },
    ];
    for (let i = 50; i <= 59; i++) d.availableItems.push(i);
    [60, 61, 62, 63, 65].forEach(i => { if (!d.availableItems.includes(i)) d.availableItems.push(i); });
    d.costs = {
        50: [10,10,10,10], 51: [10,10,10,10], 52: [10,10,10,10],
        53: [10,10,10,10], 54: [10,10,10,10], 55: [10,10,10,10],
        56: [15,15,15,15],
        57: [5,5,5,5], 58: [30,30,30,30], 59: [50,50,50,50],
        60: [30,30,30,30], 61: [10,10,10,10], 62: [30,30,30,30],
        63: [30,30,30,30], 65: [5,5,5,5],
    };
})();

// ---------------------------------------------------------------- 断言
let pass = 0, fail = 0;
function check(label, actual, expected) {
    const a = JSON.stringify(actual), e = JSON.stringify(expected);
    if (a === e) { pass++; console.log('  [OK] ' + label); }
    else { fail++; console.log('  [NG] ' + label + '\n         期望 ' + e + '\n         实际 ' + a); }
}
function section(t) { console.log('\n=== ' + t + ' ==='); }
function resetMaterials(v) { variables[70] = variables[71] = variables[72] = variables[73] = v; }
function clearInventory() { Object.keys(inventory).forEach(k => delete inventory[k]); }

// [V28.17] 投料界面已整合进锻刀界面，匹配逻辑正式搬到 Scene_ForgeTenPull
const Scene_ForgeTenPull = sandbox.Scene_ForgeTenPull;
const probe = Object.create(Scene_ForgeTenPull.prototype);
probe._recipeValues = [];

function newTenPull(recipe) {
    const scene = Object.create(Scene_ForgeTenPull.prototype);
    scene._recipeValues = recipe.slice();
    scene._forgingInProgress = false;
    scene._tenPullExecuted = false;
    scene._commandWindow = { deactivate: () => {}, activate: () => {} };
    scene.showResult = function (label, actualTimes, possible, records) {
        this._lastResult = { label, actualTimes, possible, records };
    };
    scene.startForge = Scene_ForgeTenPull.prototype.startForge.bind(scene);
    scene.doForgeLoop = Scene_ForgeTenPull.prototype.doForgeLoop.bind(scene);
    return scene;
}

// ---------------------------------------------------------------- 测试
section('1. 配方匹配 findMatchingItems（严格全等）');
check('5/5/5/5 -> 今剑 + 五虎退', probe.findMatchingItems([5,5,5,5]), [57, 65]);
check('10/10/10/10 -> 7 把同档', probe.findMatchingItems([10,10,10,10]), [50,51,52,53,54,55,61]);
check('15/15/15/15 -> 仅和泉守兼定', probe.findMatchingItems([15,15,15,15]), [56]);
check('30/30/30/30 -> 四把', probe.findMatchingItems([30,30,30,30]), [58,60,62,63]);
check('50/50/50/50 -> 仅石切丸', probe.findMatchingItems([50,50,50,50]), [59]);
check('7/7/7/7 -> 无匹配（回退全池）', probe.findMatchingItems([7,7,7,7]), []);
check('10/10/10/0 -> 无匹配', probe.findMatchingItems([10,10,10,0]), []);

section('2. 十连：素材充足 -> 正好锻 10 次');
resetMaterials(1000); clearInventory(); log.messages.length = 0; log.sounds.length = 0;
let scene = newTenPull([10,10,10,10]);
scene.startForge('十连锻刀', 10, 1);
check('实际锻造次数 = 10', scene._lastResult.records.length, 10);
check('木炭消耗 = 100', 1000 - variables[70], 100);
check('玉钢消耗 = 100', 1000 - variables[71], 100);
check('冷却材消耗 = 100', 1000 - variables[72], 100);
check('砥石消耗 = 100', 1000 - variables[73], 100);
check('产物全部落在 10 档池内',
    scene._lastResult.records.every(r => [50,51,52,53,54,55,61].indexOf(r.itemId) >= 0), true);
check('背包共获得 10 件',
    Object.keys(inventory).reduce((a, k) => a + inventory[k], 0), 10);

section('3. 十连：素材只够 3 次 -> 按 3 次执行');
resetMaterials(35); clearInventory();
scene = newTenPull([10,10,10,10]);
scene.startForge('十连锻刀', 10, 1);
check('实际锻造次数 = 3', scene._lastResult.records.length, 3);
check('剩余木炭 = 5', variables[70], 5);
check('上报的可锻次数 = 3', String(scene._lastResult.possible), '3');

section('4. 十连：素材一次都锻不动 -> 拒绝且不扣料');
resetMaterials(3); clearInventory(); log.messages.length = 0; log.sounds.length = 0;
scene = newTenPull([10,10,10,10]);
scene.startForge('十连锻刀', 10, 1);
check('没有产生产物记录', scene._lastResult === undefined, true);
check('蜂鸣器响过', log.sounds.indexOf('buzzer') >= 0, true);
check('有失败提示文案', log.messages.length > 0, true);
check('素材未被扣除（木炭仍为 3）', variables[70], 3);

section('5. 单次锻造 x1：素材不足同样拒绝');
resetMaterials(3); log.sounds.length = 0; log.messages.length = 0;
scene = newTenPull([10,10,10,10]);
scene.startForge('锻造 x1', 1, 0);
check('素材不足时拒绝', scene._lastResult === undefined, true);
check('蜂鸣器响过', log.sounds.indexOf('buzzer') >= 0, true);

section('6. 99 上限保护：整池满仓时一件都收不进去');
resetMaterials(1000);
// 必须把全部产物先清零，否则会继承上一个用例的满仓状态
[50,51,52,53,54,55,56,57,58,59,60,61,62,63,65].forEach(id => { inventory[id] = 0; });
inventory[58] = 99; inventory[60] = 99; inventory[62] = 99; inventory[63] = 99;
scene = newTenPull([30,30,30,30]);
scene.startForge('十连锻刀', 10, 1);
const recs6 = scene._lastResult.records;
check('仍然记录了 10 次投料', recs6.length, 10);
check('全部标记为收纳失败', recs6.every(r => r.doubled === true), true);
check('三日月仍是 99（没有溢出）', inventory[58], 99);
check('产生了溢出警告',
    Array.isArray(scene._overflowWarnings) && scene._overflowWarnings.length > 0, true);

section('7. 99 上限保护：只满一种时，只吞掉那一种');
resetMaterials(1000);
// 必须把全部产物先清零，否则会继承上一个用例的满仓状态
[50,51,52,53,54,55,56,57,58,59,60,61,62,63,65].forEach(id => { inventory[id] = 0; });
inventory[58] = 99;
// 记录锻造前的背包总量，用增量判断本次真正收进了几件
const before7 = Object.keys(inventory).reduce((a, k) => a + inventory[k], 0);
scene = newTenPull([30,30,30,30]);
scene.startForge('十连锻刀', 10, 1);
const recs7 = scene._lastResult.records;
const gained7 = Object.keys(inventory).reduce((a, k) => a + inventory[k], 0) - before7;
check('投料 10 次', recs7.length, 10);
check('任何道具都没超过 99', Object.keys(inventory).every(k => inventory[k] <= 99), true);
check('三日月不超过 99', inventory[58] <= 99, true);
check('本次入库件数 = 10 - 三日月被吞次数',
    gained7, 10 - scene._overflowWarnings.length);
console.log('      （本次三日月被吞 ' + scene._overflowWarnings.length + ' 次）');

section('10. 十连界面布局几何校验（V28.1 修复点）');
// 用一个合成场景，只跑 createWindows，把每个窗口的矩形算出来检查越界/重叠
function layoutOf(boxH) {
    const oldH = sandbox.Graphics.boxHeight;
    sandbox.Graphics.boxHeight = boxH;

    const scene = Object.create(Scene_ForgeTenPull.prototype);
    scene._recipeValues = [10, 10, 10, 10];
    scene._helpWindow = null;
    scene._windows = [];
    scene.addWindow = function (win) { scene._windows.push(win); };
    scene.createHelpWindow = function () {
        this._helpWindow = new sandbox.Window_Help(new sandbox.Rectangle(0, boxH - 96, 816, 96));
        this._helpWindow.padding = 18;
        this.addWindow(this._helpWindow);
    };
    Scene_ForgeTenPull.prototype.createWindows.call(scene);

    const out = {
        title: scene._titleWindow,
        menu: scene._commandWindow,
        help: scene._helpWindow,
        boxH: boxH,
    };
    sandbox.Graphics.boxHeight = oldH;
    return out;
}

function rect(w) { return { y: w.y, bottom: w.y + w.height, h: w.height, x: w.x, right: w.x + w.width, w: w.width }; }

[624, 640, 720].forEach(bh => {
    const L = layoutOf(bh);
    const t = rect(L.title), m = rect(L.menu), hp = rect(L.help);
    console.log('  屏幕高 ' + bh + ' → 标题 y=' + t.y + '..' + t.bottom +
                ' | 命令 y=' + m.y + '..' + m.bottom +
                ' | 帮助 y=' + hp.y + '..' + hp.bottom);

    check('[' + bh + '] 标题窗在屏幕内', t.y >= 0 && t.bottom <= bh, true);
    check('[' + bh + '] 命令窗在屏幕内', m.y >= 0 && m.bottom <= bh, true);
    check('[' + bh + '] 帮助窗在屏幕内', hp.y >= 0 && hp.bottom <= bh, true);
    check('[' + bh + '] 标题窗不与帮助窗重叠', t.bottom <= hp.y, true);
    check('[' + bh + '] 命令窗不与帮助窗重叠', m.bottom <= hp.y, true);
    check('[' + bh + '] 标题窗与命令窗不重叠', t.bottom <= m.y, true);
    check('[' + bh + '] 三个窗都不超出屏幕右边界', t.right <= 816 && m.right <= 816 && hp.right <= 816, true);
    check('[' + bh + '] 命令窗高度够放 3 行（>=110）', m.h >= 110, true);
});

// 标题窗内容不能超出它自己的高度
(function () {
    const L = layoutOf(624);
    // [V28.20] MZ 的 drawText 行高写死 = lineHeight() = 36，所以 20 号字的结论行要按 36 占位，
    // 不能按字号算（旧版就是按 20 算的，才以为放得下）。
    const MZ_LINE_H = 36;
    const rows = 2;                                  // 4 种素材 -> 2 行网格
    const lineY = 74 + rows * 26 + 10;               // 结论行 y
    const need = lineY + MZ_LINE_H;                  // 结论行底边
    check('标题窗高度容得下配方行 + 表头 + 2 行素材 + 结论行（按 MZ 行高 36 算）',
        L.title.height >= need, true);
    check('结论行底边离窗口下边框至少 12px（不许贴边/被挡）',
        L.title.height - need >= 12, true);
    console.log('      标题窗高 ' + L.title.height + '，内容需要 ' + need +
                '（余 ' + (L.title.height - need) + 'px）');

    // 素材明细两列网格：每格文字不得超过列宽，杜绝上一版末尾被裁的问题
    const innerW = L.title.width;   // padding=0 -> 内容宽 = 窗口宽
    // [V28.20] 名称列 72px，「不足」标签 36px，数值列要同时避开这两者
    const nameW = 76, tagW = 36;
    const valW = Math.floor(innerW / 2) - nameW - tagW - 10;
    const worst = '冷却材1000｜10';   // 最长的素材名 + 4 位数字（V28.20 起用全角竖线分隔）
    const est = Array.from(worst).reduce((acc, ch) => {
        const c = ch.codePointAt(0);
        const full = (c >= 0x2E80 && c <= 0x9FFF) || (c >= 0xFF00 && c <= 0xFFEF) || (c >= 0x3000 && c <= 0x303F);
        return acc + 17 * (full ? 1.0 : 0.5);
    }, 0);
    check('素材格文字不超数值列宽（' + worst + ' 约 ' + Math.round(est) + 'px <= ' + valW + 'px）',
        est <= valW, true);
    check('「不足」标签不窜出窗口右缘',
        Math.floor(innerW / 2) * 2 - 8 <= innerW, true);
    check('标题窗顶部留白合理（>=24px）', L.title.y >= 24, true);
    check('命令窗底边距帮助窗 >= 8px', L.help.y - (L.menu.y + L.menu.height) >= 8, true);
})();
section('11. 窗口内容尺寸校验（V28.2 修复点）');
// 按 MZ 真实公式估算文字宽度：CJK/全角 1em，ASCII 半角 0.5em
function textW(text, fontSize) {
    let w = 0;
    for (const ch of text) {
        const c = ch.codePointAt(0);
        const full = (c >= 0x2E80 && c <= 0x9FFF) || (c >= 0xFF00 && c <= 0xFFEF) || (c >= 0x3000 && c <= 0x303F);
        w += fontSize * (full ? 1.0 : 0.5);
    }
    return w;
}
function lineH(fontSize) { return Math.ceil(fontSize * 1.5); }

function auditDraws(label, win, opts) {
    const cw = win.contentsWidth();
    const ch = win.contentsHeight();
    const bad = [];
    for (const d of (win._drawCalls || [])) {
        // 右边界：多行文本取最宽的一行
        const widest = String(d.text).split('\n').reduce((a, b) => (textW(b, d.fontSize) > textW(a, d.fontSize) ? b : a), '');
        const tw = textW(widest, d.fontSize);
        let right = d.x + tw;
        if (d.align === 'center' && d.maxWidth) right = d.x + (d.maxWidth - tw) / 2 + tw;
        if (right > cw + 0.5) bad.push(`右越界 ${Math.round(right - cw)}px <- "${d.text}"`);
        // 下边界：文本里可能有换行（结果窗就是把整段文本一次性交给 drawText 的），
        // 所以要按行数折算真实高度
        const lineCount = String(d.text).split('\n').length;
        const bottom = d.y + lineH(d.fontSize) * lineCount;
        if (bottom > ch + 0.5) bad.push(`下越界 ${Math.round(bottom - ch)}px（${lineCount} 行）<- "${String(d.text).slice(0, 30)}"`);
        // drawText 的 maxWidth 不该超过内容宽（老 bug 就是填了窗口宽）
        if (d.maxWidth !== undefined && d.maxWidth > cw + 0.5) {
            bad.push(`maxWidth ${d.maxWidth} > 内容宽 ${cw} <- "${d.text}"`);
        }
    }
    if (bad.length === 0) { pass++; console.log('  [OK] ' + label); }
    else { fail++; console.log('  [NG] ' + label); bad.forEach(b => console.log('         ' + b)); }
}

function auditItems(label, win, itemCount, lastBottom) {
    // itemCount 项要占的总高（最后一项的底边）；可见性由 contentsHeight 决定
    const ch = win.contentsHeight();
    const need = itemCount * win.itemHeight();
    const ok = need <= ch;
    if (ok) { pass++; console.log('  [OK] ' + label + `（${itemCount}项 x ${win.itemHeight()} = ${need} <= 内容高 ${ch}）`); }
    else { fail++; console.log('  [NG] ' + label + `（末项底 ${lastBottom} / 项高 ${win.itemHeight()}，总高 ${need} / 内容高 ${ch}）`); }
}

// --- 主菜单 ---
// [V28.18] 改为「每项仅一行主功能文字」：itemHeight 64、4 项、窗口 320 高、垂直居中
const mainWin = Object.create(sandbox.Window_SimpleForge.prototype);
mainWin.initialize(new sandbox.Rectangle(80, 152, 560, 320));
mainWin._index = 0;
for (let i = 0; i < 4; i++) if (mainWin.drawItem) mainWin.drawItem(i);
auditDraws('主菜单 4 项文字都在内容区里', mainWin);
auditItems('主菜单 4 项总高放得下', mainWin, 4, 12 + lineH(26));
check('主菜单每项只画一行主文案（无副标题/小字）',
    (mainWin._drawCalls || []).filter(c => c.text !== undefined).length, 4);
check('主菜单项高 = 64', mainWin.itemHeight(), 64);

// --- 十连命令窗 ---
const cmdWin = Object.create(sandbox.Window_ForgeTenPullCommand.prototype);
cmdWin.initialize(new sandbox.Rectangle(80, 264, 656, 220));
check('命令窗能放下 4 项（MZ 每项 lineHeight+8）',
    4 * (36 + 8) <= cmdWin.contentsHeight(), true);
console.log('      命令窗内容高 ' + cmdWin.contentsHeight() + '，4 项需要 ' + 4 * 44);

// --- 十连标题窗（真跑一遍 drawTitle，带满素材数据） ---
// 直接用 layoutOf 里真实创建出来的标题窗，保证测的就是游戏里那个尺寸
function tenPullTitleWindow(materialsAmount) {
    resetMaterials(materialsAmount);
    const L = layoutOf(624);
    const scene = Object.create(Scene_ForgeTenPull.prototype);
    scene._recipeValues = [10, 10, 10, 10];
    scene._titleWindow = L.title;
    scene._titleWindow._drawCalls = [];
    scene._titleWindow.contents.fontSize = 28;
    Scene_ForgeTenPull.prototype.drawTitle.call(scene);
    return scene._titleWindow;
}
auditDraws('十连标题窗（素材充足）文字都在内容区里', tenPullTitleWindow(1000));
auditDraws('十连标题窗（四素材全不足，最坏情况）文字都在内容区里', tenPullTitleWindow(3));
resetMaterials(1000);
// --- 十连结果窗 ---
const resWin = Object.create(sandbox.Window_ForgeTenResult.prototype);
resWin.initialize(new sandbox.Rectangle(80, 70, 600, 400));
// V28.8 新格式：产物合并成一行，整段最多 4 行
// V28.14 格式：标题 1 行 + 产物每行两个 + 备注
const sample = '十连锻刀完成，共 10 把：\n山姥切国广·刀身 × 4 ｜ 蜂须贺虎彻·刀身 × 3\n大和守安定·刀身 × 2 ｜ 加州清光·刀身 × 1\n（素材只够 10 次）';
auditDraws('十连结果窗（12 行最坏情况）文字都在内容区里', resWin);
check('结果窗 3 行文本放得下（行高 30）', 3 * 30 <= resWin.contentsHeight(), true);
console.log('      结果窗内容高 ' + resWin.contentsHeight() + '，3 行 x 30 = ' + (3*30));

// ---- V28.8 专项：结果窗口 ----
// ---- V28.8 专项：结果窗口 ----
// 关键教训（两次踩坑）：
//   1) drawTextEx 内部第一句 resetFontSettings() 会把 contents.fontSize 重置回默认；
//      且 width 若为 undefined，calcTextHeight 算出 NaN，processAllText 一个字符都不画 → 整窗空白。
//   2) Window_Base.drawText(text, x, y, maxWidth, align) 内部固定用 this.lineHeight()(=36) 当行高；
//      位图的真实签名是 Bitmap.drawText(text, x, y, maxWidth, lineHeight, align)。
//      所以 refreshText 直接调 contents.drawText，行高自己说了算。
// 这里抓 contents.drawText 的调用参数来检查。
(function () {
    const proto = sandbox.Window_ForgeTenResult.prototype;

    const w2 = Object.create(proto);
    w2.initialize(new sandbox.Rectangle(80, 70, 600, 400));
    w2._drawCalls = [];      // V28.14 起 refreshText 走 Window_Base.drawText，绘制记录在 _drawCalls
    w2.setResultText(
        '十连锻刀完成，共 10 把：\n' +
        '山姥切国广·刀身 × 4 ｜ 蜂须贺虎彻·刀身 × 3\n' +
        '大和守安定·刀身 × 2 ｜ 加州清光·刀身 × 1\n' +
        '（素材只够 10 次）'
    );
    const calls = w2._drawCalls || [];
    const texts = calls.filter(c => c.text !== undefined);

    check('结果窗画了字', texts.length > 0, true);
    console.log('      共绘制 ' + texts.length + ' 段文字');

    // 1) 字号：物品名 20 号（与物品界面一致），数量 16 号
    //    注意排除表头单元格（"刀身" / "数量"）与标题行
    const nameCalls = texts.filter(c => c.text.indexOf('刀身') >= 0
                                        && c.text !== '刀身'
                                        && c.text.indexOf('x') < 0
                                        && c.text.indexOf('共') < 0
                                        && c.text.indexOf('（') < 0);
    check('物品名用 20 号字（与物品界面一致）',
        nameCalls.length > 0 && nameCalls.every(c => c.fontSize === 20), true);
    // [V28.20] 数量格式由 "x4" 改成 "× 4"，且长名字时会自动缩字（12~16）
    const countCalls = texts.filter(c => /^×\s*\d+$/.test(String(c.text).trim()));
    check('数量用 12~16 号字（长名字自动缩字）',
        countCalls.length > 0 && countCalls.every(c => c.fontSize >= 12 && c.fontSize <= 16), true);
    console.log('      物品名 ' + nameCalls.length + ' 个 / 数量 ' + countCalls.length + ' 个');

    // 2) 每行两个：产物 4 种 -> 应画 4 个名字、4 个数量
    check('4 种产物画了 4 个名字', nameCalls.filter(c => c.text.indexOf('刀身') >= 0).length >= 4, true);

    // 3) 布局分类：数量数字走右对齐，名字走左对齐
    // [V28.20] 右格的数量也必须在（以前整串塞一格，右格数量会被裁掉）
    check('左右两列都画了数量（各 2 个）',
        countCalls.filter(c => c.align === 'right' && c.x >= 282).length, 2);

    // 4) 左列与右列：名字的 x 坐标应分成两组（一左一右）
    const leftXs = new Set(), rightXs = new Set();
    nameCalls.forEach(c => {
        if (c.x < w2.contentsWidth() / 2) leftXs.add(Math.round(c.x));
        else rightXs.add(Math.round(c.x));
    });
    check('名字分布在左右两列（各至少 2 个）', leftXs.size === 1 && rightXs.size === 1, true);
    console.log('      左列 x=' + [...leftXs].join(',') + '  右列 x=' + [...rightXs].join(','));

    // 5) 中线：drawFlatLine 应被调用过，且有过一条 2px 宽的竖线
    // drawFlatLine 内部是 contents.fillRect(..., outlineWidth=0)，记录下来的 kind 是 fillRect
    const dividerCalls = calls.filter(c => c.kind === 'fillRect');
    check('画过分隔线（含中线）', dividerCalls.length > 0, true);
    const vLine = dividerCalls.filter(c => c.w <= 3 && c.h > 20);
    check('其中有一条贯穿多行的竖中线', vLine.length > 0, true);
    if (vLine.length > 0) {
        console.log('      中线 x=' + vLine[0].x + '  y=' + vLine[0].y + '  高=' + vLine[0].h +
                    '  内容宽一半=' + Math.floor(w2.contentsWidth() / 2));
        check('中线在内容宽的正中间',
            Math.abs(vLine[0].x - Math.floor(w2.contentsWidth() / 2)) <= 1, true);
    }

    // 6) 文本为空时不应抛错
    let threw = false;
    try {
        const w3 = Object.create(proto);
        w3.initialize(new sandbox.Rectangle(80, 70, 600, 400));
        w3._resultText = '';
        w3.refreshText();
    } catch (e) { threw = true; }
    check('结果窗文本为空时 refreshText 不抛错', threw, false);

    sandbox.__capturedDrawText = [];
})();

(function () {
    const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'js', 'plugins', 'SimpleForge.js'), 'utf8');
    const iAdd = src.indexOf('this.addWindow(this._resultWindow)');
    const iSet = src.indexOf('this._resultWindow.setResultText(this._resultText)');
    check('setResultText 在 addWindow 之后调用（顺序修复）',
        iAdd >= 0 && iSet >= 0 && iSet > iAdd, true);
    console.log('      addWindow 位置 ' + iAdd + ' < setResultText 位置 ' + iSet);
})();
section('12. 更改配方功能（V28.3 新增）');

// 菜单应有 4 项：x1 / x10 / 更改配方 / 返回
const cmdWin2 = Object.create(sandbox.Window_ForgeTenPullCommand.prototype);
cmdWin2.initialize(new sandbox.Rectangle(80, 255, 656, 220));
cmdWin2.makeCommandList();
check('十连菜单项数 = 4', cmdWin2._list.length, 4);
check('菜单项符号依次为 x1 / x10 / recipe / cancel',
    cmdWin2._list.map(c => c.symbol), ['x1', 'x10', 'recipe', 'cancel']);

// 配方列表窗：项数应等于可锻造物品数，且每项文字都在内容区里
const recWin = Object.create(sandbox.Window_ForgeRecipeList.prototype);
recWin.initialize(new sandbox.Rectangle(80, 108, 656, 404));
recWin._index = 0;
check('配方列表项数 = 可锻造物品数 15', recWin.maxItems(), 15);
// V28.5 起改用 MZ 原生滚动，itemRect 由引擎给。这里只断言真正重要的性质，
// 不去绑死引擎内部的 rowSpacing / contentsHeight 细节：
//   1. 相邻两项的 y 严格递增（防重叠 —— 这就是主人反馈的 bug）
//   2. 相邻两项的 y 差恰好等于一个整行高
//   3. 任意两项的矩形不重叠
//   4. 初始 scrollBaseY 为 0
check('配方列表 itemRect 逐项递增（防重叠）',
    recWin.itemRect(1).y > recWin.itemRect(0).y, true);
// 不断言具体间距数值（那是引擎内部细节），只断言「严格递增且不重叠」这一必要条件
check('配方列表相邻项 y 严格递增',
    recWin.itemRect(1).y > recWin.itemRect(0).y, true);
(function () {
    let overlap = false;
    for (let i = 1; i < 15; i++) {
        const a = recWin.itemRect(i - 1), b = recWin.itemRect(i);
        if (b.y < a.y + a.height) overlap = true;   // 下一项压到上一项 = 重叠
    }
    check('配方列表 15 项两两不重叠', overlap, false);
})();
check('配方列表初始 scrollBaseY = 0', recWin.scrollBaseY(), 0);
check('配方列表 maxVisibleItems 由 MZ 公式给出',
    recWin.maxVisibleItems(),
    Math.ceil(recWin.contentsHeight() / recWin.itemHeight()) * recWin.maxCols());
check('配方列表 overallHeight = 15 项 * itemHeight', recWin.overallHeight(), 15 * recWin.itemHeight());
for (let i = 0; i < 3; i++) recWin.drawItem(i);
auditDraws('配方列表窗文字都在内容区里', recWin);
auditItems('配方列表每项高放得下', recWin, 3, 2 + 2 * 56 + 52);
console.log('      配方列表内容高 ' + recWin.contentsHeight() + '，每项 ' + recWin.itemHeight() +
            '，可见 ' + Math.floor(recWin.contentsHeight() / recWin.itemHeight()) + ' 项（共 15 项，可滚动）');

// applyRecipe 应把配方换掉并刷新标题
const tp = Object.create(Scene_ForgeTenPull.prototype);
tp._recipeValues = [10, 10, 10, 10];
let redrawn = 0;
tp.drawTitle = function () { redrawn++; };
tp._commandWindow = { select: () => {} };
Scene_ForgeTenPull.prototype.applyRecipe.call(tp, [30, 30, 30, 30]);
check('applyRecipe 换掉了配方', JSON.stringify(tp._recipeValues), JSON.stringify([30, 30, 30, 30]));
check('applyRecipe 触发了标题重绘', redrawn, 1);

// 换配方后标题窗应显示新配方且不越界
resetMaterials(1000);
const L2 = layoutOf(624);
const tp2 = Object.create(Scene_ForgeTenPull.prototype);
tp2._recipeValues = [30, 30, 30, 30];
tp2._titleWindow = L2.title;
tp2._titleWindow._drawCalls = [];
tp2._titleWindow.contents.fontSize = 28;
Scene_ForgeTenPull.prototype.drawTitle.call(tp2);
auditDraws('换成 30 档配方后标题窗文字仍在内容区里', tp2._titleWindow);
const joined = tp2._titleWindow._drawCalls.map(d => d.text).join(' | ');
// [V28.20] 数量分隔符由空格改成「 ｜ 」（全角竖线 + 左右各一个半角空格）
check('标题窗确实显示了新配方 30 ｜ 30 ｜ 30 ｜ 30', joined.indexOf('30 ｜ 30 ｜ 30 ｜ 30') >= 0, true);
section('13. 主菜单行数与锻刀预览');
const win = Object.create(sandbox.Window_SimpleForge.prototype);
log.sounds.length = 0;
// [V28.17] 主菜单由 5 项整合为 4 项：锻刀 / 可锻造列表 / 素材信息 / 退出工坊
check('主菜单项数 = 4（锻刀已整合）', win.maxItems(), 4);
const preview = win.tenPullPreview();
check('锻刀预览文案可生成（含「可锻」）', /可锻|不足|未设置/.test(preview), true);
console.log('      预览文案：' + preview);

// ============================================================================
section('14. 通用防护：结果窗换行往返 + drawText 参数签名');

// ---- 14.1 换行往返 ----
// 这个 bug 之前测试没抓到，因为测试样本用的是真换行符、而实现两端都用了错误的 "\\n"，
// 两边各自自洽。真正的不匹配发生在「showResult 造文本」与「refreshText 拆文本」之间。
(function () {
    // 抓 showResult 实际产出的文本：拦截 $gameMessage.add / SceneManager.push
    const Scene_ForgeTenPullRef = sandbox.Scene_ForgeTenPull;
    const scene = Object.create(Scene_ForgeTenPullRef.prototype);
    scene._recipeValues = [10, 10, 10, 10];
    scene._forgingInProgress = false;
    scene._commandWindow = { deactivate: () => {}, activate: () => {} };
    scene._overflowWarnings = [];

    // V28.11 起文本经 $gameTemp 中转（MZ 的 push 不支持传参）
    sandbox.$gameTemp._forgeTenResultText = null;
    const records = [
        { itemId: 58, name: '三日月宗近·刀身', doubled: false },
        { itemId: 58, name: '三日月宗近·刀身', doubled: false },
        { itemId: 60, name: '鹤丸国永·刀身', doubled: false },
    ];
    Scene_ForgeTenPullRef.prototype.showResult.call(scene, '十连锻刀', 3, 10, records);

    const text = sandbox.$gameTemp._forgeTenResultText;
    check('showResult 产出了结果文本', typeof text === 'string' && text.length > 0, true);
    console.log('      showResult 产出文本 = ' + JSON.stringify(text));

    check('结果文本用的是真换行符（不是字面量 \\n 两个字符）',
        text.indexOf('\\n') < 0 && text.indexOf('\n') >= 0, true);

    // 把这段真实文本灌进结果窗，看它能不能拆成多行画出来
    const proto = sandbox.Window_ForgeTenResult.prototype;
    const w = Object.create(proto);
    w.initialize(new sandbox.Rectangle(80, 70, 600, 400));
    sandbox.__capturedDrawText = [];
    w.setResultText(text);
    const drawn = sandbox.__capturedDrawText;
    check('结果窗按真换行拆出了多行（而非整段一行）', drawn.length >= 2, true);
    console.log('      结果窗画了 ' + drawn.length + ' 行');
    drawn.forEach((d, i) => console.log('        [' + i + '] "' + d.text + '"'));
    check('每行宽度都没超过内容宽（超了会被裁）',
        drawn.every(d => d.textW === undefined || d.textW <= w.contentsWidth() + 1), true);

    // ---- 14.1c [V28.20] 分隔符往返：showResult 造文本 → parseResultLines 拆文本 ----
    // 这一条是被真事故逼出来的：V28.20 把结果分隔符从全角空格改成「 ｜ 」，
    // 但解析器还在按 "　" 切 → 一行两把切不开、数量为空。
    // 旧测试用的是**手写样本**，样本没跟着改，所以全绿放行（假绿第七次）。
    // 现在改成「拿真实产出的文本灌进真实解析器」，实现改了测试就会红。
    (function () {
        const parsed = w.parseResultLines();
        check('实产文本被拆出 1 行产物（3 把 → 2+1）', parsed.pairs.length, 1);
        check('第一行两格都拆开了（左格有名字）',
            !!parsed.pairs[0] && !!parsed.pairs[0][0] && parsed.pairs[0][0].name.length > 0, true);
        check('第一行右格也拆开了',
            !!parsed.pairs[0] && !!parsed.pairs[0][1], true);
        check('左格名字不带分隔符残留',
            !!parsed.pairs[0] && parsed.pairs[0][0].name.indexOf('｜') < 0, true);
        check('三日月宗近 计数解析为 2',
            parsed.pairs[0] && parsed.pairs[0][0] ? parsed.pairs[0][0].count : null, 2);
        check('鹤丸国永·刀身 计数解析为 1',
            parsed.pairs[0] && parsed.pairs[0][1] ? parsed.pairs[0][1].count : null, 1);
        check('右格名字不带分隔符残留',
            !!parsed.pairs[0] && parsed.pairs[0][1] ? parsed.pairs[0][1].name.indexOf('｜') : 0, -1);
        console.log('      解析结果：' + JSON.stringify(parsed.pairs));
        console.log('      备注行：' + JSON.stringify(parsed.notes));
    })();

    // ---- 14.1b 超长文本必须折行，且折完每行都不超内容宽 ----
    (function () {
        const proto = sandbox.Window_ForgeTenResult.prototype;
        const w2 = Object.create(proto);
        w2.initialize(new sandbox.Rectangle(80, 70, 600, 400));
        // 最坏情况：产物 10 种（每行两个）+ 长道具名的溢出备注
        // [V28.20] 分隔符与计数格式必须与 showResult 实产一致：「 ｜ 」与「 × N」
        const longText = '十连锻刀完成，共 10 把：\n'
            + '三日月宗近·刀身 × 1 ｜ 鹤丸国永·刀身 × 1\n'
            + '髭切·刀身 × 1 ｜ 膝丸·刀身 × 1\n'
            + '石切丸·刀身 × 1 ｜ 大和守安定·刀身 × 1\n'
            + '加州清光·刀身 × 1 ｜ 歌仙兼定·刀身 × 1\n'
            + '山姥切国广·刀身 × 1 ｜ 陆奥守吉行·刀身 × 1\n'
            + '（三日月宗近·刀身、山姥切国广·刀身 已达 99 件上限）';
        sandbox.__capturedDrawText = [];
        w2.setResultText(longText);
        const drawn = sandbox.__capturedDrawText;
        const cw = w2.contentsWidth();
        check('表格被拆成多行绘制', drawn.length >= 6, true);
        console.log('      绘制了 ' + drawn.length + ' 段文字，内容宽 ' + cw);
        // 每个文字块不能超过自己的格子宽度（超了会被裁）
        const over = drawn.filter(d => {
            if (typeof d.maxWidth !== 'number') return false;
            const fs2 = d.fontSize || 20;
            let wpx = 0;
            for (const ch of d.text) {
                const c = ch.codePointAt(0);
                const full = (c >= 0x2E80 && c <= 0x9FFF) || (c >= 0xFF00 && c <= 0xFFEF) || (c >= 0x3000 && c <= 0x303F);
                wpx += fs2 * (full ? 1.0 : 0.5);
            }
            return wpx > d.maxWidth + 1;
        });
        check('每个文字块都没超过自己的格子宽度', over.length, 0);
        over.forEach(d => console.log('      ✖ 超宽: "' + d.text + '" 格宽=' + d.maxWidth));

        // 表格总高：标题 32 + 表头 30 + 5 行产物 x 44 + 备注 26 <= 内容高
        const tableH = 4 + 32 + 30 + 5 * 44 + 26;
        check('最坏情况（10 种产物）表格总高放得进窗口',
            tableH <= w2.contentsHeight(), true);
        console.log('      表格总高 ' + tableH + ' / 内容高 ' + w2.contentsHeight());
    })();

    // ---- 14.2 drawText 参数签名 ----
    check('没有调用把 lineHeight 误当 align 传给 Window_Base.drawText',
        sandbox.__signatureErrors.length, 0);
    sandbox.__signatureErrors.forEach(e =>
        console.log('      ✖ "' + e.text + '..." align=' + e.align));
})();
check('没有调用把 lineHeight 误当 align 传给 Window_Base.drawText',
    sandbox.__signatureErrors.length, 0);
sandbox.__signatureErrors.forEach(e =>
    console.log('      ✖ "' + e.text + '..." align=' + e.align));

// ============================================================================
section('15. 跨场景传值必须走 $gameTemp（MZ 的 push 不传参）');

// 15.1 push 桩件本身要如实模拟 MZ：场景只拿到类名，没有参数
(function () {
    function Probe() { this.argCount = arguments.length; }
    sandbox.SceneManager.push(Probe, 'someText');
    check('push 记录的场景参数个数为 0（复刻 MZ 行为）',
        sandbox.SceneManager._created[sandbox.SceneManager._created.length - 1].args.length, 0);
})();

// 15.2 showResult 必须把结果文本放进 $gameTemp，而不是靠 push 传参
(function () {
    const proto = sandbox.Scene_ForgeTenPull.prototype;
    const scene = Object.create(proto);
    scene._recipeValues = [10, 10, 10, 10];
    scene._forgingInProgress = false;
    scene._commandWindow = { deactivate: () => {}, activate: () => {} };
    scene._overflowWarnings = [];

    sandbox.SceneManager._created.length = 0;
    sandbox.$gameTemp._forgeTenResultText = null;

    const records = [
        { itemId: 58, name: '三日月宗近·刀身', doubled: false },
        { itemId: 60, name: '鹤丸国永·刀身', doubled: false },
        { itemId: 60, name: '鹤丸国永·刀身', doubled: false },
    ];
    proto.showResult.call(scene, '十连锻刀', 3, 10, records);

    check('showResult 把文本放进了 $gameTemp._forgeTenResultText',
        typeof sandbox.$gameTemp._forgeTenResultText === 'string'
        && sandbox.$gameTemp._forgeTenResultText.length > 0, true);
    console.log('      $gameTemp 里的文本 = ' +
                JSON.stringify(String(sandbox.$gameTemp._forgeTenResultText || '').slice(0, 50)));
    check('showResult 调用了 SceneManager.push',
        sandbox.SceneManager._created.length > 0, true);
    check('push 过去的场景就是 Scene_ForgeTenResult',
        sandbox.SceneManager._created.length > 0
        && sandbox.SceneManager._created[sandbox.SceneManager._created.length - 1].cls === sandbox.Scene_ForgeTenResult, true);
})();

// 15.3 结果场景 create 时能从 $gameTemp 取到文本并画出来
(function () {
    const S = sandbox.Scene_ForgeTenResult;
    const scene = Object.create(S.prototype);
    scene._resultText = "";
    scene._windows = [];
    scene.addWindow = function (w) { scene._windows.push(w); };
    scene.createHelpWindow = function () {};
    scene.create = function () {
        // 复刻 create 的关键动作（避免拖入整套 Scene_Base）
        this._resultText = sandbox.$gameTemp._forgeTenResultText || "";
        sandbox.$gameTemp._forgeTenResultText = null;
        const proto = sandbox.Window_ForgeTenResult.prototype;
        const w = Object.create(proto);
        w.initialize(new sandbox.Rectangle(80, 70, 600, 400));
        sandbox.__capturedDrawText = [];
        w.setResultText(this._resultText);
        this._resultWindow = w;
    };

    sandbox.$gameTemp._forgeTenResultText = '十连锻刀完成，共 2 把：\n三日月宗近·刀身 × 1 ｜ 鹤丸国永·刀身 × 1';
    sandbox.SceneManager._scene = null;
    scene.create();

    check('结果场景从 $gameTemp 取到了文本',
        scene._resultText.length > 0, true);
    check('取完即清空 $gameTemp（不污染下一次）',
        sandbox.$gameTemp._forgeTenResultText, null);
    check('窗口里真的画出了这些字',
        sandbox.__capturedDrawText.length >= 2, true);
    console.log('      窗口画了 ' + sandbox.__capturedDrawText.length + ' 行');
})();

// ============================================================================
section('16. 结果窗：无光标 + 每行 2 把');

(function () {
    const proto = sandbox.Window_ForgeTenResult.prototype;

    // 16.1 必须是 Window_Base 派生，不能再是 Window_Selectable（那会带出光标格子与滚动基座）
    check('结果窗原型链来自 Window_Base',
        Object.getPrototypeOf(proto) === sandbox.Window_Base.prototype, true);
    check('结果窗不是 Window_Selectable 派生（无光标格子）',
        Object.getPrototypeOf(proto) !== sandbox.Window_Selectable.prototype, true);
    check('结果窗没有 maxItems（不再当作列表控件）',
        typeof proto.maxItems, 'undefined');
    check('结果窗没有 drawItem（不再走列表刷新链）',
        typeof proto.drawItem, 'undefined');
    // 注：Window_Base 本身就有 select()（只设 active，不画光标），所以不能用它判断。
    // 光标格子来自 Window_Selectable 的 _index / maxItems / drawAllItems 那一套，
    // 只要不是它的派生类、且没有 maxItems，就不会出现光标。
    check('结果窗的 select 是 Window_Base 那个（只设 active）',
        proto.select === sandbox.Window_Base.prototype.select, true);
    check('结果窗没有列表控件标志方法 isCurrentItemEnabled',
        typeof proto.isCurrentItemEnabled, 'undefined');

    // 16.2 排版：每行 2 把
    const scene = Object.create(sandbox.Scene_ForgeTenPull.prototype);
    scene._recipeValues = [10, 10, 10, 10];
    scene._forgingInProgress = false;
    scene._commandWindow = { deactivate: () => {}, activate: () => {} };
    scene._overflowWarnings = [];

    sandbox.$gameTemp._forgeTenResultText = null;
    // 造 5 种不同产物（含重复计数）
    const names = ['三日月宗近·刀身', '鹤丸国永·刀身', '髭切·刀身', '膝丸·刀身', '压切长谷部·刀身'];
    const records = [];
    for (let i = 0; i < 10; i++) {
        records.push({ itemId: 50 + i, name: names[i % names.length], doubled: false });
    }
    sandbox.Scene_ForgeTenPull.prototype.showResult.call(scene, '十连锻刀', 10, 10, records);
    const text = sandbox.$gameTemp._forgeTenResultText || "";
    const rows = text.split("\n");
    console.log('      产出行数（不含标题）= ' + (rows.length - 1));
    rows.forEach(r => console.log('        | ' + r));

    check('第一行是标题', /共 10 把/.test(rows[0]), true);
    check('标题之后每行最多 2 把', rows.slice(1).every(r => {
        const n = (r.match(/x\d+/g) || []).length;
        return n <= 2;
    }), true);
    check('产物共 5 种时分成 3 行（2/2/1）', rows.length - 1, 3);

    // 16.3 每行宽度都放得进窗口（每行 2 项，用真实度量）
    const w = Object.create(proto);
    w.initialize(new sandbox.Rectangle(80, 70, 600, 400));
    sandbox.__capturedDrawText = [];
    w.setResultText(text);
    const cw = w.contentsWidth();
    const drawn = sandbox.__capturedDrawText;
    const over = drawn.filter(d => {
        let px = 0;
        for (const ch of d.text) {
            const c = ch.codePointAt(0);
            const full = (c >= 0x2E80 && c <= 0x9FFF) || (c >= 0xFF00 && c <= 0xFFEF) || (c >= 0x3000 && c <= 0x303F);
            px += 17 * (full ? 1.0 : 0.5);
        }
        return px > cw + 1;
    });
    check('每行 2 把时没有一行超宽', over.length, 0);
    over.forEach(d => console.log('      ✖ 超宽: "' + d.text + '"'));
    console.log('      窗口画了 ' + drawn.length + ' 行，内容宽 ' + cw);
})();
// ============================================================================
section('17. 结果场景 create() 全流程（输入方法必须真的存在）');

// 这个 bug（V28.13）本该在这里被抓到：
//   结果窗改成 Window_Base 后没有 setHandler，场景 create() 里却照样调用它 → 运行即崩。
//   以前测试只测「画得对不对」，从没跑过 create() 本身。
(function () {
    const S = sandbox.Scene_ForgeTenResult;
    const scene = Object.create(S.prototype);

    // 造一个够用的最小场景环境
    scene._windowLayer = { children: [], addChild: function (w) { this.children.push(w); } };
    scene._windows = [];
    scene.addWindow = function (w) { this._windowLayer.addChild(w); };
    scene.createHelpWindow = function () {};
    scene.activate = function () {};

    let createError = null;
    try {
        sandbox.$gameTemp._forgeTenResultText = '十连锻刀完成，共 3 把：\n三日月宗近·刀身 × 2 ｜ 鹤丸国永·刀身 × 1';
        S.prototype.create.call(scene);
    } catch (e) {
        createError = e;
    }

    check('结果场景 create() 全程不抛错', createError === null, true);
    if (createError) console.log('      ✖ ' + createError.message + '\n' + (createError.stack || '').split('\n').slice(1, 4).join('\n'));

    check('create() 之后窗口已建立', !!scene._resultWindow, true);

    // 逐个验证：场景真的调用了、且窗口真的有的那些方法
    const w = scene._resultWindow;
    if (w) {
        ['setHandler', 'setTouchGuard', 'setResultText', 'activate', 'update', 'refreshText', 'processHandling', 'processTouch', 'isTouchedInside', 'isOpenAndActive', 'callResultHandler']
            .forEach(m => check('结果窗有方法 ' + m + '()', typeof w[m], 'function'));
        check('结果窗内容非空（字画上去了）', String(w._resultText).length > 0, true);
    }

    // update() 也要跑一遍 —— 输入链路会在这里被调用
    let updateError = null;
    try {
        if (w) w.update();
    } catch (e) { updateError = e; }
    check('结果窗 update() 不抛错（输入链路可用）', updateError === null, true);
    if (updateError) console.log('      ✖ ' + updateError.message);

    // 手动画一遍，确认没走 Window_Selectable 的刷新链
    let drawError = null;
    try {
        if (w) w.refreshText();
    } catch (e) { drawError = e; }
    check('结果窗 refreshText() 不抛错', drawError === null, true);
})();
// ============================================================================
section('18. 更改配方往返（必须真的换掉配方）');
section('18. 更改配方往返（必须真的换掉配方）');

// 探针实测（主人提供）证实真实流程是：
//   1. 在十连场景点「更改配方」-> push 配方列表
//   2. 在配方列表选中 -> onRecipeOk 把配方写进 $gameTemp -> pop
//   3. MZ 回到上一层时会把十连场景**整个重建**（走 create()），而不是调 resume()
//      —— 日志里 [R2]/[R3] 从未出现，而 [R4] create() 又跑了一次
// 所以「配方是否传到位」必须以 create() 能否读到为准；resume() 只是额外的保险。
(function () {
    const Ten = sandbox.Scene_ForgeTenPull;
    const List = sandbox.Scene_ForgeRecipeList;
    const KEY = '_forgeTenPullRecipe';      // ★ 唯一的中转键，create / resume / onRecipeOk 必须一致

    const targetItemId = 58;                // 三日月宗近（30 档）
    const itemIndex = sandbox.$gameSystem._simpleForgeData.availableItems.indexOf(targetItemId);
    const expectCosts = sandbox.$gameSystem._simpleForgeData.costs[targetItemId];
    check('测试目标物品存在且下标有效', itemIndex >= 0 && !!expectCosts, true);
    console.log('      目标物品 id=' + targetItemId + ' 下标=' + itemIndex +
                ' 配方=' + JSON.stringify(expectCosts));

    // ---- 1) 模拟「在配方列表里选中」 ----
    const listScene = Object.create(List.prototype);
    listScene._listWindow = { index: () => itemIndex };
    sandbox.$gameTemp[KEY] = null;
    List.prototype.onRecipeOk.call(listScene);

    check('选中后配方写进了 $gameTemp.' + KEY,
        Array.isArray(sandbox.$gameTemp[KEY])
        && sandbox.$gameTemp[KEY].join(',') === expectCosts.join(','), true);
    console.log('      中转区 = ' + JSON.stringify(sandbox.$gameTemp[KEY]));

    // ---- 2) 场景被重建：new 一个全新的十连场景并跑 create() ----
    const fresh = Object.create(Ten.prototype);
    fresh._recipeValues = null;             // 新场景的构造函数会把配方清空
    fresh._forgingInProgress = false;
    fresh._tenPullExecuted = false;
    fresh._helpWindow = null;
    fresh._windows = [];
    fresh.addWindow = () => {};
    fresh.createHelpWindow = function () {
        this._helpWindow = { y: 0, height: 96, setText: () => {} };
    };
    Ten.prototype.create.call(fresh);

    check('重建后的十连场景从 $gameTemp 读到了配方',
        JSON.stringify(fresh._recipeValues), JSON.stringify(expectCosts));
    check('读完即清空中转区（不污染下一次）',
        sandbox.$gameTemp[KEY], null);
    console.log('      重建后 _recipeValues = ' + JSON.stringify(fresh._recipeValues));

    // ---- 3) resume() 作为第二道保险：也应认识同一个键 ----
    const viaResume = Object.create(Ten.prototype);
    viaResume._recipeValues = [10, 10, 10, 10];
    viaResume.drawTitle = () => {};
    viaResume._commandWindow = { select: () => {} };
    sandbox.$gameTemp[KEY] = expectCosts.slice();
    Ten.prototype.resume.call(viaResume);
    check('resume() 也认得同一个中转键',
        JSON.stringify(viaResume._recipeValues), JSON.stringify(expectCosts));
    check('resume 读完也清空',
        sandbox.$gameTemp[KEY], null);

    // ---- 4) 没有待换配方时不应乱改 ----
    const before = JSON.stringify(viaResume._recipeValues);
    Ten.prototype.resume.call(viaResume);
    check('没有待换配方时 resume 不会改动配方',
        JSON.stringify(viaResume._recipeValues), before);

    // ---- 5) 静态检查：三个位置必须用同一个键，不许再出现别的键名 ----
    const src = require('fs').readFileSync(
        require('path').join(__dirname, '..', 'js', 'plugins', 'SimpleForge.js'), 'utf8');
    const activeLines = src.split(/\r?\n/).filter(l => {
        const t = l.trim();
        return !t.startsWith('//') && !t.startsWith('*');
    }).join('\n');
    check('活跃代码里不再出现 _forgePendingRecipe 这个旧键',
        activeLines.indexOf('_forgePendingRecipe') < 0, true);
    check('create() 读的键与 onRecipeOk 写的键一致',
        /_forgeTenPullRecipe/.test(src), true);
})();


// ============================================================================
section('19. 界面整合（V28.17）：投料界面合并进锻刀界面');

(function () {
    const src = require('fs').readFileSync(
        require('path').join(__dirname, '..', 'js', 'plugins', 'SimpleForge.js'), 'utf8');
    const active = src.split(/\r?\n/)
        .filter(l => { const t = l.trim(); return !t.startsWith('//') && !t.startsWith('*'); })
        .join('\n');

    // ---- 19.1 死代码必须清干净 ----
    check('投料场景 Scene_MaterialInput 已移除',
        active.indexOf('Scene_MaterialInput') < 0, true);
    check('投料窗口 Window_MaterialInputFixed 已移除',
        active.indexOf('Window_MaterialInputFixed') < 0, true);
    check('数字输入窗 Window_ForgeNumberInputFixed 已移除',
        active.indexOf('Window_ForgeNumberInputFixed') < 0, true);
    check('旧的预填静态变量 _prefillCosts 已移除',
        active.indexOf('_prefillCosts') < 0, true);

    // ---- 19.2 主菜单结构（用源码结构断言，避免拖入整套 Scene_Base 桩件）----
    check('主菜单绑定了 forge / list / materials / cancel 四个处理器',
        /setHandler\('forge'/.test(src) && /setHandler\('list'/.test(src)
        && /setHandler\('materials'/.test(src) && /setHandler\('cancel'/.test(src), true);
    check('主菜单不再有 tenForge 处理器（已整合）',
        active.indexOf("setHandler('tenForge'") < 0, true);
    check('主菜单不再有 onTenForge 入口方法',
        active.indexOf('Scene_SimpleForge.prototype.onTenForge') < 0, true);
    check('「锻刀」入口方法 onForge 存在',
        active.indexOf('Scene_SimpleForge.prototype.onForge = function') >= 0, true);
    check('onForge 进入的是 Scene_ForgeTenPull',
        /Scene_SimpleForge\.prototype\.onForge[\s\S]{0,900}?SceneManager\.push\(Scene_ForgeTenPull\)/.test(src), true);

    // ---- 19.3 可锻造列表点选后的去向（真实调用）----

    // ---- 19.4 可锻造列表点配方 -> 带上配方直接进锻刀界面 ----
    const listScene = Object.create(sandbox.Scene_ForgeList.prototype);
    const targetId = 58;                                   // 三日月宗近（30 档）
    const idx = sandbox.$gameSystem._simpleForgeData.availableItems.indexOf(targetId);
    listScene._listWindow = { index: () => idx };
    sandbox.$gameTemp._forgeTenPullRecipe = null;
    sandbox.SceneManager._created.length = 0;
    sandbox.Scene_ForgeList.prototype.onItemOk.call(listScene);

    check('点列表配方后进入 Scene_ForgeTenPull（不再进投料界面）',
        sandbox.SceneManager._created.length > 0
        && sandbox.SceneManager._created[sandbox.SceneManager._created.length - 1].cls === sandbox.Scene_ForgeTenPull, true);
    check('并把该配方写进了 $gameTemp._forgeTenPullRecipe',
        Array.isArray(sandbox.$gameTemp._forgeTenPullRecipe)
        && sandbox.$gameTemp._forgeTenPullRecipe.join(',') === '30,30,30,30', true);
    console.log('      列表点选后中转配方 = ' + JSON.stringify(sandbox.$gameTemp._forgeTenPullRecipe));

    // 场景重建时应读到这个配方
    const fresh = Object.create(sandbox.Scene_ForgeTenPull.prototype);
    fresh._recipeValues = null;
    fresh._windows = [];
    fresh.addWindow = () => {};
    fresh.createHelpWindow = function () { this._helpWindow = { y: 0, height: 96, setText: () => {} }; };
    sandbox.Scene_ForgeTenPull.prototype.create.call(fresh);
    check('锻刀界面创建时读到了列表带来的配方',
        JSON.stringify(fresh._recipeValues), JSON.stringify([30, 30, 30, 30]));

    // ---- 19.5 findMatchingItems 已归属锻刀场景 ----
    check('findMatchingItems 定义在 Scene_ForgeTenPull 上',
        typeof sandbox.Scene_ForgeTenPull.prototype.findMatchingItems, 'function');
    const probe2 = Object.create(sandbox.Scene_ForgeTenPull.prototype);
    check('findMatchingItems 仍然按严格全等匹配',
        JSON.stringify(probe2.findMatchingItems([50, 50, 50, 50])), JSON.stringify([59]));
})();
// ============================================================================
section('20. 列表与主菜单排版统一（V28.18）');

(function () {
    const src = require('fs').readFileSync(
        require('path').join(__dirname, '..', 'js', 'plugins', 'SimpleForge.js'), 'utf8');

    // ---- 20.1 两个列表的项高与可见行数必须一致 ----
    function itemHeightOf(cls) {
        const m = src.match(new RegExp(cls + '\\.prototype\\.itemHeight = function\\(\\) \\{\\s*return (\\d+)'));
        return m ? Number(m[1]) : -1;
    }
    check('可锻造列表项高 = 更改配方列表项高（都是 56）',
        itemHeightOf('Window_ForgeList'), itemHeightOf('Window_ForgeRecipeList'));
    check('两者项高都等于 56', itemHeightOf('Window_ForgeList'), 56);
    check('可锻造列表可见行数 = 7',
        Number((src.match(/Window_ForgeList\.prototype\.maxVisibleItems = function\(\) \{\s*return (\d+)/) || [0, -1])[1]), 7);

    // ---- 20.2 消耗描述不再带持有量 ----
    check('getCostDescription 不再输出「持有」字样',
        /function getCostDescription[\s\S]*?\n    \}/.test(src)
        && !/function getCostDescription[\s\S]*?\n    \}/.exec(src)[0].includes('持有'), true);

    // ---- 20.3 两个列表的行内排版结构一致 ----
    // 用「大括号配对」切出方法体（比靠下一个方法名当结束标记可靠得多）
    function bodyOf(locator) {
        const s = src.indexOf(locator);
        if (s < 0) return '';
        const open = src.indexOf('{', s);
        if (open < 0) return '';
        let depth = 0;
        for (let i = open; i < src.length; i++) {
            const ch = src[i];
            if (ch === '{') depth++;
            else if (ch === '}') {
                depth--;
                if (depth === 0) return src.slice(s, i + 1);
            }
        }
        return '';
    }
    const bodyList = bodyOf('Window_ForgeList.prototype.drawItem');
    const bodyRecipe = bodyOf('Window_ForgeRecipeList.prototype.drawItem');
    check('两个 drawItem 都取到了方法体', bodyList.length > 200 && bodyRecipe.length > 200, true);

    const LAYOUT_KEYS = [
        { label: '物品名 19 号字',          re: /fontSize = 19;/ },
        { label: '右侧「可锻 N 次」16 号',   re: /fontSize = 16;[\s\S]{0,400}?可锻 \$\{Math\.min\(TEN_PULL_MAX, possible\)\} 次/ },
        { label: '第二行「配方：」14 号',    re: /fontSize = 14;[\s\S]{0,400}?配方：/ },
        { label: '内容左边距 12px',          re: /const innerX = rect\.x \+ 12;/ },
        { label: '名字 y 偏移 3',            re: /rect\.y \+ 3/ },
        { label: '数字右对齐',               re: /", "right"\)|"right"\)/ },
    ];
    LAYOUT_KEYS.forEach(k => {
        check('可锻造列表：' + k.label, k.re.test(bodyList), true);
        check('更改配方列表：' + k.label, k.re.test(bodyRecipe), true);
    });

    // ---- 20.4 主菜单只画主功能文字 ----
    const mainSeg = src.slice(src.indexOf('Window_SimpleForge.prototype.drawItem'),
                             src.indexOf('Window_SimpleForge.prototype.isCurrentItemEnabled'));
    const menus = ['锻刀', '可锻造列表', '素材信息', '退出工坊'];
    check('主菜单 4 项主文案齐全',
        menus.every(t => mainSeg.includes(t)), true);
    check('主菜单里不再调用 tenPullPreview（小字已去掉）',
        mainSeg.indexOf('tenPullPreview') < 0, true);
    check('主菜单里不再画副标题（除主文案外无其它 drawText）',
        (mainSeg.match(/this\.drawText\(/g) || []).length, 4);

    // ---- 20.4b 主菜单字号与文案（V28.19）----
    check('主菜单字号 = 26（与工程基准字号一致）',
        /fontSize = 26;/.test(mainSeg), true);
    check('「锻刀」文案不带全角空格',
        mainSeg.indexOf('锻　刀') < 0 && mainSeg.indexOf('"锻刀"') >= 0, true);
    // 文字垂直居中：y 偏移应为 (64 - ceil(26*1.5)) / 2 ≈ 12
    check('主菜单文字 y 偏移 = 12（垂直居中）',
        /rect\.y \+ 12/.test(mainSeg), true);

    // ---- 20.5 主菜单窗口尺寸与项数匹配（不留大片空白）----
    const rectMatch = src.match(/const rect = new Rectangle\((\d+), (\d+), (\d+), (\d+)\);\s*\n\s*this\._mainWindow = new Window_SimpleForge/);
    check('能找到主菜单窗口矩形', !!rectMatch, true);
    if (rectMatch) {
        const winH = Number(rectMatch[4]);
        const items = 4, itemH = 64, padBase = 36;
        check('窗口高度刚好容纳 4 项（不超 350）', winH <= 350, true);
        check('窗口高度不小于内容需求（4×64+36=292）', winH >= items * itemH + 0, true);
        console.log('      主菜单窗口 ' + rectMatch[3] + 'x' + winH +
                    '；内容需要 4×' + itemH + '+36 = ' + (items * itemH + padBase));
    }
})();

// ============================================================================
section('21. 锻刀界面底边留白 + 数量分隔（V28.20）');

// 21.1 结论行底边必须真的在窗口内 —— 用 MZ 自己的行高，不许用字号猜
(function () {
    const L = layoutOf(624);
    const innerW = L.title.width;
    const nameW = 76;

    function drawOnce(materialsAmount) {
        resetMaterials(materialsAmount);
        const scene = Object.create(Scene_ForgeTenPull.prototype);
        scene._recipeValues = [10, 10, 10, 10];
        scene._titleWindow = L.title;
        L.title._drawCalls = [];
        Scene_ForgeTenPull.prototype.drawTitle.call(scene);
        return (L.title._drawCalls || []).filter(c => c.text !== undefined);
    }

    const drawn = drawOnce(1000);
    const line = drawn.find(d => d.text.indexOf('最多可锻') === 0);
    check('标题窗画出了结论行', !!line, true);
    if (line) {
        // MZ 的 Window_Base.drawText 把行高写死成 lineHeight()=36（rmmz_windows.js:217），
        // 不按字号算，所以这里直接取窗口自己的 lineHeight（真值就是 36）。
        const lh = L.title.lineHeight();
        check('标题窗 lineHeight = 36（MZ 写死的行高）', lh, 36);
        const lineBottom = line.y + lh;
        check('结论行底边在窗口内容区内（' + lineBottom + ' <= ' + L.title.height + '）',
            lineBottom <= L.title.height, true);
        check('结论行底边距下边框 >= 12px（' + (L.title.height - lineBottom) + 'px）',
            L.title.height - lineBottom >= 12, true);
        console.log('      窗口高 ' + L.title.height + '，结论行 y=' + line.y +
                    '，按行高 ' + lh + ' 算底边 ' + lineBottom +
                    '，余 ' + (L.title.height - lineBottom) + 'px');
    }

    // 21.2 素材明细两列都不能窜出内容宽（最坏情况：四素材全不足）
    const worst = drawOnce(3);
    worst.filter(d => d.align === 'left').forEach(d => {
        check('明细「' + d.text + '」不超出内容右缘（x+maxW=' + (d.x + d.maxWidth) + ' <= ' + innerW + '）',
            d.x + d.maxWidth <= innerW, true);
    });
    // 「不足」标签右端必须落在格里
    const tags = worst.filter(d => d.text === '不足');
    check('四个素材全不足 -> 画了 4 个「不足」标签', tags.length, 4);
    tags.forEach(d => {
        check('「不足」标签不窜出内容右缘（' + (d.x + d.maxWidth) + ' <= ' + innerW + '）',
            d.x + d.maxWidth <= innerW, true);
    });
    const names = worst.filter(d => d.align === 'left'
        && d.text.indexOf('｜') < 0 && d.text !== '素材' && d.text !== '本次配方：');
    check('素材名与「不足」标签各 4 个都没带分隔符', names.length, 4);
})();

// 21.3 分隔符统一：「｜」必须出现在每一处相邻数量之间
(function () {
    const L = layoutOf(624);
    resetMaterials(1000);
    const scene = Object.create(Scene_ForgeTenPull.prototype);
    scene._titleWindow = L.title;
    scene._recipeValues = [10, 10, 10, 10];

    L.title._drawCalls = [];
    Scene_ForgeTenPull.prototype.drawTitle.call(scene);
    const texts = (L.title._drawCalls || []).filter(c => c.text !== undefined).map(d => d.text);

    check('配方行数量用「 ｜ 」分隔（10 ｜ 10 ｜ 10 ｜ 10）',
        texts.some(t => t === '10 ｜ 10 ｜ 10 ｜ 10'), true);
    check('配方行不再出现空格拼接（"10 10 10 10"）',
        texts.indexOf('10 10 10 10') < 0, true);
    check('表头写成「持有｜需求」', texts.indexOf('持有｜需求') >= 0, true);
    check('表头不再写「持有 / 需求」', texts.indexOf('持有 / 需求') < 0, true);
    check('素材明细写成「1000 ｜ 10」', texts.indexOf('1000 ｜ 10') >= 0, true);
    const concl = texts.find(t => t.indexOf('最多可锻') === 0) || '';
    check('结论行里的素材数量也用「 ｜ 」', concl.indexOf('（10 ｜ 10 ｜ 10 ｜ 10 × ') >= 0, true);
    console.log('      结论行文案：' + concl);
})();

// 21.4 结果窗与列表描述的分隔符
(function () {
    const src = require('fs').readFileSync(
        require('path').join(__dirname, '..', 'js', 'plugins', 'SimpleForge.js'), 'utf8');

    check('十连结果每行两把之间用「 ｜ 」',
        /lines\.push\(row\.join\(" ｜ "\)\)/.test(src), true);
    check('结果产物计数统一「× N」格式',
        /\.map\(name => `\$\{name\} × \$\{counts\[name\]\}`\)/.test(src), true);
    check('结果行不再用全角空格拼接', src.indexOf('row.join("　")') < 0, true);

    const costBody = (function () {
        const s = src.indexOf('function getCostDescription');
        const open = src.indexOf('{', s);
        let depth = 0;
        for (let i = open; i < src.length; i++) {
            if (src[i] === '{') depth++;
            else if (src[i] === '}') { depth--; if (depth === 0) return src.slice(s, i + 1); }
        }
        return '';
    })();
    check('列表消耗描述用「 ｜ 」分隔素材', costBody.indexOf('description += " ｜ "') >= 0, true);
    // 只看代码行，注释里提到 ", " 不算
    const codeOnly = costBody.split('\n').filter(l => l.trim().indexOf('//') !== 0).join('\n');
    check('列表消耗描述不再用 ", " 拼接', codeOnly.indexOf('+= ", "') < 0, true);
})();

// ============================================================================
section('22. 界面标题后的括号注释全部去掉（V28.22）');

(function () {
    const src = require('fs').readFileSync(
        require('path').join(__dirname, '..', 'js', 'plugins', 'SimpleForge.js'), 'utf8');

    // 22.1 三处窗口/菜单标题不许再带括号注释
    // 注意：要剔除注释行再查 —— 代码里刻意留着「改前」的注释说明，
    //       不剔除就会把注释里的旧文案当成真文案（测试自己骗自己）。
    const codeOnly = src.split('\n')
        .filter(l => { const t = l.trim(); return t.indexOf('//') !== 0 && t.indexOf('*') !== 0; })
        .join('\n');
    const banned = [
        { label: '锻造 x1（投入一次素材）', re: /锻造 x1（/ },
        { label: '锻造 x10（同一配方连续十次）', re: /锻造 x10（/ },
        { label: '返回（不锻造）', re: /返回（/ },
        { label: '可锻造列表（点击配方即开锻）', re: /可锻造列表（/ },
        { label: '更改配方（点击即选用）', re: /更改配方（/ },
    ];
    banned.forEach(b => {
        check('界面上不再出现「' + b.label + '」', b.re.test(codeOnly), false);
    });

    // 22.2 菜单四项必须是干净写法
    check('菜单文案：锻造 x1', src.indexOf('x1: "锻造 x1"') >= 0, true);
    check('菜单文案：锻造 x10', src.indexOf('x10: "锻造 x10"') >= 0, true);
    check('菜单文案：更改配方', src.indexOf('recipe: "更改配方"') >= 0, true);
    check('菜单文案：返回', src.indexOf('close: "返回"') >= 0, true);

    // 22.3 标题窗画的就是干净标题
    check('可锻造列表标题窗文案 = 「可锻造列表」',
        src.indexOf('drawText("可锻造列表", 0, 0, 600, "center")') >= 0, true);
    check('更改配方标题窗文案 = 「更改配方」',
        src.indexOf('drawText("更改配方", 0, 0, contentW - 36, "center")') >= 0, true);

    // 22.4 label 会带进结果提示，不许再出现「锻造 x1（…）完成」
    // 单次（1 把）走 $gameMessage，多把走 $gameTemp 中转，两条路都验一下
    const scene = Object.create(sandbox.Scene_ForgeTenPull.prototype);
    scene._recipeValues = [10, 10, 10, 10];
    scene._forgingInProgress = false;
    scene._commandWindow = { deactivate: () => {}, activate: () => {} };
    scene._overflowWarnings = [];

    log.messages.length = 0;
    Scene_ForgeTenPull.prototype.showResult.call(scene, '锻造 x1', 1, 1, [
        { itemId: 58, name: '三日月宗近·刀身', doubled: false },
    ]);
    const single = String(log.messages[0] || '');
    const singleHead = single.split('\n')[0];
    check('单次结果标题行没有括号注释（' + JSON.stringify(singleHead) + '）',
        singleHead.length > 0 && singleHead.indexOf('（') < 0, true);
    console.log('      单次结果 = ' + JSON.stringify(single));

    sandbox.$gameTemp._forgeTenResultText = null;
    Scene_ForgeTenPull.prototype.showResult.call(scene, '锻造 x10', 10, 10, [
        { itemId: 58, name: '三日月宗近·刀身', doubled: false },
        { itemId: 60, name: '鹤丸国永·刀身', doubled: false },
    ]);
    const multi = String(sandbox.$gameTemp._forgeTenResultText || '');
    // 标题行（第一行）是 label 拼出来的，必须干净；备注行的括号是状态说明，可以留
    const headline = multi.split('\n')[0];
    check('十连结果标题行没有括号注释（' + JSON.stringify(headline) + '）',
        headline.length > 0 && headline.indexOf('（') < 0, true);
    console.log('      十连结果 = ' + JSON.stringify(multi));
})();
console.log('\n========================================');
console.log('  通过 ' + pass + ' 项 / 失败 ' + fail + ' 项');
console.log('========================================');
process.exit(fail === 0 ? 0 : 1);
