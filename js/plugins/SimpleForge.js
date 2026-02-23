// 简易锻刀系统 - 最终修复版 for RPG Maker MZ
// 版本：27.0 - 存档兼容版
// 作者：AI Assistant (由 Gemini 修改以支持存档)

/*:
 * @target MZ
 * @plugindesc 一个可配置的简易锻刀系统，支持玩家输入素材数量决定锻造结果。(V27.0 - 支持存档)
 * @author AI Assistant
 *
 * @help
 * 使用方法：
 * 1. 打开锻刀界面：SimpleForge open
 * 2. 设置可锻造物品范围：SimpleForge setRange start end
 * - start: 起始物品ID
 * - end: 结束物品ID
 * 3. 设置特定锻造列表：SimpleForge setList item1 item2 item3 ...
 * - 使用物品ID列表，用空格分隔
 * 4. 清空可锻造列表：SimpleForge clearList
 * 5. 设置锻造素材：SimpleForge setMaterial varId varName
 * - varId: 游戏变量ID
 * - varName: 素材名称（显示用）
 * 6. 设置锻造消耗：SimpleForge setCost itemId cost1 cost2 ...
 * - itemId: 物品ID
 * - cost1, cost2...: 对应素材的消耗数量
 *
 * 示例：
 * SimpleForge setRange 11 20
 * SimpleForge setMaterial 1 铁矿石
 * SimpleForge setMaterial 2 煤炭
 * SimpleForge setCost 11 5 3
 * SimpleForge setCost 12 8 5
 *
 * @command open
 * @text 打开锻刀界面
 * @desc 打开锻刀主界面。
 *
 * @command setRange
 * @text 设置锻造物品范围
 * @desc 设置可锻造物品的ID范围，会添加到现有列表中。
 *
 * @arg start
 * @type number
 * @text 起始ID
 * @desc 可锻造物品的起始ID。
 *
 * @arg end
 * @type number
 *
 * @text 结束ID
 * @desc 可锻造物品的结束ID。
 *
 * @command setList
 * @text 设置锻造物品列表
 * @desc 设置特定的可锻造物品ID列表，会添加到现有列表中。
 *
 * @arg items
 * @type string
 * @text 物品ID列表
 * @desc 用空格分隔的物品ID列表，例如: 11 13 15 17 19
 *
 * @command clearList
 * @text 清空锻造列表
 * @desc 清空所有可锻造物品。
 *
 * @command setMaterial
 * @text 设置锻造素材
 * @desc 设置锻造所需的素材变量。
 *
 * @arg varId
 * @type number
 * @text 变量ID
 * @desc 用于存储素材数量的游戏变量ID。
 *
 * @arg varName
 * @type string
 * @text 素材名称
 * @desc 素材的显示名称。
 *
 * @command setCost
 * @text 设置锻造消耗
 * @desc 设置锻造特定物品所需的素材消耗。
 *
 * @arg itemId
 *
 * @type number
 * @text 物品ID
 * @desc 要设置消耗的物品ID。
 *
 * @arg costs
 * @type string
 * @text 消耗数量
 * @desc 用空格分隔的素材消耗数量，顺序与设置的素材变量对应。
 */

(function() {
    'use strict';

    // =========================================================================
    //  [新] 挂钩 Game_System 以实现存档兼容性
    // =========================================================================

    // 1. 别名 Game_System.prototype.initialize
    const _Game_System_initialize = Game_System.prototype.initialize;
    Game_System.prototype.initialize = function() {
        _Game_System_initialize.call(this);
        // 2. 初始化插件数据
        this.initSimpleForgeData();
    };

    // 3. 定义初始化方法
    Game_System.prototype.initSimpleForgeData = function() {
        // 检查数据是否已存在 (兼容旧存档)
        if (!this._simpleForgeData) {
            this._simpleForgeData = {
                availableItems: [], // 可锻造的物品ID列表
                materials: [],      // 锻造素材列表 [{id, name}]
                costs: {}           // 物品消耗 {itemId: [cost1, cost2, ...]}
            };
        }
    };

    // [新] 辅助函数，用于在访问前确保 $gameSystem 上的数据存在
    // 这主要用于防止从没有此数据的旧存档加载时出错
    function ensureForgeData() {
        if ($gameSystem && !$gameSystem._simpleForgeData) {
            $gameSystem.initSimpleForgeData();
        }
    }
    
    // **新增辅助函数：检查点是否在矩形内**
    function isPointInRect(x, y, rect) {
        return x >= rect.x && x < rect.x + rect.width && y >= rect.y && y < rect.y + rect.height;
    }
    
    const PLUGIN_NAME = "SimpleForge";
    
    // [旧] 存储锻造配置 (已被移至 $gameSystem._simpleForgeData)
    /*
    const _forgeData = {
        availableItems: [], // 可锻造的物品ID列表
        useRange: false,    // 是否使用范围模式
        rangeStart: 1,      // 范围起始
        rangeEnd: 10,       // 范围结束
        materials: [],      // 锻造素材列表 [{id, name}]
        costs: {}           // 物品消耗 {itemId: [cost1, cost2, ...]}
    };
    */
    
    // 初始化默认范围
    function initializeForgeData() {
        // [新] 确保 $gameSystem 上的数据存在
        ensureForgeData();
        // (原内容已移至 Game_System.prototype.initSimpleForgeData)
    }
    
    // 添加物品到列表，避免重复
    function addItemsToForgeList(newItems) {
        ensureForgeData(); // [新]
        for (const id of newItems) {
            if ($dataItems[id] && !$gameSystem._simpleForgeData.availableItems.includes(id)) { // [改]
                $gameSystem._simpleForgeData.availableItems.push(id); // [改]
            }
        }
    }
    
    // 获取物品消耗描述（简化版，不显示持有量）
    function getCostDescription(itemId) {
        ensureForgeData(); // [新]
        const costs = $gameSystem._simpleForgeData.costs[itemId]; // [改]
        if (!costs || $gameSystem._simpleForgeData.materials.length === 0) { // [改]
            return "无需素材";
        }
        
        let description = "";
        for (let i = 0; i < costs.length; i++) {
            if (i >= $gameSystem._simpleForgeData.materials.length) break; // [改]
            
            const material = $gameSystem._simpleForgeData.materials[i]; // [改]
            const cost = costs[i];
            
            if (description !== "") description += ", ";
            description += `${material.name}: ${cost}`;
        }
        
        return description;
    }
    
    // 注册插件命令
    PluginManager.registerCommand(PLUGIN_NAME, "open", function(args) {
        console.log("SimpleForge: 插件命令被调用");
        try {
            initializeForgeData(); // [保留] 这个函数现在只调用 ensureForgeData()
            SceneManager.push(Scene_SimpleForge);
        } catch (error) {
            console.error("SimpleForge: 打开场景失败:", error);
            $gameMessage.add("锻刀系统暂时无法打开，请检查系统配置。");
        }
    });

    PluginManager.registerCommand(PLUGIN_NAME, "setRange", function(args) {
        ensureForgeData(); // [新]
        const start = parseInt(args.start);
        const end = parseInt(args.end);
        
        if (isNaN(start) || isNaN(end) || start <= 0 || end <= 0) {
            console.error("SimpleForge: 无效的物品ID范围", args);
            $gameMessage.add("设置锻造范围失败：参数无效");
            return;
        }
        
        if (start > end) {
            console.error("SimpleForge: 起始ID不能大于结束ID", args);
            $gameMessage.add("设置锻造范围失败：起始ID不能大于结束ID");
            return;
        }
        
        // 收集范围内的所有物品ID
        const newItems = [];
        for (let i = start; i <= end; i++) {
            if ($dataItems[i]) {
                newItems.push(i);
            }
        }
        
        // 添加到现有列表
        const beforeCount = $gameSystem._simpleForgeData.availableItems.length; // [改]
        addItemsToForgeList(newItems);
        const addedCount = $gameSystem._simpleForgeData.availableItems.length - beforeCount; // [改]
        
        console.log(`SimpleForge: 添加锻造范围 ${start} - ${end}, 新增物品: ${addedCount}, 总计: ${$gameSystem._simpleForgeData.availableItems.length}`); // [改]
        //$gameMessage.add(`已添加锻造范围 ${start} 到 ${end}\\n新增 ${addedCount} 种物品，当前总计 ${$gameSystem._simpleForgeData.availableItems.length} 种`); // [改]
    });

    PluginManager.registerCommand(PLUGIN_NAME, "setList", function(args) {
        ensureForgeData(); // [新]
        if (!args.items || typeof args.items !== 'string') {
            console.error("SimpleForge: 物品列表参数无效", args);
            $gameMessage.add("设置锻造列表失败：参数无效");
            return;
        }
        
        const itemIds = args.items.split(' ').map(id => parseInt(id.trim())).filter(id => !isNaN(id) && id > 0);
        
        if (itemIds.length === 0) {
            console.error("SimpleForge: 没有有效的物品ID", args);
            $gameMessage.add("设置锻造列表失败：没有有效的物品ID");
            return;
        }
        
        // 验证物品是否存在并添加到列表
        const beforeCount = $gameSystem._simpleForgeData.availableItems.length; // [改]
        const validItems = [];
        
        for (const id of itemIds) {
            if ($dataItems[id]) {
                validItems.push(id);
            } else {
                console.warn(`SimpleForge: 物品ID ${id} 不存在，已跳过`);
            }
        }
        
        addItemsToForgeList(validItems);
        const addedCount = $gameSystem._simpleForgeData.availableItems.length - beforeCount; // [改]
        
        console.log(`SimpleForge: 添加锻造列表 ${validItems.join(', ')}, 新增物品: ${addedCount}, 总计: ${$gameSystem._simpleForgeData.availableItems.length}`); // [改]
        //$gameMessage.add(`已添加 ${addedCount} 种物品到锻造列表\\n当前总计 ${$gameSystem._simpleForgeData.availableItems.length} 种`); // [改]
    });

    PluginManager.registerCommand(PLUGIN_NAME, "clearList", function(args) {
        ensureForgeData(); // [新]
        const previousCount = $gameSystem._simpleForgeData.availableItems.length; // [改]
        $gameSystem._simpleForgeData.availableItems = []; // [改]
        
        console.log(`SimpleForge: 清空锻造列表，之前有 ${previousCount} 种物品`);
        $gameMessage.add(`已清空锻造列表，移除了 ${previousCount} 种物品`);
    });

    PluginManager.registerCommand(PLUGIN_NAME, "setMaterial", function(args) {
        ensureForgeData(); // [新]
        const varId = parseInt(args.varId);
        const varName = args.varName;
        
        if (isNaN(varId) || varId <= 0) {
            console.error("SimpleForge: 无效的变量ID", args);
            $gameMessage.add("设置锻造素材失败：变量ID无效");
            return;
        }
        
        if (!varName || varName.trim() === "") {
            console.error("SimpleForge: 素材名称不能为空", args);
            $gameMessage.add("设置锻造素材失败：素材名称不能为空");
            return;
        }
        
        // 添加或更新素材
        const existingIndex = $gameSystem._simpleForgeData.materials.findIndex(m => m.id === varId); // [改]
        if (existingIndex >= 0) {
            $gameSystem._simpleForgeData.materials[existingIndex].name = varName; // [改]
            console.log(`SimpleForge: 更新锻造素材 ${varId}: ${varName}`);
            //$gameMessage.add(`已更新锻造素材: ${varName}`);
        } else {
            $gameSystem._simpleForgeData.materials.push({ id: varId, name: varName }); // [改]
            console.log(`SimpleForge: 添加锻造素材 ${varId}: ${varName}, 总计: ${$gameSystem._simpleForgeData.materials.length}`); // [改]
            //$gameMessage.add(`已添加锻造素材: ${varName}`);
        }
    });

    PluginManager.registerCommand(PLUGIN_NAME, "setCost", function(args) {
        ensureForgeData(); // [新]
        const itemId = parseInt(args.itemId);
        const costsStr = args.costs;
        
        if (isNaN(itemId) || itemId <= 0) {
            console.error("SimpleForge: 无效的物品ID", args);
            $gameMessage.add("设置锻造消耗失败：物品ID无效");
            return;
        }
        
        if (!costsStr || typeof costsStr !== 'string') {
            console.error("SimpleForge: 消耗参数无效", args);
            $gameMessage.add("设置锻造消耗失败：消耗参数无效");
            return;
        }
        
        const costValues = costsStr.split(' ').map(cost => parseInt(cost.trim())).filter(cost => !isNaN(cost) && cost >= 0);
        
        if (costValues.length === 0) {
            console.error("SimpleForge: 没有有效的消耗值", args);
            $gameMessage.add("设置锻造消耗失败：没有有效的消耗值");
            return;
        }
        
        $gameSystem._simpleForgeData.costs[itemId] = costValues; // [改]
        
        console.log(`SimpleForge: 设置物品 ${itemId} 的消耗为 ${costValues.join(', ')}`);
        //$gameMessage.add(`已设置物品 #${itemId} 的锻造消耗`);
    });

    // =========================================================================
    // 主场景类定义
    // =========================================================================
    
    function Scene_SimpleForge() {
        this.initialize.apply(this, arguments);
    }

    Scene_SimpleForge.prototype = Object.create(Scene_MenuBase.prototype);
    Scene_SimpleForge.prototype.constructor = Scene_SimpleForge;

    Scene_SimpleForge.prototype.create = function() {
        Scene_MenuBase.prototype.create.call(this);
        this.createWindows();
    };

    Scene_SimpleForge.prototype.createWindows = function() {
		// 创建主窗口
		const rect = new Rectangle(80, 60, 560, 380);
		this._mainWindow = new Window_SimpleForge(rect);
		
		// 设置处理器
		this._mainWindow.setHandler('forge', this.onForgeStart.bind(this));
		this._mainWindow.setHandler('list', this.onShowForgeList.bind(this));
		this._mainWindow.setHandler('materials', this.onShowMaterials.bind(this));
		this._mainWindow.setHandler('cancel', this.popScene.bind(this));
		
		// 添加到场景
		this.addWindow(this._mainWindow);
		
		// 激活窗口
		this._mainWindow.activate();
		
		// 【核心修复】：设置输入保护罩，忽略激活时残留的输入，防止点击穿透。
		// 10 帧（约 0.16 秒）足以消除残余点击。
		if (this._mainWindow.setTouchGuard) {
			this._mainWindow.setTouchGuard(10); 
		}
	};

    Scene_SimpleForge.prototype.onForgeStart = function() {
        ensureForgeData(); // [新]
        // 检查是否有可锻造的物品
        if ($gameSystem._simpleForgeData.availableItems.length === 0) { // [改]
            $gameMessage.add("没有可锻造的物品，请先设置锻造范围或列表。");
            SoundManager.playBuzzer();
            this.setupMessageCallback();
            return;
        }
        
        // 检查是否有设置素材
        if ($gameSystem._simpleForgeData.materials.length === 0) { // [改]
            $gameMessage.add("没有设置锻造素材，请先设置锻造素材。");
            SoundManager.playBuzzer();
            this.setupMessageCallback();
            return;
        }
        
        // 进入素材输入场景
        SceneManager.push(Scene_MaterialInput);
    };

    Scene_SimpleForge.prototype.onShowForgeList = function() {
        ensureForgeData(); // [新]
        // 检查是否有可锻造的物品
        if ($gameSystem._simpleForgeData.availableItems.length === 0) { // [改]
            $gameMessage.add("当前没有可锻造的物品。");
            this.setupMessageCallback();
            return;
        }
        
        // 创建可锻造列表场景
        SceneManager.push(Scene_ForgeList);
    };

    Scene_SimpleForge.prototype.onShowMaterials = function() {
        // 创建素材信息场景
        SceneManager.push(Scene_MaterialInfo);
    };

    Scene_SimpleForge.prototype.setupMessageCallback = function() {
        // 保存当前场景引用
        const scene = this;
        
        // 重写消息系统的更新方法，检测消息是否结束
        const originalUpdate = Scene_Message.prototype.update;
        Scene_Message.prototype.update = function() {
            originalUpdate.call(this);
            
            // 检查消息是否已经结束
            if (!this._messageWindow || !this._messageWindow.isOpening() && !this._messageWindow.isClosing()) {
                if (this._messageWindow && this._messageWindow.isClosed()) {
                    // 恢复原始更新方法
                    Scene_Message.prototype.update = originalUpdate;
                    
                    // 重新打开锻刀界面
                    setTimeout(function() {
                        SceneManager.push(Scene_SimpleForge);
                    }, 10);
                }
            }
        };
        
        // 关闭当前场景
        this.popScene();
    };

    // =========================================================================
    // 可锻造列表场景
    // =========================================================================
    
    function Scene_ForgeList() {
        this.initialize.apply(this, arguments);
    }

    Scene_ForgeList.prototype = Object.create(Scene_MenuBase.prototype);
    Scene_ForgeList.prototype.constructor = Scene_ForgeList;

    Scene_ForgeList.prototype.create = function() {
        Scene_MenuBase.prototype.create.call(this);
        this.createWindows();
    };

    // 【修改】：重写创建窗口方法，修改标题提示并绑定 'ok' 事件
    Scene_ForgeList.prototype.createWindows = function() {
        ensureForgeData(); // [新]
        // 创建标题窗口
        this._titleWindow = new Window_Base(new Rectangle(80, 50, 600, 60));
        this._titleWindow.drawText("可锻造列表 (点击配方可快捷填入)", 0, 0, 600, "center");
        this._titleWindow.drawText(`总计: ${$gameSystem._simpleForgeData.availableItems.length} 种物品`, 0, 30, 600, "center"); 
        this.addWindow(this._titleWindow);
        
        // 创建列表窗口
        const listRect = new Rectangle(80, 120, 600, 380);
        this._listWindow = new Window_ForgeList(listRect);
        
        // 【新增】：绑定确定键/鼠标点击处理器
        this._listWindow.setHandler('ok', this.onItemOk.bind(this));
        this._listWindow.setHandler('cancel', this.popScene.bind(this));
        this.addWindow(this._listWindow);
        
        // 激活列表窗口
        this._listWindow.activate();
    };

    // 【新增】：处理列表项被点击后的逻辑
    Scene_ForgeList.prototype.onItemOk = function() {
        ensureForgeData();
        const index = this._listWindow.index();
        const itemId = $gameSystem._simpleForgeData.availableItems[index];
        const costs = $gameSystem._simpleForgeData.costs[itemId] || [];

        // 将当前选中的配方消耗存入场景类的静态变量，作为“快递”传给下一个场景
        Scene_MaterialInput._prefillCosts = costs;
        
        // 播放确认音效并推送锻造输入场景
        SoundManager.playOk();
        SceneManager.push(Scene_MaterialInput);
    };

    // =========================================================================
    // 素材信息场景
    // =========================================================================
    
    function Scene_MaterialInfo() {
        this.initialize.apply(this, arguments);
    }

    Scene_MaterialInfo.prototype = Object.create(Scene_MenuBase.prototype);
    Scene_MaterialInfo.prototype.constructor = Scene_MaterialInfo;

    Scene_MaterialInfo.prototype.create = function() {
        Scene_MenuBase.prototype.create.call(this);
        this.createWindows();
    };

    Scene_MaterialInfo.prototype.createWindows = function() {
        // 创建标题窗口
        this._titleWindow = new Window_Base(new Rectangle(80, 50, 600, 60));
        this._titleWindow.drawText("锻造素材信息", 0, 0, 600, "center");
        this.addWindow(this._titleWindow);
        
        // 创建素材窗口
        const materialRect = new Rectangle(80, 120, 600, 380);
        this._materialWindow = new Window_MaterialInfo(materialRect);
        this._materialWindow.setHandler('cancel', this.popScene.bind(this));
        this.addWindow(this._materialWindow);
        
        // 激活素材窗口
        this._materialWindow.activate();
    };

    // =========================================================================
    // 素材输入场景 - 修复窗口重开问题
    // =========================================================================
    
    function Scene_MaterialInput() {
        this.initialize.apply(this, arguments);
    }

    Scene_MaterialInput.prototype = Object.create(Scene_MenuBase.prototype);
    Scene_MaterialInput.prototype.constructor = Scene_MaterialInput;

    // 【修改】：在创建输入场景时，检查是否有传过来的预填数据
    Scene_MaterialInput.prototype.create = function() {
        Scene_MenuBase.prototype.create.call(this);
        ensureForgeData(); // [新]
        
        // 初始化输入值
        this._inputValues = [];
        for (let i = 0; i < $gameSystem._simpleForgeData.materials.length; i++) { // [改]
            // 如果从列表传来了预填配方，则直接读取；否则默认为 0
            if (Scene_MaterialInput._prefillCosts && i < Scene_MaterialInput._prefillCosts.length) {
                this._inputValues[i] = Scene_MaterialInput._prefillCosts[i];
            } else {
                this._inputValues[i] = 0;
            }
        }
        
        // 【新增】：清理掉“快递”数据，防止玩家下次从“开始锻造”进入时也带入上一次的数字
        Scene_MaterialInput._prefillCosts = null;

        this._currentIndex = 0;
        this._numberInputIndex = null;
        this._numberInputActive = false;
        this._forgingInProgress = false;
        
        this.createWindows();
    };

    Scene_MaterialInput.prototype.createWindows = function() {
        // 创建标题窗口
        this._titleWindow = new Window_Base(new Rectangle(80, 50, 600, 60));
        this._titleWindow.drawText("请输入素材数量", 0, 0, 600, "center");
        this._titleWindow.drawText("使用方向键选择素材，确定键输入数量", 0, 30, 600, "center");
        this.addWindow(this._titleWindow);
        
        // 创建输入窗口
        const inputRect = new Rectangle(80, 120, 600, 300);
        this._inputWindow = new Window_MaterialInputFixed(inputRect);
        
        // 设置处理器
        this._inputWindow.setHandler('materialClick', this.onMaterialClick.bind(this));
        this._inputWindow.setHandler('ok', this.onInputConfirm.bind(this));
        this._inputWindow.setHandler('cancel', this.popScene.bind(this));
        
        this.addWindow(this._inputWindow);
        
        // 设置输入窗口数据
        this._inputWindow.setData(this._inputValues, this._currentIndex);
        
        // 激活输入窗口
        this._inputWindow.activate();
    };

    Scene_MaterialInput.prototype.onMaterialClick = function(index) {
        if (this._numberInputActive) {
            console.log("Number input already active, ignoring click");
            return;
        }
        
        console.log("Material clicked:", index);
        this._numberInputIndex = index;
        this.startNumberInput();
    };

    Scene_MaterialInput.prototype.startNumberInput = function() {
        if (this._numberInputIndex === null || this._numberInputActive) return;
        ensureForgeData(); // [新]
        
        const material = $gameSystem._simpleForgeData.materials[this._numberInputIndex]; // [改]
        const currentAmount = $gameVariables.value(material.id);
        
        // 创建自定义数字输入窗口
        this.createNumberInputWindow(material.name, currentAmount);
    };

    Scene_MaterialInput.prototype.createNumberInputWindow = function(materialName, maxValue) {
        console.log("Creating number input window for:", materialName, "max:", maxValue);
        
        // 窗口宽度调整为 420，确保有足够的空间容纳 10px 右边距
        const numberRect = new Rectangle(200, 100, 420, 270); 
        
        // 创建新的数字输入窗口
        this._numberInputWindow = new Window_ForgeNumberInputFixed(numberRect);
        this._numberInputWindow.setHandler('ok', this.onNumberInputOk.bind(this));
        this._numberInputWindow.setHandler('cancel', this.onNumberInputCancel.bind(this));
        this._numberInputWindow.setup(materialName, maxValue);
        
        // 添加到窗口层
        this.addWindow(this._numberInputWindow);
        
        // 设置状态标志
        this._numberInputActive = true;
        
        // 直接显示和激活
        this._numberInputWindow.show();
        this._numberInputWindow.activate();
        
        // 停用输入窗口
        if (this._inputWindow) {
            this._inputWindow.deactivate();
        }
        
        console.log("Number input window created and activated");
    };

    Scene_MaterialInput.prototype.onNumberInputOk = function() {
        console.log("Number input OK");
        const inputNumber = this._numberInputWindow.value();
        
        // 更新输入值
        if (this._inputValues && this._numberInputIndex !== null) {
            this._inputValues[this._numberInputIndex] = inputNumber;
            this._inputWindow.setData(this._inputValues, this._numberInputIndex);
        }
        
        // 关闭数字输入窗口
        this.closeNumberInputWindow();
    };

    Scene_MaterialInput.prototype.onNumberInputCancel = function() {
        console.log("Number input Cancel");
        // 关闭数字输入窗口
        this.closeNumberInputWindow();
    };

    Scene_MaterialInput.prototype.closeNumberInputWindow = function() {
        console.log("Closing number input window");
        
        // 重置状态标志
        this._numberInputActive = false;
        
        if (this._numberInputWindow) {
            if (this._numberInputWindow.isOpen()) {
                this._numberInputWindow.deactivate();
                this._numberInputWindow.hide();
            }
            // 使用 destroy 以确保完全清理
            this._numberInputWindow.destroy(); 
            this._numberInputWindow = null;
        }
        this._numberInputIndex = null;
        
        // 重新激活输入窗口
        if (this._inputWindow) {
            // **【最终修复点】在激活下层窗口前，设置触摸保护罩**
            if (this._inputWindow.setTouchGuard) {
                // 忽略接下来的 15 帧触摸输入 (约 0.25 秒)
                this._inputWindow.setTouchGuard(15); 
            }
            
            this._inputWindow.activate();
            this._inputWindow.refresh();
        }
    };

    Scene_MaterialInput.prototype.onInputConfirm = function() {
        // 防止重复执行锻造
        if (this._forgingInProgress) {
            console.log("锻造正在进行中，忽略重复确认");
            return;
        }
        
        // 检查是否所有素材都输入了数量
        let hasInput = false;
        for (let i = 0; i < this._inputValues.length; i++) {
            if (this._inputValues[i] > 0) {
                hasInput = true;
                break;
            }
        }
        
        if (!hasInput) {
			//先注释掉提示，蜂鸣已经足够明显
            //$gameMessage.add("请至少输入一种素材的数量。");
            SoundManager.playBuzzer();
            return;
        }
        
        // 设置锻造进行中标志
        this._forgingInProgress = true;
        
        // 立即停用输入窗口以阻止后续输入事件
        if (this._inputWindow) {
            this._inputWindow.deactivate();
        }
        
        // 执行锻造
        this.performForge();
    };

    Scene_MaterialInput.prototype.performForge = function() {
        console.log("开始执行锻造，输入值:", this._inputValues);
        ensureForgeData(); // [新]
        
        // 检查玩家是否有足够的素材
        for (let i = 0; i < this._inputValues.length; i++) {
            const material = $gameSystem._simpleForgeData.materials[i]; // [改]
            const inputAmount = this._inputValues[i];
            const currentAmount = $gameVariables.value(material.id);
            
            console.log(`检查素材 ${material.name}: 需要 ${inputAmount}, 当前 ${currentAmount}`);
            
            if (inputAmount > currentAmount) {
                $gameMessage.add(`${material.name}不足！需要${inputAmount}，但只有${currentAmount}。`);
                SoundManager.playBuzzer();
                this._forgingInProgress = false;
                
                // 重新激活输入窗口以允许用户修改
                if (this._inputWindow) {
                    this._inputWindow.activate();
                }
                return;
            }
        }
        
        // 消耗素材
        for (let i = 0; i < this._inputValues.length; i++) {
            const material = $gameSystem._simpleForgeData.materials[i]; // [改]
            const inputAmount = this._inputValues[i];
            const currentAmount = $gameVariables.value(material.id);
            
            if (inputAmount > 0) {
                console.log(`消耗素材 ${material.name}: ${currentAmount} - ${inputAmount} = ${currentAmount - inputAmount}`);
                $gameVariables.setValue(material.id, currentAmount - inputAmount);
            }
        }
        
        // 根据投入的素材查找匹配的刀剑
        const matchedItems = this.findMatchingItems();
        console.log("匹配的物品:", matchedItems);
        
        let resultItem;
        if (matchedItems.length > 0) {
            // 有匹配的刀剑，随机选择一把
            const randomIndex = Math.floor(Math.random() * matchedItems.length);
            resultItem = $dataItems[matchedItems[randomIndex]];
            console.log("从匹配物品中随机选择:", resultItem.name);
        } else {
            // 没有匹配的刀剑，从所有可锻造物品中随机选择一把
            const randomIndex = Math.floor(Math.random() * $gameSystem._simpleForgeData.availableItems.length); // [改]
            resultItem = $dataItems[$gameSystem._simpleForgeData.availableItems[randomIndex]]; // [改]
            console.log("从所有物品中随机选择:", resultItem.name);
        }
        
        // 获得物品
        $gameParty.gainItem(resultItem, 1);
        console.log("获得物品:", resultItem.name);
        
        // 显示结果
        let resultMessage = "锻造完成！";
        resultMessage += "\\n获得了：" + resultItem.name;
        //resultMessage += "\\n投入素材：";
        
        // for (let i = 0; i < this._inputValues.length; i++) {
            // if (this._inputValues[i] > 0) {
                // resultMessage += "\\n" + $gameSystem._simpleForgeData.materials[i].name + "：" + this._inputValues[i]; // [改]
            // }
        // }
        
        // 重置锻造标志
        this._forgingInProgress = false;
        
        // 立即关闭所有锻刀相关的场景并显示结果
        this.closeAllForgeScenesAndShowResult(resultMessage);
    };

    /**
     * **关闭所有锻刀相关的场景**
     */
    // 【修改】：彻底返回地图，不论嵌套了多少层菜单
    Scene_MaterialInput.prototype.closeAllForgeScenesImmediate = function() {
        console.log("立即关闭所有锻刀场景");
        // 直接安全跳转回游戏地图层
        SceneManager.goto(Scene_Map);
    };
    
    /**
     * **立即关闭所有场景并显示结果消息。**
     */
    Scene_MaterialInput.prototype.closeAllForgeScenesAndShowResult = function(resultMessage) {
        console.log("立即关闭所有锻刀场景并显示结果");
        
        // 1. 显示锻造结果消息
        $gameMessage.add(resultMessage);
        SoundManager.playOk();
        console.log("显示锻造结果消息");

        // 【新增】：设置一个防穿透标记，告诉大地图系统需要进行触摸保护
        $gameTemp._forgeResultShowing = true;
        
        // 2. 立即安全跳转回大地图
        this.closeAllForgeScenesImmediate();
    };
    
    Scene_MaterialInput.prototype.findMatchingItems = function() {
        ensureForgeData(); // [新]
        const matchedItems = [];
        
        // 遍历所有可锻造物品
        for (const itemId of $gameSystem._simpleForgeData.availableItems) { // [改]
            const costs = $gameSystem._simpleForgeData.costs[itemId]; // [改]
            
            // 如果没有设置消耗，跳过
            if (!costs) continue;
            
            // 检查消耗是否与输入匹配
            let isMatch = true;
            for (let i = 0; i < this._inputValues.length; i++) {
                const inputAmount = this._inputValues[i];
                const costAmount = (i < costs.length) ? costs[i] : 0;
                
                // 如果输入了这种素材，但消耗不匹配
                if (inputAmount > 0 && inputAmount !== costAmount) {
                    isMatch = false;
                    break;
                }
                
                // 如果没有输入这种素材，但物品需要这种素材
                if (inputAmount === 0 && costAmount > 0) {
                    isMatch = false;
                    break;
                }
            }
            
            if (isMatch) {
                matchedItems.push(itemId);
            }
        }
        
        return matchedItems;
    };

    // =========================================================================
	// 主窗口类定义 - 【最终修复点：添加触摸保护罩】
	// =========================================================================
		
	function Window_SimpleForge() {
		this.initialize.apply(this, arguments);
	}

	Window_SimpleForge.prototype = Object.create(Window_Selectable.prototype);
	Window_SimpleForge.prototype.constructor = Window_SimpleForge;

	Window_SimpleForge.prototype.initialize = function(rect) {
		Window_Selectable.prototype.initialize.call(this, rect);
		this._touchGuard = 0; // <<--- 新增：触摸保护帧数计数器
		this.refresh();
		this.select(0);
		this.activate();
	};

	// **新增：设置触摸保护的帧数**
	Window_SimpleForge.prototype.setTouchGuard = function(frames) {
		this._touchGuard = frames;
	};

	// **覆写：更新方法，处理触摸保护**
	Window_SimpleForge.prototype.update = function() {
		Window_Selectable.prototype.update.call(this);
		
		// 如果触摸保护计数器大于 0，则每帧递减
		if (this._touchGuard > 0) {
			this._touchGuard--;
		}
	};

	// **覆写：触摸处理方法，实现保护逻辑**
	Window_SimpleForge.prototype.processTouch = function() {
		if (this._touchGuard > 0) {
			// 如果保护罩开启，则忽略触摸输入，防止点击穿透
			return; 
		}
		// 调用父类的原始触摸处理逻辑
		Window_Selectable.prototype.processTouch.call(this);
	};

	// 添加缺失的声音方法
	Window_SimpleForge.prototype.playOkSound = function() {
		SoundManager.playOk();
	};

	Window_SimpleForge.prototype.playCancelSound = function() {
		SoundManager.playCancel();
	};

	Window_SimpleForge.prototype.playBuzzerSound = function() {
		SoundManager.playBuzzer();
	};

	// 确保输入方法可用
	Window_SimpleForge.prototype.isOkEnabled = function() {
		return this.isOpenAndActive();
	};

	Window_SimpleForge.prototype.isCancelEnabled = function() {
		return this.isOpenAndActive();
	};

	Window_SimpleForge.prototype.isTouchOkEnabled = function() {
		// 在这里也检查保护罩，防止在 processTouch 之前被调用
		return this.isOpenAndActive() && this._touchGuard === 0;
	};

	// 窗口内容
	Window_SimpleForge.prototype.maxItems = function() {
		return 4;
	};

	Window_SimpleForge.prototype.itemHeight = function() {
		return 80;
	};

	Window_SimpleForge.prototype.drawItem = function(index) {
		const rect = this.itemRect(index);
		
		// 绘制项目背景
		this.contents.fillRect(rect.x, rect.y, rect.width, rect.height - 4, "rgba(0, 0, 0, 0.5)");
		
		// 绘制选中状态的边框
		if (index === this.index()) {
			this.contents.fillRect(rect.x, rect.y, rect.width, 4, "rgba(255, 255, 255, 0.8)");
			this.contents.fillRect(rect.x, rect.y + rect.height - 4, rect.width, 4, "rgba(255, 255, 255, 0.8)");
			this.contents.fillRect(rect.x, rect.y, 4, rect.height, "rgba(255, 255, 255, 0.8)");
			this.contents.fillRect(rect.x + rect.width - 4, rect.y, 4, rect.height, "rgba(255, 255, 255, 0.8)");
		}
		
		// 绘制选项内容 - 使用更大的字体和更好的布局
		this.contents.fontSize = 22;
		switch(index) {
			case 0:
				this.drawText("开始锻刀", rect.x, rect.y + 15, rect.width, "center");
				this.contents.fontSize = 18;
				this.drawText("投入素材锻造刀剑", rect.x, rect.y + 45, rect.width, "center");
				break;
			case 1:
				this.drawText("可锻造列表", rect.x, rect.y + 15, rect.width, "center");
				this.contents.fontSize = 18;
				this.drawText("查看所有可锻造物品", rect.x, rect.y + 45, rect.width, "center");
				break;
			case 2:
				this.drawText("素材信息", rect.x, rect.y + 15, rect.width, "center");
				this.contents.fontSize = 18;
				this.drawText("查看当前素材持有量", rect.x, rect.y + 45, rect.width, "center");
				break;
			case 3:
				this.drawText("退出工坊", rect.x, rect.y + 15, rect.width, "center");
				this.contents.fontSize = 18;
				this.drawText("返回游戏", rect.x, rect.y + 45, rect.width, "center");
				break;
		}
		
		// 恢复默认字体大小
		this.contents.fontSize = 28;
	};

	Window_SimpleForge.prototype.isCurrentItemEnabled = function() {
		return true;
	};

	// 处理确定键 (确保键盘/手柄输入也在保护罩内)
	Window_SimpleForge.prototype.processOk = function() {
		// 检查输入保护罩
		if (this._touchGuard > 0) {
			return;
		}
		
		if (this.isCurrentItemEnabled()) {
			this.playOkSound();
			const index = this.index();
			
			switch(index) {
				case 0:
					this.callHandler('forge');
					break;
				case 1:
					this.callHandler('list');
					break;
				case 2:
					this.callHandler('materials');
					break;
				case 3:
					this.callHandler('cancel');
					break;
			}
		} else {
			this.playBuzzerSound();
		}
	};

	// 处理取消键
	Window_SimpleForge.prototype.processCancel = function() {
		if (this._touchGuard > 0) {
			return;
		}
		this.playCancelSound();
		this.callHandler('cancel');
	};

    // =========================================================================
    // 可锻造列表窗口
    // =========================================================================
    
    function Window_ForgeList() {
        this.initialize.apply(this, arguments);
    }

    Window_ForgeList.prototype = Object.create(Window_Selectable.prototype);
    Window_ForgeList.prototype.constructor = Window_ForgeList;

    Window_ForgeList.prototype.initialize = function(rect) {
        Window_Selectable.prototype.initialize.call(this, rect);
        this.refresh();
        this.select(0);
        this.activate();
    };

    // 添加缺失的声音方法 
    Window_ForgeList.prototype.playOkSound = function() {
        SoundManager.playOk();
    };

    Window_ForgeList.prototype.playCancelSound = function() {
        SoundManager.playCancel();
    };

    Window_ForgeList.prototype.playBuzzerSound = function() {
        SoundManager.playBuzzer();
    };

    // 确保输入方法可用
    Window_ForgeList.prototype.isOkEnabled = function() {
        return this.isOpenAndActive();
    };

    Window_ForgeList.prototype.isCancelEnabled = function() {
        return this.isOpenAndActive();
    };

    Window_ForgeList.prototype.isTouchOkEnabled = function() {
        return this.isOpenAndActive();
    };

    Window_ForgeList.prototype.maxItems = function() {
        ensureForgeData(); // [新]
        return $gameSystem._simpleForgeData.availableItems.length; // [改]
    };

    Window_ForgeList.prototype.itemHeight = function() {
        return 80;
    };

    Window_ForgeList.prototype.maxCols = function() {
        return 1;
    };

    Window_ForgeList.prototype.maxVisibleItems = function() {
        return 5;
    };

    Window_ForgeList.prototype.drawItem = function(index) {
        ensureForgeData(); // [新]
        const rect = this.itemRect(index);
        const itemId = $gameSystem._simpleForgeData.availableItems[index]; // [改]
        const item = $dataItems[itemId];
        
        if (!item) return;
        
        // 绘制项目背景
        this.contents.fillRect(rect.x, rect.y, rect.width, rect.height - 2, "rgba(0, 0, 0, 0.5)");
        
        // 绘制选中状态的边框
        if (index === this.index()) {
            this.contents.fillRect(rect.x, rect.y, rect.width, 2, "rgba(255, 255, 255, 0.8)");
            this.contents.fillRect(rect.x, rect.y + rect.height - 2, rect.width, 2, "rgba(255, 255, 255, 0.8)");
            this.contents.fillRect(rect.x, rect.y, 2, rect.height, "rgba(255, 255, 255, 0.8)");
            this.contents.fillRect(rect.x + rect.width - 2, rect.y, 2, rect.height, "rgba(255, 255, 255, 0.8)");
        }
        
        // 绘制物品名称 - 使用更大的字体和更显眼的位置
        this.contents.fontSize = 20;
        this.drawText(`〖${item.name}〗`, rect.x + 10, rect.y + 8, rect.width - 20, "left");
        
        // 绘制消耗信息 - 使用较小的字体，确保有足够空间
        this.contents.fontSize = 16;
        const costDesc = getCostDescription(itemId);
        
        // 智能换行处理
        const maxLineWidth = rect.width - 20; // 留出边距
        const lines = this.wrapText(costDesc, maxLineWidth);
        
        // 绘制每一行
        for (let i = 0; i < lines.length; i++) {
            if (i >= 2) break; // 最多显示两行
            this.drawText(lines[i], rect.x + 10, rect.y + 35 + (i * 20), rect.width - 20, "left");
        }
        
        // 如果内容被截断，添加提示
        if (lines.length > 2) {
            this.drawText("...", rect.x + 10, rect.y + 75, rect.width - 20, "left");
        }
        
        // 恢复默认字体大小
        this.contents.fontSize = 28;
    };

    // 文本换行函数
    Window_ForgeList.prototype.wrapText = function(text, maxWidth) {
        const words = text.split(', ');
        const lines = [];
        let currentLine = '';
        
        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            const testLine = currentLine ? currentLine + ', ' + word : word;
            const testWidth = this.textWidth(testLine);
            
            if (testWidth > maxWidth && currentLine !== '') {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        }
        
        if (currentLine) {
            lines.push(currentLine);
        }
        
        return lines;
    };

    Window_ForgeList.prototype.isCurrentItemEnabled = function() {
        return true; // 要快速跳转，列表项可以被选择
    };

    // 处理取消键
    Window_ForgeList.prototype.processCancel = function() {
        this.playCancelSound();
        this.callHandler('cancel');
    };

    // =========================================================================
    // 素材信息窗口
    // =========================================================================
    
    function Window_MaterialInfo() {
        this.initialize.apply(this, arguments);
    }

    Window_MaterialInfo.prototype = Object.create(Window_Selectable.prototype);
    Window_MaterialInfo.prototype.constructor = Window_MaterialInfo;

    Window_MaterialInfo.prototype.initialize = function(rect) {
        Window_Selectable.prototype.initialize.call(this, rect);
        this.refresh();
        this.select(0);
        this.activate();
    };

    // 添加缺失的声音方法 
    Window_MaterialInfo.prototype.playOkSound = function() {
        SoundManager.playOk();
    };

    Window_MaterialInfo.prototype.playCancelSound = function() {
        SoundManager.playCancel();
    };

    Window_MaterialInfo.prototype.playBuzzerSound = function() {
        SoundManager.playBuzzer();
    };

    // 确保输入方法可用
    Window_MaterialInfo.prototype.isOkEnabled = function() {
        return this.isOpenAndActive();
    };

    Window_MaterialInfo.prototype.isCancelEnabled = function() {
        return this.isOpenAndActive();
    };

    Window_MaterialInfo.prototype.isTouchOkEnabled = function() {
        return this.isOpenAndActive();
    };

    Window_MaterialInfo.prototype.maxItems = function() {
        ensureForgeData(); // [新]
        return $gameSystem._simpleForgeData.materials.length; // [改]
    };

    Window_MaterialInfo.prototype.itemHeight = function() {
        return 60;
    };

    Window_MaterialInfo.prototype.maxCols = function() {
        return 1;
    };

    Window_MaterialInfo.prototype.maxVisibleItems = function() {
        return 6;
    };

    Window_MaterialInfo.prototype.drawItem = function(index) {
        const rect = this.itemRect(index);
        ensureForgeData(); // [新]
        
        if (index >= $gameSystem._simpleForgeData.materials.length) return; // [改]
        
        const material = $gameSystem._simpleForgeData.materials[index]; // [改]
        const currentAmount = $gameVariables.value(material.id);
        
        // 绘制项目背景
        this.contents.fillRect(rect.x, rect.y, rect.width, rect.height - 2, "rgba(0, 0, 0, 0.5)");
        
        // 绘制选中状态的边框
        if (index === this.index()) {
            this.contents.fillRect(rect.x, rect.y, rect.width, 2, "rgba(255, 255, 255, 0.8)");
            this.contents.fillRect(rect.x, rect.y + rect.height - 2, rect.width, 2, "rgba(255, 255, 255, 0.8)");
            this.contents.fillRect(rect.x, rect.y, 2, rect.height, "rgba(255, 255, 255, 0.8)");
            this.contents.fillRect(rect.x + rect.width - 2, rect.y, 2, rect.height, "rgba(255, 255, 255, 0.8)");
        }
        
        // 绘制素材图标和名称 - 左侧区域
        this.contents.fontSize = 20;
        this.drawText(`● ${material.name}`, rect.x + 15, rect.y + 15, 300, "left");
        
        // 绘制持有数量 - 右侧区域，使用更大的字体和显眼颜色
        this.contents.fontSize = 22;
        const amountText = `持有: ${currentAmount}`;
        const amountWidth = this.textWidth(amountText);
        this.drawText(amountText, rect.x + rect.width - amountWidth - 20, rect.y + 15, amountWidth, "left");
        
        // 恢复默认字体大小
        this.contents.fontSize = 28;
    };

    Window_MaterialInfo.prototype.isCurrentItemEnabled = function() {
        return false; // 列表项不可选择，仅供查看
    };

    // 处理取消键
    Window_MaterialInfo.prototype.processCancel = function() {
        this.playCancelSound();
        this.callHandler('cancel');
    };

    // =========================================================================
    // 修复的素材输入窗口 - 【最终修复点：添加触摸保护罩】
    // =========================================================================
    
    function Window_MaterialInputFixed() {
        this.initialize.apply(this, arguments);
    }

    Window_MaterialInputFixed.prototype = Object.create(Window_Selectable.prototype);
    Window_MaterialInputFixed.prototype.constructor = Window_MaterialInputFixed;

    Window_MaterialInputFixed.prototype.initialize = function(rect) {
        Window_Selectable.prototype.initialize.call(this, rect);
        this._inputValues = [];
        this._currentIndex = 0;
        this._handlers = {};
        this._processing = false;
        this._lastProcessTime = 0;
        this._touchGuard = 0; // <<--- 新增：触摸保护帧数计数器
        this.refresh();
        this.select(0);
        this.activate();
    };

    // **新增：设置触摸保护的帧数**
    Window_MaterialInputFixed.prototype.setTouchGuard = function(frames) {
        this._touchGuard = frames;
    };

    // **覆写：更新方法，处理触摸保护**
    Window_MaterialInputFixed.prototype.update = function() {
        Window_Selectable.prototype.update.call(this);
        
        // 如果触摸保护计数器大于 0，则每帧递减
        if (this._touchGuard > 0) {
            this._touchGuard--;
        }
    };

    // **覆写：触摸处理方法，实现保护逻辑**
    Window_MaterialInputFixed.prototype.processTouch = function() {
        if (this._touchGuard > 0) {
            // 如果保护罩开启，则忽略触摸输入，防止点击穿透
            return; 
        }
        // 调用父类的原始触摸处理逻辑
        Window_Selectable.prototype.processTouch.call(this);
    };
    
    Window_MaterialInputFixed.prototype.setData = function(inputValues, currentIndex) {
        this._inputValues = inputValues || [];
        this._currentIndex = currentIndex || 0;
        this.refresh();
        this.select(this._currentIndex);
    };

    // 添加缺失的声音方法 
    Window_MaterialInputFixed.prototype.playOkSound = function() {
        SoundManager.playOk();
    };

    Window_MaterialInputFixed.prototype.playCancelSound = function() {
        SoundManager.playCancel();
    };

    Window_MaterialInputFixed.prototype.playBuzzerSound = function() {
        SoundManager.playBuzzer();
    };

    // 确保输入方法可用
    Window_MaterialInputFixed.prototype.isOkEnabled = function() {
        return this.isOpenAndActive();
    };

    Window_MaterialInputFixed.prototype.isCancelEnabled = function() {
        return this.isOpenAndActive();
    };

    Window_MaterialInputFixed.prototype.isTouchOkEnabled = function() {
        return this.isOpenAndActive();
    };

    Window_MaterialInputFixed.prototype.maxItems = function() {
        ensureForgeData(); // [新]
        return ($gameSystem._simpleForgeData.materials ? $gameSystem._simpleForgeData.materials.length : 0) + 1; // [改]
    };

    Window_MaterialInputFixed.prototype.itemHeight = function() {
        return 50;
    };

    Window_MaterialInputFixed.prototype.maxCols = function() {
        return 1;
    };

    Window_MaterialInputFixed.prototype.maxVisibleItems = function() {
        return 6;
    };

    Window_MaterialInputFixed.prototype.drawItem = function(index) {
        const rect = this.itemRect(index);
        ensureForgeData(); // [新]
        
        // 绘制项目背景
        this.contents.fillRect(rect.x, rect.y, rect.width, rect.height - 2, "rgba(0, 0, 0, 0.5)");
        
        // 绘制选中状态的边框
        if (index === this.index()) {
            this.contents.fillRect(rect.x, rect.y, rect.width, 2, "rgba(255, 255, 255, 0.8)");
            this.contents.fillRect(rect.x, rect.y + rect.height - 2, rect.width, 2, "rgba(255, 255, 255, 0.8)");
            this.contents.fillRect(rect.x, rect.y, 2, rect.height, "rgba(255, 255, 255, 0.8)");
            this.contents.fillRect(rect.x + rect.width - 2, rect.y, 2, rect.height, "rgba(255, 255, 255, 0.8)");
        }
        
        // 绘制素材输入项
        if (index < ($gameSystem._simpleForgeData.materials ? $gameSystem._simpleForgeData.materials.length : 0)) { // [改]
            const material = $gameSystem._simpleForgeData.materials[index]; // [改]
            const currentAmount = $gameVariables.value(material.id);
            const inputAmount = this._inputValues[index] || 0;
            
            // 绘制素材名称
            this.contents.fontSize = 20;
            this.drawText(`● ${material.name}`, rect.x + 15, rect.y + 10, 200, "left");
            
            // 绘制输入数量
            this.drawText(`数量: ${inputAmount}`, rect.x + 220, rect.y + 10, 150, "left");
            
            // 绘制当前持有量
            this.drawText(`持有: ${currentAmount}`, rect.x + 380, rect.y + 10, 150, "left");
            
            // 恢复默认字体大小
            this.contents.fontSize = 28;
        } else {
            // 绘制确认按钮
            this.contents.fontSize = 22;
            this.drawText("开始锻造", rect.x, rect.y + 10, rect.width, "center");
            this.contents.fontSize = 28;
        }
    };

    Window_MaterialInputFixed.prototype.isCurrentItemEnabled = function() {
        return true;
    };

    // 确定键处理 - 增加输入清空
    Window_MaterialInputFixed.prototype.processOk = function() {
        const currentTime = Date.now();
        
        // 防止重复处理（500ms 冷却）
        if (currentTime - this._lastProcessTime < 500) {
            return;
        }
        
        this._lastProcessTime = currentTime;
        
        if (this.isCurrentItemEnabled()) {
            // 播放音效
            this.playOkSound();
            
            ensureForgeData(); // [新]
            const index = this.index();
            
            if (index < ($gameSystem._simpleForgeData.materials ? $gameSystem._simpleForgeData.materials.length : 0)) { // [改]
                // 点击素材项：进入数量输入
                if (this._handlers.materialClick) {
                    this._handlers.materialClick(index);
                }
            } else {
                // 点击“开始锻造”：确认锻造
                if (this._handlers.ok) {
                    this._handlers.ok();
                }
                // 在执行场景切换操作后，立即清空输入缓冲
                Input.clear(); 
            }
        } else {
            this.playBuzzerSound();
        }
    };

    // 修复的取消键处理
    Window_MaterialInputFixed.prototype.processCancel = function() {
        const currentTime = Date.now();
        
        // 防止重复处理
        if (currentTime - this._lastProcessTime < 500) {
            return;
        }
        
        this._lastProcessTime = currentTime;
        
        this.playCancelSound();
        if (this._handlers.cancel) {
            this._handlers.cancel();
        }
    };

    // 添加处理器设置方法
    Window_MaterialInputFixed.prototype.setHandler = function(symbol, method) {
        this._handlers[symbol] = method;
    };

    // =========================================================================
    // 修复的数字输入窗口 (包含按钮、定位和 C/F 键功能修复)
    // =========================================================================
    
    function Window_ForgeNumberInputFixed() {
        this.initialize.apply(this, arguments);
    }

    Window_ForgeNumberInputFixed.prototype = Object.create(Window_Base.prototype);
    Window_ForgeNumberInputFixed.prototype.constructor = Window_ForgeNumberInputFixed;

    Window_ForgeNumberInputFixed.prototype.initialize = function(rect) {
        Window_Base.prototype.initialize.call(this, rect);
        this._materialName = "";
        this._maxValue = 0;
        this._currentValue = 0;
        this._handlers = {};
        this._inputCooldown = 0;
        this.refresh();
    };

    // 添加缺失的坐标转换方法
    Window_ForgeNumberInputFixed.prototype.canvasToLocalX = function(x) {
        return x - this.x;
    };
    
    Window_ForgeNumberInputFixed.prototype.canvasToLocalY = function(y) {
        return y - this.y;
    };

    Window_ForgeNumberInputFixed.prototype.setup = function(materialName, maxValue) {
        this._materialName = materialName;
        this._maxValue = maxValue;
        this._currentValue = 0;
        this._inputCooldown = 10;
        this.refresh();
    };

    Window_ForgeNumberInputFixed.prototype.value = function() {
        return this._currentValue;
    };

    Window_ForgeNumberInputFixed.prototype.isOpenAndActive = function() {
        return this.isOpen() && this.active;
    };

    // **修复和调整：处理按钮触摸输入**
	Window_ForgeNumberInputFixed.prototype.processButtonTouch = function() {
		if (TouchInput.isTriggered() && this.isOpenAndActive()) {
			// 使用修复后的方法进行坐标转换
			const x = this.canvasToLocalX(TouchInput.x); 
			const y = this.canvasToLocalY(TouchInput.y);
			
			// 检查触摸是否在窗口内容区域内
			const contentX = x - this.padding;
			const contentY = y - this.padding;
			
			if (contentX >= 0 && contentX < this.innerWidth && contentY >= 0 && contentY < this.innerHeight) {
				
				this.contents.fontSize = 20; 
				
				const innerWidth = this.innerWidth;
				const buttonWidth = (innerWidth - 40) / 3;
				
				const buttonHeight = 40;
				const startY1 = 150;
				const startY2 = 200;
				const buttonLabels = ['+1', '-1', '确定', '+10', '-10', '取消'];
				
				for (let i = 0; i < buttonLabels.length; i++) {
					const label = buttonLabels[i];
					const col = i % 3;
					const row = Math.floor(i / 3);
					const startY = (row === 0) ? startY1 : startY2;
					// 10px 边距 + col * (buttonWidth + 10px 间距)
					const buttonX = 10 + col * (buttonWidth + 10); 
					const buttonY = startY;
					
					const rect = {x: buttonX, y: buttonY, width: buttonWidth, height: buttonHeight};

					// 触摸点在按钮范围内
					if (isPointInRect(contentX, contentY, rect)) {
						console.log(`Forge Button ${label} clicked! (Index: ${i})`);
						
						// --- 核心修改：根据按钮执行相应操作 ---
						if (label === '确定') {
							this.processOk(); // 确定
						} else if (label === '取消') {
							this.processCancel(); // 取消
						} else if (label === '+1') {
							this.changeValue(1); // +1
						} else if (label === '-1') {
							this.changeValue(-1); // -1
						} else if (label === '+10') {
							this.changeValue(10); // +10
						} else if (label === '-10') {
							this.changeValue(-10); // -10
						} else {
							// 理论上不会执行，但作为回退
							SoundManager.playOk(); 
						}
						// --- 核心修改结束 ---

						// 清除输入，防止多次触发
						TouchInput.clear(); 
						return;
					}
				}
			}
		}
	};


    // update 方法，新增左右键支持和按钮触摸处理
    Window_ForgeNumberInputFixed.prototype.update = function() {
        Window_Base.prototype.update.call(this);
        
        // 新增：处理按钮触摸
        this.processButtonTouch();
        
        // 处理输入冷却
        if (this._inputCooldown > 0) {
            this._inputCooldown--;
            return;
        }
        
        // 处理键盘输入
        if (this.isOpenAndActive()) {
            if (Input.isRepeated('up')) {
                this.changeValue(10);
            } else if (Input.isRepeated('down')) {
                this.changeValue(-10);
            } else if (Input.isRepeated('left') || Input.isRepeated('pagedown') || Input.isRepeated('r')) {
                this.changeValue(-1); // <-- 添加 'left' 支持 -1
            } else if (Input.isRepeated('right') || Input.isRepeated('pageup') || Input.isRepeated('l')) {
                this.changeValue(1);  // <-- 添加 'right' 支持 +1
            } else if (Input.isTriggered('ok')) {
                this.processOk();
            } else if (Input.isTriggered('cancel')) {
                this.processCancel();
            }
        }
    };

    Window_ForgeNumberInputFixed.prototype.changeValue = function(delta) {
        const newValue = this._currentValue + delta;
        
        if (newValue >= 0 && newValue <= this._maxValue) {
            this._currentValue = newValue;
            this.refresh();
            SoundManager.playCursor();
        } else {
            SoundManager.playBuzzer();
        }
    };

    // refresh 方法，【修复：使用 this.innerWidth 修正定位】
    Window_ForgeNumberInputFixed.prototype.refresh = function() {
        this.contents.clear();
        
        // 使用 this.innerWidth 作为基准宽度
        const innerWidth = this.innerWidth;
        const textWidth = innerWidth - 20; // 留出左右 10px 边距
        
        // 绘制窗口背景 (使用内容区域的尺寸)
        this.contents.fillRect(0, 0, innerWidth, this.innerHeight, "rgba(0, 0, 0, 0.8)");
        
        // 绘制标题
        this.contents.fontSize = 20;
        // X 坐标从 10 开始，相对于内容区域左上角
        this.drawText(`请输入${this._materialName}的数量`, 10, 10, textWidth, "center");
        
        // 绘制当前值
        this.contents.fontSize = 24;
        this.drawText(`当前: ${this._currentValue}`, 10, 40, textWidth, "center");
        
        // 绘制最大值
        this.contents.fontSize = 16;
        this.drawText(`最大值: ${this._maxValue}`, 10, 70, textWidth, "center");
        
        // 绘制操作提示
        this.drawText("↑/↓: ±10  ←/→: ±1", 10, 100, textWidth, "center");
        
        // **新增：绘制 A, B, C, D, E, F 按钮**
        this.contents.fontSize = 20;
        
        // 按钮宽度计算：基于 this.innerWidth
        // 3 * buttonWidth = innerWidth - (左 10 + 间隙 10 + 间隙 10 + 右 10) = innerWidth - 40
        const buttonWidth = (innerWidth - 40) / 3; 
        
        const buttonHeight = 40;
        const startY1 = 150;
        const startY2 = 200;
        const buttonLabels = ['+1', '-1', '确定', '+10', '-10', '取消'];

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
            this.drawText(label, x, y + 6, buttonWidth, "center"); 
        }
        // **********************************************

        // 恢复默认字体大小
        this.contents.fontSize = 28;
    };
    // **********************************************

    Window_ForgeNumberInputFixed.prototype.processOk = function() {
        SoundManager.playOk();
        if (this._handlers.ok) {
            this._handlers.ok();
        }
    };

    Window_ForgeNumberInputFixed.prototype.processCancel = function() {
        SoundManager.playCancel();
        if (this._handlers.cancel) {
            this._handlers.cancel();
        }
    };

    Window_ForgeNumberInputFixed.prototype.setHandler = function(symbol, method) {
        this._handlers[symbol] = method;
    };
	
	// =========================================================================
    // 【新增】大地图防穿透拦截器
    // =========================================================================
    const _Scene_Map_processMapTouch = Scene_Map.prototype.processMapTouch;
    Scene_Map.prototype.processMapTouch = function() {
        // 如果当前正在展示锻造结果
        if ($gameTemp._forgeResultShowing) {
            // 如果消息框还在显示
            if ($gameMessage.isBusy()) {
                // 清除触摸输入，防止在阅读消息时积攒点击意图
                TouchInput.clear();
                return;
            } else {
                // 消息框刚刚被关闭的瞬间，解除保护
                $gameTemp._forgeResultShowing = false;
                // 强行清除这次残余的点击和可能生成的移动目的地
                TouchInput.clear();
                $gameTemp.clearDestination();
                return; // 跳过这一帧的地图触摸处理
            }
        }
        // 如果没有锻造结果消息，照常执行游戏原有的地图触摸逻辑
        _Scene_Map_processMapTouch.call(this);
    };

    // =========================================================================
    // 全局导出
    // =========================================================================
    
    window.Scene_SimpleForge = Scene_SimpleForge;
    window.Window_SimpleForge = Window_SimpleForge;
    window.Scene_ForgeList = Scene_ForgeList;
    window.Window_ForgeList = Window_ForgeList;
    window.Scene_MaterialInfo = Scene_MaterialInfo;
    window.Window_MaterialInfo = Window_MaterialInfo;
    window.Scene_MaterialInput = Scene_MaterialInput;
    window.Window_MaterialInputFixed = Window_MaterialInputFixed;
    window.Window_ForgeNumberInputFixed = Window_ForgeNumberInputFixed;

})();