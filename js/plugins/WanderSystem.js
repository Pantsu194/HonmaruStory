/*:
 * @target MZ
 * @plugindesc [散步系统] v1.3 - 下午时段刀男外出散步 + 可交互对话
 * @author Codex
 *
  * @param dialogueWeight
 * @text 有对话角色的权重
 * @desc 有该地图对话配置的角色被选中的权重（无对话角色权重为1）。默认3.0即3倍。
 * @type number
 * @min 1.0
 * @max 10.0
 * @default 3.0
 *
 * @param pairChance
 * @text 配对触发概率(%)
 * @desc 同pair_group的角色被分配到同一地图时，配对触发的概率。默认80。
 * @type number
 * @min 0
 * @max 100
 * @default 80
 *
  * @param wanderMapIds
 * @text 散步地图ID列表
 * @desc 允许散步的本丸地图ID，逗号分隔。分配时所有地图平等参与抽签。
 * @type number[]
 * @default [2,3,4,7,11,13,19]
 *
 * @help
 * ============================================================================
 * 【散步系统 v1.2】
 * ============================================================================
 *
 * 功能：下午时段（Var[7] >= 2）随机派出本丸待命（State=1）的刀男到各地图散步。
 * 散步中的刀男可交互对话，对话数据由外部 Excel（WanderDialogues.xlsx）管理。
 *
 * -------- 使用流程 --------
 *
 * 一、准备工作
 * 1. 在每张允许散步的地图放置 1~3 个"散步插槽"事件
 * 2. 每个插槽事件设置两个页：
 *    - 第1页（默认）：无行走图，无触发，无执行内容，条件无
 *      （此页会在非下午时段显示，插槽不可见）
 *    - 第2页：条件 Variable[7] >= 2，无行走图，触发=确定键
 *      执行内容：
 *        脚本：WanderSystem.updateSlot(this, 0);
 *        注释：0=槽位序号，同一地图内从0开始编号，不可重复
 * 3. 插槽事件的移动路线设置为"随机移动"
 *
 * 二、触发散步
 * 进入下午时段时，在公共事件中调用：
 *   插件命令：WanderSystem assign
 * （建议放在 CE16「吃午餐事件」中 Var[7]=2 之后）
 *
 * 三、结束散步
 * 退出下午时段时调用：
 *   插件命令：WanderSystem clear
 * （建议放在 CE17「吃晚餐事件」中或 CE18「过夜」中）
 *
 * 四、对话交互（插槽事件的动作键触发页内）
 *   注释：// 获取当前插槽分配的角色ID
 *   脚本：var actorId = WanderSystem.getSlotActor(this);
 *   插件命令：WanderSystem initTalk \V[3] $gameMap.mapId()
 *   （或直接用事件命令写死 actorId 和 mapId）
 *   循环开始
 *     插件命令：WanderSystem checkNext 58
 *     条件分支：开关58 = ON
 *       插件命令：WanderSystem next 94 95
 *       文章：\V[94]
 *       文章：\V[95]
 *       插件命令：WanderSystem showChoices
 *       跳转标签：循环开始
 *     分支结束
 *   重复以上
 *
 * 四·补充、通用保底对话（map_id = 0）
 *   需求：刀男被分配到「自己没有写专属对话的地图」时，不再只会说占位台词。
 *   做法：在对话数据里为每个角色写一组 map_id = 0 的行，作为全地图通用的默认台词。
 *   优先级：该角色在当前地图的专属对话  >  map_id = 0 通用对话  >  事件页内的兜底文本
 *   注意：通用对话【不参与】分配权重判定，三级池（本图专属 > 无专属 > 他图专属）不变，
 *         因此不会影响各地图的专属台词保护策略。
 *   数据源：WanderDialogues.xlsx（每个刀剑男子一页）的 map_id 列填 0，
 *           保存后双击「散步对话用这个导出.bat」生成 data/WanderDialogues.json。
 *
 * 五、状态变量说明
 * - 散步中的刀男状态变量（ActorId+100）会被临时设为 5
 * - 房间事件页条件是 Var==1、Var==2、Var==3、Var==4，5 不匹配任何页 -> 自动隐藏
 * - 散步结束后自动恢复为 1
 * - 对其他系统影响：State=5 的刀男不会被内番/远征系统选中
 *
 * 六、读档与存档行为
 * - 分配表会同步写入 $gameSystem._wanderAssignments，随存档一起保存。
 * - 【下午存档 -> 读档】：沿用存档里的同一批散步角色，
 *   同一天内反复读档也不会换人。
 * - 其他时段存档 -> 读档：散步早已结束（clear 会作废分配表），不受影响。
 * - 旧存档没有该字段：自动按「重新分配」处理，不会报错。
 * - 读档后若某条分配里的角色状态已不是 5（例如转去内番/远征），该条作废；
 *   若整张表都失效，则退回随机重新分配，并清理孤儿 State=5。
 *
 * -------- 七、角色 ID 扫描上限（v1.3） --------
 * 角色扫描范围原为写死的 3~200，导致 ID > 200 的刀男（如 212 笹贯、248 三郎国宗）
 * 永远进不了散步候选池，自然也不会被派出去散步。
 * v1.3 起改为动态上限（$dataActors.length - 1），新增刀男无需再改插件。
 *
 * ============================================================================
 *
 * @command assign
 * @text 分配散步NPC
 * @desc 扫描所有State=1的刀男，随机分配至当前地图的散步插槽。调用前确保插槽已注册。
 *
 * @command clear
 * @text 清除散步NPC
 * @desc 停止所有散步，将刀男状态恢复为1，清理插槽。
 *
 * @command initTalk
 * @text 1.初始化散步对话
 * @desc 准备指定角色在当前地图的散步对话数据。
 * @arg actorId
 * @text 角色ID
 * @type number
 * @arg mapId
 * @text 地图ID
 * @type number
 *
 * @command checkNext
 * @text 2.检查还有下一句吗
 * @desc 将结果写入指定开关。ON=还有对话，OFF=对话结束。
 * @arg switchId
 * @text 结果开关ID
 * @type switch
 *
 * @command next
 * @text 3.读取下一句
 * @desc 读取对话的下一行，写入名字和文本变量。
 * @arg nameVarId
 * @text 名字变量ID
 * @type variable
 * @arg textVarId
 * @text 文本变量ID
 * @type variable
 *
 * @command showChoices
 * @text 4.显示选项窗口
 * @desc 如果对话中包含CHOICE行，显示选项并处理跳转。
 */

(() => {
    const PLUGIN_NAME = "WanderSystem";
    const PARAMS = PluginManager.parameters(PLUGIN_NAME);
    const WANDER_STATE = 5;
    const AFTERNOON_TIME = 2;
    // 通用保底对话的地图标识：数据行 map_id = 0 表示「任何地图都能用的默认台词」。
    // 只有当该角色在【当前地图】没有专属对话行时，initTalk 才回退读取它。
    const COMMON_MAP_ID = 0;
    const DIALOGUE_WEIGHT = parseFloat(PARAMS["dialogueWeight"] || "3.0");
    const PAIR_CHANCE = parseFloat(PARAMS["pairChance"] || "80");
    // 角色 ID 扫描下限：1=审神者、2 为空槽，刀男从 3 号起
    const ACTOR_ID_MIN = 3;

    // =========================================================================
    // 0. 数据结构
    // =========================================================================
    window.WanderSystem = window.WanderSystem || {};
    const WS = window.WanderSystem;

    // 全局散步分配表: { mapId: { slotIndex: actorId } }
    WS._assignments = {};
    // 插槽注册表: { mapId: { slotIndex: eventId } }
    WS._slotMap = {};
    // 对话队列
    WS._queue = [];
    // 保底清理：读档后残留的 State=5 变量
    WS._pendingSweep = true;
    // 日期代际追踪：同一代际内不更换分配
    WS._generation = 0;
    WS._mapGeneration = {};  // { mapId: generation }
    WS._prevTime = -1;       // 上一次的 Var[7] 值
    // 刀帐位置/导航原始值缓存：{ actorId: { mapId, eventId } }
    WS._originalLocations = {};
    // 角色 ID 扫描上限：动态跟随 Actors.json 的真实规模（长度 - 1）。
    // v1.3 修正：此前写死 200，导致 ID > 200 的刀男（212 笹贯 / 248 三郎国宗）
    // 永远进不了候选池、卡在 State=5 时也不会被兜底清理。
    WS._actorIdMax = function() {
        if (typeof $dataActors !== 'undefined' && $dataActors && $dataActors.length > 0) {
            return $dataActors.length - 1;
        }
        return 299;
    };
    // 散步目标地图 -> Map2 上对应门事件的映射（散步时更新刀帐导航用）
    WS._doorMap = {
        3: 1, 4: 4, 5: 7, 6: 8, 7: 9, 8: 10, 9: 11,
        10: 12, 11: 13, 12: 16, 13: 17, 14: 18, 15: 29,
        16: 41, 17: 43, 18: 54, 19: 56, 22: 62,
        25: 65, 26: 67, 27: 69, 29: 71, 30: 72
    };


    // =========================================================================
    // 1. 数据加载（WanderDialogues.json）
    // =========================================================================
    window.$dataWanderDialogues = null;

    const _DataManager_loadDatabase = DataManager.loadDatabase;
    DataManager.loadDatabase = function() {
        _DataManager_loadDatabase.call(this);
        this.loadDataFile('$dataWanderDialogues', 'WanderDialogues.json');
    };

    // =========================================================================
    // 2. 核心：分配散步
    // =========================================================================

    // 从 $dataMap 的事件备注中扫描 <WanderSlot:N> 注册槽位
    // 预扫描所有地图的插槽信息（启动时执行一次，用于预分配）
    WS._allMapSlots = {};
    WS._initAllMapSlots = function() {
        this._allMapSlots = {};
        try {
            var fs = require("fs");
            var path = require("path");
            var dataDir = path.join(process.cwd(), "data");
            var files = fs.readdirSync(dataDir);
            var mapRe = /^Map(\d+)\.json$/;
            for (var f = 0; f < files.length; f++) {
                var m = files[f].match(mapRe);
                if (!m) continue;
                var mapId = parseInt(m[1]);
                var raw = fs.readFileSync(path.join(dataDir, files[f]), "utf8");
                var mapData = JSON.parse(raw);
                var slots = {};
                if (mapData && mapData.events) {
                    for (var e = 0; e < mapData.events.length; e++) {
                        var ev = mapData.events[e];
                        if (!ev || !ev.note) continue;
                        var sm = ev.note.match(/<WanderSlot:(\d+)>/);
                        if (sm) {
                            var slotIdx = parseInt(sm[1]);
                            slots[slotIdx] = ev.id;
                            // 读取配对标签
                            var pm = ev.note.match(/<WanderPair:(\w+)>/);
                            if (pm) {
                                if (!this._pairSlots) this._pairSlots = {};
                                if (!this._pairSlots[mapId]) this._pairSlots[mapId] = {};
                                if (!this._pairSlots[mapId][pm[1]]) this._pairSlots[mapId][pm[1]] = [];
                                this._pairSlots[mapId][pm[1]].push(slotIdx);
                            }
                        }
                    }
                }
                if (Object.keys(slots).length > 0) {
                    this._allMapSlots[mapId] = slots;
                }
            }
            var mapIds = Object.keys(this._allMapSlots);
            console.log("[WanderSystem] Pre-scanned " + mapIds.length + " wander maps: " + mapIds.join(", "));
        } catch(e) {
            console.warn("[WanderSystem] Pre-scan failed: " + e.message);
        }
    };
    WS._initAllMapSlots();

    WS._scanSlots = function() {
        const mapId = $gameMap.mapId();
        this._slotMap[mapId] = {};
        if (!$dataMap || !$dataMap.events) return;
        for (const ev of $dataMap.events) {
            if (!ev || !ev.note) continue;
            const match = ev.note.match(/<WanderSlot:(\d+)>/);
            if (match) {
                const slotIndex = parseInt(match[1]);
                this._slotMap[mapId][slotIndex] = ev.id;
                // 读取配对标签
                const pm = ev.note.match(/<WanderPair:(\w+)>/);
                if (pm) {
                    if (!this._pairSlots) this._pairSlots = {};
                    if (!this._pairSlots[mapId]) this._pairSlots[mapId] = {};
                    if (!this._pairSlots[mapId][pm[1]]) this._pairSlots[mapId][pm[1]] = [];
                    if (this._pairSlots[mapId][pm[1]].indexOf(slotIndex) < 0) {
                        this._pairSlots[mapId][pm[1]].push(slotIndex);
                    }
                }
            }
        }
    };

    // 检查角色在当前地图是否有对话配置
    WS._actorHasDialogue = function(actorId, mapId) {
        this._ensureDialoguesLoaded();
        if (!$dataWanderDialogues) return false;
        for (let i = 0; i < $dataWanderDialogues.length; i++) {
            const row = $dataWanderDialogues[i];
            if (String(row.actor_id || "").trim() === String(actorId).trim() &&
                String(row.map_id || "").trim() === String(mapId).trim()) {
                return true;
            }
        }
        return false;
    };

    // 加权随机选取（不重复）
    // 检查角色在任意地图是否有对话配置（用于反向保护：有专属地图的角色不应被无对话地图抢走）
    WS._actorHasAnyDialogue = function(actorId) {
        if (!$dataWanderDialogues) return false;
        for (let i = 0; i < $dataWanderDialogues.length; i++) {
            const row = $dataWanderDialogues[i];
            if (String(row.actor_id || "").trim() !== String(actorId).trim()) continue;
            // map_id = 0 是「通用保底台词」，不代表该角色的专属地图归属，
            // 因此不计入三级池判定，避免分配策略被通用台词改变。
            if (Number(row.map_id) === COMMON_MAP_ID) continue;
            return true;
        }
        return false;
    };

    WS._getPairMembers = function(actorId, mapId) {
        this._ensureDialoguesLoaded();
        if (!$dataWanderDialogues) return [];
        var pairGroup = null;
        for (var i = 0; i < $dataWanderDialogues.length; i++) {
            var row = $dataWanderDialogues[i];
            if (String(row.actor_id || "").trim() === String(actorId).trim() &&
                String(row.map_id || "").trim() === String(mapId).trim() &&
                row.pair_group) {
                pairGroup = String(row.pair_group).trim();
                break;
            }
        }
        if (!pairGroup) return [];
        var members = [];
        for (var i = 0; i < $dataWanderDialogues.length; i++) {
            var row = $dataWanderDialogues[i];
            var rowActorId = Number(row.actor_id);
            if (rowActorId !== actorId &&
                String(row.map_id || "").trim() === String(mapId).trim() &&
                String(row.pair_group || "").trim() === pairGroup &&
                members.indexOf(rowActorId) < 0) {
                members.push(rowActorId);
            }
        }
        return members;
    };

    WS._weightedPick = function(candidates, count, mapId) {
        // mapId 为 null 时不做权重区分
        if (mapId === null) {
            const shuffled = candidates.slice().sort(() => Math.random() - 0.5);
            return shuffled.slice(0, Math.min(count, shuffled.length));
        }

        // 三级分级池：优先匹配 > 无归属 > 其他地图专属（保护）
        var tier1 = [];  // 此地图有对话
        var tier2 = [];  // 无任何地图有对话
        var tier3 = [];  // 其他地图有对话

        for (var k = 0; k < candidates.length; k++) {
            var aid = candidates[k];
            if (this._actorHasDialogue(aid, mapId)) {
                tier1.push(aid);
            } else if (this._actorHasAnyDialogue(aid)) {
                tier3.push(aid);
            } else {
                tier2.push(aid);
            }
        }

        // 洗牌各层
        var shuffle = function(arr) { return arr.sort(function() { return Math.random() - 0.5; }); };
        tier1 = shuffle(tier1);
        tier2 = shuffle(tier2);
        tier3 = shuffle(tier3);

        // 按优先级合并：Tier1 全部 > Tier2 全部 > Tier3 全部
        var merged = tier1.concat(tier2).concat(tier3);
        return merged.slice(0, Math.min(count, merged.length));
    };

    // 保存并更新刀帐位置/导航
    WS._saveAndUpdateToucho = function(actorId, mapId, slotEventId) {
        const actor = $gameActors.actor(actorId);
        if (!actor) return;
        // 保存原始值（仅首次）
        if (!this._originalLocations[actorId]) {
            this._originalLocations[actorId] = {
                mapId: actor.touchoMapId(),
                eventId: actor.touchoEventId()
            };
        }
        // 更新位置为散步所在的地图
        actor.setTouchoMapId(mapId);
        // 导航：如果在Map2散步 -> 指向散步插槽事件；否则 -> 指向Map2上该地图的门
        if (mapId === 2) {
            actor.setTouchoEventId(slotEventId);
        } else {
            const doorEventId = this._doorMap[mapId] || 0;
            if (doorEventId > 0) {
                actor.setTouchoEventId(doorEventId);
            }
        }
    };

    // 恢复刀帐位置/导航到原始值
    WS._restoreToucho = function(actorId) {
        const original = this._originalLocations[actorId];
        if (!original) return;
        const actor = $gameActors.actor(actorId);
        if (actor) {
            actor.setTouchoMapId(original.mapId);
            actor.setTouchoEventId(original.eventId);
        }
        delete this._originalLocations[actorId];
    };

    // -------------------------------------------------------------------------
    // 分配表持久化：_assignments 是插件运行时数据，本身不入档，
    // 因此把它同步一份到 $gameSystem（该对象随存档保存）。
    // 目的：同一天内反复读档，散步角色不会重新随机。
    // -------------------------------------------------------------------------
    WS._persistAssignments = function() {
        if (typeof $gameSystem === 'undefined' || !$gameSystem) return;
        const has = this._assignments && Object.keys(this._assignments).length > 0;
        $gameSystem._wanderAssignments = has ? this._assignments : null;
    };

    // 读档后接管存档里的分配表。
    // 返回 true 表示接管成功（此时【不要】清理 State=5，那批刀男确实是散步中）；
    // 返回 false 表示存档没有可用分配，调用方应清理孤儿散步状态。
    WS._adoptSavedAssignments = function() {
        const saved = (typeof $gameSystem !== 'undefined' && $gameSystem &&
                       $gameSystem._wanderAssignments) ? $gameSystem._wanderAssignments : null;
        if (!saved) {
            this._sweepStaleWanders();
            return false;
        }

        // 逐条校验：角色必须仍存在，且状态确实还是「散步」(5)。
        // 存档被外部手段改过、或角色已转内番/远征时，该记录作废。
        const restored = {};
        let total = 0;
        for (const mapId in saved) {
            const mapAssign = saved[mapId] || {};
            for (const sidx in mapAssign) {
                const actorId = mapAssign[sidx];
                if (!actorId) continue;
                if (!$gameActors.actor(actorId)) continue;
                if ($gameVariables.value(actorId + 100) !== WANDER_STATE) continue;
                if (!restored[mapId]) restored[mapId] = {};
                restored[mapId][sidx] = actorId;
                total++;
            }
        }

        if (total === 0) {
            // 存档分配已全部失效 -> 按孤儿处理
            this._assignments = {};
            this._persistAssignments();
            this._sweepStaleWanders();
            return false;
        }

        this._assignments = restored;
        console.log("[WanderSystem] Restored " + total + " wander assignment(s) from save");
        return true;
    };

    // 全局候选池：下午开始时洗牌一次，各地图从中顺序取用
    WS._globalPool = [];
    WS._poolUsed = 0;

    WS._buildGlobalPool = function() {
        const idleActors = [];
        const maxActorId = this._actorIdMax();
        for (let i = ACTOR_ID_MIN; i <= maxActorId; i++) {
            const actor = $gameActors.actor(i);
            if (!actor) continue;
            const state = $gameVariables.value(i + 100);
            if (state === 1) {
                idleActors.push(i);
            }
        }
        this._globalPool = idleActors.sort(() => Math.random() - 0.5);
        this._poolUsed = 0;
        this._sweepStaleWanders();
    };

    // 从全局剩余池中按对话权重抽取（不重复）
    WS._pullFromPool = function(count, mapId) {
        // 收集池中仍为 State=1 的候选
        const candidates = [];
        for (let i = this._poolUsed; i < this._globalPool.length; i++) {
            const aid = this._globalPool[i];
            if ($gameVariables.value(aid + 100) === 1) {
                candidates.push(aid);
            }
        }
        if (candidates.length === 0) return [];

        // 移除"已被使用"的部分，只保留候选
        this._globalPool = candidates;
        this._poolUsed = 0;

        const toPick = Math.min(count, candidates.length);
        const picked = this._weightedPick(candidates, toPick, mapId);

        // 标记为已占用，从池中移除
        for (let p = 0; p < picked.length; p++) {
            $gameVariables.setValue(picked[p] + 100, WANDER_STATE);
            const idx = this._globalPool.indexOf(picked[p]);
            if (idx >= 0) {
                this._globalPool.splice(idx, 1);
            }
        }
        return picked;
    };

    // 下午开始时一次性预分配所有地图
    WS._preAssignAll = function() {
        var mapIds = Object.keys(this._allMapSlots);
        for (var m = 0; m < mapIds.length; m++) {
            var mapId = Number(mapIds[m]);
            var slots = this._allMapSlots[mapId];
            var slotKeys = Object.keys(slots).sort(function(a,b){ return Number(a)-Number(b); });
            var totalSlots = slotKeys.length;
            if (totalSlots === 0) continue;

            if (!this._assignments[mapId]) this._assignments[mapId] = {};
            var mapAssign = this._assignments[mapId];

            // Step 1: 构建候选池（仍按三级分级）
            var tier1 = [], tier2 = [], tier3 = [];
            for (var i = 0; i < this._globalPool.length; i++) {
                var aid = this._globalPool[i];
                if ($gameVariables.value(aid + 100) !== 1) continue;
                if (this._actorHasDialogue(aid, mapId)) {
                    tier1.push(aid);
                } else if (this._actorHasAnyDialogue(aid)) {
                    tier3.push(aid);
                } else {
                    tier2.push(aid);
                }
            }
            var shuffle = function(arr) { return arr.sort(function() { return Math.random() - 0.5; }); };
            tier1 = shuffle(tier1);
            tier2 = shuffle(tier2);
            tier3 = shuffle(tier3);

            // Step 2: 先决定哪些 pair_group 触发（骰子 + 检查成员可用性）
            var triggeredPairs = []; // [{ main, members, pairGroup }]
            var pairedActorIds = {};  // 已被锁定为配对成员的角色
            var processedPairs = {};  // 避免同一 pair_group 重复处理
            
            for (var t = 0; t < tier1.length; t++) {
                var aid = tier1[t];
                if (pairedActorIds[aid]) continue;
                var members = this._getPairMembers(aid, mapId);
                if (members.length === 0) continue;
                
                // 找到 pair_group 名
                var pg = null;
                for (var d = 0; d < $dataWanderDialogues.length; d++) {
                    var dr = $dataWanderDialogues[d];
                    if (String(dr.actor_id || "").trim() === String(aid).trim() &&
                        String(dr.map_id || "").trim() === String(mapId).trim() &&
                        dr.pair_group) {
                        pg = String(dr.pair_group).trim();
                        break;
                    }
                }
                if (!pg || processedPairs[pg]) continue;
                processedPairs[pg] = true;
                
                // 骰子
                if (Math.random() * 100 >= PAIR_CHANCE) continue;
                
                // 收集该 pair_group 的所有成员（从 tier1 中）
                var groupMembers = [aid];
                for (var m2 = 0; m2 < members.length; m2++) {
                    if (tier1.indexOf(members[m2]) >= 0 && groupMembers.indexOf(members[m2]) < 0) {
                        groupMembers.push(members[m2]);
                    }
                }
                
                // 全组成员必须在全局池中且状态为1
                var allAvailable = true;
                for (var g = 0; g < groupMembers.length; g++) {
                    if ($gameVariables.value(groupMembers[g] + 100) !== 1 || this._globalPool.indexOf(groupMembers[g]) < 0) {
                        allAvailable = false;
                        break;
                    }
                }
                if (!allAvailable) continue;
                
                // 触发！
                triggeredPairs.push({ members: groupMembers, pairGroup: pg });
                for (var g = 0; g < groupMembers.length; g++) {
                    pairedActorIds[groupMembers[g]] = true;
                }
            }

            // Step 3: 分配插槽
            var slotAssign = {}; // slotIndex -> actorId
            var usedSlots = {};
            var pairSlots = (this._pairSlots && this._pairSlots[mapId]) ? this._pairSlots[mapId] : {};
            
            // 先放配对组（优先标记插槽）
            for (var tp = 0; tp < triggeredPairs.length; tp++) {
                var grp = triggeredPairs[tp];
                var tagged = pairSlots[grp.pairGroup] ? pairSlots[grp.pairGroup].slice().sort(function(a,b){return a-b;}) : [];
                
                // 先尝试放入标记插槽
                var ti = 0;
                for (var g = 0; g < grp.members.length; g++) {
                    // 找标记空位
                    while (ti < tagged.length && usedSlots[tagged[ti]]) ti++;
                    if (ti < tagged.length) {
                        slotAssign[tagged[ti]] = grp.members[g];
                        usedSlots[tagged[ti]] = true;
                        ti++;
                    }
                }
                // 标记位不够 → 放普通空位
                for (var g = 0; g < grp.members.length; g++) {
                    if (Object.values(slotAssign).indexOf(grp.members[g]) >= 0) continue;
                    for (var sk = 0; sk < slotKeys.length; sk++) {
                        if (!usedSlots[slotKeys[sk]]) {
                            slotAssign[slotKeys[sk]] = grp.members[g];
                            usedSlots[slotKeys[sk]] = true;
                            break;
                        }
                    }
                }
            }
            
            // 再放非配对角色（按 Tier1>Tier2>Tier3 顺序，跳过已被配对的）
            var remaining = tier1.concat(tier2).concat(tier3);
            var ri = 0;
            for (var sk = 0; sk < slotKeys.length; sk++) {
                if (usedSlots[slotKeys[sk]]) continue;
                // 跳过已被配对占用的角色
                while (ri < remaining.length && pairedActorIds[remaining[ri]]) ri++;
                if (ri >= remaining.length) break;
                slotAssign[slotKeys[sk]] = remaining[ri];
                usedSlots[slotKeys[sk]] = true;
                ri++;
            }

            // Step 4: 写入并标记状态
            for (var sk = 0; sk < slotKeys.length; sk++) {
                var sidx = slotKeys[sk];
                var actorId = slotAssign[Number(sidx)] || 0;
                if (actorId > 0) {
                    mapAssign[sidx] = actorId;
                    $gameVariables.setValue(actorId + 100, 5);
                    var gidx = this._globalPool.indexOf(actorId);
                    if (gidx >= 0) this._globalPool.splice(gidx, 1);
                    var slotEventId = slots[sidx] || 0;
                    this._saveAndUpdateToucho(actorId, mapId, slotEventId);
                } else {
                    delete mapAssign[sidx];
                }
            }
            
            this._mapGeneration[mapId] = this._generation;
        }

        // 分配结果同步进存档，读档后据此恢复同一批散步角色，而不是重新抽签
        this._persistAssignments();
    };

    WS.assignWanders = function() {
        const currentMapId = $gameMap.mapId();
        if ($gameVariables.value(7) !== AFTERNOON_TIME) return;

        this._scanSlots();

        const slots = this._slotMap[currentMapId];
        if (!slots) return;
        const slotKeys = Object.keys(slots);
        if (slotKeys.length === 0) return;

        // 仅刷新外观（分配已在 _preAssignAll 中完成）
        const mapAssign = this._assignments[currentMapId] || {};
        for (let j = 0; j < slotKeys.length; j++) {
            const sidx = slotKeys[j];
            const actorId = mapAssign[sidx] || 0;
            this._refreshSlotEvent(currentMapId, Number(sidx), actorId);
        }
    };

    // 仅重新应用精灵（不改变分配）
    WS._reapplySprites = function(mapId) {
        const slots = this._slotMap[mapId];
        const mapAssign = this._assignments[mapId];
        if (!slots || !mapAssign) return;
        for (const sidx in slots) {
            const actorId = mapAssign[sidx] || 0;
            this._refreshSlotEvent(mapId, Number(sidx), actorId);
        }
    };

    // =========================================================================
    // 3. 清除散步
    // =========================================================================
    // 保底清理：扫描所有角色，将任何卡在 State=5 的变量重置为 1
    WS._sweepStaleWanders = function() {
        var swept = 0;
        var maxActorId = this._actorIdMax();
        for (var i = ACTOR_ID_MIN; i <= maxActorId; i++) {
            if ($gameActors.actor(i) && $gameVariables.value(i + 100) === 5) {
                $gameVariables.setValue(i + 100, 1);
                this._restoreToucho(i);
                swept++;
            }
        }
        if (swept > 0) {
            console.warn("[WanderSystem] Swept " + swept + " stale wander state(s) to 1");
            // 这批角色的状态已被清成「本丸待命」，分配表随之作废（内存 + 存档）
            this._assignments = {};
            this._persistAssignments();
        }
        return swept;
    };

    WS.clearWanders = function() {
        for (const mapId in this._assignments) {
            const mapAssign = this._assignments[mapId];
            for (const sidx in mapAssign) {
                const actorId = mapAssign[sidx];
                if (actorId > 0) {
                    // 恢复状态为 1（本丸待命）
                    $gameVariables.setValue(actorId + 100, 1);
                    this._restoreToucho(actorId);
                }
                // 清除插槽外观（仅当前地图可见）
                if (Number(mapId) === $gameMap.mapId()) {
                    this._refreshSlotEvent(Number(mapId), Number(sidx), 0);
                }
            }
        }
        this._assignments = {};
        this._slotMap = {};
        this._mapGeneration = {};
        this._prevTime = -1;
        this._globalPool = [];
        this._poolUsed = 0;
        // 散步已结束 -> 存档里的分配表必须一并作废，
        // 否则下一个下午读档时会恢复出一批「其实并不在散步」的角色。
        this._persistAssignments();
        this._sweepStaleWanders();
    };

    // =========================================================================
    // 4. 插槽事件：注册与刷新
    // =========================================================================

    // 插槽事件在并行页中调用此函数来注册自己并更新外观
    // interpreter: 从事件的脚本命令传入 this
    // slotIndex: 槽位编号（同一地图内从0开始）
    WS.updateSlot = function(interpreter, slotIndex) {
        const eventId = (interpreter && interpreter._eventId) ? interpreter._eventId : 0;
        if (!eventId) return;

        const mapId = $gameMap.mapId();
        const sidx = Number(slotIndex) || 0;

        // 注册插槽
        if (!this._slotMap[mapId]) {
            this._slotMap[mapId] = {};
        }
        this._slotMap[mapId][sidx] = eventId;

        // 检查是否有分配的角色
        const mapAssign = this._assignments[mapId];
        const actorId = (mapAssign && mapAssign[sidx]) ? mapAssign[sidx] : 0;

        if (actorId > 0) {
            const actor = $gameActors.actor(actorId);
            if (actor) {
                const event = $gameMap.event(eventId);
                if (event) {
                    event.setImage(actor.characterName(), actor.characterIndex());
                    event.setTransparent(false);
                }
            }
        }
    };

    // 内部刷新某槽位的外观
    WS._refreshSlotEvent = function(mapId, slotIndex, actorId) {
        const slots = this._slotMap[mapId];
        if (!slots) return;

        const eventId = slots[slotIndex];
        if (!eventId) return;

        if (mapId !== $gameMap.mapId()) return; // 不同地图不刷新

        const event = $gameMap.event(eventId);
        if (!event) return;

        if (actorId > 0) {
            const actor = $gameActors.actor(actorId);
            if (actor) {
                event.setImage(actor.characterName(), actor.characterIndex());
                event.setTransparent(false);
            }
        } else {
            event.setImage('', 0);
            event.setTransparent(true);
        }
    };

    // =========================================================================
    // 5. 获取插槽对应的角色ID（供对话事件使用）
    // =========================================================================
    WS.getSlotActor = function(interpreter) {
        const eventId = (interpreter && interpreter._eventId) ? interpreter._eventId : 0;
        if (!eventId) return 0;

        const mapId = $gameMap.mapId();
        const slots = this._slotMap[mapId];
        if (!slots) return 0;

        for (const sidx in slots) {
            if (slots[sidx] === eventId) {
                const mapAssign = this._assignments[mapId];
                return (mapAssign && mapAssign[sidx]) ? mapAssign[sidx] : 0;
            }
        }
        return 0;
    };

    // =========================================================================
    // 6. 对话系统（与 NightSystem_Excel 相同的调用模式）
    // =========================================================================

    // 初始化对话：加载指定角色+地图的所有对话行
    WS.initTalk = function(actorId, mapId) {
        this._queue = [];
        this._ensureDialoguesLoaded();

        if (!$dataWanderDialogues) {
            this._queue.push({speaker: 'System', text: '(散步对话数据未加载)'});
            return;
        }

        // 注意：此处不能用 `x || ''` 兜底 —— map_id 为 0（通用行）时 0 是 falsy，
        // 会被折成空串而永远匹配不上，导致通用回退静默失效。
        const norm = v => String(v === null || v === undefined ? '' : v).trim();
        const myId = norm(actorId);
        const pick = mid => $dataWanderDialogues.filter(item =>
            norm(item.actor_id) === myId && norm(item.map_id) === norm(mid));

        // 优先级：该角色在当前地图的专属对话 > 通用保底对话（map_id = 0）
        let rawRows = pick(mapId);
        if (rawRows.length === 0) {
            rawRows = pick(COMMON_MAP_ID);
        }

        if (rawRows.length === 0) {
            this._queue = [];
            return;
        }

        // 按 group_id 分组
        const groups = {};
        for (let r = 0; r < rawRows.length; r++) {
            const row = rawRows[r];
            const gid = String(row.group_id || '0').trim();
            if (!groups[gid]) groups[gid] = [];
            groups[gid].push(row);
        }

        const groupIDs = Object.keys(groups);
        if (groupIDs.length === 0) {
            this._queue = [];
            return;
        }

        // 随机选一组
        const randomGid = groupIDs[Math.floor(Math.random() * groupIDs.length)];
        this._queue = groups[randomGid];
    };

    WS.hasNext = function() {
        return this._queue.length > 0;
    };

    WS.checkNext = function(switchId) {
        $gameSwitches.setValue(switchId, this.hasNext());
    };

    WS.next = function(nameVarId, textVarId) {
        if (this._queue.length === 0) return;

        let safety = 0;
        while (this._queue.length > 0) {
            if (safety++ > 100) {
                console.error('[WanderSystem] JUMP dead loop, stopped.');
                return;
            }

            const row = this._queue[0];
            const speakerKey = String(row.speaker || '').trim().toUpperCase();

            // JUMP
            if (speakerKey === 'JUMP') {
                this._queue.shift();
                this.loadGroup(String(row.text || '').trim());
                continue;
            }

            // CHOICE
            if (speakerKey === 'CHOICE') {
                $gameVariables.setValue(textVarId, -1);
                $gameVariables.setValue(nameVarId, '');
                return;
            }

            break;
        }

        if (this._queue.length === 0) return;

        const line = this._queue.shift();
        const speaker = String(line.speaker || '').trim();
        const speakerUpper = speaker.toUpperCase();

        // 解析说话者名字
        let name = '';
        if (speakerUpper === '' || speakerUpper === 'NONE' || speakerUpper === '0') {
            name = '';
        } else if (speakerUpper === 'SELF') {
            const selfActorId = Number(line.actor_id) || 0;
            if (selfActorId > 0) {
                const selfActor = $gameActors.actor(selfActorId);
                name = selfActor ? selfActor.name() : '???';
            } else {
                name = '???';
            }
        } else if (speakerUpper === 'PLAYER') {
            name = $gameParty.leader() ? $gameParty.leader().name() : '审神者';
        } else if (/^V\[(\d+)\]$/i.test(speaker)) {
            const varId = parseInt(speaker.match(/^V\[(\d+)\]$/i)[1]);
            const vActorId = $gameVariables.value(varId);
            const vActor = $gameActors.actor(vActorId);
            name = vActor ? vActor.name() : '???';
        } else if (/^\d+$/.test(speaker)) {
            const numActorId = Number(speaker);
            const numActor = $gameActors.actor(numActorId);
            name = numActor ? numActor.name() : speaker;
        } else {
            name = speaker;
        }

        const content = String(line.text || '').replace(/\\n/g, '\n');
        $gameVariables.setValue(nameVarId, name);
        $gameVariables.setValue(textVarId, content);
    };

    // 跳转到指定 group_id
    WS.loadGroup = function(targetGid) {
        this._ensureDialoguesLoaded();
        if (!$dataWanderDialogues) return;
        const targetRows = $dataWanderDialogues.filter(item => {
            return String(item.group_id || '').trim() === String(targetGid).trim();
        });
        if (targetRows.length > 0) {
            this._queue = targetRows;
        } else {
            this._queue.push({speaker: 'System', text: '(missing dialogue: ' + targetGid + ')'});
        }
    };

    // 选项处理
    WS.processChoices = function() {
        const choices = [];
        while (this._queue.length > 0) {
            const row = this._queue[0];
            if (String(row.speaker || '').trim().toUpperCase() !== 'CHOICE') break;
            this._queue.shift();
            const parts = String(row.text).split('|');
            const choiceText = parts[0].trim();
            const targetId = parts.length > 1 ? parts[1].trim() : '';
            choices.push({ name: choiceText, target: targetId });
        }
        if (choices.length === 0) return;

        $gameMessage.setChoices(choices.map(c => c.name), 0, -1);
        $gameMessage.setChoiceCallback(n => {
            const selected = choices[n];
            if (selected.target) WS.loadGroup(selected.target);
        });
    };

    // =========================================================================
    // 7. 插件命令注册
    // =========================================================================

    PluginManager.registerCommand(PLUGIN_NAME, 'assign', args => {
        WS.assignWanders();
    });

    PluginManager.registerCommand(PLUGIN_NAME, 'clear', args => {
        WS.clearWanders();
    });

    // 解析参数值：支持直接数字或 V[n] 变量引用
    function resolveArg(value) {
        const str = String(value || '').trim();
        const match = str.match(/^V\[(\d+)\]$/i);
        if (match) {
            return $gameVariables.value(parseInt(match[1]));
        }
        return Number(str) || 0;
    }

    PluginManager.registerCommand(PLUGIN_NAME, 'initTalk', args => {
        WS.initTalk(resolveArg(args.actorId), resolveArg(args.mapId));
    });

    PluginManager.registerCommand(PLUGIN_NAME, 'checkNext', args => {
        $gameSwitches.setValue(Number(args.switchId), WS.hasNext());
    });

    PluginManager.registerCommand(PLUGIN_NAME, 'next', args => {
        WS.next(Number(args.nameVarId), Number(args.textVarId));
    });

    PluginManager.registerCommand(PLUGIN_NAME, 'showChoices', args => {
        WS.processChoices();
    });

    // =========================================================================
    // 8-0. 存档扩展：把散步分配表挂到 $gameSystem 上
    //      $gameSystem 随存档保存，是「读档后还原同一批散步角色」的载体。
    //      旧存档没有该字段 —— 读取时按 undefined 处理，逻辑自动回退为重新分配，
    //      因此旧的存档依然可以正常读取。
    // =========================================================================
    const _Game_System_initialize = Game_System.prototype.initialize;
    Game_System.prototype.initialize = function() {
        _Game_System_initialize.call(this);
        this._wanderAssignments = null;
    };

    // =========================================================================
    // 8a. 全局过渡检测：每帧检查 Var[7] 变化 -> 自动清理/重置代际
    // =========================================================================
    const _Game_Map_update = Game_Map.prototype.update;
    Game_Map.prototype.update = function(sceneActive) {
        _Game_Map_update.call(this, sceneActive);

        // 【先处理存档带回的状态，再判断时段】
        // 读档后两种情形必须分开：
        //   a) 存档分配表仍有效（下午存档）-> 接管它，并且【不清】那批 State=5，
        //      因为他们确实在散步；
        //   b) 存档没有分配表（其他时段存档 / 旧存档）-> 清掉孤儿 State=5，
        //      否则这些刀男既不在房间里、也不在散步点上。
        if (WS._pendingSweep) {
            WS._pendingSweep = false;
            WS._adoptSavedAssignments();
        }

        const currentTime = $gameVariables.value(7);
        if (currentTime !== AFTERNOON_TIME && WS._prevTime === AFTERNOON_TIME) {
            WS.clearWanders();
        }
        if (currentTime === AFTERNOON_TIME && WS._prevTime !== AFTERNOON_TIME) {
            WS._generation++;
            WS._mapGeneration = {};
            // 已有可用分配（刚读档接管的那批）就沿用，不再重新随机 ——
            // 这样同一天内反复读档，散步角色始终是同一批。
            if (Object.keys(WS._assignments).length === 0) {
                WS._assignments = {};
                WS._buildGlobalPool();
                WS._preAssignAll();
            }
            // 读档不会走 Game_Map.setup，_slotMap 可能尚未建立；
            // 这里补一次「扫描 + 刷新」，保证当前地图插槽立即显示角色。
            WS.assignWanders();
        }
        WS._prevTime = currentTime;
    };

    // =========================================================================
    // 8b. 地图切换时自动处理散步
    // =========================================================================
    const _Game_Map_setup = Game_Map.prototype.setup;
    Game_Map.prototype.setup = function(mapId) {
        _Game_Map_setup.call(this, mapId);
        WS._slotMap = {};
        if ($gameVariables.value(7) === AFTERNOON_TIME) {
            WS.assignWanders();
        }
    };

    // =========================================================================
    // 9. 挂钩 setupPage：仅下午时段自动重新应用散步行走图
    //    （非下午时段让事件通过页面条件自动退回透明默认页）
    // =========================================================================
    const _Game_Event_setupPage = Game_Event.prototype.setupPage;
    Game_Event.prototype.setupPage = function() {
        _Game_Event_setupPage.call(this);

        if ($gameVariables.value(7) !== AFTERNOON_TIME) return;

        const mapId = $gameMap.mapId();
        const slots = WS._slotMap[mapId];
        if (!slots) return;

        for (const sidx in slots) {
            if (slots[sidx] === this._eventId) {
                const mapAssign = WS._assignments[mapId];
                const actorId = (mapAssign && mapAssign[sidx]) ? mapAssign[sidx] : 0;
                if (actorId > 0) {
                    const actor = $gameActors.actor(actorId);
                    if (actor) {
                        this.setImage(actor.characterName(), actor.characterIndex());
                        this.setTransparent(false);
                    }
                } else {
                    // 该插槽本时段无人：setupPageSettings 会把页面自带的占位行走图
                    // （Damage3）重新贴回来，必须在此显式清掉，
                    // 否则空插槽会露出占位图、并成为看不见的障碍物。
                    this.setImage('', 0);
                    this.setTransparent(true);
                }
                break;
            }
        }
    };

    // =========================================================================
    // =========================================================================
    // 10. 加载散步对话 JSON 数据（懒加载，需要时自动初始化）
    // =========================================================================
    WS._dialoguesLoaded = false;
    WS._ensureDialoguesLoaded = function() {
        if (this._dialoguesLoaded) return;
        if (typeof $dataWanderDialogues !== "undefined") {
            this._dialoguesLoaded = true;
            return;
        }
        try {
            var xhr = new XMLHttpRequest();
            xhr.open("GET", "data/WanderDialogues.json", false);
            xhr.overrideMimeType("application/json");
            xhr.send();
            if (xhr.status >= 200 && xhr.status < 300) {
                $dataWanderDialogues = JSON.parse(xhr.responseText);
                console.log("[WanderSystem] Loaded WanderDialogues.json: " + $dataWanderDialogues.length + " entries");
            }
        } catch(e) {
            console.warn("[WanderSystem] XHR failed: " + e.message + ", trying node fs...");
            try {
                var fs = require("fs");
                var path = require("path");
                var dataPath = path.join(process.cwd(), "data", "WanderDialogues.json");
                var raw = fs.readFileSync(dataPath, "utf8");
                $dataWanderDialogues = JSON.parse(raw);
                console.log("[WanderSystem] Loaded via fs: " + $dataWanderDialogues.length + " entries");
            } catch(e2) {
                console.error("[WanderSystem] All load methods failed: " + e2.message);
            }
        }
        this._dialoguesLoaded = true;
    };

    // 在 initTalk 和 _actorHasDialogue 中自动调用 _ensureDialoguesLoaded

})();