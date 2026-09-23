//=============================================================================
// SortieGate.js  v1.2.0
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [v1.2.0] 出阵地图解锁门控：按「配置表 + 通关开关」重算出阵地图各地点的开放状态，含老存档一次性迁移
 * @author 野生本丸物语
 *
 * @help
 * ============================================================================
 * SortieGate v1.2.0  —  出阵地图解锁门控
 * ============================================================================
 * 【它解决什么问题】
 * GALV_MapTravelMZ（旅行场景）里每个地点的「能不能进」存在
 *   $gameSystem._travelMaps.maps[旅行地图ID].locations[地点名].enabled
 * 而插件的 createMap / setLocation 都是整条覆盖、新地点默认 enabled = true。
 * 所以只要重建顺序一变，解锁状态就会漂移。
 *
 * 本插件把「真相」搬到开关上：
 *   能不能进 = 配置表里选的「开启条件开关」是否 ON
 * 每次打开出阵地图前调用一次 refresh()，enabled 就会被重算成正确值。
 *
 * 【本插件不碰事件】
 *   它只读开关，不会自动改任何事件；
 *   「打完 BOSS 之后把哪个开关置 ON」由主人在事件里手动配置
 *   （位置清单见 docs/出阵地图-开关配置指南.md）。
 *
 * 【两个脚本调用（写在公共事件 CE8「出阵地图初始化」里）】
 *   SortieGate.migrate();   // 老存档一次性回填。★必须在任何 createMap 之前调用★
 *   SortieGate.refresh();   // 按配置表 + 开关重算全部 enabled（幂等，可反复调用）
 * 事件里实际写成带守卫的形式，插件万一被关掉也不会让事件报错：
 *   if (window.SortieGate) SortieGate.refresh();
 *
 * 【怎么配（插件管理器里，不用写 JSON）】
 *   「出阵地图配置」是一个结构化列表：
 *     每条 = 一张旅行地图（31 记忆选择层 / 32 维新的关卡层 / 48 江户的关卡层）
 *     展开后 = 该地图的「地点列表」，每个地点三格：
 *        地点名称       —— 必须和 CE8 里 setLocation 的名字一致
 *        开启条件开关   —— 下拉框选开关（不选 = 恒开）
 *        永不开放       —— 勾上就永远锁着（给还没做的区域占位用）
 *   地点在列表里的先后顺序 = 开放顺序的参考；实际条件就看「开启条件开关」选了谁。
 *
 * 【老存档迁移原理（严格前缀推断）】
 *   老存档的解锁状态必须是「同一张旅行地图里从前往后连续开着」才有意义，
 *   因为「第一关」在旧机制里是被 createMap 默认打开的（即便玩家根本进不去该区域），
 *   这种噪声不能当成"已通关"的证据。
 *   所以迁移只认「严格前缀」：第 1..k 个地点全部开着时，才认定前 k-1 个已通关，
 *   并把对应的开关置 ON（只增不减）。
 *
 * 【安全阀】
 *   配置表为空 / 解析失败时，refresh() 会直接返回、什么都不做，
 *   绝不会因为配置错误把出阵地图整个锁死。
 * ============================================================================
 *
 * @param basicSettings
 * @text --- 基础设置 ---
 * @default
 *
 * @param versionVar
 * @text 迁移版本变量
 * @parent basicSettings
 * @type variable
 * @default 1000
 * @desc 存放「数据版本」的变量，用于老存档一次性迁移。默认 1000「出阵地图-配置版本」。
 *
 * @param currentVersion
 * @text 当前数据版本
 * @parent basicSettings
 * @type number
 * @default 1
 * @desc 迁移目标版本。以后需要再迁移一次时，把这个数字 +1 即可。
 *
 * @param lockUnlisted
 * @text 未登记地点一律锁上
 * @parent basicSettings
 * @type boolean
 * @default true
 * @desc 配置表里没有登记的地点是否强制锁上（true=锁，漏登记能一眼发现）。
 *
 * @param Debug
 * @text 调试输出
 * @parent basicSettings
 * @type boolean
 * @default false
 *
 * @param gateConfig
 * @text --- 出阵地图配置 ---
 * @desc 每张旅行地图一条；展开后逐个配它的地点。
 * @type struct<GateMap>[]
 * @default []
 */

/*~struct~GateMap:
 * @param travelMap
 * @text 旅行地图ID
 * @desc 31 = 记忆（区域）选择层；32 = 维新的记忆的关卡层；48 = 江户的记忆的关卡层。
 * @type number
 * @default 31
 *
 * @param note
 * @text 备注
 * @desc 只是写给自己看的说明文字。
 * @type string
 * @default
 *
 * @param locations
 * @text 地点列表
 * @desc 这张旅行地图上的所有地点。
 * @type struct<GateLocation>[]
 * @default []
 */

/*~struct~GateLocation:
 * @param name
 * @text 地点名称
 * @desc 必须和第 8 号公共事件（出阵地图初始化）里 setLocation 的名字完全一致。
 * @type string
 * @default
 *
 * @param need
 * @text 开启条件开关
 * @desc 不选(0) = 恒开；选一个开关 = 该开关 ON 时才开放（通常选上一关的「已通关」开关）。
 * @type switch
 * @default 0
 *
 * @param lockAlways
 * @text 永不开放
 * @desc 勾上 = 这个地点永远锁着（给还没做的区域占位）。
 * @type boolean
 * @default false
 */

(() => {
    'use strict';

    const pluginName = 'SortieGate';
    const parameters = PluginManager.parameters(pluginName);
    const Debug = parameters['Debug'] === 'true';

    function log(...args) {
        if (Debug) console.log('[SortieGate]', ...args);
    }

    //-------------------------------------------------------------------------
    // 配置解析
    //   新格式（结构化参数）：[{travelMap, note, locations:[{name, need, lockAlways}]}]
    //     其中 locations 本身也是一串 JSON 字符串
    //   旧格式（兼容）：[{travelMap, name, need}]
    //-------------------------------------------------------------------------
    function parseGateConfig(raw) {
        const out = [];
        if (!raw) return out;
        let root;
        try {
            root = JSON.parse(raw);
        } catch (e) {
            console.error('[SortieGate] 配置表解析失败，请检查插件参数：', e);
            return out;
        }
        if (!Array.isArray(root)) root = [root];
        for (const item of root) {
            let node;
            try {
                node = (typeof item === 'string') ? JSON.parse(item) : item;
            } catch (e) {
                console.warn('[SortieGate] 跳过无法解析的条目：', item);
                continue;
            }
            if (!node) continue;

            const travelMap = Number(node.travelMap);

            if (node.locations !== undefined) {
                let locs;
                try {
                    locs = JSON.parse(node.locations || '[]');
                } catch (e) {
                    locs = [];
                }
                if (!Array.isArray(locs)) locs = [locs];
                for (const rawLoc of locs) {
                    let loc;
                    try {
                        loc = (typeof rawLoc === 'string') ? JSON.parse(rawLoc) : rawLoc;
                    } catch (e) {
                        continue;
                    }
                    if (!loc || !loc.name) continue;
                    const need = (String(loc.lockAlways) === 'true') ? -1 : Number(loc.need || 0);
                    out.push({ travelMap: travelMap, name: String(loc.name), need: need });
                }
                continue;
            }

            if (node.name) {
                out.push({ travelMap: travelMap, name: String(node.name), need: Number(node.need || 0) });
            }
        }
        return out.filter(g => !isNaN(g.travelMap) && g.name && !isNaN(g.need));
    }

    const GATE = parseGateConfig(parameters['gateConfig']);
    const VERSION_VAR = Number(parameters['versionVar'] || 1000);
    const CURRENT_VERSION = Number(parameters['currentVersion'] || 1);
    const LOCK_UNLISTED = parameters['lockUnlisted'] !== 'false';

    //-------------------------------------------------------------------------
    // 工具
    //-------------------------------------------------------------------------
    function travelMaps() {
        if (!$gameSystem || !$gameSystem._travelMaps) return null;
        return $gameSystem._travelMaps.maps || null;
    }

    function locOf(maps, entry) {
        const map = maps[entry.travelMap];
        if (!map) return null;
        return (map.locations || {})[entry.name] || null;
    }

    function needSatisfied(entry) {
        if (entry.need === 0) return true;
        if (entry.need < 0) return false;
        return $gameSwitches.value(entry.need) === true;
    }

    function gateByMap() {
        const out = new Map();
        for (const entry of GATE) {
            if (!out.has(entry.travelMap)) out.set(entry.travelMap, []);
            out.get(entry.travelMap).push(entry);
        }
        return out;
    }

    //-------------------------------------------------------------------------
    // 主对象
    //-------------------------------------------------------------------------
    const SortieGate = {
        config: GATE,
        versionVar: VERSION_VAR,
        currentVersion: CURRENT_VERSION,

        // 按配置表 + 开关重算所有地点的 enabled
        refresh() {
            if (!GATE.length) {
                console.error('[SortieGate] 配置表为空，refresh 已跳过（不会锁死任何地点）');
                return 0;
            }
            const maps = travelMaps();
            if (!maps) {
                console.warn('[SortieGate] 找不到 $gameSystem._travelMaps，请确认 GALV_MapTravelMZ 已加载');
                return 0;
            }
            let changed = 0;
            for (const entry of GATE) {
                const loc = locOf(maps, entry);
                if (!loc) {
                    console.warn('[SortieGate] 配置表里的地点不存在（旅行地图 ' +
                        entry.travelMap + ' / ' + entry.name + '），已跳过');
                    continue;
                }
                const want = needSatisfied(entry);
                if (loc.enabled !== want) changed++;
                loc.enabled = want;
            }
            if (LOCK_UNLISTED) {
                for (const id in maps) {
                    const locs = maps[id].locations || {};
                    for (const nm in locs) {
                        if (!GATE.some(g => g.travelMap === Number(id) && g.name === nm) && locs[nm].enabled) {
                            locs[nm].enabled = false;
                            changed++;
                        }
                    }
                }
            }
            log('refresh 完成，变动地点数 =', changed);
            return changed;
        },

        // 老存档一次性迁移：按「严格前缀」推断已通关的关卡，置对应的开关
        // ★ 必须在任何 createMap / setLocation 之前调用
        migrate() {
            const cur = $gameVariables.value(VERSION_VAR);
            if (cur >= CURRENT_VERSION) return 0;
            const maps = travelMaps();
            let filled = 0;
            if (maps && GATE.length) {
                gateByMap().forEach((list, travelMap) => {
                    if (!maps[travelMap]) return;
                    let k = 0;
                    while (k < list.length) {
                        const loc = locOf(maps, list[k]);
                        if (loc && loc.enabled) k++;
                        else break;
                    }
                    for (let j = 1; j < k; j++) {
                        const need = list[j].need;
                        if (need > 0 && !$gameSwitches.value(need)) {
                            $gameSwitches.setValue(need, true);
                            filled++;
                        }
                    }
                });
            }
            $gameVariables.setValue(VERSION_VAR, CURRENT_VERSION);
            log('migrate 完成：回填开关', filled, '个，数据版本 →', CURRENT_VERSION);
            return filled;
        },

        // 调试用：在控制台打印当前每个地点的开放状态
        report() {
            const maps = travelMaps();
            if (!maps) return '（无旅行地图数据）';
            const lines = [];
            for (const entry of GATE) {
                const loc = locOf(maps, entry);
                lines.push(
                    '旅行地图' + entry.travelMap + '  ' + entry.name +
                    '  need=' + entry.need +
                    (entry.need > 0 ? '(' + ($gameSwitches.value(entry.need) ? 'ON' : 'OFF') + ')' : '') +
                    '  → ' + (loc ? (loc.enabled ? '开' : '锁') : '地点不存在')
                );
            }
            console.log('[SortieGate] 当前状态：\n' + lines.join('\n'));
            return lines;
        }
    };

    window.SortieGate = SortieGate;
    log('插件已加载，配置表条目数 =', GATE.length);
})();
