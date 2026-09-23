/*:
 * @target MZ
 * @plugindesc [位置追踪] v1.0.1 - 刀男状态变更时自动同步刀帐位置与导航
 * @author Codex
 *
 * @help
 * ============================================================================
 * 【位置追踪 v1.0.1】
 * ============================================================================
 *
 * 功能：监听 Var[ActorId+100]（刀男状态变量）的变化，自动更新刀帐中的
 * 「当前所在」和「导航箭头」。
 *
 * 覆盖的状态：
 * 0（未召唤）   → 不处理
 * 1（本丸待命） → 恢复为角色备注中的 <TouchoMap> <TouchoEvent>
 * 2（在审神者队）→ 位置=当前地图，导航=0（跟随玩家）
 * 3（远征）     → 由远征系统自行处理，本插件不干预
 * 4（内番）     → 查 Var 81~86 确定具体地点，更新位置+导航
 * 5（散步）     → 由 WanderSystem 处理，本插件不干预
 *
 * —————— 与 WanderSystem 的协作 ——————
 * 本插件运行在 WanderSystem 之前。
 * 当状态从 5 → 1 时（散步结束），检查 WanderSystem._originalLocations
 * 是否有缓存：有则跳过（由 WanderSystem 恢复），无则按正常 State=1 处理。
 *
 * ============================================================================
 *
 * @param barnEvent1
 * @text 马当番1事件ID
 * @desc Map2上马当番1对应的导航事件
 * @type number
 * @default 0
 *
 * @param barnEvent2
 * @text 马当番2事件ID
 * @desc Map2上马当番2对应的导航事件
 * @type number
 * @default 0
 *
 * @param fieldEvent1
 * @text 畑当番1事件ID
 * @desc Map2上畑当番1对应的导航事件
 * @type number
 * @default 187
 *
 * @param fieldEvent2
 * @text 畑当番2事件ID
 * @desc Map2上畑当番2对应的导航事件
 * @type number
 * @default 188
 *
 * @param dojoEvent1
 * @text 手合1事件ID
 * @desc Map13上手合1对应的导航事件
 * @type number
 * @default 5
 *
 * @param dojoEvent2
 * @text 手合2事件ID
 * @desc Map13上手合2对应的导航事件
 * @type number
 * @default 6
 */

(() => {
    const PLUGIN_NAME = "PositionTracker";
    const PARAMS = PluginManager.parameters(PLUGIN_NAME);
    const STATE_OFFSET = 100;
    const ACTOR_MIN = 3;
    // 角色 ID 上限：动态跟随 Actors.json 的真实规模。
    // v1.0.1 修正：曾写死 200，漏掉 212 笹贯 / 248 三郎国宗 等 ID > 200 的新刀男，
    // 他们的状态变化不会同步刀帐位置与导航。结果首次读取后缓存（规模运行期内不变）。
    let _actorMaxCache = 0;
    const actorIdMax = function() {
        if (_actorMaxCache === 0) {
            const len = (typeof $dataActors !== 'undefined' && $dataActors) ? $dataActors.length : 0;
            _actorMaxCache = len > 0 ? len - 1 : 299;
        }
        return _actorMaxCache;
    };

    // =========================================================================
    // 0. 缓存
    // =========================================================================
    window.PositionTracker = window.PositionTracker || {};
    const PT = window.PositionTracker;
    PT._cache = {}; // { actorId: { mapId, eventId } }

    // 从角色备注读取原始 Toucho 值
    PT._getOriginal = function(actorId) {
        if (this._cache[actorId]) return this._cache[actorId];
        const actor = $gameActors.actor(actorId);
        if (!actor) return null;
        const meta = actor.actor().meta;
        const result = {
            mapId: Number(meta.TouchoMap || 0),
            eventId: Number(meta.TouchoEvent || 0)
        };
        this._cache[actorId] = result;
        return result;
    };

    // 更新刀帐
    PT._updateToucho = function(actorId, mapId, eventId) {
        const actor = $gameActors.actor(actorId);
        if (!actor) return;
        if (typeof actor.setTouchoMapId !== 'function') return;
        actor.setTouchoMapId(mapId);
        actor.setTouchoEventId(eventId);
    };

    // 查找内番分配
    PT._findChore = function(actorId) {
        for (let v = 81; v <= 86; v++) {
            if ($gameVariables.value(v) === actorId) return v;
        }
        return 0;
    };

    // =========================================================================
    // 1. 挂钩变量变化
    // =========================================================================
    const _Game_Variables_setValue = Game_Variables.prototype.setValue;
    Game_Variables.prototype.setValue = function(variableId, value) {
        const oldValue = this._data[variableId];
        _Game_Variables_setValue.call(this, variableId, value);

        const actorId = variableId - STATE_OFFSET;
        if (actorId < ACTOR_MIN || actorId > actorIdMax()) return;
        if (value === oldValue) return;

        // 安全检查：确保游戏已初始化
        if (!$gameMap || !$gameActors) return;

        // State 5 相关：交给 WanderSystem
        if (value === 5) return;
        if (oldValue === 5) {
            // 5 → 1：检查 WanderSystem 是否缓存了原始值
            if (window.WanderSystem && window.WanderSystem._originalLocations &&
                window.WanderSystem._originalLocations[actorId]) {
                return; // WanderSystem 会处理恢复
            }
        }

        switch (value) {
            case 1: {
                const orig = PT._getOriginal(actorId);
                if (orig) PT._updateToucho(actorId, orig.mapId, orig.eventId);
                break;
            }
            case 2: {
                PT._updateToucho(actorId, $gameMap.mapId(), 0);
                break;
            }
            case 3:
                // 远征系统自行处理
                break;
            case 4: {
                const choreVar = PT._findChore(actorId);
                if (choreVar >= 85) {
                    // 手合 → Map 13
                    const evId = choreVar === 85
                        ? Number(PARAMS["dojoEvent1"] || 0)
                        : Number(PARAMS["dojoEvent2"] || 0);
                    PT._updateToucho(actorId, 13, evId);
                } else if (choreVar >= 81) {
                    // 马当番/畑当番 → Map 2
                    let evId = 0;
                    if (choreVar === 81) evId = Number(PARAMS["barnEvent1"] || 0);
                    else if (choreVar === 82) evId = Number(PARAMS["barnEvent2"] || 0);
                    else if (choreVar === 83) evId = Number(PARAMS["fieldEvent1"] || 0);
                    else if (choreVar === 84) evId = Number(PARAMS["fieldEvent2"] || 0);
                    PT._updateToucho(actorId, 2, evId);
                }
                break;
            }
            case 0:
                break;
        }
    };

})();