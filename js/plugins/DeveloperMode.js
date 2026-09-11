//=============================================================================
// DeveloperMode.js - 开发者模式插件 (RPG Maker MZ)
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [开发者模式] 玩家可自选获取道具/武器/防具、改变开关与变量、调整角色等级
 * @author Codex
 *
 * @help
 * ============================================================================
 * 插件简介
 * ============================================================================
 * 本插件提供「开发者模式」菜单，玩家可以在游戏内：
 *   · 获取道具 / 武器 / 防具（自选物品与数量，直接加入背包）
 *   · 改变开关（浏览并切换任意开关的 ON/OFF）
 *   · 改变变量（浏览并修改任意变量的数值）
 *   · 提升 / 降低等级（选择角色并设置新等级）
 *
 * ============================================================================
 * 如何打开
 * ============================================================================
 * 1. 插件命令（推荐，可放在任意事件中调用）：
 *       DeveloperMode open
 *     也可以直接打开某个子页面：
 *       DeveloperMode open items      ← 获取道具
 *       DeveloperMode open weapons    ← 获取武器
 *       DeveloperMode open armors     ← 获取防具
 *       DeveloperMode open switches   ← 改变开关
 *       DeveloperMode open variables  ← 改变变量
 *       DeveloperMode open level      ← 提升/降低等级
 *
 * 2. 主菜单命令：
 *    当参数「菜单命令」为 true（默认）时，主菜单会新增「开发者模式」命令。
 *    若不想在正式版本中开放，请把该参数改为 false，仅通过插件命令调用。
 *
 * ============================================================================
 * 操作说明
 * ============================================================================
 * · 列表页：方向键移动光标，确定键进入下一步，取消键返回。
 * · 数量 / 数值输入页：
 *     ←/→  ±1      ↑/↓  ±10      PageUp / PageDown  ±100
 *     确定键确认，取消键返回。
 *     鼠标 / 触屏可直接点击按钮（-100 -10 -1 +1 +10 +100 归零 确定 取消）。
 *
 * ============================================================================
 * 备注
 * ============================================================================
 * · 获取武器 / 防具时，若角色身上已装备同类物品，会自动解除装备。
 * · 等级调整使用游戏自身的经验 / 等级计算（含升级、降级效果）。
 * · 该插件仅供开发与测试使用，发布正式版前请关闭菜单入口。
 *
 * @command open
 * @text 打开开发者模式
 * @desc 打开开发者模式主菜单；scene 参数可指定直接打开对应子页面。
 * @arg scene
 * @type text
 * @text 子页面
 * @desc 可选：items / weapons / armors / switches / variables / level。留空打开主菜单。
 *
 * @param menuCommand
 * @text 菜单命令
 * @desc 是否在主菜单中添加「开发者模式」命令。false 时不添加，仅通过插件命令打开。
 * @type boolean
 * @default true
 *
 * @param maxAmount
 * @text 获得数量上限
 * @desc 获取道具/武器/防具时，单次可输入的最大数量。
 * @type number
 * @default 99
 *
 * @param defaultAmount
 * @text 默认获得数量
 * @desc 打开数量输入时默认填入的数量。
 * @type number
 * @default 1
 *
 * @param maxLevel
 * @text 等级上限
 * @desc 手动提升等级时的上限。填 0 则使用各角色职业自身的等级上限。
 * @type number
 * @default 0
 *
 * @param varRange
 * @text 变量输入范围
 * @desc 改变变量时可输入数值的绝对值上限（负/正）。
 * @type number
 * @default 999999
 */

(() => {
    "use strict";

    const PLUGIN_NAME = "DeveloperMode";
    const params = PluginManager.parameters(PLUGIN_NAME);

    const menuCommandEnabled = params.menuCommand !== "false";
    const maxAmount = Math.max(1, Number(params.maxAmount) || 99);
    const defaultAmount = Math.min(Math.max(1, Number(params.defaultAmount) || 1), maxAmount);
    const maxLevelParam = Math.max(0, Number(params.maxLevel) || 0);
    const varRange = Math.max(1, Number(params.varRange) || 999999);

    function devCalcWindowHeight(numLines, selectable) {
        const lineHeight = 36;
        const padding = 18;
        return numLines * lineHeight + padding * 2;
    }

    function devListRect(helpWindow) {
        return new Rectangle(
            0,
            helpWindow.height,
            Graphics.boxWidth,
            Math.max(0, Graphics.boxHeight - helpWindow.height)
        );
    }
    // =========================================================================
    // 1. 数字输入窗口 Window_DevNumberInput
    // =========================================================================

    function Window_DevNumberInput() {
        this.initialize.apply(this, arguments);
    }
    Window_DevNumberInput.prototype = Object.create(Window_Selectable.prototype);
    Window_DevNumberInput.prototype.constructor = Window_DevNumberInput;

    Window_DevNumberInput.prototype.initialize = function(rect) {
        Window_Selectable.prototype.initialize.call(this, rect);
        this._label = "";
        this._number = 0;
        this._min = 0;
        this._max = 0;
        this.hide();
    };

    Window_DevNumberInput.prototype.setup = function(label, number, min, max) {
        this._label = String(label);
        this._min = Number(min);
        this._max = Number(max);
        this._number = Number(number);
        if (!Number.isFinite(this._number)) {
            this._number = 0;
        }
        this._number = this._number.clamp(this._min, this._max);
        this.refresh();
    };

    Window_DevNumberInput.prototype.number = function() {
        return this._number;
    };

    Window_DevNumberInput.prototype.maxItems = function() {
        return 0;
    };

    Window_DevNumberInput.prototype.update = function() {
        Window_Selectable.prototype.update.call(this);
        if (this.active) {
            this.updateNumber();
            this.processButtonTouch();
        }
    };

    Window_DevNumberInput.prototype.updateNumber = function() {
        if (Input.isRepeated("left")) {
            this.changeNumber(-1);
        }
        if (Input.isRepeated("right")) {
            this.changeNumber(1);
        }
        if (Input.isRepeated("up")) {
            this.changeNumber(10);
        }
        if (Input.isRepeated("down")) {
            this.changeNumber(-10);
        }
        if (Input.isRepeated("pageup")) {
            this.changeNumber(100);
        }
        if (Input.isRepeated("pagedown")) {
            this.changeNumber(-100);
        }
    };

    Window_DevNumberInput.prototype.changeNumber = function(amount) {
        const newNumber = (this._number + amount).clamp(this._min, this._max);
        if (newNumber !== this._number) {
            this._number = newNumber;
            this.drawNumber();
            SoundManager.playCursor();
        }
    };
    Window_DevNumberInput.prototype.refresh = function() {
        this.contents.clear();
        this.contents.fillRect(0, 0, this.innerWidth, this.innerHeight, "rgba(0, 0, 0, 0.85)");
        this.drawText(this._label, 0, 0, this.innerWidth, "left");
        this.drawNumber();
        this.drawButtons();
        this.changeTextColor(ColorManager.systemColor());
        this.contents.fontSize = 18;
        this.drawText("方向键调整  ·  确定=确认  取消=返回", 0, this.lineHeight() * 5 + 6, this.innerWidth, "center");
        this.resetFontSettings();
    };

    Window_DevNumberInput.prototype.drawNumber = function() {
        const y = this.lineHeight();
        this.contents.clearRect(0, y, this.innerWidth, this.lineHeight());
        this.contents.fillRect(0, y, this.innerWidth, this.lineHeight(), "rgba(0, 0, 0, 0.85)");
        const originalFontSize = this.contents.fontSize;
        this.contents.fontSize = 30;
        this.changeTextColor(ColorManager.normalColor());
        this.drawText(`${this._number}   ( ${this._min} ~ ${this._max} )`, 0, y, this.innerWidth, "center");
        this.contents.fontSize = originalFontSize;
        this.resetFontSettings();
    };

    Window_DevNumberInput.prototype.drawButtons = function() {
        const labels = ["-100", "-10", "-1", "+1", "+10", "+100", "归零", "确定", "取消"];
        const buttonWidth = (this.innerWidth - 40) / 3;
        const buttonHeight = 34;
        const startY = this.lineHeight() * 2;
        this.contents.fontSize = 20;
        for (let i = 0; i < labels.length; i++) {
            const col = i % 3;
            const row = Math.floor(i / 3);
            const x = 10 + col * (buttonWidth + 10);
            const y = startY + row * (buttonHeight + 6);
            this.contents.fillRect(x, y, buttonWidth, buttonHeight, "rgba(80, 80, 80, 1)");
            this.changeTextColor(ColorManager.normalColor());
            this.drawText(labels[i], x, y + 2, buttonWidth, "center");
        }
        this.resetFontSettings();
    };

    Window_DevNumberInput.prototype.canvasToLocalX = function(x) {
        return x - this.x;
    };

    Window_DevNumberInput.prototype.canvasToLocalY = function(y) {
        return y - this.y;
    };

    Window_DevNumberInput.prototype.processButtonTouch = function() {
        if (!TouchInput.isTriggered() || !this.isOpenAndActive()) {
            return;
        }
        const contentX = this.canvasToLocalX(TouchInput.x) - this.padding;
        const contentY = this.canvasToLocalY(TouchInput.y) - this.padding;
        if (contentX < 0 || contentX >= this.innerWidth || contentY < 0 || contentY >= this.innerHeight) {
            return;
        }
        const labels = ["-100", "-10", "-1", "+1", "+10", "+100", "归零", "确定", "取消"];
        const buttonWidth = (this.innerWidth - 40) / 3;
        const buttonHeight = 34;
        const startY = this.lineHeight() * 2;
        for (let i = 0; i < labels.length; i++) {
            const col = i % 3;
            const row = Math.floor(i / 3);
            const rectX = 10 + col * (buttonWidth + 10);
            const rectY = startY + row * (buttonHeight + 6);
            if (contentX >= rectX && contentX < rectX + buttonWidth &&
                contentY >= rectY && contentY < rectY + buttonHeight) {
                const label = labels[i];
                if (label === "确定") {
                    this.processOk();
                } else if (label === "取消") {
                    this.processCancel();
                } else if (label === "归零") {
                    this.changeNumber(-this._number);
                } else {
                    this.changeNumber(Number(label));
                }
                TouchInput.clear();
                return;
            }
        }
    };
    // =========================================================================
    // 2. 主菜单场景 Scene_DevMode
    // =========================================================================

    function Scene_DevMode() {
        this.initialize.apply(this, arguments);
    }
    Scene_DevMode.prototype = Object.create(Scene_MenuBase.prototype);
    Scene_DevMode.prototype.constructor = Scene_DevMode;

    Scene_DevMode.prototype.initialize = function() {
        Scene_MenuBase.prototype.initialize.call(this);
    };

    Scene_DevMode.prototype.create = function() {
        Scene_MenuBase.prototype.create.call(this);
        this.createHelpWindow();
        const ww = 440;
        const wh = devCalcWindowHeight(6, true);
        const wx = Math.max(0, (Graphics.boxWidth - ww) / 2);
        const wy = Math.max(0, (Graphics.boxHeight - wh) / 2);
        const commandWindow = new Window_DevCommand(new Rectangle(wx, wy, ww, wh));
        commandWindow.setHelpWindow(this._helpWindow);
        commandWindow.setHandler("item", this.commandItem.bind(this));
        commandWindow.setHandler("weapon", this.commandWeapon.bind(this));
        commandWindow.setHandler("armor", this.commandArmor.bind(this));
        commandWindow.setHandler("switch", this.commandSwitch.bind(this));
        commandWindow.setHandler("variable", this.commandVariable.bind(this));
        commandWindow.setHandler("level", this.commandLevel.bind(this));
        commandWindow.setHandler("cancel", this.popScene.bind(this));
        this.addWindow(commandWindow);
        this._commandWindow = commandWindow;
        this._commandWindow.select(0);
        this._commandWindow.activate();
        this._helpWindow.setText("开发者模式：选择要执行的功能。");
    };

    Scene_DevMode.prototype.commandItem = function() {
        Scene_DevItemList.mode = "item";
        SceneManager.push(Scene_DevItemList);
    };

    Scene_DevMode.prototype.commandWeapon = function() {
        Scene_DevItemList.mode = "weapon";
        SceneManager.push(Scene_DevItemList);
    };

    Scene_DevMode.prototype.commandArmor = function() {
        Scene_DevItemList.mode = "armor";
        SceneManager.push(Scene_DevItemList);
    };

    Scene_DevMode.prototype.commandSwitch = function() {
        SceneManager.push(Scene_DevSwitchList);
    };

    Scene_DevMode.prototype.commandVariable = function() {
        SceneManager.push(Scene_DevVariableList);
    };

    Scene_DevMode.prototype.commandLevel = function() {
        SceneManager.push(Scene_DevActorList);
    };

    function Window_DevCommand() {
        this.initialize.apply(this, arguments);
    }
    Window_DevCommand.prototype = Object.create(Window_Command.prototype);
    Window_DevCommand.prototype.constructor = Window_DevCommand;

    Window_DevCommand.prototype.initialize = function(rect) {
        Window_Command.prototype.initialize.call(this, rect);
    };

    Window_DevCommand.prototype.makeCommandList = function() {
        this.addCommand("获取道具", "item", true);
        this.addCommand("获取武器", "weapon", true);
        this.addCommand("获取防具", "armor", true);
        this.addCommand("改变开关", "switch", true);
        this.addCommand("改变变量", "variable", true);
        this.addCommand("提升 / 降低等级", "level", true);
    };
    // =========================================================================
    // 3. 获取道具 / 武器 / 防具
    // =========================================================================

    Scene_DevItemList.mode = "item";

    function Scene_DevItemList() {
        this.initialize.apply(this, arguments);
    }
    Scene_DevItemList.prototype = Object.create(Scene_MenuBase.prototype);
    Scene_DevItemList.prototype.constructor = Scene_DevItemList;

    Scene_DevItemList.prototype.initialize = function() {
        Scene_MenuBase.prototype.initialize.call(this);
        this._mode = Scene_DevItemList.mode || "item";
    };

    Scene_DevItemList.prototype.create = function() {
        Scene_MenuBase.prototype.create.call(this);
        this.createHelpWindow();
        this._listWindow = new Window_DevItemList(devListRect(this._helpWindow), this._mode);
        this._listWindow.setHelpWindow(this._helpWindow);
        this._listWindow.setHandler("ok", this.commandGain.bind(this));
        this._listWindow.setHandler("cancel", this.popScene.bind(this));
        this.addWindow(this._listWindow);
        this.createNumberWindow();
        this._listWindow.select(0);
        this._listWindow.activate();
    };

    Scene_DevItemList.prototype.createNumberWindow = function() {
        const ww = 480;
        const wh = devCalcWindowHeight(6, false);
        const rect = new Rectangle(
            Math.max(0, (Graphics.boxWidth - ww) / 2),
            Math.max(0, (Graphics.boxHeight - wh) / 2),
            ww,
            wh
        );
        this._numberWindow = new Window_DevNumberInput(rect);
        this._numberWindow.setHandler("ok", this.onNumberInputOk.bind(this));
        this._numberWindow.setHandler("cancel", this.onNumberInputCancel.bind(this));
        this.addWindow(this._numberWindow);
    };

    Scene_DevItemList.prototype.commandGain = function() {
        const item = this._listWindow.item();
        if (!item) {
            SoundManager.playBuzzer();
            return;
        }
        this._listWindow.deactivate();
        this._numberWindow.setup(`获得数量 · ${item.name}`, defaultAmount, 1, maxAmount);
        this._numberWindow.show();
        this._numberWindow.activate();
    };

    Scene_DevItemList.prototype.onNumberInputOk = function() {
        const item = this._listWindow.item();
        const count = this._numberWindow.number();
        if (item && count > 0) {
            $gameParty.gainItem(item, count, true);
            SoundManager.playShop();
            this._helpWindow.setText(`已获得 ${item.name} × ${count}。`);
        }
        this.closeNumberInput();
        this._listWindow.refresh();
        this._listWindow.updateHelp();
        this._listWindow.activate();
    };

    Scene_DevItemList.prototype.onNumberInputCancel = function() {
        SoundManager.playCancel();
        this.closeNumberInput();
        this._listWindow.activate();
    };

    Scene_DevItemList.prototype.closeNumberInput = function() {
        this._numberWindow.hide();
        this._numberWindow.deactivate();
    };

    function Window_DevItemList() {
        this.initialize.apply(this, arguments);
    }
    Window_DevItemList.prototype = Object.create(Window_Selectable.prototype);
    Window_DevItemList.prototype.constructor = Window_DevItemList;

    Window_DevItemList.prototype.initialize = function(rect, mode) {
        Window_Selectable.prototype.initialize.call(this, rect);
        this._mode = mode || "item";
        this._data = [];
        this.refresh();
    };

    Window_DevItemList.prototype.maxItems = function() {
        return this._data.length;
    };

    Window_DevItemList.prototype.maxCols = function() {
        return 1;
    };

    Window_DevItemList.prototype.item = function() {
        return this._data[this.index()];
    };

    Window_DevItemList.prototype.database = function() {
        switch (this._mode) {
            case "weapon":
                return $dataWeapons;
            case "armor":
                return $dataArmors;
            default:
                return $dataItems;
        }
    };

    Window_DevItemList.prototype.refresh = function() {
        const db = this.database();
        this._data = [];
        for (let i = 1; i < db.length; i++) {
            if (db[i]) {
                this._data.push(db[i]);
            }
        }
        Window_Selectable.prototype.refresh.call(this);
    };

    Window_DevItemList.prototype.drawItem = function(index) {
        const item = this._data[index];
        if (!item) {
            return;
        }
        const rect = this.itemRectWithPadding(index);
        this.drawItemName(item, rect.x, rect.y, rect.width - 70);
        this.changeTextColor(ColorManager.systemColor());
        this.drawText(`×${$gameParty.numItems(item)}`, rect.x + rect.width - 70, rect.y, 70, "right");
    };

    Window_DevItemList.prototype.updateHelp = function() {
        if (!this._helpWindow) {
            return;
        }
        const item = this.item();
        if (!item) {
            this._helpWindow.clear();
            return;
        }
        this._helpWindow.setText(`${item.description}\n当前持有：${$gameParty.numItems(item)} 个  ·  确定键获得`);
    };
    // =========================================================================
    // 4. 改变开关
    // =========================================================================

    function Scene_DevSwitchList() {
        this.initialize.apply(this, arguments);
    }
    Scene_DevSwitchList.prototype = Object.create(Scene_MenuBase.prototype);
    Scene_DevSwitchList.prototype.constructor = Scene_DevSwitchList;

    Scene_DevSwitchList.prototype.initialize = function() {
        Scene_MenuBase.prototype.initialize.call(this);
    };

    Scene_DevSwitchList.prototype.create = function() {
        Scene_MenuBase.prototype.create.call(this);
        this.createHelpWindow();
        this._listWindow = new Window_DevSwitchList(devListRect(this._helpWindow));
        this._listWindow.setHelpWindow(this._helpWindow);
        this._listWindow.setHandler("ok", this.commandToggle.bind(this));
        this._listWindow.setHandler("cancel", this.popScene.bind(this));
        this.addWindow(this._listWindow);
        this._listWindow.select(0);
        this._listWindow.activate();
    };

    Scene_DevSwitchList.prototype.commandToggle = function() {
        const id = this._listWindow.itemId();
        if (!id) {
            return;
        }
        $gameSwitches.setValue(id, !$gameSwitches.value(id));
        SoundManager.playCursor();
        this._listWindow.refresh();
        this._listWindow.updateHelp();
    };

    function Window_DevSwitchList() {
        this.initialize.apply(this, arguments);
    }
    Window_DevSwitchList.prototype = Object.create(Window_Selectable.prototype);
    Window_DevSwitchList.prototype.constructor = Window_DevSwitchList;

    Window_DevSwitchList.prototype.initialize = function(rect) {
        Window_Selectable.prototype.initialize.call(this, rect);
        this._data = [];
        for (let i = 1; i < $dataSystem.switches.length; i++) {
            this._data.push(i);
        }
        this.refresh();
    };

    Window_DevSwitchList.prototype.maxItems = function() {
        return this._data.length;
    };

    Window_DevSwitchList.prototype.maxCols = function() {
        return 1;
    };

    Window_DevSwitchList.prototype.itemId = function() {
        return this._data[this.index()];
    };

    Window_DevSwitchList.prototype.drawItem = function(index) {
        const id = this._data[index];
        if (!id) {
            return;
        }
        const rect = this.itemRectWithPadding(index);
        this.changeTextColor(ColorManager.normalColor());
        this.drawText(`#${id} ${$dataSystem.switches[id] || ""}`, rect.x, rect.y, rect.width - 70);
        const on = $gameSwitches.value(id);
        this.changeTextColor(on ? ColorManager.paramchangeTextColor() : ColorManager.normalColor());
        this.drawText(on ? "ON" : "OFF", rect.x + rect.width - 70, rect.y, 70, "right");
    };

    Window_DevSwitchList.prototype.updateHelp = function() {
        if (!this._helpWindow) {
            return;
        }
        const id = this.itemId();
        if (!id) {
            this._helpWindow.clear();
            return;
        }
        const state = $gameSwitches.value(id) ? "开" : "关";
        this._helpWindow.setText(`开关 #${id} ${$dataSystem.switches[id] || ""}\n当前：${state}  ·  确定键切换`);
    };
    // =========================================================================
    // 5. 改变变量
    // =========================================================================

    function Scene_DevVariableList() {
        this.initialize.apply(this, arguments);
    }
    Scene_DevVariableList.prototype = Object.create(Scene_MenuBase.prototype);
    Scene_DevVariableList.prototype.constructor = Scene_DevVariableList;

    Scene_DevVariableList.prototype.initialize = function() {
        Scene_MenuBase.prototype.initialize.call(this);
    };

    Scene_DevVariableList.prototype.create = function() {
        Scene_MenuBase.prototype.create.call(this);
        this.createHelpWindow();
        this._listWindow = new Window_DevVariableList(devListRect(this._helpWindow));
        this._listWindow.setHelpWindow(this._helpWindow);
        this._listWindow.setHandler("ok", this.commandEdit.bind(this));
        this._listWindow.setHandler("cancel", this.popScene.bind(this));
        this.addWindow(this._listWindow);
        this.createNumberWindow();
        this._listWindow.select(0);
        this._listWindow.activate();
    };

    Scene_DevVariableList.prototype.createNumberWindow = function() {
        const ww = 480;
        const wh = devCalcWindowHeight(6, false);
        const rect = new Rectangle(
            Math.max(0, (Graphics.boxWidth - ww) / 2),
            Math.max(0, (Graphics.boxHeight - wh) / 2),
            ww,
            wh
        );
        this._numberWindow = new Window_DevNumberInput(rect);
        this._numberWindow.setHandler("ok", this.onNumberInputOk.bind(this));
        this._numberWindow.setHandler("cancel", this.onNumberInputCancel.bind(this));
        this.addWindow(this._numberWindow);
    };

    Scene_DevVariableList.prototype.commandEdit = function() {
        const id = this._listWindow.itemId();
        if (!id) {
            return;
        }
        this._listWindow.deactivate();
        const name = $dataSystem.variables[id] || `变量${id}`;
        this._numberWindow.setup(`设置变量 · ${name}`, $gameVariables.value(id), -varRange, varRange);
        this._numberWindow.show();
        this._numberWindow.activate();
    };

    Scene_DevVariableList.prototype.onNumberInputOk = function() {
        const id = this._listWindow.itemId();
        if (id) {
            const value = this._numberWindow.number();
            $gameVariables.setValue(id, value);
            SoundManager.playShop();
            this._helpWindow.setText(`已将变量 #${id} 设为 ${value}。`);
        }
        this.closeNumberInput();
        this._listWindow.refresh();
        this._listWindow.updateHelp();
        this._listWindow.activate();
    };

    Scene_DevVariableList.prototype.onNumberInputCancel = function() {
        SoundManager.playCancel();
        this.closeNumberInput();
        this._listWindow.activate();
    };

    Scene_DevVariableList.prototype.closeNumberInput = function() {
        this._numberWindow.hide();
        this._numberWindow.deactivate();
    };

    function Window_DevVariableList() {
        this.initialize.apply(this, arguments);
    }
    Window_DevVariableList.prototype = Object.create(Window_Selectable.prototype);
    Window_DevVariableList.prototype.constructor = Window_DevVariableList;

    Window_DevVariableList.prototype.initialize = function(rect) {
        Window_Selectable.prototype.initialize.call(this, rect);
        this._data = [];
        for (let i = 1; i < $dataSystem.variables.length; i++) {
            this._data.push(i);
        }
        this.refresh();
    };

    Window_DevVariableList.prototype.maxItems = function() {
        return this._data.length;
    };

    Window_DevVariableList.prototype.maxCols = function() {
        return 1;
    };

    Window_DevVariableList.prototype.itemId = function() {
        return this._data[this.index()];
    };

    Window_DevVariableList.prototype.drawItem = function(index) {
        const id = this._data[index];
        if (!id) {
            return;
        }
        const rect = this.itemRectWithPadding(index);
        this.changeTextColor(ColorManager.normalColor());
        this.drawText(`#${id} ${$dataSystem.variables[id] || ""}`, rect.x, rect.y, rect.width - 130);
        this.changeTextColor(ColorManager.systemColor());
        this.drawText(String($gameVariables.value(id)), rect.x + rect.width - 130, rect.y, 130, "right");
    };

    Window_DevVariableList.prototype.updateHelp = function() {
        if (!this._helpWindow) {
            return;
        }
        const id = this.itemId();
        if (!id) {
            this._helpWindow.clear();
            return;
        }
        this._helpWindow.setText(`变量 #${id} ${$dataSystem.variables[id] || ""}\n当前值：${$gameVariables.value(id)}  ·  确定键修改`);
    };
    // =========================================================================
    // 6. 提升 / 降低等级
    // =========================================================================

    function Scene_DevActorList() {
        this.initialize.apply(this, arguments);
    }
    Scene_DevActorList.prototype = Object.create(Scene_MenuBase.prototype);
    Scene_DevActorList.prototype.constructor = Scene_DevActorList;

    Scene_DevActorList.prototype.initialize = function() {
        Scene_MenuBase.prototype.initialize.call(this);
    };

    Scene_DevActorList.prototype.create = function() {
        Scene_MenuBase.prototype.create.call(this);
        this.createHelpWindow();
        this._listWindow = new Window_DevActorList(devListRect(this._helpWindow));
        this._listWindow.setHelpWindow(this._helpWindow);
        this._listWindow.setHandler("ok", this.commandLevel.bind(this));
        this._listWindow.setHandler("cancel", this.popScene.bind(this));
        this.addWindow(this._listWindow);
        this.createNumberWindow();
        this._listWindow.select(0);
        this._listWindow.activate();
    };

    Scene_DevActorList.prototype.createNumberWindow = function() {
        const ww = 480;
        const wh = devCalcWindowHeight(6, false);
        const rect = new Rectangle(
            Math.max(0, (Graphics.boxWidth - ww) / 2),
            Math.max(0, (Graphics.boxHeight - wh) / 2),
            ww,
            wh
        );
        this._numberWindow = new Window_DevNumberInput(rect);
        this._numberWindow.setHandler("ok", this.onNumberInputOk.bind(this));
        this._numberWindow.setHandler("cancel", this.onNumberInputCancel.bind(this));
        this.addWindow(this._numberWindow);
    };

    Scene_DevActorList.prototype.commandLevel = function() {
        const actor = this._listWindow.actor();
        if (!actor) {
            return;
        }
        this._listWindow.deactivate();
        this._numberWindow.setup(`设置等级 · ${actor.name()}`, actor.level, 1, this._listWindow.levelLimit(actor));
        this._numberWindow.show();
        this._numberWindow.activate();
    };

    Scene_DevActorList.prototype.onNumberInputOk = function() {
        const actor = this._listWindow.actor();
        if (actor) {
            actor.changeLevel(this._numberWindow.number(), true);
            SoundManager.playShop();
            this._helpWindow.setText(`${actor.name()} 的等级已设为 ${actor.level}。`);
        }
        this.closeNumberInput();
        this._listWindow.refresh();
        this._listWindow.updateHelp();
        this._listWindow.activate();
    };

    Scene_DevActorList.prototype.onNumberInputCancel = function() {
        SoundManager.playCancel();
        this.closeNumberInput();
        this._listWindow.activate();
    };

    Scene_DevActorList.prototype.closeNumberInput = function() {
        this._numberWindow.hide();
        this._numberWindow.deactivate();
    };

    function Window_DevActorList() {
        this.initialize.apply(this, arguments);
    }
    Window_DevActorList.prototype = Object.create(Window_Selectable.prototype);
    Window_DevActorList.prototype.constructor = Window_DevActorList;

    Window_DevActorList.prototype.initialize = function(rect) {
        Window_Selectable.prototype.initialize.call(this, rect);
        this._data = $gameParty.allMembers().filter(actor => !!actor);
        this.refresh();
    };

    Window_DevActorList.prototype.maxItems = function() {
        return this._data.length;
    };

    Window_DevActorList.prototype.maxCols = function() {
        return 1;
    };

    Window_DevActorList.prototype.actor = function() {
        return this._data[this.index()];
    };

    Window_DevActorList.prototype.levelLimit = function(actor) {
        if (maxLevelParam > 0) {
            return Math.min(maxLevelParam, actor.maxLevel());
        }
        return actor.maxLevel();
    };

    Window_DevActorList.prototype.drawItem = function(index) {
        const actor = this._data[index];
        if (!actor) {
            return;
        }
        const rect = this.itemRectWithPadding(index);
        this.changeTextColor(ColorManager.normalColor());
        this.drawText(actor.name(), rect.x, rect.y, rect.width - 150);
        this.changeTextColor(ColorManager.systemColor());
        this.drawText(`Lv.${actor.level}`, rect.x + rect.width - 150, rect.y, 150, "right");
    };

    Window_DevActorList.prototype.updateHelp = function() {
        if (!this._helpWindow) {
            return;
        }
        const actor = this.actor();
        if (!actor) {
            this._helpWindow.clear();
            return;
        }
        const cls = actor.currentClass();
        const className = cls ? cls.name : "";
        this._helpWindow.setText(`${actor.name()} · ${className} · 等级 ${actor.level}\n确定键设置新等级（上限 ${this.levelLimit(actor)}）`);
    };
    // =========================================================================
    // 7. 菜单命令与插件命令
    // =========================================================================

    // --- 主菜单集成：菜单项由 MenuHub 插件参数 menuItems 配置（动作: scene Scene_DevMode） ---
    // 暴露菜单可用性判断（MenuHub enabledCall 用），保留原 menuCommand 参数语义
    window.DeveloperMode = window.DeveloperMode || {};
    window.DeveloperMode.menuEnabled = function() {
        return menuCommandEnabled;
    };

    PluginManager.registerCommand(PLUGIN_NAME, "open", function(args) {
        const target = String(args.scene || "").trim().toLowerCase();
        switch (target) {
            case "item":
            case "items":
                Scene_DevItemList.mode = "item";
                SceneManager.push(Scene_DevItemList);
                break;
            case "weapon":
            case "weapons":
                Scene_DevItemList.mode = "weapon";
                SceneManager.push(Scene_DevItemList);
                break;
            case "armor":
            case "armors":
                Scene_DevItemList.mode = "armor";
                SceneManager.push(Scene_DevItemList);
                break;
            case "switch":
            case "switches":
                SceneManager.push(Scene_DevSwitchList);
                break;
            case "variable":
            case "variables":
                SceneManager.push(Scene_DevVariableList);
                break;
            case "level":
            case "levels":
            case "actor":
            case "actors":
                SceneManager.push(Scene_DevActorList);
                break;
            default:
                SceneManager.push(Scene_DevMode);
                break;
        }
    });

    // =========================================================================
    // 8. 全局导出
    // =========================================================================

    window.Scene_DevMode = Scene_DevMode;
    window.Scene_DevItemList = Scene_DevItemList;
    window.Scene_DevSwitchList = Scene_DevSwitchList;
    window.Scene_DevVariableList = Scene_DevVariableList;
    window.Scene_DevActorList = Scene_DevActorList;
    window.Window_DevCommand = Window_DevCommand;
    window.Window_DevItemList = Window_DevItemList;
    window.Window_DevSwitchList = Window_DevSwitchList;
    window.Window_DevVariableList = Window_DevVariableList;
    window.Window_DevActorList = Window_DevActorList;
    window.Window_DevNumberInput = Window_DevNumberInput;
})();