// 任务系统插件 for RPG Maker MZ - V3.6 主菜单集成版
// 版本：3.6
// 作者：AI Assistant (Menu Integration)

/*:
 * @target MZ
 * @plugindesc [V3.6] 将任务系统整合进主菜单，保留了所有滚动和显示的修复。
 * @author AI Assistant
 * * @help
 * 使用说明：
 * * 【交互操作】
 * 1. 在游戏主菜单中选择【任务手账】进入。
 * 2. 左侧列表：[↑/↓]或[鼠标点击]选择任务，[确定/Z]进入详情。
 * 3. 右侧详情：[↑/↓]滚动查看，[PageUp/PageDown]快速翻页，[取消/X]返回列表。
 * * 【V3.6 更新】
 * - 自动将“任务手账”命令添加到游戏主菜单 (Scene_Menu) 中。
 * * @command add
 * @text 添加任务
 * @desc 添加一个新任务。
 * @arg data
 * @type string
 * @text 任务数据
 * * @command addSubTask
 * @text 添加子任务
 * @desc 为现有任务添加一个子任务条目。
 * @arg data
 * @type string
 * @text 数据
 * * @command toggleSubTask
 * @text 切换子任务状态
 * @desc 完成或取消完成某个子任务。
 * @arg data
 * @type string
 * @text 数据
 * * @command update
 * @text 更新任务进度
 * @desc 更新任务进度。
 * @arg data
 * @type string
 * @text 进度数据
 * * @command complete
 * @text 完成任务
 * @desc 标记任务为完成。
 * @arg title
 * @type string
 * @text 任务标题
 * * @command open
 * @text 打开任务界面
 * @desc 打开任务查看界面。
 * * @command remove
 * @text 删除任务
 * @desc 删除指定任务。
 * @arg title
 * @type string
 * @text 任务标题
 */

(function() {
    'use strict';

    const pluginName = "QuestSystem";
    let _quests = [];

    // --- 数据处理 ---
    function initQuestData() {
        if (!_quests) _quests = [];
    }

    function parseProgress(progressStr) {
        if (!progressStr) return 0;
        const variableMatch = String(progressStr).trim().match(/^v(\d+)$/i);
        if (variableMatch) {
            const variableId = parseInt(variableMatch[1]);
            const variableValue = $gameVariables.value(variableId);
            return Math.min(Math.max(variableValue, 0), 100);
        }
        const progress = parseInt(progressStr);
        return isNaN(progress) ? 0 : Math.min(Math.max(progress, 0), 100);
    }

    function getQuestProgress(quest) {
        if (!quest) return 0;
        if (quest.useVariable && quest.variableId) {
            const variableValue = $gameVariables.value(quest.variableId);
            return Math.min(Math.max(variableValue, 0), 100);
        }
        return quest.progress;
    }

    // --- 命令注册 ---
    PluginManager.registerCommand(pluginName, "add", args => addQuest(args.data));
    PluginManager.registerCommand(pluginName, "addSubTask", args => addSubTask(args.data));
    PluginManager.registerCommand(pluginName, "toggleSubTask", args => toggleSubTask(args.data));
    PluginManager.registerCommand(pluginName, "update", args => updateQuestProgress(args.data));
    PluginManager.registerCommand(pluginName, "complete", args => completeQuest(args.title));
    PluginManager.registerCommand(pluginName, "open", args => SceneManager.push(Scene_Quest));
    PluginManager.registerCommand(pluginName, "remove", args => removeQuest(args.title));

    // --- 主菜单集成逻辑 (V3.6 新增) ---
    const _Window_MenuCommand_addOriginalCommands = Window_MenuCommand.prototype.addOriginalCommands;
    Window_MenuCommand.prototype.addOriginalCommands = function() {
        _Window_MenuCommand_addOriginalCommands.call(this);
        // 添加选项
        this.addCommand("审神者手账", "quest", true);
    };

    const _Scene_Menu_createCommandWindow = Scene_Menu.prototype.createCommandWindow;
    Scene_Menu.prototype.createCommandWindow = function() {
        _Scene_Menu_createCommandWindow.call(this);
        // 绑定跳转事件
        this._commandWindow.setHandler("quest", this.commandQuest.bind(this));
    };

    Scene_Menu.prototype.commandQuest = function() {
        SceneManager.push(Scene_Quest);
    };

    // --- 核心逻辑 ---
    function addQuest(data) {
        if (!_quests) _quests = [];
        const parts = String(data).split('|');
        if (parts.length >= 3) {
            const type = parts[0].trim();
            const title = parts[1].trim();
            const progressStr = parts[2].trim();
            
            const existingQuest = _quests.find(quest => quest.title === title);
            if (!existingQuest) {
                let description = parts.length > 3 ? parts[3].trim() : "暂无详细描述";
                description = description.replace(/\\n/g, '\n');
                const variableMatch = progressStr.match(/^v(\d+)$/i);
                let useVariable = false, variableId = null, progress = 0;
                
                if (variableMatch) {
                    useVariable = true;
                    variableId = parseInt(variableMatch[1]);
                    progress = parseProgress(progressStr);
                } else {
                    progress = parseProgress(progressStr);
                }
                
                _quests.push({
                    type: type, title: title, progress: progress,
                    useVariable: useVariable, variableId: variableId,
                    description: description, subtasks: []
                });
            }
        }
    }

    function addSubTask(data) {
        if (!_quests) return;
        const parts = String(data).split('|');
        if (parts.length >= 2) {
            const title = parts[0].trim();
            const subTaskDesc = parts[1].trim();
            const quest = _quests.find(q => q.title === title);
            if (quest) {
                if (!quest.subtasks) quest.subtasks = [];
                quest.subtasks.push({ description: subTaskDesc, completed: false });
            }
        }
    }

    function toggleSubTask(data) {
        if (!_quests) return;
        const parts = String(data).split('|');
        if (parts.length >= 2) {
            const title = parts[0].trim();
            const index = parseInt(parts[1].trim()) - 1;
            const quest = _quests.find(q => q.title === title);
            if (quest && quest.subtasks && quest.subtasks[index]) {
                quest.subtasks[index].completed = !quest.subtasks[index].completed;
            }
        }
    }

    function updateQuestProgress(data) {
        if (!_quests) return;
        const parts = String(data).split('|');
        if (parts.length >= 2) {
            const title = parts[0].trim();
            const progressStr = parts[1].trim();
            const quest = _quests.find(q => q.title === title);
            if (quest) {
                const variableMatch = progressStr.match(/^v(\d+)$/i);
                if (variableMatch) {
                    quest.useVariable = true;
                    quest.variableId = parseInt(variableMatch[1]);
                } else {
                    quest.useVariable = false;
                    quest.variableId = null;
                }
                quest.progress = parseProgress(progressStr);
            }
        }
    }

    function completeQuest(title) {
        if (!_quests) return;
        const quest = _quests.find(q => q.title === title);
        if (quest) {
            quest.useVariable = false;
            quest.variableId = null;
            quest.progress = 100;
        }
    }

    function removeQuest(title) {
        if (!_quests) return;
        _quests = _quests.filter(q => q.title !== title);
    }

    // --- 窗口：任务列表 (左侧) ---
    class Window_QuestList extends Window_Selectable {
        constructor(rect) {
            super(rect);
            this.refresh();
            this.activate();
            this.select(0);
        }

        maxItems() { return _quests ? _quests.length : 0; }

        drawItem(index) {
            if (!_quests || index >= _quests.length) return;
            const quest = _quests[index];
            if (quest) {
                const rect = this.itemRect(index);
                const typeWidth = 80;
                const progressWidth = 60;
                const titleWidth = rect.width - typeWidth - progressWidth - 20;
                
                const actualProgress = getQuestProgress(quest);
                const completed = actualProgress >= 100;
                
                this.changeTextColor(this.getTypeColor(quest.type));
                this.drawText(quest.type, rect.x, rect.y, typeWidth);
                
                this.changeTextColor(ColorManager.normalColor());
                const displayTitle = quest.title.length > 20 ? quest.title.substring(0, 17) + "..." : quest.title;
                this.drawText(displayTitle, rect.x + typeWidth + 5, rect.y, titleWidth);
                
                this.changeTextColor(completed ? "#2ECC71" : ColorManager.normalColor());
                const progressText = completed ? "完成" : `${actualProgress}%`;
                this.drawText(progressText, rect.x + rect.width - progressWidth - 5, rect.y, progressWidth, "right");
                
                if (index === this.index()) this.drawBackgroundRect(index);
            }
        }
        
        drawBackgroundRect(index) {
            const rect = this.itemRect(index);
            this.contents.fillRect(rect.x, rect.y, rect.width, rect.height, "rgba(255, 255, 255, 0.2)");
        }

        getTypeColor(type) {
            switch(type) {
                case "主线": return "#FF6B6B";
                case "支线": return "#4ECDC4";
                case "日常": return "#45B7D1";
                default: return ColorManager.normalColor();
            }
        }

        select(index) {
            const prevIndex = this.index();
            super.select(index);
            if (index !== prevIndex || (index === 0 && prevIndex === -1)) {
                this.callHandler('cursorMove');
            }
        }

        setCursorMoveHandler(method) { 
            this.setHandler('cursorMove', method);
        }
    }

    // --- 窗口：任务详情 (右侧) ---
    class Window_QuestDetail extends Window_Scrollable {
        constructor(rect) {
            super(rect);
            this._quest = null;
            this._totalHeight = 0;
            this._handlers = {};
            this._isActive = false;
        }

        activate() {
            this._isActive = true;
            this.show();
        }

        deactivate() {
            this._isActive = false;
        }

        setHandler(symbol, method) {
            this._handlers[symbol] = method;
        }

        isHandled(symbol) {
            return !!this._handlers[symbol];
        }

        callHandler(symbol) {
            if (this.isHandled(symbol)) {
                this._handlers[symbol]();
            }
        }

        update() {
            super.update();
            this.processHandling();
            this.processKeyboardScroll(); 
            this.origin.y = this._scrollY; // 强制同步
        }

        processKeyboardScroll() {
            if (this._isActive) {
                const scrollSpeed = 30;
                let direction = 0;
                
                if (Input.isPressed("down")) direction = 1;
                if (Input.isPressed("up")) direction = -1;
                
                if (Input.isPressed("pagedown")) direction = 10;
                if (Input.isPressed("pageup")) direction = -10;

                if (direction !== 0) {
                    const max = this.maxScrollY();
                    let newY = this._scrollY + (direction * scrollSpeed);
                    
                    if (newY < 0) newY = 0;
                    if (newY > max) newY = max;
                    
                    this._scrollY = newY;
                    this._scrollTargetY = newY;
                }
            }
        }

        processHandling() {
            if (this._isActive) {
                if (Input.isTriggered('cancel') || TouchInput.isCancelled()) {
                    this.processCancel();
                }
            }
        }

        processCancel() {
            SoundManager.playCancel();
            this.callHandler('cancel');
        }

        setQuest(quest) {
            if (this._quest !== quest) {
                this._quest = quest;
                this._scrollY = 0;
                this._scrollTargetY = 0;
                this.origin.y = 0;
                this.refresh();
            }
        }

        contentsHeight() {
            return Math.max(this.innerHeight, this._totalHeight);
        }
        
        overallHeight() {
            return this.contentsHeight();
        }

        maxScrollY() {
            return Math.max(0, this._totalHeight - this.innerHeight);
        }

        refresh() {
            if (this._quest) {
                this._totalHeight = this.drawQuestInfo(true);
                this.createContents();
                this.drawQuestInfo(false);
            } else {
                this.createContents();
                this.changeTextColor(ColorManager.normalColor());
                this.drawText("请从左侧选择一个任务", 0, 0, this.innerWidth, "center");
            }
        }

        drawQuestInfo(simulate) {
            if (!this._quest) return 0;

            const padding = 10;
            let y = padding;
            const width = this.innerWidth;
            const originalFontSize = this.contents.fontSize;

            // 1. 类型
            this.contents.fontSize = 24; 
            if (!simulate) {
                this.changeTextColor(this.getTypeColor(this._quest.type));
                this.drawText(this._quest.type, 0, y, width, "center");
            }
            y += 36;

            // 2. 标题
            this.contents.fontSize = 28; 
            if (!simulate) {
                this.changeTextColor(ColorManager.normalColor());
                this.drawText(this._quest.title, 0, y, width, "center");
            }
            y += 40;

            // 分隔线
            if (!simulate) this.contents.fillRect(0, y, width, 2, ColorManager.normalColor());
            y += 15;

            // 3. 进度条
            const actualProgress = getQuestProgress(this._quest);
            if (!simulate) {
                const progressWidth = width - 40;
                const progressHeight = 16;
                this.contents.fillRect(20, y, progressWidth, progressHeight, "#333333");
                const fillW = (progressWidth * actualProgress) / 100;
                this.contents.fillRect(20, y, fillW, progressHeight, this.getProgressColor(actualProgress));
            }
            y += 25;

            // 进度文本
            this.contents.fontSize = 18; 
            if (!simulate) {
                this.changeTextColor(ColorManager.normalColor());
                const completed = actualProgress >= 100;
                const pText = completed ? "★ 任务完成 ★" : `进度: ${actualProgress}%`;
                this.changeTextColor(completed ? "#F1C40F" : ColorManager.normalColor());
                this.drawText(pText, 0, y, width, "center");
            }
            y += 35;

            // 4. 描述
            this.contents.fontSize = 22; 
            if (!simulate) {
                this.changeTextColor(ColorManager.normalColor());
            }
            y = this.drawTextWithAutoWrap(this._quest.description, 10, y, width - 20, simulate);
            y += 20;

            // 5. 子任务
            this.contents.fontSize = 20; 
            if (this._quest.subtasks && this._quest.subtasks.length > 0) {
                if (!simulate) {
                    this.changeTextColor(ColorManager.systemColor());
                    this.drawText("【执行清单】", 10, y, width, "left");
                }
                y += 35;

                for (let i = 0; i < this._quest.subtasks.length; i++) {
                    const sub = this._quest.subtasks[i];
                    const textX = 25; 
                    const maxWidth = width - 35;
                    
                    if (!simulate) {
                        this.changeTextColor(sub.completed ? "#888888" : "#E0E0E0");
                        this.drawText(sub.description, textX, y, maxWidth, "left");

                        if (sub.completed) {
                            const txtWidth = this.textWidth(sub.description);
                            const lineY = y + 15;
                            this.contents.fillRect(textX, lineY, Math.min(txtWidth, maxWidth), 2, "#888888");
                        }
                    }
                    y += 32;
                }
            }

            // === 增加底部缓冲 400px ===
            y += 400;
            
            this.contents.fontSize = originalFontSize;
            return y;
        }

        drawTextWithAutoWrap(text, x, y, maxWidth, simulate) {
            if (!text) return y;
            const lineHeight = 32;
            let currentX = x;
            let currentY = y;
            let currentLine = "";
            
            for (let i = 0; i < text.length; i++) {
                const char = text[i];
                if (char === '\n') {
                    if (!simulate) this.contents.drawText(currentLine, currentX, currentY, maxWidth, lineHeight);
                    currentLine = "";
                    currentX = x;
                    currentY += lineHeight;
                    continue;
                }
                const testLine = currentLine + char;
                const testWidth = this.textWidth(testLine);
                
                if (testWidth > maxWidth && currentLine.length > 0) {
                    if (!simulate) this.contents.drawText(currentLine, currentX, currentY, maxWidth, lineHeight);
                    currentLine = char;
                    currentX = x;
                    currentY += lineHeight;
                } else {
                    currentLine = testLine;
                }
            }
            if (currentLine.length > 0) {
                if (!simulate) this.contents.drawText(currentLine, currentX, currentY, maxWidth, lineHeight);
                currentY += lineHeight;
            }
            return currentY;
        }

        getTypeColor(type) {
            switch(type) {
                case "主线": return "#FF6B6B";
                case "支线": return "#4ECDC4";
                case "日常": return "#45B7D1";
                default: return ColorManager.normalColor();
            }
        }

        getProgressColor(progress) {
            if (progress >= 100) return "#2ECC71";
            else if (progress >= 50) return "#F39C12";
            else return "#E74C3C";
        }
    }

    // --- 场景类 ---
    class Scene_Quest extends Scene_MenuBase {
        create() {
            super.create();
            this.createHelpWindow();
            this.createListWindow();
            this.createDetailWindow();
            
            if (_quests && _quests.length > 0) {
                this._listWindow.select(0);
                this._listWindow.activate();
                this.onCursorMove(); 
            } else {
                this._detailWindow.setQuest(null);
            }
        }

        createHelpWindow() {
            const rect = new Rectangle(0, 0, Graphics.boxWidth, 72);
            this._helpWindow = new Window_Help(rect);
            this._helpWindow.setText("任务手账 - [确定]查看详情 [方向键]滚动");
            this.addWindow(this._helpWindow);
        }

        createListWindow() {
            const helpHeight = this._helpWindow.height;
            const listWidth = Math.floor(Graphics.boxWidth * 0.4);
            const rect = new Rectangle(0, helpHeight, listWidth, Graphics.boxHeight - helpHeight);
            this._listWindow = new Window_QuestList(rect);
            
            this._listWindow.setHandler('cancel', () => this.popScene());
            this._listWindow.setHandler('ok', this.onListOk.bind(this));
            this._listWindow.setCursorMoveHandler(this.onCursorMove.bind(this));
            
            this.addWindow(this._listWindow);
        }
        
        createDetailWindow() {
            const helpHeight = this._helpWindow.height;
            const listWidth = Math.floor(Graphics.boxWidth * 0.4);
            const detailWidth = Graphics.boxWidth - listWidth;
            const rect = new Rectangle(listWidth, helpHeight, detailWidth, Graphics.boxHeight - helpHeight);
            this._detailWindow = new Window_QuestDetail(rect);
            
            this._detailWindow.setHandler('cancel', this.onDetailCancel.bind(this));
            
            this.addWindow(this._detailWindow);
        }
        
        onListOk() {
            this._listWindow.deactivate();
            this._detailWindow.activate();
            this._helpWindow.setText("查看详情 - [↑/↓]滚动 [Esc/X]返回");
        }

        onDetailCancel() {
            this._detailWindow.deactivate();
            this._listWindow.activate();
            this._helpWindow.setText("任务手账 - [确定]查看详情");
        }
        
        onCursorMove() {
            const index = this._listWindow.index();
            if (_quests && index >= 0 && index < _quests.length) {
                const quest = _quests[index];
                this._detailWindow.setQuest(quest);
            } else {
                this._detailWindow.setQuest(null);
            }
        }
        
        start() {
            super.start();
            this._listWindow.activate();
            this._detailWindow.deactivate();
        }

        update() {
            super.update();
        }
    }

    // --- 存档集成 ---
    const _DataManager_createGameObjects = DataManager.createGameObjects;
    DataManager.createGameObjects = function() {
        _DataManager_createGameObjects.call(this);
        initQuestData();
    };

    const _DataManager_makeSaveContents = DataManager.makeSaveContents;
    DataManager.makeSaveContents = function() {
        const contents = _DataManager_makeSaveContents.call(this);
        contents.quests = _quests || [];
        return contents;
    };

    const _DataManager_extractSaveContents = DataManager.extractSaveContents;
    DataManager.extractSaveContents = function(contents) {
        _DataManager_extractSaveContents.call(this, contents);
        _quests = contents.quests || [];
    };
})();