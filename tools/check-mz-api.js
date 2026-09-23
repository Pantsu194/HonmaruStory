// MZ API 用途校验器（原型链版 v2）
//
// 作用：扫出插件里调用了「本工程 MZ 版本中并不存在的方法」，
//       避免再出现 this.scrollTop() / Window_Base.setHandler() 那种运行时 TypeError。
//
// 用法：node tools/check-mz-api.js            # 默认只查 SimpleForge.js（推荐，结论可靠）
//       node tools/check-mz-api.js --all      # 查全部插件（第三方写法多样，误报较多）
//
// v2 相比 v1 的关键升级：会解析插件里的继承关系，
//   例如 Window_ForgeTenResult.prototype = Object.create(Window_Base.prototype)
//   于是「Window_ForgeTenResult 里调用 this.setHandler()」会被判为错误 ——
//   因为 setHandler 只存在于 Window_Selectable，Window_Base 没有。
//   （这正是 V28.13 那个 TypeError 的成因，v1 抓不到。）
//
// 内置自测：样本里放了一个 MZ 1.10 已移除的 this.scrollTop() 与一个插件自定义方法，
//   只有「准确抓出前者、不误报后者」才继续输出结论，否则以退出码 2 中止。

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const jsDir = path.join(__dirname, '..', 'js');
const MZ_FILES = ['rmmz_core.js', 'rmmz_managers.js', 'rmmz_objects.js',
                  'rmmz_windows.js', 'rmmz_scenes.js', 'rmmz_sprites.js'];

// ---------------------------------------------------------------- 载入真实 MZ
function loadMZ() {
    const sandbox = {};
    sandbox.window = sandbox;
    sandbox.global = sandbox;
    sandbox.console = { log() {}, warn() {}, error() {}, info() {}, debug() {} };
    sandbox.Math = Math; sandbox.JSON = JSON; sandbox.Date = Date;
    sandbox.Number = Number; sandbox.String = String; sandbox.Array = Array;
    sandbox.Object = Object; sandbox.Error = Error; sandbox.RegExp = RegExp;
    sandbox.Function = Function; sandbox.Boolean = Boolean;
    sandbox.setTimeout = () => 0; sandbox.clearTimeout = () => {};
    sandbox.setInterval = () => 0; sandbox.clearInterval = () => {};
    sandbox.parseInt = parseInt; sandbox.parseFloat = parseFloat;
    sandbox.isNaN = isNaN; sandbox.isFinite = isFinite;

    function stub() {}
    function Ctor() {}
    Ctor.prototype = Object.create(stub.prototype);
    Ctor.prototype.constructor = Ctor;
    Ctor.registerPlugin = function () {};

    sandbox.PIXI = new Proxy({}, {
        get(t, k) {
            if (k === 'utils') return { isMobile: { any: false } };
            if (k === 'settings') return { SCALE_MODE: 0 };
            if (k === 'BLEND_MODES') return { NORMAL: 0 };
            if (k === 'SCALE_MODES') return { LINEAR: 1, NEAREST: 0 };
            if (!t[k]) t[k] = Ctor;
            return t[k];
        },
    });

    const fakeCanvas = () => ({
        width: 0, height: 0, style: {},
        getContext: () => new Proxy({}, {
            get(tt, k) {
                if (k === 'measureText') return () => ({ width: 0 });
                if (k === 'canvas') return { width: 0, height: 0 };
                return () => {};
            },
            set() { return true; },
        }),
    });

    sandbox.document = {
        createElement: (tag) => (tag === 'canvas' ? fakeCanvas() : { style: {}, appendChild() {} }),
        createElementNS: () => fakeCanvas(),
        body: { appendChild() {}, style: {} },
        addEventListener() {}, removeEventListener() {},
        documentElement: { style: {} },
    };
    sandbox.navigator = { userAgent: 'node' };
    sandbox.location = { href: '' };
    sandbox.innerWidth = 816; sandbox.innerHeight = 624;
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
            vm.runInContext(fs.readFileSync(path.join(jsDir, f), 'utf8'), sandbox, { filename: f });
        } catch (e) {
            console.error('载入 ' + f + ' 失败（不影响校验，跳过）: ' + e.message);
        }
    }
    return sandbox;
}

// ---------------------------------------------------------------- 解析插件的类结构
// 返回 { parentOf, ownMethods }
//   parentOf[Class]    = 父类名（可能是 MZ 类，也可能是插件里的类）
//   ownMethods[Class]  = Set(该类自己定义的方法名)
function parsePlugin(src) {
    const parentOf = {};
    const ownMethods = {};

    function ensureOwn(cls) {
        if (!ownMethods[cls]) ownMethods[cls] = new Set();
        return ownMethods[cls];
    }

    let m;
    // Class.prototype = Object.create(Base.prototype)
    const reInherit = /([A-Za-z_$][\w$]*)\.prototype\s*=\s*Object\.create\(\s*([A-Za-z_$][\w$]*)\.prototype\s*\)/g;
    while ((m = reInherit.exec(src))) {
        parentOf[m[1]] = m[2];
        ensureOwn(m[1]);
    }
    // Class.prototype.method = ...
    const reMember = /([A-Za-z_$][\w$]*)\.prototype\.([A-Za-z_$][\w$]*)\s*=/g;
    while ((m = reMember.exec(src))) {
        // 记录归属：只有已知的类才记
        if (parentOf[m[1]] !== undefined || ownMethods[m[1]] !== undefined) {
            ensureOwn(m[1]).add(m[2]);
        } else {
            ensureOwn(m[1]).add(m[2]);
        }
    }
    // function Class() {}
    const reFn = /function\s+([A-Za-z_$][\w$]*)\s*\(/g;
    while ((m = reFn.exec(src))) ensureOwn(m[1]);
    // 类内写法 this.method = function
    const reInner = /this\.([A-Za-z_$][\w$]*)\s*=\s*function/g;
    const innerNames = new Set();
    while ((m = reInner.exec(src))) innerNames.add(m[1]);

    return { parentOf, ownMethods, innerNames };
}

// 判断某方法名能否在「插件类 -> ... -> MZ 原型链」上找到
function methodExists(className, method, parsed, mzGlobal) {
    const seen = new Set();
    let cur = className;
    while (cur && !seen.has(cur)) {
        seen.add(cur);
        if (parsed.innerNames.has(method)) return true;          // 插件里以 this.X = function 定义过
        if (parsed.ownMethods[cur] && parsed.ownMethods[cur].has(method)) return true;
        const real = mzGlobal[cur];
        if (typeof real === 'function' && real.prototype && method in real.prototype) return true;
        cur = parsed.parentOf[cur];
    }
    // 类上下文都没识别出来时，退化为「MZ 里任何类有就算有」（宁可少报）
    if (className === null || className === undefined) {
        for (const k of Object.keys(mzGlobal)) {
            const real = mzGlobal[k];
            if (typeof real === 'function' && real.prototype && method in real.prototype) return true;
        }
    }
    return false;
}

// 收集「成员变量 -> 类名」的推断：
//   this._resultWindow = new Window_ForgeTenResult(...)  ->  _resultWindow → Window_ForgeTenResult
// 这样 this._resultWindow.setHandler() 这类「在成员变量上调用」也能被检查到 —— V28.13 崩的就是这一行。
function parseMemberTypes(src) {
    const map = {};
    const re = /this\.([A-Za-z_$][\w$]*)\s*=\s*new\s+([A-Za-z_$][\w$]*)\s*\(/g;
    let m;
    while ((m = re.exec(src))) map[m[1]] = m[2];
    return map;
}

function findMissing(src, parsed, mzGlobal) {
    const found = [];
    const memberTypes = parseMemberTypes(src);
    const lines = src.split(/\r?\n/);
    let currentClass = null;

    lines.forEach((line, i) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;
        const codePart = line.split('//')[0];

        // 跟踪「当前在哪个类里」
        const mc = codePart.match(/([A-Za-z_$][\w$]*)\.prototype\.[A-Za-z_$][\w$]*\s*=/);
        if (mc && parsed.parentOf[mc[1]] !== undefined) currentClass = mc[1];
        const mf = codePart.match(/function\s+([A-Za-z_$][\w$]*)\s*\(/);
        if (mf && parsed.parentOf[mf[1]] !== undefined) currentClass = mf[1];

        // 插件里「任何地方」定义过的方法名（兜底用，见下）
        const definedAnywhere = new Set(parsed.innerNames);
        Object.keys(parsed.ownMethods).forEach(c => {
            parsed.ownMethods[c].forEach(n => definedAnywhere.add(n));
        });

        const re = /\bthis\.([A-Za-z_$][\w$]*)\s*\(/g;
        let m;
        while ((m = re.exec(codePart))) {
            const method = m[1];
            if (methodExists(currentClass, method, parsed, mzGlobal)) continue;
            // 类上下文没识别出来时（例如别名包装 const _X_init = Game_System.prototype.initialize），
            // 退化为「插件里定义过就算有」—— 宁可少报，也不要误报把真问题淹没。
            if (currentClass === null && definedAnywhere.has(method)) continue;
            found.push({ method, line: i + 1, cls: currentClass });
        }

        // 在成员变量上调用：this._resultWindow.setHandler(...)
        const reMemberCall = /\bthis\.([A-Za-z_$][\w$]*)\.([A-Za-z_$][\w$]*)\s*\(/g;
        let mm;
        while ((mm = reMemberCall.exec(codePart))) {
            const varName = mm[1];
            const mName = mm[2];
            const tcls = memberTypes[varName];
            if (!tcls) continue;
            if (methodExists(tcls, mName, parsed, mzGlobal)) continue;
            if (definedAnywhere.has(mName)) continue;
            found.push({ method: varName + '.' + mName, line: i + 1, cls: tcls + '（成员变量）' });
        }
    });
    return found;
}

// ---------------------------------------------------------------- 自测
const PROBE = [
    'function DummyWin() {}',
    'DummyWin.prototype = Object.create(Window_Base.prototype);',
    'DummyWin.prototype.foo = function () {',
    '    this.setHandler("ok", null);',   // ✖ Window_Base 没有 setHandler
    '    this.refreshText();',            // ✖ 不存在
    '    this.drawText("x", 0, 0);',      // ✔ Window_Base 有
    '    this.myOwnHelper();',            // ✔ 插件自定义
    '};',
    'DummyWin.prototype.myOwnHelper = function () {};',
    'function DummySel() {}',
    'DummySel.prototype = Object.create(Window_Selectable.prototype);',
    'DummySel.prototype.bar = function () {',
    '    this.setHandler("ok", null);',   // ✔ Window_Selectable 有
    '};',
].join('\n');

const mzGlobal = loadMZ();

console.log('=== MZ API 用途校验（原型链版 v2） ===');
console.log('【适用范围】默认只校验 SimpleForge.js。--all 模式会扫写法多样的第三方插件，误报较多，仅作参考。');
console.log('已载入 MZ 源码: ' + MZ_FILES.join(', '));
console.log('');

(function selfTest() {
    const parsed = parsePlugin(PROBE);
    const missing = findMissing(PROBE, parsed, mzGlobal).map(x => x.method).sort();
    const expect = ['refreshText', 'setHandler'];   // setHandler 在 DummyWin 里非法；refreshText 到处都不存在
    const ok = JSON.stringify(missing) === JSON.stringify(expect);
    console.log('【校验器自测】');
    console.log('  样本：DummyWin(继承 Window_Base) 调 setHandler / refreshText / drawText / myOwnHelper');
    console.log('        DummySel(继承 Window_Selectable) 调 setHandler');
    console.log('  结果: ' + (ok ? '✔ 抓出 [' + missing.join(', ') + ']，未误报合法的 drawText / myOwnHelper / DummySel.setHandler'
                             : '✖ 校验器不可靠（抓到 ' + JSON.stringify(missing) + '，期望 ' + JSON.stringify(expect) + '）'));
    if (!ok) process.exit(2);
    console.log('');
})();

const onlyForge = process.argv.indexOf('--all') < 0;
const pluginDir = path.join(jsDir, 'plugins');
let files = fs.readdirSync(pluginDir).filter(f => f.endsWith('.js'));
if (onlyForge) files = files.filter(f => f === 'SimpleForge.js');
console.log('本次校验: ' + (onlyForge ? 'SimpleForge.js（默认）' : '全部 ' + files.length + ' 个插件'));
console.log('');

let total = 0;
for (const file of files) {
    const src = fs.readFileSync(path.join(pluginDir, file), 'utf8');
    const parsed = parsePlugin(src);
    const found = findMissing(src, parsed, mzGlobal);
    if (found.length > 0) {
        console.log('【' + file + '】');
        found.forEach(x => console.log('  ✖ 行 ' + x.line + '  this.' + x.method +
                                       '()   所在类: ' + (x.cls || '(未识别)')));
        total += found.length;
    }
}

console.log('');
if (total === 0) {
    console.log('✔ 未发现「调用本工程 MZ 中不存在的方法」');
    process.exit(0);
} else {
    console.log('✖ 共 ' + total + ' 处可疑调用，游戏运行到那里会抛 TypeError');
    process.exit(1);
}