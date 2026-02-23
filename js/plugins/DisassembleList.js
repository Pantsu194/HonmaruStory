// 刀解清单 - 按钮交互增强版 for RPG Maker MZ
// 版本：2.5.0 - 新增：数量输入窗口增加点击按钮 (+/-及确认取消)
// 作者：AI Assistant

/*:
 * @target MZ
 * @plugindesc 【刀解清单】插件：实现一个可配置的刀解列表和素材回收功能。(v2.5.0 按钮增强版)
 * @author AI Assistant
 *
 * @help
 * **【注意】此版本已兼容 Item/Weapon/Armor 三种类型。**
 *
 * 物品在列表中显示的四个必备条件：
 * 1. 物品ID必须有效。
 * 2. 必须使用 `addItems` 或 `addRange` 指令将其添加到**可刀解列表**中。
 * 3. 玩家的**背包中必须持有**该物品 (数量 > 0)。
 * 4. 必须使用 `setDisassembleResult` 指令为其设置了**有效的刀解结果**。
 *
 * 使用方法：
 * 1. 在事件中，使用“插件命令”调用：DisassembleList open
 *
 * --- 列表设置 (设置哪些物品可以被刀解) ---
 *
 * @command addItems
 * @text [列表] 添加物品 (列表)
 * @desc 批量添加一个或多个物品ID到刀解列表。请使用物品/武器/防具数据库中的ID。
 * @arg items
 * @type string
 * @text 物品ID列表
 * @desc 用空格分隔的物品ID列表 (例如: 1 2 5)。
 *
 * @command addRange
 * @text [列表] 添加物品 (范围)
 * @desc 批量添加指定范围内的物品ID到刀解列表。
 * @arg start
 * @type number
 * @text 起始ID
 * @desc 范围的起始物品ID。
 * @arg end
 * @type number
 * @desc 范围的结束物品ID。
 *
 * @command removeItems
 * @text [列表] 移除物品
 * @desc 从刀解列表中移除一个或多个物品ID。
 * @arg items
 * @type string
 * @text 物品ID列表
 * @desc 用空格分隔的物品ID列表 (例如: 1 2 5)。
 *
 * @command clearList
 * @text [列表] 清空列表
 * @desc 清空所有可刀解的物品。
 *
 * --- 结果设置 (设置刀解后获得什么素材) ---
 *
 * @command setDisassembleResult
 * @text [结果] 设置刀解结果
 * @desc 设置单个物品刀解后获得的素材（变量）和数量。
 * @arg item
 * @type number
 * @text 物品ID
 * @desc 物品/武器/防具数据库中的ID。
 * @arg results
 * @type string
 * @text 获得结果 (变量ID,数量 ...)
 * @desc 格式: "变量ID1,数量1 变量ID2,数量2"。例如: "10,5 11,2"
 *
 * @command open
 * @text 打开刀解清单
 * @desc 打开刀解清单界面。
 */

(function() {
    'use strict';
    
    const PLUGIN_NAME = "DisassembleList";

    // 辅助函数：判断点是否在矩形内
    function isPointInRect(x, y, rect) {
        return x >= rect.x && x < rect.x + rect.width && y >= rect.y && y < rect.y + rect.height;
    }
    
    // =========================================================================
    // 1. 游戏数据存储 ($gameSystem)
    // =========================================================================
    
    const _Game_System_initialize = Game_System.prototype.initialize;
    Game_System.prototype.initialize = function() {
        _Game_System_initialize.call(this);
        this.initDisassembleSystem();
    };

    Game_System.prototype.initDisassembleSystem = function() {
        if (!this._disassembleList) {
            this._disassembleList = [];
        }
        if (!this._disassembleResults) {
            this._disassembleResults = {};
        }
    };
    
    Game_System.prototype.getDisassembleList = function() {
        if (!this._disassembleList) {
            this.initDisassembleSystem();
        }
        return this._disassembleList;
    };
    
    Game_System.prototype.getDisassembleResults = function() {
        if (!this._disassembleResults) {
            this.initDisassembleSystem();
        }
        return this._disassembleResults;
    };
    
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
    
    Game_System.prototype.addDisassembleItem = function(itemId) {
        const id = Number(itemId);
        const list = this.getDisassembleList();
        if (getDisassembleItem(id) && !list.includes(id)) {
            list.push(id);
        }
    };
    
    Game_System.prototype.removeDisassembleItem = function(itemId) {
        const id = Number(itemId);
        const list = this.getDisassembleList();
        const index = list.indexOf(id);
        if (index >= 0) {
            list.splice(index, 1);
        }
    };
    
    Game_System.prototype.clearDisassembleList = function() {
        this._disassembleList = [];
    };
    
    Game_System.prototype.setDisassembleResult = function(itemId, results) {
        const id = Number(itemId);
        this.getDisassembleResults()[id] = results; 
    };

    // =========================================================================
    // 2. 插件命令注册
    // =========================================================================
    
    PluginManager.registerCommand(PLUGIN_NAME, "open", function(args) {
        SceneManager.push(Scene_Disassemble);
    });
    
    PluginManager.registerCommand(PLUGIN_NAME, "addItems", function(args) {
        const items = args.items.split(' ');
        items.forEach(itemString => {
            const id = Number(itemString);
            if (getDisassembleItem(id)) {
                $gameSystem.addDisassembleItem(id);
            } else {
                console.warn(`[DisassembleList WARNING] 无法识别的物品ID "${itemString}" 或非有效类型。`);
            }
        });
    });
    
    PluginManager.registerCommand(PLUGIN_NAME, "addRange", function(args) {
        const start = Number(args.start);
        const end = Number(args.end);
        for (let i = start; i <= end; i++) {
            if (getDisassembleItem(i)) {
                $gameSystem.addDisassembleItem(i);
            }
        }
    });

    PluginManager.registerCommand(PLUGIN_NAME, "removeItems", function(args) {
        const items = args.items.split(' ');
        items.forEach(itemString => {
            const id = Number(itemString);
            $gameSystem.removeDisassembleItem(id);
        });
    });
    
    PluginManager.registerCommand(PLUGIN_NAME, "clearList", function(args) {
        $gameSystem.clearDisassembleList();
    });
    
    PluginManager.registerCommand(PLUGIN_NAME, "setDisassembleResult", function(args) {
        const itemId = Number(args.item);
        const resultsString = args.results;
        
        if (!getDisassembleItem(itemId)) {
            console.warn(`[DisassembleList WARNING] 无法识别的物品ID "${args.item}" 或非有效类型。`);
            return;
        }
        
        const parsedResults = resultsString.split(' ').map(pair => {
            const parts = pair.split(',');
            if (parts.length === 2) {
                return { varId: Number(parts[0]), count: Number(parts[1]) };
            }
            return null;
        }).filter(r => r && r.varId > 0 && r.count > 0);
        
        if (parsedResults.length > 0) {
            $gameSystem.setDisassembleResult(itemId, parsedResults);
        } else {
            console.warn(`[DisassembleList WARNING] 结果格式错误 "${resultsString}"，请使用 "变量ID,数量" 格式。`);
        }
    });


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
        console.log("[Disassemble DEBUG] Scene_Disassemble.create: 开始创建窗口.");

        // 1. 定义公共尺寸
        const mainW = this.mainAreaWidth();
        
        // Help Window Height (标准 2 行)
        this.createHelpWindow(); 
        const helpH = this._helpWindow.height; 

        // Info Window 区域高度: 4 行 (物品名1 + 提示1 + 素材2)
        const infoH = this.calcWindowHeight(4, false); 
        
        // 2. 创建 Info Window 
        const infoRect = new Rectangle(0, helpH, mainW, infoH);
        this._infoWindow = new Window_DisassembleInfo(infoRect);
        this.addWindow(this._infoWindow);
        console.log("[Disassemble DEBUG] Info Window (已扩大) 创建成功.");

        // 3. 计算 List Window 尺寸
        const listY = helpH + infoH; 
        const listH = this.mainAreaBottom() - listY; 
        
        // 4. 创建 List Window
        const listRect = new Rectangle(0, listY, mainW, listH);
        this._listWindow = new Window_DisassembleList(listRect);
        this._listWindow.setHelpWindow(this._helpWindow);
        // 绑定到 commandDisassemble (开启数量输入)
        this._listWindow.setHandler("ok", this.commandDisassemble.bind(this)); 
        this._listWindow.setHandler("cancel", this.popScene.bind(this));
        this.addWindow(this._listWindow);
        console.log("[Disassemble DEBUG] List Window 创建成功.");
        
        // 5. 创建数量输入窗口 (初始隐藏)
        this.createNumberWindow();

        // 6. 最终化
        this._listWindow.setInfoWindow(this._infoWindow);
        this._infoWindow.refresh();
        
        this._listWindow.refresh(); 
        console.log("[Disassemble DEBUG] List Window 强制刷新完成。");

        this._listWindow.activate();
        this._listWindow.select(0);
        console.log("[Disassemble DEBUG] Scene_Disassemble.create: 窗口激活完成.");
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
        
        console.log(`[Disassemble DEBUG] commandDisassemble: 尝试刀解物品ID ${item ? item.id : '无'}，持有数量 ${maxCount}`);

        if (item && maxCount > 0) {
            // 数量选择
            this._listWindow.deactivate(); 
            this._numberWindow.setup(item, maxCount); 
            
            // 确保窗口显示且立即激活
            this._numberWindow.show(); 
            this._numberWindow.activate();
            console.log(`[Disassemble DEBUG] commandDisassemble: 数量输入窗口已显示并激活。`);
        } else {
            // 不可刀解，播放错误音效并继续保持激活
            SoundManager.playBuzzer();
            this._listWindow.activate();
            console.log(`[Disassemble DEBUG] commandDisassemble: 物品无效或数量不足，操作被拒绝。`);
        }
    };
    
    Scene_Disassemble.prototype.onNumberInputOk = function() {
        const item = this._numberWindow.item();
        const count = this._numberWindow.number();
        console.log(`[Disassemble DEBUG] onNumberInputOk: 确认刀解 ${count} 个 ${item.name}`);


        this.performDisassemble(item, count); // 执行刀解核心逻辑
        
        // 隐藏并清理数量输入窗口
        this._numberWindow.hide(); 
        this._numberWindow.deactivate();
        
        // 刷新所有窗口
        this._listWindow.refresh();
        this._infoWindow.refresh();
        this._helpWindow.clear();

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
        console.log(`[Disassemble DEBUG] onNumberInputCancel: 取消操作，返回列表激活。`);
    };

    // ** 核心刀解逻辑 **
    Scene_Disassemble.prototype.performDisassemble = function(item, count) {
        // 1. 扣除物品
        $gameParty.loseItem(item, count);
        
        // 2. 获取回收结果
        const results = $gameSystem.getDisassembleResults()[item.id];
        
        // 3. 增加素材变量
        if (results) {
            results.forEach(result => {
                const totalGain = result.count * count;
                $gameVariables.setValue(result.varId, $gameVariables.value(result.varId) + totalGain);
            });
        }
        
        // 4. 播放成功音效
        SoundManager.playShop();
        
        // 5. 显示提示 (可选：使用 Help Window 提示)
        this._helpWindow.setText(`刀解成功！消耗了 ${count} 个 ${item.name}，获得了对应素材。`);
    };


    Scene_Disassemble.prototype.helpWindowRect = Scene_MenuBase.prototype.helpWindowRect;
    Scene_Disassemble.prototype.createHelpWindow = Scene_MenuBase.prototype.createHelpWindow;

    
    // =========================================================================
    // 4. 窗口类定义
    // =========================================================================
    
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
            const results = $gameSystem.getDisassembleResults()[this._item.id];
            
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
            this.drawText("选择一个物品查看详情。", 0, 0, this.innerWidth, 'center');
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
        const registeredIds = $gameSystem.getDisassembleList();
        
        // 1. 过滤已注册的ID，并转换为 Item/Weapon/Armor 对象
        const itemObjects = registeredIds.map(id => getDisassembleItem(id)).filter(item => item !== null);

        // 2. 过滤玩家实际持有的 (拥有数量 > 0) 且有刀解结果的物品
        this._data = itemObjects.filter(item => {
            const itemId = item.id;
            const hasResult = $gameSystem.getDisassembleResults()[itemId];
            const numHeld = $gameParty.numItems(item); 
            
            return hasResult && numHeld > 0; 
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

        this.drawItemName(item, rect.x, rect.y, rect.width - 150);
        this.drawText("持有:", rect.x + rect.width - 150, rect.y, 50, 'right');
        this.drawText(number, rect.x + rect.width - 100, rect.y, 50, 'right');
    };
    
    Window_DisassembleList.prototype.updateHelp = function() {
        const item = this.item();
        this.setHelpWindowItem(item);
        if (this._infoWindow) {
            this._infoWindow.setItem(item);
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
    window.Window_DisassembleInfo = Window_DisassembleInfo;
    window.Window_DisassembleList = Window_DisassembleList;
    window.Window_DisassembleNumberInput = Window_DisassembleNumberInput;

})();