// 刀解清单 - 参数可配置版 for RPG Maker MZ
// 版本：3.2.1
// 变更：四素材分别配置 / 素材窗下移避开返回按钮 / 修复信息窗不刷新 / 列表只显示数量
//       列表项只显示「物品名 ×数量」（去掉「持有」）
// 作者：AI Assistant

/*:
 * @target MZ
 * @plugindesc 【刀解清单】插件：配方在插件参数里配置，四种素材可分别设置消耗。(v3.2.1 布局修复版)
 * @author AI Assistant
 *
 * @param recipeList
 * @text [配方] 刀解列表
 * @desc 在这里添加可刀解的物品。回收量 = 该物品「锻造消耗」的一半（向下取整），四种素材等量。
 * @type struct<DisassembleRecipe>[]
 * @default ["{\"itemId\":\"50\",\"cost1\":\"10\",\"cost2\":\"10\",\"cost3\":\"10\",\"cost4\":\"10\",\"enabled\":\"true\"}","{\"itemId\":\"51\",\"cost1\":\"10\",\"cost2\":\"10\",\"cost3\":\"10\",\"cost4\":\"10\",\"enabled\":\"true\"}","{\"itemId\":\"52\",\"cost1\":\"10\",\"cost2\":\"10\",\"cost3\":\"10\",\"cost4\":\"10\",\"enabled\":\"true\"}","{\"itemId\":\"53\",\"cost1\":\"10\",\"cost2\":\"10\",\"cost3\":\"10\",\"cost4\":\"10\",\"enabled\":\"true\"}","{\"itemId\":\"54\",\"cost1\":\"10\",\"cost2\":\"10\",\"cost3\":\"10\",\"cost4\":\"10\",\"enabled\":\"true\"}","{\"itemId\":\"55\",\"cost1\":\"10\",\"cost2\":\"10\",\"cost3\":\"10\",\"cost4\":\"10\",\"enabled\":\"true\"}","{\"itemId\":\"56\",\"cost1\":\"15\",\"cost2\":\"15\",\"cost3\":\"15\",\"cost4\":\"15\",\"enabled\":\"true\"}","{\"itemId\":\"57\",\"cost1\":\"5\",\"cost2\":\"5\",\"cost3\":\"5\",\"cost4\":\"5\",\"enabled\":\"true\"}","{\"itemId\":\"58\",\"cost1\":\"30\",\"cost2\":\"30\",\"cost3\":\"30\",\"cost4\":\"30\",\"enabled\":\"true\"}","{\"itemId\":\"59\",\"cost1\":\"50\",\"cost2\":\"50\",\"cost3\":\"50\",\"cost4\":\"50\",\"enabled\":\"true\"}","{\"itemId\":\"60\",\"cost1\":\"30\",\"cost2\":\"30\",\"cost3\":\"30\",\"cost4\":\"30\",\"enabled\":\"true\"}","{\"itemId\":\"61\",\"cost1\":\"10\",\"cost2\":\"10\",\"cost3\":\"10\",\"cost4\":\"10\",\"enabled\":\"true\"}","{\"itemId\":\"62\",\"cost1\":\"30\",\"cost2\":\"30\",\"cost3\":\"30\",\"cost4\":\"30\",\"enabled\":\"true\"}","{\"itemId\":\"63\",\"cost1\":\"30\",\"cost2\":\"30\",\"cost3\":\"30\",\"cost4\":\"30\",\"enabled\":\"true\"}","{\"itemId\":\"65\",\"cost1\":\"5\",\"cost2\":\"5\",\"cost3\":\"5\",\"cost4\":\"5\",\"enabled\":\"true\"}"]
 *
 * @param materialVarIds
 * @text [素材] 变量ID（逗号分隔）
 * @desc 刀解回收进哪些变量，同时也决定顶部素材窗显示哪几种。默认 70,71,72,73。
 * @type string
 * @default 70,71,72,73
 *
 * @help
 * ============================================================
 * 一、最近的改动
 * ============================================================
 * 1. 配方改为「插件管理器参数」配置：本插件的「[配方] 刀解列表」，
 *    在编辑器里点开就能加 / 改 / 关，不用再改脚本文件。
 * 2. 四种素材的消耗**分别配置**（素材1~4），回收量 = 各自消耗的一半（向下取整）；
 *    哪种素材填 0 就哪种不回收。
 * 3. 屏幕顶部常驻显示**素材数量**（1 行，排在返回按钮下方，不会被按钮挡住）。
 * 4. 列表项只显示「物品名 ×数量」，「持有」两个字去掉了。
 * 5. 光标移到物品上时，下方信息窗会显示该物品的刀解收益明细。
 *
 * ============================================================ * 二、怎么配置（编辑器内）
 * ============================================================
 * 插件管理器 → DisassembleList → 「[配方] 刀解列表」→ 添加条目：
 *
 *     物品ID     ：下拉选择物品（如「大和守安定·刀身」）
 *     素材1 消耗 ：第 1 种素材（默认木炭）的锻造消耗，填 10 -> 回收 5
 *     素材2 消耗 ：第 2 种素材（默认玉钢）的锻造消耗
 *     素材3 消耗 ：第 3 种素材（默认冷却材）的锻造消耗
 *     素材4 消耗 ：第 4 种素材（默认砥石）的锻造消耗
 *     启用       ：开 / 关（关掉 = 该项不出现在清单里、也不产出素材）
 *
 * 四种素材的消耗**可以各不相同**（例如 10 / 20 / 0 / 5），回收量按
 * 「各自的一半，向下取整」算 —— 上例就是 5 / 10 / 0 / 2；
 * 填 0 的那种素材不回收，也不会出现在信息窗里。
 *
 * 「素材1~4」与下面的「[素材] 变量ID」按顺序一一对应：
 * 变量ID 填 70,71,72,73 时，素材1=木炭、素材2=玉钢、素材3=冷却材、素材4=砥石。
 * 变量最多 4 个（顶部素材窗是 2 行 x 2 列）。 * 列表显示规则：配方**已启用** 且 背包**持有 > 0**，才会出现在清单里。
 *
 * ============================================================
 * 三、界面
 * ============================================================
 * [素材窗] 屏幕顶部、返回按钮下方的一行（最多显示 4 种素材），常驻显示数量，
 *          刀解后立刻刷新
 * [信息窗] 物品名 + 「【刀解】回收素材」明细
 * [列表窗] 2 列，每项「物品名 ×数量」
 * [数量窗] 按钮 +1 / -1 / +10 / -10 / 确定 / 返回
 *          键盘 ↑↓ = ±10，←→ = ±1，OK / Cancel 同确定 / 返回
 *
 * ============================================================
 * 四、怎么用
 * ============================================================
 * 事件里用「插件命令」调用：DisassembleList open
 *
 * @command open
 * @text 打开刀解清单
 * @desc 打开刀解清单界面。
 */

/*~struct~DisassembleRecipe:
 * @param itemId
 * @text 物品ID
 * @desc 可刀解的物品（选刀身道具即可）。
 * @type item
 * @default 50
 *
 * @param cost1
 * @text 素材1 消耗
 * @desc 第 1 种素材的锻造消耗（对应「[素材] 变量ID」第 1 个，默认木炭）。回收量 = 它的一半，向下取整。
 * @type number
 * @min 0
 * @default 10
 *
 * @param cost2
 * @text 素材2 消耗
 * @desc 第 2 种素材的锻造消耗（默认玉钢）。回收量 = 它的一半，向下取整。
 * @type number
 * @min 0
 * @default 10
 *
 * @param cost3
 * @text 素材3 消耗
 * @desc 第 3 种素材的锻造消耗（默认冷却材）。回收量 = 它的一半，向下取整。
 * @type number
 * @min 0
 * @default 10
 *
 * @param cost4
 * @text 素材4 消耗
 * @desc 第 4 种素材的锻造消耗（默认砥石）。回收量 = 它的一半，向下取整。
 * @type number
 * @min 0
 * @default 10
 *
 * @param enabled
 * @text 启用
 * @desc 关闭后该项不会出现在刀解列表里，也不产出素材。
 * @type boolean
 * @on 启用
 * @off 关闭
 * @default true
 */

(function() {
    'use strict';
    
    const PLUGIN_NAME = "DisassembleList";

    // 辅助函数：判断点是否在矩形内
    function isPointInRect(x, y, rect) {
        return x >= rect.x && x < rect.x + rect.width && y >= rect.y && y < rect.y + rect.height;
    }
    
    // =========================================================================
    // 1. 配方与素材（来自插件管理器参数）
    // =========================================================================
    // 【v3.1.0】配方改由编辑器里的插件参数配置：
    //   「[配方] 刀解列表」 -> 每条：物品ID / 锻造消耗 / 启用
    //   「[素材] 变量ID」   -> 例如 70,71,72,73
    // 回收量规则：= 锻造消耗的一半，向下取整（floor），四种素材等量。
    // 若参数读不到 / 被清空，则回退到下面的默认表（与游戏当前数值一致）。
    const PARAMS = PluginManager.parameters(PLUGIN_NAME);

    const DEFAULT_MATERIAL_VAR_IDS = [70, 71, 72, 73];
    const DEFAULT_RECIPES = [
        // [物品ID, [素材1, 素材2, 素材3, 素材4] 的锻造消耗]
        [50, [10, 10, 10, 10]], [51, [10, 10, 10, 10]], [52, [10, 10, 10, 10]],
        [53, [10, 10, 10, 10]], [54, [10, 10, 10, 10]], [55, [10, 10, 10, 10]],
        [56, [15, 15, 15, 15]], [57, [5, 5, 5, 5]],     [58, [30, 30, 30, 30]],
        [59, [50, 50, 50, 50]], [60, [30, 30, 30, 30]], [61, [10, 10, 10, 10]],
        [62, [30, 30, 30, 30]], [63, [30, 30, 30, 30]], [65, [5, 5, 5, 5]]
    ];


    // 把 MZ 的 struct 数组参数（字符串数组，或已解析的数组）拆成对象数组
    function parseStructArray(raw) {
        let arr = raw;
        if (typeof arr === "string") {
            try {
                arr = JSON.parse(arr);
            } catch (e) {
                return [];
            }
        }
        if (!Array.isArray(arr)) {
            return [];
        }
        return arr.map(function(entry) {
            if (typeof entry === "string") {
                try {
                    return JSON.parse(entry);
                } catch (e) {
                    return null;
                }
            }
            return entry;
        }).filter(function(entry) {
            return entry && typeof entry === "object";
        });
    }

    function parseMaterialVarIds(raw) {
        const ids = String(raw || "")
            .split(",")
            .map(function(s) { return Number(String(s).trim()); })
            .filter(function(n) { return n > 0; });
        return ids.length > 0 ? ids : DEFAULT_MATERIAL_VAR_IDS.slice();
    }

    function parseRecipes(raw) {
        const table = {};
        parseStructArray(raw).forEach(function(entry) {
            const itemId = Number(entry.itemId);
            if (!(itemId > 0)) {
                return;
            }
            // 四种素材分别读；兼容早期只写一个 cost 的写法（那时四种用同一个值）
            const legacy = Number(entry.cost);
            const costs = [entry.cost1, entry.cost2, entry.cost3, entry.cost4].map(function(v) {
                const n = Number(v);
                return n > 0 ? n : (legacy > 0 ? legacy : 0);
            });
            if (costs.every(function(c) { return !(c > 0); })) {
                return;     // 四种都没填 -> 视为无效条目
            }
            table[itemId] = {
                costs: costs,
                // MZ 编辑器写回的布尔可能是 "true" / "false" 字符串，这里统一处理
                enabled: String(entry.enabled) !== "false"
            };
        });
        if (Object.keys(table).length > 0) {
            return table;
        }
        const fallback = {};
        DEFAULT_RECIPES.forEach(function(pair) {
            fallback[pair[0]] = { costs: pair[1].slice(), enabled: true };
        });
        return fallback;
    }


    const MATERIAL_VAR_IDS = parseMaterialVarIds(PARAMS.materialVarIds);
    const RECIPES = parseRecipes(PARAMS.recipeList);

    // 回收量 = 锻造消耗的一半，向下取整
    function disassembleGain(cost) {
        return Math.floor(Number(cost) / 2);
    }

    // 某物品的刀解结果 -> [{ varId, count }, ...]；未配置 / 已关闭 返回 null
    // 第 i 种素材对应「[素材] 变量ID」里的第 i 个变量，
    // 各自的回收量 = 该种素材锻造消耗的一半（向下取整），互不影响；
    // 消耗填 0（或算出来是 0）的素材不会出现在结果里。
    function getRecipeResults(itemId) {
        const recipe = RECIPES[Number(itemId)];
        if (!recipe || recipe.enabled === false) {
            return null;
        }
        const results = [];
        MATERIAL_VAR_IDS.forEach(function(varId, index) {
            const gain = disassembleGain(recipe.costs[index] || 0);
            if (gain > 0) {
                results.push({ varId: varId, count: gain });
            }
        });
        return results.length > 0 ? results : null;
    }


    // 全部已启用的配方物品ID（升序）
    function enabledRecipeIds() {
        return Object.keys(RECIPES)
            .map(function(id) { return Number(id); })
            .filter(function(id) { return RECIPES[id].enabled !== false; })
            .sort(function(a, b) { return a - b; });
    }
    
    // 辅助函数：检查物品 ID，返回 Item/Weapon/Armor 对象 
    function getDisassembleItem(id) {
        const itemId = Number(id);
        if (itemId <= 0) return null;
        
        if ($dataItems[itemId] && DataManager.isItem($dataItems[itemId])) {
            return $dataItems[itemId];
        }
        if ($dataWeapons[itemId] && DataManager.isWeapon($dataWeapons[itemId])) {
            return $dataWeapons[itemId];
        }
        if ($dataArmors[itemId] && DataManager.isArmor($dataArmors[itemId])) {
            return $dataArmors[itemId];
        }
        
        return null;
    }
    

    // =========================================================================
    // 2. 插件命令注册
    // =========================================================================
    
    PluginManager.registerCommand(PLUGIN_NAME, "open", function(args) {
        SceneManager.push(Scene_Disassemble);
    });
    
    // 【v3.0.0】addItems / addRange / removeItems / clearList / setDisassembleResult
    // 五条命令已移除：配方改为插件内 RECIPES 表（见第 1 节），不再由事件配置。

    // =========================================================================
    // 3. 场景定义 - Scene_Disassemble (核心逻辑)
    // =========================================================================
    
    function Scene_Disassemble() {
        this.initialize.apply(this, arguments);
    }

    Scene_Disassemble.prototype = Object.create(Scene_MenuBase.prototype);
    Scene_Disassemble.prototype.constructor = Scene_Disassemble;

    Scene_Disassemble.prototype.initialize = function() {
        Scene_MenuBase.prototype.initialize.call(this);
    };
    
    Scene_Disassemble.prototype.calcWindowHeight = function(numLines, selectable) {
        const lineHeight = 36; 
        const padding = 12;    
        return numLines * lineHeight + padding * 2;
    };

    Scene_Disassemble.prototype.mainAreaWidth = function() {
        return Graphics.boxWidth;
    };

    Scene_Disassemble.prototype.mainAreaBottom = function() {
        return Graphics.boxHeight;
    };

    Scene_Disassemble.prototype.create = function() {
        Scene_MenuBase.prototype.create.call(this);

        // 1. 定义公共尺寸
        const mainW = this.mainAreaWidth();

        // 【v3.1.0】顶部窗口改为「素材数量窗」（不再是帮助窗）
        // 【v3.2.1】它的 y 不再是 0（要避开右上角的返回按钮），所以下面用「底边」定位
        this.createMaterialWindow();
        const materialBottom = this._materialWindow.y + this._materialWindow.height;

        // Info Window 区域高度: 4 行 (物品名1 + 提示1 + 素材2)
        const infoH = this.calcWindowHeight(4, false);

        // 2. 创建 Info Window
        const infoRect = new Rectangle(0, materialBottom, mainW, infoH);
        this._infoWindow = new Window_DisassembleInfo(infoRect);
        this.addWindow(this._infoWindow);

        // 3. 计算 List Window 尺寸
        const listY = materialBottom + infoH;
        const listH = this.mainAreaBottom() - listY;

        // 4. 创建 List Window
        const listRect = new Rectangle(0, listY, mainW, listH);
        this._listWindow = new Window_DisassembleList(listRect);
        // 绑定到 commandDisassemble (开启数量输入)
        this._listWindow.setHandler("ok", this.commandDisassemble.bind(this));
        this._listWindow.setHandler("cancel", this.popScene.bind(this));
        this.addWindow(this._listWindow);

        // 5. 创建数量输入窗口 (初始隐藏)
        this.createNumberWindow();

        // 6. 最终化
        this._listWindow.setInfoWindow(this._infoWindow);
        this._infoWindow.refresh();

        this._listWindow.refresh();

        this._listWindow.activate();
        this._listWindow.select(0);
    };

    // 【v3.2.1】顶部素材窗的矩形集中在这里，方便校验脚本核对。
    // y 从返回按钮区下方开始（buttonAreaBottom()），高度压成 1 行：
    // 这样右上角「返回」按钮所在的那一行留空，不会遮住素材数量。
    Scene_Disassemble.prototype.materialWindowRect = function() {
        return new Rectangle(0, this.buttonAreaBottom(), Graphics.boxWidth, this.calcWindowHeight(1, false));
    };

    Scene_Disassemble.prototype.createMaterialWindow = function() {
        this._materialWindow = new Window_DisassembleMaterials(this.materialWindowRect());
        this.addWindow(this._materialWindow);
    };
    
    Scene_Disassemble.prototype.createNumberWindow = function() {
        // 修复 2.4.6: 增加窗口宽度到 400 像素以容纳提示文字
        const WINDOW_WIDTH = 400; 
        // 修复 2.5.0: 增加行数到 6 行，以容纳按钮
        const numLines = 6; 
        const rect = new Rectangle(
            (Graphics.boxWidth / 2) - (WINDOW_WIDTH / 2), // 居中
            (Graphics.boxHeight / 2) - 100, // 稍微上移一点
            WINDOW_WIDTH, // 增加宽度
            this.calcWindowHeight(numLines, false) 
        );
        this._numberWindow = new Window_DisassembleNumberInput(rect);
        this._numberWindow.setHandler("ok", this.onNumberInputOk.bind(this));
        this._numberWindow.setHandler("cancel", this.onNumberInputCancel.bind(this));
        this.addWindow(this._numberWindow);
    };

    Scene_Disassemble.prototype.commandDisassemble = function() {
        const item = this._listWindow.item();
        const maxCount = $gameParty.numItems(item);
        

        if (item && maxCount > 0) {
            // 数量选择
            this._listWindow.deactivate(); 
            this._numberWindow.setup(item, maxCount); 
            
            // 确保窗口显示且立即激活
            this._numberWindow.show(); 
            this._numberWindow.activate();
        } else {
            // 不可刀解，播放错误音效并继续保持激活
            SoundManager.playBuzzer();
            this._listWindow.activate();
        }
    };
    
    Scene_Disassemble.prototype.onNumberInputOk = function() {
        const item = this._numberWindow.item();
        const count = this._numberWindow.number();


        this.performDisassemble(item, count); // 执行刀解核心逻辑
        
        // 隐藏并清理数量输入窗口
        this._numberWindow.hide(); 
        this._numberWindow.deactivate();
        
        // 刷新所有窗口
        this._listWindow.refresh();
        this._infoWindow.refresh();
        this._materialWindow.refresh();

        // 重新选择当前项 (或下一个有效项)
        const newIndex = this._listWindow.index().clamp(0, this._listWindow.maxItems() - 1);
        this._listWindow.select(newIndex);

        // 如果列表中还有物品，重新激活列表
        if (this._listWindow.maxItems() > 0 && this._listWindow.item()) { // 检查是否有有效物品
            this._listWindow.activate();
        } else {
            // 列表已空，关闭场景
            this.popScene();
        }
    };

    Scene_Disassemble.prototype.onNumberInputCancel = function() {
        SoundManager.playCancel();
        this._numberWindow.hide(); 
        this._numberWindow.deactivate();
        this._listWindow.activate();
    };

    // ** 核心刀解逻辑 **
    Scene_Disassemble.prototype.performDisassemble = function(item, count) {
        // 1. 扣除物品
        $gameParty.loseItem(item, count);
        
        // 2. 获取回收结果
        const results = getRecipeResults(item.id);
        
        // 3. 增加素材变量
        if (results) {
            results.forEach(result => {
                const totalGain = result.count * count;
                $gameVariables.setValue(result.varId, $gameVariables.value(result.varId) + totalGain);
            });
        }
        
        // 4. 播放成功音效
        SoundManager.playShop();
        
        // 5. 刷新顶部素材数量窗（刀解结果直接反映在数字上）
        if (this._materialWindow) {
            this._materialWindow.refresh();
        }
    };


    // 【v3.1.0】屏幕顶部不再是帮助窗，而是常驻的「素材数量窗」，
    // 位置由 materialWindowRect() 给出（见上方 create 附近），
    // 因此不再需要覆盖 helpWindowRect / createHelpWindow。

    
    // =========================================================================
    // 4. 窗口类定义
    // =========================================================================

    // ** Window_DisassembleMaterials（顶部素材数量窗，v3.1.0 新增）**
    function Window_DisassembleMaterials() { this.initialize.apply(this, arguments); }
    Window_DisassembleMaterials.prototype = Object.create(Window_Base.prototype);
    Window_DisassembleMaterials.prototype.constructor = Window_DisassembleMaterials;
    Window_DisassembleMaterials.prototype.initialize = function(rect) {
        Window_Base.prototype.initialize.call(this, rect);
        this.refresh();
    };
    Window_DisassembleMaterials.prototype.refresh = function() {
        if (!this.contents) return;
        this.contents.clear();
        const varIds = MATERIAL_VAR_IDS;
        if (varIds.length === 0) return;

        // 【v3.2.1】单行横排（窗口高度只有 1 行，让开右上角的返回按钮）
        const cellW = Math.floor(this.innerWidth / varIds.length);
        const labels = varIds.map(function(varId) {
            return ($dataSystem.variables[varId] || `变量${varId}`) + "：";
        });
        let labelW = 0;
        labels.forEach(function(text) {
            labelW = Math.max(labelW, this.textWidth(text));
        }, this);
        labelW = Math.min(labelW + 4, Math.floor(cellW * 0.6));
        const valueW = Math.max(0, cellW - labelW - 8);

        varIds.forEach((varId, index) => {
            const x = index * cellW;
            this.changeTextColor(ColorManager.systemColor());
            this.drawText(labels[index], x, 0, labelW, "left");
            this.resetTextColor();
            this.drawText($gameVariables.value(varId), x + labelW, 0, valueW, "right");
        });
    };
    
    // ** Window_DisassembleGold (空方法，防止出错) **
    function Window_DisassembleGold() { this.initialize.apply(this, arguments); }
    Window_DisassembleGold.prototype = Object.create(Window_Base.prototype);
    Window_DisassembleGold.prototype.constructor = Window_DisassembleGold;
    Window_DisassembleGold.prototype.initialize = Window_Base.prototype.initialize;
    Window_DisassembleGold.prototype.refresh = function() { /* 移除金币显示逻辑 */ };

    // ** Window_DisassembleInfo **
    function Window_DisassembleInfo() { this.initialize.apply(this, arguments); }
    Window_DisassembleInfo.prototype = Object.create(Window_Base.prototype);
    Window_DisassembleInfo.prototype.constructor = Window_DisassembleInfo;
    Window_DisassembleInfo.prototype.initialize = function(rect) { 
        Window_Base.prototype.initialize.call(this, rect); 
        this._item = null; 
    };
    Window_DisassembleInfo.prototype.setItem = function(item) { 
        if (this._item !== item) { 
            this._item = item; 
            this.refresh(); 
        } 
    };
    Window_DisassembleInfo.prototype.refresh = function() {
        if (!this.contents) return;
        this.contents.clear();
        
        // 手动定义行矩形计算
        const lineRect = (index) => {
            const x = 0;
            const y = this.lineHeight() * index;
            const width = this.innerWidth;
            const height = this.lineHeight();
            return new Rectangle(x, y, width, height);
        };

        if (this._item) {
            const rect = lineRect(0);
            this.drawItemName(this._item, rect.x, rect.y, rect.width);
            this.drawText("【刀解】回收素材：", rect.x, rect.y + this.lineHeight(), rect.width);
            const results = getRecipeResults(this._item.id);
            
            if (results && results.length > 0) {
                // 素材两列显示逻辑
                const colWidth = this.innerWidth / 2; // 每列宽度为窗口内容区的一半
                
                results.forEach((result, index) => {
                    const varName = $dataSystem.variables[result.varId] || `变量${result.varId}`;
                    
                    const col = index % 2; 
                    const row = Math.floor(index / 2); 
                    
                    // x 坐标: 0 或 colWidth
                    const x = col * colWidth;
                    // y 坐标: 第 3 行 (index=0) 开始 + row * lineHeight
                    const y = rect.y + this.lineHeight() * (2 + row); 

                    const drawWidth = colWidth;

                    this.changeTextColor(ColorManager.paramchangeTextColor()); 
                    // 绘制在各自的列中
                    this.drawText(`${varName}: +${result.count}`, x, y, drawWidth, 'left'); 
                });
                
                // 检查是否有太多素材 
                if (results.length > 4) {
                    this.resetTextColor();
                    const warningY = rect.y + this.lineHeight() * 4;
                    this.drawText("（注意：素材数量过多，部分未显示）", 0, warningY, this.innerWidth, 'center');
                }
                
            } else {
                this.resetTextColor();
                this.drawText("（无法刀解 / 未配置结果）", rect.x, rect.y + this.lineHeight() * 2, rect.width);
            }
        } else {
            this.drawText("把光标移到物品上，即可查看刀解收益。", 0, 0, this.innerWidth, 'center');
        }
    };
    Window_DisassembleInfo.prototype.drawItemName = Window_Base.prototype.drawItemName;

    
    // ** Window_DisassembleList (列表窗口) **
    function Window_DisassembleList() { this.initialize.apply(this, arguments); }
    Window_DisassembleList.prototype = Object.create(Window_Selectable.prototype);
    Window_DisassembleList.prototype.constructor = Window_DisassembleList;
    Window_DisassembleList.prototype.initialize = function(rect) { 
        Window_Selectable.prototype.initialize.call(this, rect); 
        this._data = []; 
        this._infoWindow = null; 
    };
    Window_DisassembleList.prototype.item = function() { return this._data[this.index()]; };
    Window_DisassembleList.prototype.setInfoWindow = function(infoWindow) { this._infoWindow = infoWindow; };
    Window_DisassembleList.prototype.maxCols = function() { return 2; };
    Window_DisassembleList.prototype.maxItems = function() { return this._data ? this._data.length : 1; }; 
    Window_DisassembleList.prototype.makeItemList = function() {
        // v3.0.0：不再读事件配置的 $gameSystem 数据，
        // 直接遍历插件内的配方表 —— 「默认全开 + 背包持有才显示」。
        this._data = enabledRecipeIds()
            .map(function(id) { return getDisassembleItem(id); })
            .filter(function(item) {
                return item !== null && $gameParty.numItems(item) > 0;
            });

        if (this._data.length === 0) {
            this._data.push(null);
        }
    };
    
    Window_DisassembleList.prototype.includes = function(item) { return false; };
    Window_DisassembleList.prototype.currentData = function() { return this.item(); };
    Window_DisassembleList.prototype.refresh = function() {
        this.makeItemList();
        Window_Selectable.prototype.refresh.call(this);
    };
    
    Window_DisassembleList.prototype.drawItem = function(index) {
        const item = this._data[index];
        const rect = this.itemRect(index);

        if (!item) {
            if (index === 0) {
                this.drawText("（没有可以刀解的物品）", rect.x, rect.y, rect.width * 2, 'center');
            }
            return;
        }

        const number = $gameParty.numItems(item);
        // 【v3.1.0】只留出「×数量」的宽度（原来给「持有:」留了 150，挤掉了名字）
        const numWidth = 80;

        this.drawItemName(item, rect.x, rect.y, rect.width - numWidth);
        this.resetTextColor();
        this.drawText("×" + number, rect.x + rect.width - numWidth, rect.y, numWidth, 'right');
    };
    
    Window_DisassembleList.prototype.updateHelp = function() {
        // 【v3.1.0】顶部不再是帮助窗，这里只同步下方的信息窗
        if (this._infoWindow) {
            this._infoWindow.setItem(this.item());
        }
    };

    // 【v3.2.1 修复】MZ 的 Window_Selectable.callUpdateHelp()（rmmz_windows.js L1339）写着
    //   if (this.active && this._helpWindow) { this.updateHelp(); }
    // 而 v3.1.0 起本场景不再创建帮助窗 -> _helpWindow 是 undefined ->
    // updateHelp() 永远不执行，信息窗就一直停在初始文案。
    // 这里绕开那道判断：窗口激活就刷新信息窗。
    Window_DisassembleList.prototype.callUpdateHelp = function() {
        if (this.active) {
            this.updateHelp();
        }
    };
    
    
    // ** Window_DisassembleNumberInput (数量输入窗口) **
    function Window_DisassembleNumberInput() { this.initialize.apply(this, arguments); }
    Window_DisassembleNumberInput.prototype = Object.create(Window_Selectable.prototype);
    Window_DisassembleNumberInput.prototype.constructor = Window_DisassembleNumberInput;

    Window_DisassembleNumberInput.prototype.initialize = function(rect) {
        Window_Selectable.prototype.initialize.call(this, rect);
        this._item = null;
        this._max = 0;
        this._number = 1;
        this.hide(); // 初始隐藏
    };
    
    // 确保有坐标转换方法 (兼容性)
    Window_DisassembleNumberInput.prototype.canvasToLocalX = function(x) {
        return x - this.x;
    };
    
    Window_DisassembleNumberInput.prototype.canvasToLocalY = function(y) {
        return y - this.y;
    };

    Window_DisassembleNumberInput.prototype.setup = function(item, max) {
        this._item = item;
        this._max = max;
        this._number = Math.min(1, this._max); // 默认选择 1
        this.refresh();
    };

    Window_DisassembleNumberInput.prototype.item = function() {
        return this._item;
    };

    Window_DisassembleNumberInput.prototype.number = function() {
        return this._number;
    };

    Window_DisassembleNumberInput.prototype.refresh = function() {
        this.contents.clear(); // 确保整体内容清空
        
        // =============================================================
        // 【新增】绘制深色背景，遮挡下层窗口，让按钮文字更清晰
        // =============================================================
        this.contents.fillRect(0, 0, this.innerWidth, this.innerHeight, "rgba(0, 0, 0, 0.8)");
        // =============================================================
        
        // Line 0: 标题
        this.drawText("刀解数量:", 0, 0, this.innerWidth, 'left');
        
        // Line 1: 物品名称
        if (this._item) { 
             this.drawItemName(this._item, 0, this.lineHeight(), this.innerWidth);
        }
        
        // Line 2: 数字
        this.drawNumber();
        
        // Line 3 & 4: 绘制交互按钮
        this.drawButtons();
		
		// =============================================================
        // 【新增】Line 5: 补回提示文字
        // 根据代码逻辑：上下是±1，左右是±10
        // =============================================================
        const hintY = this.lineHeight() * 5 + 4; // 放在第6行，稍微下移一点居中
        this.contents.fontSize = 18; // 使用小字体
        this.changeTextColor(ColorManager.systemColor()); // 使用系统色（通常是蓝色/黄色）区分提示
        this.drawText("↑/↓: ±10   ←/→: ±1", 0, hintY, this.innerWidth, 'center');
        this.resetFontSettings(); // 恢复字体设置
        // =============================================================
		
    };
    
    Window_DisassembleNumberInput.prototype.drawButtons = function() {
        this.contents.fontSize = 20;
        
        // 按钮布局参数
        const innerWidth = this.innerWidth;
        const buttonWidth = (innerWidth - 40) / 3; // 左右各留 10px + 中间两个 10px 间隔
        const buttonHeight = 36;
        
        // 按钮起始位置 (第4行开始)
        const startY1 = this.lineHeight() * 3; 
        const startY2 = this.lineHeight() * 4 + 6; // 稍微加点间距
        
        const buttonLabels = ['+1', '-1', '确定', '+10', '-10', '返回'];
        
        for (let i = 0; i < buttonLabels.length; i++) {
            const label = buttonLabels[i];
            const col = i % 3;
            const row = Math.floor(i / 3);
            const startY = (row === 0) ? startY1 : startY2;
            
            // x 坐标计算：起始左边距 10px + 列数 * (按钮宽度 + 间隙 10px)
            const x = 10 + col * (buttonWidth + 10);
            const y = startY;
            
            // 绘制按钮背景 (灰色)
            this.contents.fillRect(x, y, buttonWidth, buttonHeight, "rgba(100, 100, 100, 1)");
            
            // 绘制按钮标签 (白色文字)
            this.changeTextColor(ColorManager.normalColor());
            // 垂直居中调整
            this.drawText(label, x, y + 2, buttonWidth, "center"); 
        }
        
        this.resetFontSettings(); // 恢复默认字体大小
    };

    Window_DisassembleNumberInput.prototype.drawNumber = function() {
        // 调整数字的位置
        const x = 0;
        const y = this.lineHeight() * 2; // 位于第3行
        const width = this.innerWidth;
        
        // 1. 清空旧数字区域
        this.contents.clearRect(x, y, width, this.lineHeight()); 
        
        // =============================================================
        // 【新增】补回背景色 (因为 clearRect 会把背景擦成透明)
        // =============================================================
        this.contents.fillRect(x, y, width, this.lineHeight(), "rgba(0, 0, 0, 0.8)");
        // =============================================================
        
        const originalFontSize = this.contents.fontSize; 
        
        this.contents.fontSize = 32; // 稍微大一点
        this.drawText(`${this._number} / ${this._max}`, x, y, width, 'center');
        
        // 恢复默认字体大小
        this.contents.fontSize = originalFontSize;
    };

    Window_DisassembleNumberInput.prototype.maxItems = function() {
        return 0; // 不使用列表选择
    };

    Window_DisassembleNumberInput.prototype.update = function() {
        Window_Selectable.prototype.update.call(this);
        // 仅在激活状态下更新数字输入
        if (this.active) {
            this.updateNumber();
            this.processButtonTouch(); // 处理触摸/点击
        }
    };

    Window_DisassembleNumberInput.prototype.processButtonTouch = function() {
        if (TouchInput.isTriggered() && this.isOpenAndActive()) {
            const x = this.canvasToLocalX(TouchInput.x); 
            const y = this.canvasToLocalY(TouchInput.y);
            
            // 检查触摸是否在窗口内容区域内
            const contentX = x - this.padding;
            const contentY = y - this.padding;
            
            if (contentX >= 0 && contentX < this.innerWidth && contentY >= 0 && contentY < this.innerHeight) {
                
                const innerWidth = this.innerWidth;
                const buttonWidth = (innerWidth - 40) / 3;
                const buttonHeight = 36;
                
                const startY1 = this.lineHeight() * 3;
                const startY2 = this.lineHeight() * 4 + 6;
                
                const buttonLabels = ['+1', '-1', '确定', '+10', '-10', '返回'];
                
                for (let i = 0; i < buttonLabels.length; i++) {
                    const label = buttonLabels[i];
                    const col = i % 3;
                    const row = Math.floor(i / 3);
                    const startY = (row === 0) ? startY1 : startY2;
                    
                    const buttonX = 10 + col * (buttonWidth + 10); 
                    const buttonY = startY;
                    
                    const rect = {x: buttonX, y: buttonY, width: buttonWidth, height: buttonHeight};

                    // 触摸点在按钮范围内
                    if (isPointInRect(contentX, contentY, rect)) {
                        
                        // 根据按钮执行相应操作
                        if (label === '确定') {
                            this.processOk();
                        } else if (label === '返回') {
                            this.processCancel();
                        } else if (label === '+1') {
                            this.changeNumber(1);
                        } else if (label === '-1') {
                            this.changeNumber(-1);
                        } else if (label === '+10') {
                            this.changeNumber(10);
                        } else if (label === '-10') {
                            this.changeNumber(-10);
                        } else {
                             SoundManager.playOk(); 
                        }

                        // 清除输入，防止多次触发
                        TouchInput.clear(); 
                        return;
                    }
                }
            }
        }
    };

    Window_DisassembleNumberInput.prototype.updateNumber = function() {
        // 由于没有光标，仅响应输入
        if (Input.isRepeated("right")) {
            this.changeNumber(1); // 左右键是 ±1
        }
        if (Input.isRepeated("left")) {
            this.changeNumber(-1); // 左右键是 ±1
        }
        if (Input.isRepeated("up")) {
            this.changeNumber(10); // 上下键是 ±10
        }
        if (Input.isRepeated("down")) {
            this.changeNumber(-10); // 上下键是 ±10
        }
        // 确保能响应确定和取消键
        if (Input.isTriggered("ok")) {
            this.processOk();
        }
        if (Input.isTriggered("cancel")) {
            this.processCancel();
        }
    };

    Window_DisassembleNumberInput.prototype.changeNumber = function(amount) {
        const newNumber = this._number + amount;
        this._number = newNumber.clamp(1, this._max);
        this.drawNumber(); // 每次改变后重新绘制，并清除旧数字
        SoundManager.playCursor();
    };


    // =========================================================================
    // 5. 全局导出
    // =========================================================================
    
    window.Scene_Disassemble = Scene_Disassemble;
    window.Window_DisassembleGold = Window_DisassembleGold;
    window.Window_DisassembleMaterials = Window_DisassembleMaterials;
    window.Window_DisassembleInfo = Window_DisassembleInfo;
    window.Window_DisassembleList = Window_DisassembleList;
    window.Window_DisassembleNumberInput = Window_DisassembleNumberInput;

    // 供 tools/disassemble-recipe-check.js 与游戏内调试查看
    window.DisassembleListConfig = {
        params: PARAMS,
        recipes: RECIPES,
        materialVarIds: MATERIAL_VAR_IDS,
        gainOf: disassembleGain,
        resultsOf: getRecipeResults,
        enabledIds: enabledRecipeIds
    };

})();
