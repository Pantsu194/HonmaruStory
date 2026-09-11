/*:
 * @target MZ
 * @plugindesc [菜单注册表 MenuHub] v2.0 - 参数化主菜单管理：全部菜单项可在插件管理器内配置
 * @author 本丸开发组
 *
 * @param menuItems
 * @text 主菜单项列表
 * @desc 所有主菜单扩展项都在这里配置。每个条目可设置：显示名称 / 唯一标识 / 排序 / 可用条件 / 点击动作。详见帮助。
 * @type struct<MenuItem>[]
 * @default []
 *
 * @help
 * ============================================================================
 * MenuHub 是什么（v2.0 参数化版）
 * ============================================================================
 * 本插件统一管理 ESC 主菜单的扩展项。所有菜单项（名称、顺序、可用条件、
 * 点击动作）都可以在插件管理器的「menuItems」参数里直接配置，无需改代码。
 *
 * 相比 v1.0（代码注册 API）：
 *   - v2.0 新增参数配置，菜单项全在编辑器内可见、可改；
 *   - 代码 API（MenuHub.add）仍然保留，供插件在运行时动态注册菜单项；
 *   - 参数项与代码项合并显示，相同 symbol 时后注册者覆盖（默认参数项在前）。
 *
 * ============================================================================
 * menuItems 每条目字段说明
 * ============================================================================
 * name         显示名称（按钮文字）
 * symbol       唯一标识：不得与 MZ 内置符号(item/skill/equip/status/formation/
 *              save/load/gameEnd/option)或其他条目重复
 * priority     排序：越小越靠前，相同值按列表顺序；建议核心玩法 10~30，工具 40~90，调试 90+
 * enabledType  可用条件类型：
 *              always      = 总是可用
 *              switchOn    = 指定开关【开启】时可用（enabledSwitch）
 *              switchOff   = 指定开关【关闭】时可用（enabledSwitch）
 *              globalCall  = 调用全局判断方法，返回真值即可用（enabledCall）
 * enabledSwitch enabledType=switchOn/switchOff 时，指定开关编号
 * enabledCall   enabledType=globalCall 时，填「全局对象.方法名」，如 BigWorldMap.available
 * actionType   点击动作类型：
 *              none          = 无动作（占位）
 *              scene         = 打开场景（sceneClass 填场景类名）
 *              globalCall    = 调用全局方法（callTarget 填「全局对象.方法名」）
 *              pluginCommand = 调用插件命令（cmdPlugin/cmdName/cmdArgs）
 * sceneClass   actionType=scene 时，填场景类名（如 Scene_Quest、Scene_Toucho）
 * callTarget   actionType=globalCall 时，填「全局对象.方法名」（如 BigWorldMap.openFromMenu）
 * cmdPlugin    actionType=pluginCommand 时，填插件名（如 QuestSystem）
 * cmdName      actionType=pluginCommand 时，填命令名（如 open）
 * cmdArgs      actionType=pluginCommand 时，填命令参数 JSON 对象（如 {"scene":"item"}）；无参数填 {} 或留空
 *
 * 常用场景示例：
 *   - 任务界面：    actionType=pluginCommand, cmdPlugin=QuestSystem,   cmdName=open
 *   - 刀帐：        actionType=scene, sceneClass=Scene_Toucho
 *   - 帮助百科：    actionType=pluginCommand, cmdPlugin=HelpSystem,    cmdName=open
 *   - 开发者模式：  actionType=scene, sceneClass=Scene_DevMode
 *   - 本丸大地图：  actionType=globalCall, callTarget=BigWorldMap.openFromMenu,
 *                   enabledType=globalCall, enabledCall=BigWorldMap.available
 *
 * ============================================================================
 * 安装与注意事项（必读）
 * ============================================================================
 * 【1】MenuHub 必须排在插件管理器列表的【第 1 位】！
 *     若排后面，依赖它的插件（如 BigWorldMap 的全局入口）仍可工作，
 *     但菜单项缺失的排查会变难，且 globalCall 型动作依赖的全局对象可能未就绪。
 *
 * 【2】symbol 必须全局唯一（见上）。重复注册会警告并覆盖旧项。
 *
 * 【3】enabledType=globalCall 与 actionType=globalCall 的目标方法必须存在：
 *      - 方法须挂在 window 下的「全局对象.方法」两级路径（如 BigWorldMap.available）
 *      - 目标不存在时，加载期打印警告，按钮按「不可用」处理
 *
 * 【4】actionType=pluginCommand 调用的是插件管理器注册的命令（PluginManager），
 *     与事件里的「插件命令」同一套，参数格式为 JSON 对象。
 *
 * 【5】本插件不写任何存档数据，对旧存档零影响；改菜单配置不影响存档。
 *
 * 【6】移除 MenuHub 前，请先把 menuItems 配置备份到记事本，并确认
 *     各插件不再依赖（v1.0 时代改造的插件已无菜单代码，依赖全部收敛在本插件）。
 *
 * 【7】调试：F12 控制台输入 MenuHub.dump() 可查看当前注册的全部菜单项
 *     （含参数项与代码项，按最终顺序排列）。
 *
 * ============================================================================
 * 开发者 API（动态注册，供插件代码使用）
 * ============================================================================
 * MenuHub.add(name, symbol, handler, options?)
 *   options.enabled  : Boolean | Function  默认 true
 *   options.priority : Number              默认 100
 * 示例：
 *   window.MenuHub && window.MenuHub.add("我的功能", "myFeature",
 *       function() { SceneManager.push(Scene_MyFeature); },
 *       { enabled: true, priority: 50 });
 *
 * MenuHub.dump() —— 返回当前注册项（按最终顺序）的字符串数组
 *
 * ============================================================================
 */

/*~struct~MenuItem:
 * @param name
 * @text 显示名称
 * @desc 菜单按钮上显示的文字。
 * @type string
 *
 * @param symbol
 * @text 唯一标识
 * @desc 内部标识，必须全局唯一：不得与 MZ 内置符号(item/skill/equip/status/formation/save/load/gameEnd/option)或其他条目重复。
 * @type string
 *
 * @param priority
 * @text 排序
 * @desc 越小越靠前；相同值按列表顺序。建议核心玩法 10~30，工具 40~90，调试 90+。
 * @type number
 * @default 100
 *
 * @param enabledType
 * @text 可用条件类型
 * @desc always=总是可用；switchOn=指定开关开启时；switchOff=指定开关关闭时；globalCall=调用全局判断方法（返回真值即可用）。
 * @type select
 * @option always
 * @option switchOn
 * @option switchOff
 * @option globalCall
 * @default always
 *
 * @param enabledSwitch
 * @text 可用条件-开关
 * @desc enabledType 为 switchOn/switchOff 时，指定判断的开关编号。
 * @type switch
 * @default 0
 *
 * @param enabledCall
 * @text 可用条件-全局方法
 * @desc enabledType 为 globalCall 时，填「全局对象.方法名」（如 BigWorldMap.available），方法返回真值则按钮可用。
 * @type string
 *
 * @param actionType
 * @text 点击动作类型
 * @desc none=无动作(占位)；scene=打开场景(填场景类名)；globalCall=调用全局方法；pluginCommand=调用插件命令。
 * @type select
 * @option none
 * @option scene
 * @option globalCall
 * @option pluginCommand
 * @default none
 *
 * @param sceneClass
 * @text 动作-场景类名
 * @desc actionType 为 scene 时填场景类名（如 Scene_Quest、Scene_Toucho）。类必须存在于全局。
 * @type string
 *
 * @param callTarget
 * @text 动作-全局方法
 * @desc actionType 为 globalCall 时填「全局对象.方法名」（如 BigWorldMap.openFromMenu）。
 * @type string
 *
 * @param cmdPlugin
 * @text 动作-插件名
 * @desc actionType 为 pluginCommand 时填插件名（如 QuestSystem）。
 * @type string
 *
 * @param cmdName
 * @text 动作-命令名
 * @desc actionType 为 pluginCommand 时填命令名（如 open）。
 * @type string
 *
 * @param cmdArgs
 * @text 动作-命令参数(JSON)
 * @desc actionType 为 pluginCommand 时可填命令参数 JSON 对象（如 {"scene":"item"}）；无参数填 {} 或留空。
 * @type note
 */
(() => {
    "use strict";

    const PLUGIN_NAME = "MenuHub";
    const PARAMS = PluginManager.parameters(PLUGIN_NAME);

    // =========================================================================
    // 注册表
    // =========================================================================
    const items = [];
    let orderSeed = 0;

    // ---------- 解析「全局对象.方法」两级路径 ----------
    function resolveGlobalCall(path) {
        if (!path || typeof path !== "string") return null;
        const parts = path.split(".");
        if (parts.length !== 2) return null;
        const obj = window[parts[0]];
        if (!obj || typeof obj[parts[1]] !== "function") return null;
        return obj[parts[1]].bind(obj);
    }

    // ---------- 核心注册 ----------
    function register(name, symbol, handler, enabled, priority) {
        const entry = {
            name: name,
            symbol: symbol,
            handler: handler,
            enabled: enabled !== undefined ? enabled : true,
            priority: Number(priority) || 100,
            order: orderSeed++
        };
        const existing = items.find(it => it.symbol === symbol);
        if (existing) {
            console.warn("[MenuHub] symbol 重复注册，已覆盖旧项:", symbol);
            Object.assign(existing, entry);
        } else {
            items.push(entry);
        }
    }

    // ---------- 由参数配置生成 可用性求值器 ----------
    // 注意：全局方法一律【调用时】解析，不在插件加载期解析——
    // MenuHub 位于插件列表第 1 位，加载时其他插件的全局对象尚未创建。
    function makeEnabled(cfg) {
        switch (String(cfg.enabledType || "always")) {
            case "switchOn": {
                const sw = Number(cfg.enabledSwitch) || 0;
                return function() { return $gameSwitches.value(sw); };
            }
            case "switchOff": {
                const sw = Number(cfg.enabledSwitch) || 0;
                return function() { return !$gameSwitches.value(sw); };
            }
            case "globalCall": {
                const path = String(cfg.enabledCall || "").trim();
                let warned = false;
                return function() {
                    const fn = resolveGlobalCall(path);
                    if (!fn) {
                        if (!warned) {
                            warned = true;
                            console.warn("[MenuHub] 菜单项「" + cfg.name + "」的 enabledCall 无效:", path, "（按钮将不可用）");
                        }
                        return false;
                    }
                    return !!fn();
                };
            }
            default:
                return true;
        }
    }

    // ---------- 由参数配置生成 点击动作 ----------
    // 注意：场景类/全局方法一律【调用时】解析（同上，加载期其他插件尚未就绪）。
    function makeHandler(cfg) {
        switch (String(cfg.actionType || "none")) {
            case "scene": {
                const clsName = String(cfg.sceneClass || "").trim();
                return function() {
                    const cls = window[clsName];
                    if (!cls || typeof cls !== "function") {
                        console.warn("[MenuHub] 菜单项「" + cfg.name + "」的场景类不存在:", clsName, "（点击无动作）");
                        return;
                    }
                    SceneManager.push(cls);
                };
            }
            case "globalCall": {
                const path = String(cfg.callTarget || "").trim();
                return function() {
                    const fn = resolveGlobalCall(path);
                    if (!fn) {
                        console.warn("[MenuHub] 菜单项「" + cfg.name + "」的 callTarget 无效:", path, "（点击无动作）");
                        return;
                    }
                    fn();
                };
            }
            case "pluginCommand": {
                const plugin = String(cfg.cmdPlugin || "").trim();
                const cmd = String(cfg.cmdName || "").trim();
                let args = {};
                const argStr = String(cfg.cmdArgs || "").trim();
                if (argStr) {
                    try {
                        args = JSON.parse(argStr);
                    } catch (e) {
                        console.warn("[MenuHub] 菜单项「" + cfg.name + "」的命令参数 JSON 无效，按空参数处理:", argStr);
                    }
                }
                if (!plugin || !cmd) {
                    console.warn("[MenuHub] 菜单项「" + cfg.name + "」缺少插件名/命令名（点击无动作）");
                    return function() {};
                }
                return function() { PluginManager.callCommand({}, plugin, cmd, args); };
            }
            default:
                return function() {};
        }
    }

    // ---------- 读取插件参数中的菜单项 ----------
    function loadFromParams() {
        const raw = PARAMS["menuItems"];
        if (!raw) return;
        let list;
        try {
            list = JSON.parse(raw);
        } catch (e) {
            console.error("[MenuHub] menuItems 参数解析失败:", e);
            return;
        }
        if (!Array.isArray(list)) return;
        list.forEach(function(json, idx) {
            let cfg;
            try {
                cfg = typeof json === "string" ? JSON.parse(json) : json;
            } catch (e) {
                console.warn("[MenuHub] menuItems 第 " + (idx + 1) + " 项解析失败，已跳过");
                return;
            }
            const name = String(cfg.name || "").trim();
            const symbol = String(cfg.symbol || "").trim();
            if (!name || !symbol) {
                console.warn("[MenuHub] menuItems 第 " + (idx + 1) + " 项缺少 name 或 symbol，已跳过");
                return;
            }
            register(name, symbol, makeHandler(cfg), makeEnabled(cfg), Number(cfg.priority) || 100);
        });
    }

    // ---------- 排序：priority 升序，同值按注册顺序（稳定） ----------
    function sorted() {
        return items.slice().sort(function(a, b) {
            return (a.priority - b.priority) || (a.order - b.order);
        });
    }

    // ---------- 可用性求值 ----------
    function isEnabled(entry) {
        if (typeof entry.enabled === "function") return !!entry.enabled();
        return !!entry.enabled;
    }

    // ---------- 全局 API ----------
    window.MenuHub = {
        add: function(name, symbol, handler, options) {
            if (typeof name !== "string" || !name) {
                console.warn("[MenuHub] 菜单项 name 无效，已忽略:", name);
                return;
            }
            if (typeof symbol !== "string" || !symbol) {
                console.warn("[MenuHub] 菜单项 symbol 无效，已忽略:", symbol);
                return;
            }
            if (typeof handler !== "function") {
                console.warn("[MenuHub] 菜单项 handler 无效，已忽略:", symbol);
                return;
            }
            const opts = options || {};
            register(name, symbol, handler, opts.enabled, opts.priority);
        },
        dump: function() {
            return sorted().map(function(it) {
                return "[" + it.priority + "] " + it.name + " (" + it.symbol + ")";
            });
        }
    };

    // =========================================================================
    // 唯一覆写点（标准链式，勿删 _call，勿改为直接赋值）
    // =========================================================================
    const _Window_MenuCommand_addOriginalCommands = Window_MenuCommand.prototype.addOriginalCommands;
    Window_MenuCommand.prototype.addOriginalCommands = function() {
        // 保留 MZ 原生灰显语义：enabled 条件不满足时按钮仍显示但置灰（不可选），
        // 与 v1.0 各插件的 addCommand(name, symbol, enabled) 行为一致。
        for (const it of sorted()) {
            this.addCommand(it.name, it.symbol, isEnabled(it));
        }
        _Window_MenuCommand_addOriginalCommands.call(this);
    };

    const _Scene_Menu_createCommandWindow = Scene_Menu.prototype.createCommandWindow;
    Scene_Menu.prototype.createCommandWindow = function() {
        // 必须先调用原方法（_commandWindow 在其中创建，之后才能 setHandler）
        _Scene_Menu_createCommandWindow.call(this);
        for (const it of sorted()) {
            // handler 无条件绑定（灰显项无法被选中，不会误触发；与 v1.0 行为一致）
            // handler 的 this 绑定为当前 Scene_Menu 实例
            this._commandWindow.setHandler(it.symbol, () => it.handler.call(this));
        }
    };

    // 先加载参数项（代码 API 注册的项后到，同 symbol 会覆盖参数项）
    loadFromParams();
    console.log("[MenuHub] v2.0 已就绪，注册项:", window.MenuHub.dump().join(" / ") || "(空)");

})();
