// 随机素材转换 - 参数可配置版 for RPG Maker MZ
// 版本：1.0.0
// 说明：界面与参数结构参照刀解清单（DisassembleList）；
//       随机规则参照公共事件 022「获得随机强化素材」（随机给物品 41~48 之一）。
//       ⚠ 本插件不修改任何公共事件 / 地图事件，接入方式是在事件里用插件命令 open。
// 作者：AI Assistant

/*:
 * @target MZ
 * @plugindesc 【随机素材转换】把刀身换成随机一种强化素材；可转换物品与产出素材都在插件参数里配置。(v1.0.0)
 * @author AI Assistant
 *
 * @param convertList
 * @text [转换] 可转换物品
 * @desc 可以拿来转换的物品（选刀身道具即可）。消耗 1 个 -> 随机产出 1 个强化素材。
 * @type struct<ConvertEntry>[]
 * @default ["{\"itemId\":\"50\",\"enabled\":\"true\"}","{\"itemId\":\"51\",\"enabled\":\"true\"}","{\"itemId\":\"52\",\"enabled\":\"true\"}","{\"itemId\":\"53\",\"enabled\":\"true\"}","{\"itemId\":\"54\",\"enabled\":\"true\"}","{\"itemId\":\"55\",\"enabled\":\"true\"}","{\"itemId\":\"56\",\"enabled\":\"true\"}","{\"itemId\":\"57\",\"enabled\":\"true\"}","{\"itemId\":\"58\",\"enabled\":\"true\"}","{\"itemId\":\"59\",\"enabled\":\"true\"}","{\"itemId\":\"60\",\"enabled\":\"true\"}","{\"itemId\":\"61\",\"enabled\":\"true\"}","{\"itemId\":\"62\",\"enabled\":\"true\"}","{\"itemId\":\"63\",\"enabled\":\"true\"}","{\"itemId\":\"65\",\"enabled\":\"true\"}"]
 *
 * @param resultItems
 * @text [产出] 强化素材表
 * @desc 随机产出的素材与权重（权重越大越容易出）。默认物品 41~48、权重各 1（等概率）。
 * @type struct<ResultEntry>[]
 * @default ["{\"itemId\":\"41\",\"weight\":\"1\"}","{\"itemId\":\"42\",\"weight\":\"1\"}","{\"itemId\":\"43\",\"weight\":\"1\"}","{\"itemId\":\"44\",\"weight\":\"1\"}","{\"itemId\":\"45\",\"weight\":\"1\"}","{\"itemId\":\"46\",\"weight\":\"1\"}","{\"itemId\":\"47\",\"weight\":\"1\"}","{\"itemId\":\"48\",\"weight\":\"1\"}"]
 *
 * @param drawPerItem
 * @text [规则] 每个物品抽取次数
 * @desc 转换 1 个物品时抽几次（默认 1 次 = 得到 1 个素材）。
 * @type number
 * @min 1
 * @default 1
 *
 * @help
 * ============================================================
 * 一、这个系统做什么
 * ============================================================
 * 把刀身（或你指定的任何物品）转换成**随机一种强化素材**：
 *     消耗 1 个物品 -> 从「[产出] 强化素材表」按权重随机抽 1 个 -> 进背包
 *
 * 规则与公共事件 022「获得随机强化素材」一致（那边是 V9 随机 1~8 给物品 41~48），
 * 本插件把它做成了可以主动使用的界面。
 *
 * ⚠ 本插件**不会**修改任何公共事件或地图事件。
 *   要使用它，请在事件里用插件命令调用：RandomConvertList open
 *
 * ============================================================
 * 二、怎么配置（编辑器内）
 * ============================================================
 * 插件管理器 → RandomConvertList：
 *
 * [转换] 可转换物品 ：每行 = 物品ID + 启用（默认 15 种刀身，全开）
 * [产出] 强化素材表 ：每行 = 素材ID + 权重（默认 41~48 各 1 = 等概率）
 * [规则] 每个物品抽取次数 ：默认 1
 *
 * 例：把「强化素材5」权重改成 5，它出现的概率就是别的 5 倍；权重填 0 = 永不产出。
 *
 * ============================================================
 * 三、界面
 * ============================================================
 * [素材窗] 屏幕顶部（2 行 x 4 格）：常驻显示产出素材的持有量，转换后立刻刷新
 * [信息窗] 选中物品的名字 + 转换说明 + 可能产出
 * [列表窗] 2 列，每项「物品名 x数量」；只有「已启用 + 背包持有 > 0」的物品才会出现
 * [数量窗] 按钮 +1 / -1 / +10 / -10 / 确定 / 返回
 *          键盘 ↑↓ = ±10，←→ = ±1，OK / Cancel 同确定 / 返回
 * [结果窗] 转换完成后列出本次全部产出（同类合并计数）
 *
 * ============================================================
 * 四、界面布局（816x624）
 * ============================================================
 * 素材窗 y=52..148（让开右上角返回按钮所在的 y=2..50 那一行）
 * 信息窗 y=148..280
 * 列表窗 y=280..624
 * 数量窗 / 结果窗 居中弹出
 *
 * @command open
 * @text 打开随机素材转换
 * @desc 打开随机素材转换界面。
 */

/*~struct~ConvertEntry:
 * @param itemId
 * @text 物品ID
 * @desc 可转换的物品（选刀身道具即可）。
 * @type item
 * @default 50
 *
 * @param enabled
 * @text 启用
 * @desc 关闭后该项不会出现在转换列表里。
 * @type boolean
 * @on 启用
 * @off 关闭
 * @default true
 */

/*~struct~ResultEntry:
 * @param itemId
 * @text 素材ID
 * @desc 随机产出的强化素材。
 * @type item
 * @default 41
 *
 * @param weight
 * @text 权重
 * @desc 越大越容易抽到（默认 1）。填 0 = 永不产出。
 * @type number
 * @min 0
 * @default 1
 */

(function() {
    'use strict';

    const PLUGIN_NAME = "RandomConvertList";
    const PARAMS = PluginManager.parameters(PLUGIN_NAME);

    // =========================================================================
    // 1. 参数与数据（参数读不到 / 被清空时回退下面的默认表）
    // =========================================================================
    const DEFAULT_CONVERT_IDS = [50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 65];
    const DEFAULT_RESULT_IDS = [41, 42, 43, 44, 45, 46, 47, 48];

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

    function parseConvertList(raw) {
        const table = {};
        parseStructArray(raw).forEach(function(entry) {
            const itemId = Number(entry.itemId);
            if (!(itemId > 0)) {
                return;
            }
            table[itemId] = { enabled: String(entry.enabled) !== "false" };
        });
        if (Object.keys(table).length > 0) {
            return table;
        }
        const fallback = {};
        DEFAULT_CONVERT_IDS.forEach(function(id) {
            fallback[id] = { enabled: true };
        });
        return fallback;
    }

    function parseResultList(raw) {
        const table = {};
        parseStructArray(raw).forEach(function(entry) {
            const itemId = Number(entry.itemId);
            if (!(itemId > 0)) {
                return;
            }
            const weight = Number(entry.weight);
            table[itemId] = { weight: weight > 0 ? weight : 0 };
        });
        if (Object.keys(table).length > 0) {
            return table;
        }
        const fallback = {};
        DEFAULT_RESULT_IDS.forEach(function(id) {
            fallback[id] = { weight: 1 };
        });
        return fallback;
    }

    const CONVERT_TABLE = parseConvertList(PARAMS.convertList);
    const RESULT_TABLE = parseResultList(PARAMS.resultItems);
    const DRAW_PER_ITEM = Math.max(1, Number(PARAMS.drawPerItem) || 1);

    // 数据库里的物品（道具 / 武器 / 防具都认）
    function getDbItem(id) {
        const itemId = Number(id);
        if (itemId <= 0) return null;
        if ($dataItems[itemId] && DataManager.isItem($dataItems[itemId])) return $dataItems[itemId];
        if ($dataWeapons[itemId] && DataManager.isWeapon($dataWeapons[itemId])) return $dataWeapons[itemId];
        if ($dataArmors[itemId] && DataManager.isArmor($dataArmors[itemId])) return $dataArmors[itemId];
        return null;
    }

    // 可转换物品（已启用 + 数据库存在），按 ID 升序
    function enabledConvertItems() {
        return Object.keys(CONVERT_TABLE)
            .map(function(id) { return Number(id); })
            .filter(function(id) { return CONVERT_TABLE[id].enabled !== false; })
            .sort(function(a, b) { return a - b; })
            .map(function(id) { return getDbItem(id); })
            .filter(function(item) { return item !== null; });
    }

    // 产出池（权重 > 0 + 数据库存在），按 ID 升序
    function resultPool() {
        return Object.keys(RESULT_TABLE)
            .map(function(id) { return Number(id); })
            .filter(function(id) { return RESULT_TABLE[id].weight > 0; })
            .sort(function(a, b) { return a - b; })
            .map(function(id) {
                return { item: getDbItem(id), weight: RESULT_TABLE[id].weight };
            })
            .filter(function(entry) { return entry.item !== null; });
    }

    // 按权重随机抽一个产出素材
    function pickResultItem() {
        const pool = resultPool();
        if (pool.length === 0) return null;
        const total = pool.reduce(function(sum, entry) { return sum + entry.weight; }, 0);
        let roll = Math.random() * total;
        for (let i = 0; i < pool.length; i++) {
            roll -= pool[i].weight;
            if (roll < 0) return pool[i].item;
        }
        return pool[pool.length - 1].item;
    }

    // 安全进包：返回「因为 99 上限而没能收下的数量」
    function gainResultItem(item, count) {
        const max = $gameParty.maxItems(item);
        const room = Math.max(0, max - $gameParty.numItems(item));
        const accepted = Math.min(count, room);
        if (accepted > 0) {
            $gameParty.gainItem(item, accepted);
        }
        return count - accepted;
    }

    // =========================================================================
    // 2. 插件命令注册
    // =========================================================================
    PluginManager.registerCommand(PLUGIN_NAME, "open", function(args) {
        SceneManager.push(Scene_RandomConvert);
    });

    // =========================================================================
    // 3. 场景定义 - Scene_RandomConvert（核心流程）
    // =========================================================================
    function Scene_RandomConvert() {
        this.initialize.apply(this, arguments);
    }

    Scene_RandomConvert.prototype = Object.create(Scene_MenuBase.prototype);
    Scene_RandomConvert.prototype.constructor = Scene_RandomConvert;

    Scene_RandomConvert.prototype.initialize = function() {
        Scene_MenuBase.prototype.initialize.call(this);
    };

    // 与 MZ 的 Window_Base.fittingHeight 一致（lineHeight 36 + padding 12 x 2）
    Scene_RandomConvert.prototype.calcWindowHeight = function(numLines, selectable) {
        return numLines * 36 + 12 * 2;
    };

    Scene_RandomConvert.prototype.mainAreaWidth = function() {
        return Graphics.boxWidth;
    };

    Scene_RandomConvert.prototype.mainAreaBottom = function() {
        return Graphics.boxHeight;
    };

    // 顶部素材窗矩形：从返回按钮区下方开始（右上角那一行留给「返回」按钮）
    Scene_RandomConvert.prototype.materialWindowRect = function() {
        return new Rectangle(0, this.buttonAreaBottom(), Graphics.boxWidth, this.calcWindowHeight(2, false));
    };

    Scene_RandomConvert.prototype.create = function() {
        Scene_MenuBase.prototype.create.call(this);

        const mainW = this.mainAreaWidth();

        // 1. 顶部素材窗（产出素材的持有量）
        this.createMaterialWindow();
        const materialBottom = this._materialWindow.y + this._materialWindow.height;

        // 2. 信息窗（3 行：物品名 + 转换说明 + 可能产出）
        const infoH = this.calcWindowHeight(3, false);
        this._infoWindow = new Window_RandomConvertInfo(new Rectangle(0, materialBottom, mainW, infoH));
        this.addWindow(this._infoWindow);

        // 3. 列表窗
        const listY = materialBottom + infoH;
        const listH = this.mainAreaBottom() - listY;
        this._listWindow = new Window_RandomConvertList(new Rectangle(0, listY, mainW, listH));
        this._listWindow.setHandler("ok", this.commandConvert.bind(this));
        this._listWindow.setHandler("cancel", this.popScene.bind(this));
        this._listWindow.setInfoWindow(this._infoWindow);
        this.addWindow(this._listWindow);

        // 4. 数量窗 / 结果窗
        this.createNumberWindow();
        this.createResultWindow();

        // 5. 收尾
        this._infoWindow.refresh();
        this._listWindow.refresh();
        this._listWindow.activate();
        this._listWindow.select(0);
    };

    Scene_RandomConvert.prototype.createMaterialWindow = function() {
        this._materialWindow = new Window_RandomConvertMaterials(this.materialWindowRect());
        this.addWindow(this._materialWindow);
    };

    Scene_RandomConvert.prototype.createNumberWindow = function() {
        const WINDOW_WIDTH = 400;
        const rect = new Rectangle(
            (Graphics.boxWidth - WINDOW_WIDTH) / 2,
            (Graphics.boxHeight / 2) - 100,
            WINDOW_WIDTH,
            this.calcWindowHeight(6, false)
        );
        this._numberWindow = new Window_RandomConvertNumberInput(rect);
        this._numberWindow.setHandler("ok", this.onNumberInputOk.bind(this));
        this._numberWindow.setHandler("cancel", this.onNumberInputCancel.bind(this));
        this.addWindow(this._numberWindow);
    };

    Scene_RandomConvert.prototype.createResultWindow = function() {
        const WINDOW_WIDTH = 600;
        const rect = new Rectangle(
            (Graphics.boxWidth - WINDOW_WIDTH) / 2, 90,
            WINDOW_WIDTH, this.calcWindowHeight(6, false)
        );
        this._resultWindow = new Window_RandomConvertResult(rect);
        this._resultWindow.setHandler("ok", this.onResultWindowOk.bind(this));
        this._resultWindow.setHandler("cancel", this.onResultWindowOk.bind(this));
        this.addWindow(this._resultWindow);
    };

    // 列表按下「确定」-> 打开数量窗
    Scene_RandomConvert.prototype.commandConvert = function() {
        const item = this._listWindow.item();
        const maxCount = item ? $gameParty.numItems(item) : 0;
        if (item && maxCount > 0) {
            this._listWindow.deactivate();
            this._numberWindow.setup(item, maxCount);
            this._numberWindow.show();
            this._numberWindow.activate();
        } else {
            SoundManager.playBuzzer();
            this._listWindow.activate();
        }
    };

    Scene_RandomConvert.prototype.onNumberInputOk = function() {
        const item = this._numberWindow.item();
        const count = this._numberWindow.number();

        this._numberWindow.hide();
        this._numberWindow.deactivate();

        const summary = this.performConvert(item, count);

        this._listWindow.refresh();
        this._infoWindow.refresh();
        this._materialWindow.refresh();

        this._resultWindow.setSummary(item, count, summary);
        this._resultWindow.show();
        this._resultWindow.activate();
    };

    Scene_RandomConvert.prototype.onNumberInputCancel = function() {
        SoundManager.playCancel();
        this._numberWindow.hide();
        this._numberWindow.deactivate();
        this._listWindow.activate();
    };

    Scene_RandomConvert.prototype.onResultWindowOk = function() {
        SoundManager.playOk();
        this._resultWindow.hide();
        this._resultWindow.deactivate();

        this._listWindow.refresh();
        if (this._listWindow.maxItems() > 0 && this._listWindow.item()) {
            const index = this._listWindow.index().clamp(0, Math.max(0, this._listWindow.maxItems() - 1));
            this._listWindow.select(index);
            this._listWindow.activate();
        } else {
            // 列表空了就直接离开场景
            this.popScene();
        }
    };

    // ** 核心转换逻辑 **
    // 扣掉物品 -> 每抽一次随机一个素材 -> 汇总进包
    Scene_RandomConvert.prototype.performConvert = function(item, count) {
        $gameParty.loseItem(item, count);

        const gained = {};      // 素材ID -> 数量
        const overflow = {};    // 素材ID -> 因为 99 上限而没收下的数量
        const draws = count * DRAW_PER_ITEM;

        for (let i = 0; i < draws; i++) {
            const result = pickResultItem();
            if (!result) break;
            gained[result.id] = (gained[result.id] || 0) + 1;
        }

        Object.keys(gained).forEach(function(id) {
            const resultItem = getDbItem(Number(id));
            if (!resultItem) return;
            const lost = gainResultItem(resultItem, gained[id]);
            if (lost > 0) {
                overflow[id] = lost;
            }
        });

        SoundManager.playShop();
        return { gained: gained, overflow: overflow, draws: draws };
    };
    // =========================================================================
    // 4. 窗口类定义
    // =========================================================================

    // ** Window_RandomConvertMaterials（顶部素材持有量窗：2 行 x 4 格）**
    function Window_RandomConvertMaterials() { this.initialize.apply(this, arguments); }
    Window_RandomConvertMaterials.prototype = Object.create(Window_Base.prototype);
    Window_RandomConvertMaterials.prototype.constructor = Window_RandomConvertMaterials;
    Window_RandomConvertMaterials.prototype.initialize = function(rect) {
        Window_Base.prototype.initialize.call(this, rect);
        this.refresh();
    };
    Window_RandomConvertMaterials.prototype.refresh = function() {
        if (!this.contents) return;
        this.contents.clear();
        const pool = resultPool();
        if (pool.length === 0) return;

        const maxShow = Math.min(pool.length, 8);      // 窗口只有 2 行 x 4 格
        const cols = Math.min(4, maxShow);
        const cellW = Math.floor(this.innerWidth / cols);

        this.contents.fontSize = 22;                   // 素材名较长，用小一号字
        pool.slice(0, maxShow).forEach((entry, index) => {
            const col = index % cols;
            const row = Math.floor(index / cols);
            const x = col * cellW;
            const y = row * this.lineHeight();
            if (y + this.lineHeight() > this.innerHeight) return;

            const label = entry.item.name + "：";
            const labelW = Math.min(this.textWidth(label), Math.floor(cellW * 0.72));
            this.changeTextColor(ColorManager.systemColor());
            this.drawText(label, x, y, labelW, "left");
            this.resetTextColor();
            this.drawText($gameParty.numItems(entry.item), x + labelW, y, Math.max(0, cellW - labelW - 8), "right");
        });
        this.resetFontSettings();
    };

    // ** Window_RandomConvertInfo（信息窗：3 行）**
    function Window_RandomConvertInfo() { this.initialize.apply(this, arguments); }
    Window_RandomConvertInfo.prototype = Object.create(Window_Base.prototype);
    Window_RandomConvertInfo.prototype.constructor = Window_RandomConvertInfo;
    Window_RandomConvertInfo.prototype.initialize = function(rect) {
        Window_Base.prototype.initialize.call(this, rect);
        this._item = null;
    };
    Window_RandomConvertInfo.prototype.setItem = function(item) {
        if (this._item !== item) {
            this._item = item;
            this.refresh();
        }
    };
    Window_RandomConvertInfo.prototype.refresh = function() {
        if (!this.contents) return;
        this.contents.clear();
        const line = this.lineHeight();

        if (!this._item) {
            this.drawText("把光标移到物品上，即可查看转换说明。", 0, 0, this.innerWidth, "center");
            return;
        }

        this.drawItemName(this._item, 0, 0, this.innerWidth);
        this.drawText("【随机转换】消耗 1 个 -> 随机获得 1 个强化素材", 0, line, this.innerWidth, "left");

        const names = resultPool().map(function(entry) { return entry.item.name; });
        let text;
        if (names.length === 0) {
            text = "可能产出：（未配置产出素材）";
        } else if (names.length <= 3) {
            text = "可能产出：" + names.join(" / ");
        } else {
            text = "可能产出：" + names.slice(0, 3).join(" / ") + " 等 " + names.length + " 种";
        }
        this.changeTextColor(ColorManager.systemColor());
        this.drawText(text, 0, line * 2, this.innerWidth, "left");
        this.resetTextColor();
    };
    Window_RandomConvertInfo.prototype.drawItemName = Window_Base.prototype.drawItemName;

    // ** Window_RandomConvertList（可转换物品列表）**
    function Window_RandomConvertList() { this.initialize.apply(this, arguments); }
    Window_RandomConvertList.prototype = Object.create(Window_Selectable.prototype);
    Window_RandomConvertList.prototype.constructor = Window_RandomConvertList;
    Window_RandomConvertList.prototype.initialize = function(rect) {
        Window_Selectable.prototype.initialize.call(this, rect);
        this._data = [];
        this._infoWindow = null;
    };
    Window_RandomConvertList.prototype.item = function() { return this._data[this.index()]; };
    Window_RandomConvertList.prototype.setInfoWindow = function(infoWindow) { this._infoWindow = infoWindow; };
    Window_RandomConvertList.prototype.maxCols = function() { return 2; };
    Window_RandomConvertList.prototype.maxItems = function() { return this._data ? this._data.length : 1; };
    Window_RandomConvertList.prototype.makeItemList = function() {
        // 只有「参数里已启用」且「背包持有 > 0」的物品才会出现
        this._data = enabledConvertItems().filter(function(item) {
            return $gameParty.numItems(item) > 0;
        });
        if (this._data.length === 0) {
            this._data.push(null);
        }
    };
    Window_RandomConvertList.prototype.currentData = function() { return this.item(); };
    Window_RandomConvertList.prototype.refresh = function() {
        this.makeItemList();
        Window_Selectable.prototype.refresh.call(this);
    };
    Window_RandomConvertList.prototype.drawItem = function(index) {
        const item = this._data[index];
        const rect = this.itemRect(index);

        if (!item) {
            if (index === 0) {
                this.drawText("（没有可以转换的物品）", rect.x, rect.y, rect.width * 2, "center");
            }
            return;
        }

        const number = $gameParty.numItems(item);
        const numWidth = 80;
        this.drawItemName(item, rect.x, rect.y, rect.width - numWidth);
        this.resetTextColor();
        this.drawText("×" + number, rect.x + rect.width - numWidth, rect.y, numWidth, "right");
    };
    Window_RandomConvertList.prototype.updateHelp = function() {
        if (this._infoWindow) {
            this._infoWindow.setItem(this.item());
        }
    };

    // MZ 原版 callUpdateHelp 会检查 this._helpWindow（rmmz_windows.js L1339），
    // 本场景没有帮助窗 -> 必须绕开，否则信息窗永远不刷新。
    Window_RandomConvertList.prototype.callUpdateHelp = function() {
        if (this.active) {
            this.updateHelp();
        }
    };

    // ** Window_RandomConvertNumberInput（数量输入窗）**
    function Window_RandomConvertNumberInput() { this.initialize.apply(this, arguments); }
    Window_RandomConvertNumberInput.prototype = Object.create(Window_Selectable.prototype);
    Window_RandomConvertNumberInput.prototype.constructor = Window_RandomConvertNumberInput;

    Window_RandomConvertNumberInput.prototype.initialize = function(rect) {
        Window_Selectable.prototype.initialize.call(this, rect);
        this._item = null;
        this._max = 0;
        this._number = 1;
        this.hide();
    };

    Window_RandomConvertNumberInput.prototype.canvasToLocalX = function(x) { return x - this.x; };
    Window_RandomConvertNumberInput.prototype.canvasToLocalY = function(y) { return y - this.y; };

    Window_RandomConvertNumberInput.prototype.setup = function(item, max) {
        this._item = item;
        this._max = max;
        this._number = Math.min(1, this._max);
        this.refresh();
    };
    Window_RandomConvertNumberInput.prototype.item = function() { return this._item; };
    Window_RandomConvertNumberInput.prototype.number = function() { return this._number; };

    Window_RandomConvertNumberInput.prototype.buttonLabels = function() {
        return ["+1", "-1", "确定", "+10", "-10", "返回"];
    };
    Window_RandomConvertNumberInput.prototype.buttonLayout = function() {
        const buttonWidth = (this.innerWidth - 40) / 3;
        const buttonHeight = 36;
        const startY1 = this.lineHeight() * 3;
        const startY2 = this.lineHeight() * 4 + 6;
        return { buttonWidth: buttonWidth, buttonHeight: buttonHeight, startY1: startY1, startY2: startY2 };
    };

    Window_RandomConvertNumberInput.prototype.refresh = function() {
        this.contents.clear();
        this.contents.fillRect(0, 0, this.innerWidth, this.innerHeight, "rgba(0, 0, 0, 0.8)");

        this.drawText("转换数量:", 0, 0, this.innerWidth, "left");
        if (this._item) {
            this.drawItemName(this._item, 0, this.lineHeight(), this.innerWidth);
        }
        this.drawNumber();
        this.drawButtons();

        const hintY = this.lineHeight() * 5 + 4;
        this.contents.fontSize = 18;
        this.changeTextColor(ColorManager.systemColor());
        this.drawText("↑/↓: ±10   ←/→: ±1", 0, hintY, this.innerWidth, "center");
        this.resetFontSettings();
    };

    Window_RandomConvertNumberInput.prototype.drawButtons = function() {
        this.contents.fontSize = 20;
        const layout = this.buttonLayout();
        this.buttonLabels().forEach((label, i) => {
            const col = i % 3;
            const row = Math.floor(i / 3);
            const x = 10 + col * (layout.buttonWidth + 10);
            const y = (row === 0) ? layout.startY1 : layout.startY2;
            this.contents.fillRect(x, y, layout.buttonWidth, layout.buttonHeight, "rgba(100, 100, 100, 1)");
            this.changeTextColor(ColorManager.normalColor());
            this.drawText(label, x, y + 2, layout.buttonWidth, "center");
        });
        this.resetFontSettings();
    };

    Window_RandomConvertNumberInput.prototype.drawNumber = function() {
        const x = 0;
        const y = this.lineHeight() * 2;
        const width = this.innerWidth;
        this.contents.clearRect(x, y, width, this.lineHeight());
        this.contents.fillRect(x, y, width, this.lineHeight(), "rgba(0, 0, 0, 0.8)");
        const originalFontSize = this.contents.fontSize;
        this.contents.fontSize = 32;
        this.drawText(this._number + " / " + this._max, x, y, width, "center");
        this.contents.fontSize = originalFontSize;
    };

    Window_RandomConvertNumberInput.prototype.maxItems = function() { return 0; };

    Window_RandomConvertNumberInput.prototype.update = function() {
        Window_Selectable.prototype.update.call(this);
        if (this.active) {
            this.updateNumber();
            this.processButtonTouch();
        }
    };

    Window_RandomConvertNumberInput.prototype.processButtonTouch = function() {
        if (!TouchInput.isTriggered() || !this.isOpenAndActive()) return;

        const contentX = this.canvasToLocalX(TouchInput.x) - this.padding;
        const contentY = this.canvasToLocalY(TouchInput.y) - this.padding;
        if (contentX < 0 || contentX >= this.innerWidth || contentY < 0 || contentY >= this.innerHeight) return;

        const layout = this.buttonLayout();
        const labels = this.buttonLabels();
        for (let i = 0; i < labels.length; i++) {
            const col = i % 3;
            const row = Math.floor(i / 3);
            const buttonX = 10 + col * (layout.buttonWidth + 10);
            const buttonY = (row === 0) ? layout.startY1 : layout.startY2;
            const rect = { x: buttonX, y: buttonY, width: layout.buttonWidth, height: layout.buttonHeight };
            if (contentX >= rect.x && contentX < rect.x + rect.width &&
                contentY >= rect.y && contentY < rect.y + rect.height) {
                const label = labels[i];
                if (label === "确定") {
                    this.processOk();
                } else if (label === "返回") {
                    this.processCancel();
                } else if (label === "+1") {
                    this.changeNumber(1);
                } else if (label === "-1") {
                    this.changeNumber(-1);
                } else if (label === "+10") {
                    this.changeNumber(10);
                } else if (label === "-10") {
                    this.changeNumber(-10);
                }
                TouchInput.clear();
                return;
            }
        }
    };

    Window_RandomConvertNumberInput.prototype.updateNumber = function() {
        if (Input.isRepeated("right")) this.changeNumber(1);
        if (Input.isRepeated("left")) this.changeNumber(-1);
        if (Input.isRepeated("up")) this.changeNumber(10);
        if (Input.isRepeated("down")) this.changeNumber(-10);
        if (Input.isTriggered("ok")) this.processOk();
        if (Input.isTriggered("cancel")) this.processCancel();
    };

    Window_RandomConvertNumberInput.prototype.changeNumber = function(amount) {
        this._number = (this._number + amount).clamp(1, this._max);
        this.drawNumber();
        SoundManager.playCursor();
    };

    // ** Window_RandomConvertResult（转换结果窗，行数多时可滚动）**
    function Window_RandomConvertResult() { this.initialize.apply(this, arguments); }
    Window_RandomConvertResult.prototype = Object.create(Window_Selectable.prototype);
    Window_RandomConvertResult.prototype.constructor = Window_RandomConvertResult;
    Window_RandomConvertResult.prototype.initialize = function(rect) {
        Window_Selectable.prototype.initialize.call(this, rect);
        this._lines = [];
        this.deactivate();
        this.hide();
    };
    Window_RandomConvertResult.prototype.maxItems = function() { return this._lines.length; };
    Window_RandomConvertResult.prototype.itemHeight = function() { return this.lineHeight(); };
    Window_RandomConvertResult.prototype.maxCols = function() { return 1; };
    Window_RandomConvertResult.prototype.isCursorVisible = function() { return false; };
    Window_RandomConvertResult.prototype.refreshCursor = function() { /* 结果窗不画光标 */ };
    Window_RandomConvertResult.prototype.drawItem = function(index) {
        const rect = this.itemRect(index);
        this.drawText(this._lines[index], rect.x, rect.y, rect.width, "left");
    };
    Window_RandomConvertResult.prototype.setSummary = function(item, count, summary) {
        this._lines = this.buildLines(item, count, summary);
        this.refresh();
        this.scrollTo(0, 0);
        this.select(0);
    };
    Window_RandomConvertResult.prototype.buildLines = function(item, count, summary) {
        const lines = [];
        lines.push("随机转换完成：消耗 " + count + " 个 " + item.name);

        const ids = Object.keys(summary.gained);
        if (ids.length === 0) {
            lines.push("（没有配置可产出的素材，什么也没得到）");
            return lines;
        }

        let current = "获得：";
        ids.forEach((id, index) => {
            const entry = getDbItem(Number(id));
            const part = (entry ? entry.name : ("物品" + id)) + " ×" + summary.gained[id];
            const separator = (index === ids.length - 1) ? "" : "，";
            if (current !== "获得：" && this.textWidth(current + part + separator) > this.innerWidth - 8) {
                lines.push(current);
                current = "　　　" + part + separator;
            } else {
                current = current + part + separator;
            }
        }, this);
        lines.push(current);

        Object.keys(summary.overflow).forEach(function(id) {
            const entry = getDbItem(Number(id));
            lines.push("（" + (entry ? entry.name : ("物品" + id)) + " 已达 99 上限，" +
                       summary.overflow[id] + " 个没能收下）");
        });
        return lines;
    };

    // =========================================================================
    // 5. 全局导出
    // =========================================================================
    window.Scene_RandomConvert = Scene_RandomConvert;
    window.Window_RandomConvertMaterials = Window_RandomConvertMaterials;
    window.Window_RandomConvertInfo = Window_RandomConvertInfo;
    window.Window_RandomConvertList = Window_RandomConvertList;
    window.Window_RandomConvertNumberInput = Window_RandomConvertNumberInput;
    window.Window_RandomConvertResult = Window_RandomConvertResult;

    // 供 tools/randomconvert-check.js 与游戏内调试查看
    window.RandomConvertListConfig = {
        params: PARAMS,
        convertTable: CONVERT_TABLE,
        resultTable: RESULT_TABLE,
        drawPerItem: DRAW_PER_ITEM,
        convertItems: enabledConvertItems,
        pool: resultPool,
        pick: pickResultItem,
        gain: gainResultItem
    };

})();