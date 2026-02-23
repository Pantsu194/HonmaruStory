//=============================================================================
// RPG Maker MZ - Cooking Mini Game
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [v1.6] 烹饪小游戏：支持分类厨具、混合QTE、触屏、自定义批量及【炸厨房进度】。
 * @author 你的RMMZ脚本助手
 *
 * @help CookingMiniGame.js
 *
 * ============================================================================
 * 版本更新 (v1.6)
 * ============================================================================
 * 1. 新增【炸厨房系统】：
 * 可以配置全局变量来记录“炸厨房进度”。在QTE精工制作中，若失误次数达到2次
 * 或以上（获得糟糕产物），即视为“烹饪失败”，会自动为该变量累加特定的进度值。
 * 进度值可在每个配方中单独配置。
 *
 * ============================================================================
 * 使用说明
 * ============================================================================
 * 1. 在插件参数中配置【配方列表】（请务必为每个配方起一个纯英数组成的 ID）。
 * 2. 在事件中，使用插件命令【打开烹饪界面】。
 * 3. 在命令参数中填入允许制作的配方 ID，例如：bread_01, meat_02
 *
 * @command open
 * @text 打开烹饪界面
 * @desc 打开烹饪小游戏主界面。
 *
 * @arg recipeIds
 * @text 允许的配方ID列表
 * @type string
 * @desc 填入当前厨具允许制作的配方ID，用逗号隔开(如: bread_01,soup_01)。留空则显示全部配方。
 *
 * @param failVariableId
 * @text 炸厨房变量ID
 * @type variable
 * @desc 烹饪失败（精工制作获得糟糕产物）时，用于累计炸厨房进度的全局变量。设为0则关闭此功能。
 * @default 0
 *
 * @param recipes
 * @text 配方列表
 * @type struct<Recipe>[]
 * @desc 游戏中所有的烹饪配方配置。
 * @default []
 */

/*~struct~Recipe:
 * @param id
 * @text 配方唯一ID
 * @type string
 * @desc 用于系统内部识别，如: bread_01
 * * @param name
 * @text 配方名称
 * @type string
 * @desc 显示在列表中的名称
 * * @param description
 * @text 配方描述
 * @type multiline_string
 * * @param ingredients
 * @text 消耗材料列表
 * @type struct<Ingredient>[]
 * @desc 合成所需的材料与数量
 * * @param failProgress
 * @text 失败增加进度
 * @type number
 * @desc 烹饪该配方失败时，增加的炸厨房变量进度。
 * @default 10
 * * @param quickResultItem
 * @text 快速合成产物(物品ID)
 * @type item
 * * @param quickResultAmount
 * @text 快速合成产物数量
 * @type number
 * @default 1
 * * @param qtePerfectItem
 * @text QTE全对产物(物品ID)
 * @type item
 * * @param qteGoodItem
 * @text QTE失误1次产物
 * @type item
 * * @param qteBadItem
 * @text QTE失误2次及以上产物
 * @type item
 * * @param qteKeys
 * @text QTE按键序列
 * @type string
 * @desc 逗号分隔，填 random 或 随机 表示随机按键。例: ok,ok,random,up
 * @default random,random,random,random,random
 * * @param qteTimeLimit
 * @text QTE单键限时(帧)
 * @type number
 * @desc 60帧约等于1秒
 * @default 60
 */

/*~struct~Ingredient:
 * @param itemId
 * @text 物品ID
 * @type item
 * * @param amount
 * @text 需求数量
 * @type number
 * @default 1
 */

(() => {
    const pluginName = "CookingMiniGame";
    const parameters = PluginManager.parameters(pluginName);
    
    // 全局失败变量ID
    const failVariableId = Number(parameters['failVariableId'] || 0);

    // 解析插件参数
    let parsedRecipes = [];
    try {
        const rawRecipes = JSON.parse(parameters['recipes'] || "[]");
        parsedRecipes = rawRecipes.map(r => {
            const recipe = JSON.parse(r);
            recipe.ingredients = JSON.parse(recipe.ingredients || "[]").map(i => JSON.parse(i));
            recipe.failProgress = Number(recipe.failProgress || 10); // 解析失败进度参数
            
            let keysRaw = recipe.qteKeys || "random,random,random,random,random";
            recipe.parsedKeys = keysRaw.split(',').map(k => {
                let key = k.trim().toLowerCase();
                if (key === '随机') key = 'random';
                return key;
            });
            
            return recipe;
        });
    } catch (e) {
        console.error("CookingMiniGame: 配方参数解析失败", e);
    }

    // 模块级变量，用于传递当前允许显示的配方列表给 Scene
    let _activeRecipes = [];

    PluginManager.registerCommand(pluginName, "open", args => {
        const rawIds = args.recipeIds || "";
        
        // 如果没有填写参数，默认加载所有配方
        if (rawIds.trim() === "") {
            _activeRecipes = parsedRecipes;
        } else {
            // 否则根据逗号分隔的 ID 列表进行过滤
            const allowedIds = rawIds.split(',').map(id => id.trim());
            _activeRecipes = parsedRecipes.filter(r => allowedIds.includes(r.id));
        }
        
        SceneManager.push(Scene_Cooking);
    });

    //=============================================================================
    // Scene_Cooking
    //=============================================================================
    class Scene_Cooking extends Scene_MenuBase {
        create() {
            super.create();
            this.createHelpWindow();
            this.createListWindow();
            this.createDetailWindow();
            this.createCommandWindow();
            this.createNumberWindow();
            this.createQteWindow();
        }

        createHelpWindow() {
            const rect = this.helpWindowRect();
            this._helpWindow = new Window_Help(rect);
            this._helpWindow.setText("请选择要制作的料理。");
            this.addWindow(this._helpWindow);
        }

        createListWindow() {
            const rect = this.listWindowRect();
            this._listWindow = new Window_CookingList(rect, _activeRecipes);
            this._listWindow.setHandler('ok', this.onListOk.bind(this));
            this._listWindow.setHandler('cancel', this.popScene.bind(this));
            this.addWindow(this._listWindow);
        }

        createDetailWindow() {
            const rect = this.detailWindowRect();
            this._detailWindow = new Window_CookingDetail(rect);
            this._listWindow.setDetailWindow(this._detailWindow);
            this.addWindow(this._detailWindow);
        }

        createCommandWindow() {
            const rect = this.commandWindowRect();
            this._commandWindow = new Window_CookingCommand(rect);
            this._commandWindow.setHandler('quick', this.onQuickCraft.bind(this, 1));
            this._commandWindow.setHandler('bulk', this.onBulkCraftCommand.bind(this));
            this._commandWindow.setHandler('qte', this.onQteCraft.bind(this));
            this._commandWindow.setHandler('cancel', this.onCommandCancel.bind(this));
            this.addWindow(this._commandWindow);
            this._commandWindow.hide();
            this._commandWindow.deactivate();
        }

        createNumberWindow() {
            const ww = 400;
            const wh = 260;
            const wx = Graphics.boxWidth / 2 - ww / 2;
            const wy = Graphics.boxHeight / 2 - wh / 2;
            const rect = new Rectangle(wx, wy, ww, wh);
            this._numberWindow = new Window_CookingNumber(rect);
            this._numberWindow.setHandler('ok', this.onNumberOk.bind(this));
            this._numberWindow.setHandler('cancel', this.onNumberCancel.bind(this));
            this.addWindow(this._numberWindow);
            this._numberWindow.hide();
            this._numberWindow.deactivate();
        }

        createQteWindow() {
            const ww = 520;
            const wh = 280;
            const wx = Graphics.boxWidth / 2 - ww / 2;
            const wy = Graphics.boxHeight / 2 - wh / 2;
            const rect = new Rectangle(wx, wy, ww, wh);
            this._qteWindow = new Window_CookingQTE(rect);
            this._qteWindow.hide();
            this.addWindow(this._qteWindow);
        }

        listWindowRect() {
            const ww = 300;
            const wy = this.mainAreaTop();
            const wh = this.mainAreaHeight();
            const wx = 0;
            return new Rectangle(wx, wy, ww, wh);
        }

        detailWindowRect() {
            const wx = 300;
            const wy = this.mainAreaTop();
            const ww = Graphics.boxWidth - wx;
            const wh = this.mainAreaHeight();
            return new Rectangle(wx, wy, ww, wh);
        }

        commandWindowRect() {
            const ww = 240;
            const wh = this.calcWindowHeight(4, true);
            const wx = Graphics.boxWidth / 2 - ww / 2;
            const wy = Graphics.boxHeight / 2 - wh / 2;
            return new Rectangle(wx, wy, ww, wh);
        }

        onListOk() {
            const recipe = this._listWindow.item();
            if (!recipe) {
                SoundManager.playBuzzer();
                this._listWindow.activate();
                return;
            }
            if (this.canCraft(recipe, 1)) {
                this._commandWindow.setup(recipe);
                this._commandWindow.show();
                this._commandWindow.activate();
                this._listWindow.deactivate();
            } else {
                SoundManager.playBuzzer();
                this._listWindow.activate();
            }
        }

        onCommandCancel() {
            this._commandWindow.hide();
            this._commandWindow.deactivate();
            this._listWindow.activate();
        }

        canCraft(recipe, times) {
            if (!recipe) return false;
            for (const ing of recipe.ingredients) {
                const item = $dataItems[ing.itemId];
                if ($gameParty.numItems(item) < ing.amount * times) return false;
            }
            return true;
        }

        getMaxCraftAmount(recipe) {
            let max = 999;
            for (const ing of recipe.ingredients) {
                const item = $dataItems[ing.itemId];
                const held = $gameParty.numItems(item);
                const possible = Math.floor(held / ing.amount);
                if (possible < max) max = possible;
            }
            return max === 999 ? 0 : max; // 防止没有材料要求时出现无限大
        }

        consumeIngredients(recipe, times) {
            for (const ing of recipe.ingredients) {
                const item = $dataItems[ing.itemId];
                $gameParty.loseItem(item, ing.amount * times);
            }
        }

        onQuickCraft(times) {
            const recipe = this._listWindow.item();
            this.consumeIngredients(recipe, times);
            
            const resultItem = $dataItems[recipe.quickResultItem];
            const resultAmount = Number(recipe.quickResultAmount) * times;
            $gameParty.gainItem(resultItem, resultAmount);
            
            SoundManager.playShop();
            this._helpWindow.setText(`成功制作了 ${resultItem.name} x${resultAmount}!`);
            this._detailWindow.refresh();
            this._listWindow.refresh();
            this.onCommandCancel();
        }

        onBulkCraftCommand() {
            const recipe = this._listWindow.item();
            const max = this.getMaxCraftAmount(recipe);
            if (max > 0) {
                this._commandWindow.deactivate();
                this._numberWindow.setup(recipe, max);
                this._numberWindow.show();
                this._numberWindow.activate();
            } else {
                SoundManager.playBuzzer();
                this._commandWindow.activate();
            }
        }

        onNumberOk() {
            const amount = this._numberWindow.value();
            this._numberWindow.hide();
            this._numberWindow.deactivate();
            this.onQuickCraft(amount);
        }

        onNumberCancel() {
            this._numberWindow.hide();
            this._numberWindow.deactivate();
            this._commandWindow.activate();
        }

        onQteCraft() {
            const recipe = this._listWindow.item();
            this.consumeIngredients(recipe, 1);
            
            this._listWindow.deactivate();
            this._commandWindow.hide();
            this._commandWindow.deactivate();
            
            this._qteWindow.startQTE(recipe, this.onQteEnd.bind(this));
        }

        onQteEnd(misses, recipe) {
            let resultItemId = recipe.qteBadItem;
            let quality = "糟糕"; // 核心标识
            
            if (misses === 0) {
                resultItemId = recipe.qtePerfectItem;
                quality = "完美";
            } else if (misses === 1) {
                resultItemId = recipe.qteGoodItem;
                quality = "良好";
            }

            // 【新增】：炸厨房进度累加逻辑
            let helpExtraText = "";
            if (quality === "糟糕") {
                SoundManager.playBuzzer(); // 失败播放警告音
                if (failVariableId > 0 && recipe.failProgress > 0) {
                    const currentFailProgress = $gameVariables.value(failVariableId);
                    $gameVariables.setValue(failVariableId, currentFailProgress + recipe.failProgress);
                    helpExtraText = ` (炸厨房进度 +${recipe.failProgress})`;
                    console.log(`[CookingMiniGame] 烹饪失败！变量 ${failVariableId} 进度增加 ${recipe.failProgress}，当前值：${$gameVariables.value(failVariableId)}`);
                }
            } else {
                SoundManager.playShop(); // 成功播放常规音
            }

            const resultItem = $dataItems[resultItemId];
            $gameParty.gainItem(resultItem, 1);
            
            this._helpWindow.setText(`制作完成！失误 ${misses} 次。获得了 ${resultItem.name}！${helpExtraText}`);
            
            this._detailWindow.refresh();
            this._listWindow.refresh();
            this._listWindow.activate();
        }
    }
    window.Scene_Cooking = Scene_Cooking;

    //=============================================================================
    // 基础 UI Windows (列表与描述)
    //=============================================================================
    class Window_CookingList extends Window_Selectable {
        initialize(rect, recipes) {
            this._data = recipes || [];
            super.initialize(rect);
            this.refresh();
            this.select(0);
            this.activate();
        }
        maxItems() { return this._data.length; }
        item() { return this._data[this.index()]; }
        setDetailWindow(detailWindow) { this._detailWindow = detailWindow; this.updateDetail(); }
        select(index) { super.select(index); this.updateDetail(); }
        updateDetail() { if (this._detailWindow) this._detailWindow.setRecipe(this.item()); }
        
        drawItem(index) {
            const item = this._data[index];
            if (!item) return;
            const rect = this.itemRect(index);
            let canCraft = true;
            for (const ing of item.ingredients) {
                if ($gameParty.numItems($dataItems[ing.itemId]) < ing.amount) canCraft = false;
            }
            this.changePaintOpacity(canCraft);
            this.drawText(item.name, rect.x, rect.y, rect.width);
            this.changePaintOpacity(1);
        }
    }

    class Window_CookingDetail extends Window_Base {
        initialize(rect) {
            super.initialize(rect);
            this._recipe = null;
        }
        setRecipe(recipe) {
            if (this._recipe !== recipe) {
                this._recipe = recipe;
                this.refresh();
            }
        }
        refresh() {
            this.contents.clear();
            if (!this._recipe) return;
            let y = 0;
            this.changeTextColor(ColorManager.systemColor());
            this.drawText("【料理描述】", 0, y, this.innerWidth);
            y += this.lineHeight();
            this.resetTextColor();
            this.drawTextEx(this._recipe.description || "无描述", 0, y);
            y += this.lineHeight() * 2;
            this.changeTextColor(ColorManager.systemColor());
            this.drawText("【所需材料】", 0, y, this.innerWidth);
            y += this.lineHeight();
            this.resetTextColor();
            for (const ing of this._recipe.ingredients) {
                const item = $dataItems[ing.itemId];
                if (!item) continue;
                const held = $gameParty.numItems(item);
                const req = ing.amount;
                this.drawItemName(item, 0, y, 200);
                this.changeTextColor(held >= req ? ColorManager.normalColor() : "#ff6666");
                this.drawText(`${held} / ${req}`, 220, y, 100, "right");
                this.resetTextColor();
                y += this.lineHeight();
            }
        }
    }

    class Window_CookingCommand extends Window_Command {
        setup(recipe) {
            this._recipe = recipe;
            this.refresh();
            this.select(0);
        }
        makeCommandList() {
            if (!this._recipe) return;
            let max = 999;
            for (const ing of this._recipe.ingredients) {
                const held = $gameParty.numItems($dataItems[ing.itemId]);
                const possible = Math.floor(held / ing.amount);
                if (possible < max) max = possible;
            }
            this.addCommand("快速合成 (1份)", 'quick', max >= 1);
            this.addCommand(`批量合成`, 'bulk', max > 1);
            this.addCommand("精工制作 (QTE)", 'qte', max >= 1);
            this.addCommand("取消", 'cancel', true);
        }
    }

    //=============================================================================
    // Window_CookingNumber (自定义数量输入 & 触屏按键)
    //=============================================================================
    class Window_CookingNumber extends Window_Base {
        initialize(rect) {
            super.initialize(rect);
            this._amount = 1;
            this._max = 1;
            this._handlers = {};
            this._touchButtons = [];
        }

        setup(recipe, max) {
            this._recipe = recipe;
            this._max = max;
            this._amount = 1;
            this.refresh();
        }

        value() {
            return this._amount;
        }

        setHandler(symbol, method) {
            this._handlers[symbol] = method;
        }

        callHandler(symbol) {
            if (this._handlers[symbol]) this._handlers[symbol]();
        }

        update() {
            super.update();
            if (this.active) {
                this.processKeyInput();
                this.processTouchInput();
            }
        }

        changeAmount(value) {
            const prev = this._amount;
            this._amount = Math.max(1, Math.min(this._max, this._amount + value));
            if (this._amount !== prev) {
                SoundManager.playCursor();
                this.refresh();
            }
        }

        processKeyInput() {
            if (Input.isRepeated('right')) this.changeAmount(1);
            if (Input.isRepeated('left')) this.changeAmount(-1);
            if (Input.isRepeated('up')) this.changeAmount(10);
            if (Input.isRepeated('down')) this.changeAmount(-10);
            if (Input.isTriggered('ok')) {
                SoundManager.playOk();
                this.callHandler('ok');
            }
            if (Input.isTriggered('cancel')) {
                SoundManager.playCancel();
                this.callHandler('cancel');
            }
        }

        processTouchInput() {
            if (TouchInput.isTriggered()) {
                const cx = TouchInput.x - this.x - this.padding;
                const cy = TouchInput.y - this.y - this.padding;
                
                for (const btn of this._touchButtons) {
                    if (cx >= btn.x && cx <= btn.x + btn.w && cy >= btn.y && cy <= btn.y + btn.h) {
                        TouchInput.clear();
                        if (btn.action === 'ok') {
                            SoundManager.playOk();
                            this.callHandler('ok');
                        } else if (btn.action === 'cancel') {
                            SoundManager.playCancel();
                            this.callHandler('cancel');
                        } else if (btn.action === 'max') {
                            this.changeAmount(this._max - this._amount);
                        } else {
                            this.changeAmount(Number(btn.action));
                        }
                        return;
                    }
                }
            }
        }

        refresh() {
            this.contents.clear();
            this._touchButtons = [];
            
            this.contents.fontSize = 28;
            this.drawText("请输入合成数量", 0, 10, this.innerWidth, "center");
            
            this.contents.fontSize = 36;
            this.changeTextColor(ColorManager.systemColor());
            this.drawText(`${this._amount} / ${this._max}`, 0, 60, this.innerWidth, "center");
            this.resetTextColor();

            this.contents.fontSize = 20;
            const btnW = 80;
            const btnH = 40;
            const startX = (this.innerWidth - (btnW * 4 + 30)) / 2;
            
            const actions1 = [{lbl:"-10", val:-10}, {lbl:"-1", val:-1}, {lbl:"+1", val:1}, {lbl:"+10", val:10}];
            for(let i = 0; i < 4; i++) {
                const bx = startX + i * (btnW + 10);
                const by = 130;
                this.contents.fillRect(bx, by, btnW, btnH, "rgba(0,0,0,0.5)");
                this.drawText(actions1[i].lbl, bx, by + 4, btnW, "center");
                this._touchButtons.push({x: bx, y: by, w: btnW, h: btnH, action: actions1[i].val});
            }

            const startX2 = (this.innerWidth - (btnW * 3 + 20)) / 2;
            const actions2 = [{lbl:"最大", val:"max"}, {lbl:"确定", val:"ok"}, {lbl:"取消", val:"cancel"}];
            for(let i = 0; i < 3; i++) {
                const bx = startX2 + i * (btnW + 10);
                const by = 180;
                let color = "rgba(0,0,0,0.5)";
                if(actions2[i].val === 'ok') color = "rgba(0,100,0,0.6)";
                if(actions2[i].val === 'cancel') color = "rgba(100,0,0,0.6)";

                this.contents.fillRect(bx, by, btnW, btnH, color);
                this.drawText(actions2[i].lbl, bx, by + 4, btnW, "center");
                this._touchButtons.push({x: bx, y: by, w: btnW, h: btnH, action: actions2[i].val});
            }
        }
    }

    //=============================================================================
    // Window_CookingQTE (支持固定按键与随机按键混合配置)
    //=============================================================================
    class Window_CookingQTE extends Window_Base {
        initialize(rect) {
            super.initialize(rect);
            this._active = false;
            this._touchButtons = [];
            this._keyNames = {
                'up': '↑',
                'down': '↓',
                'left': '←',
                'right': '→',
                'ok': '确认',
                'cancel': '取消'
            };
        }

        startQTE(recipe, callback) {
            this._recipe = recipe;
            this._callback = callback;
            this._timeLimit = Number(recipe.qteTimeLimit) || 60;
            
            const pool = ['up', 'down', 'left', 'right', 'ok', 'cancel'];
            this._keys = [];
            for (let i = 0; i < recipe.parsedKeys.length; i++) {
                const keyDef = recipe.parsedKeys[i];
                if (keyDef === 'random') {
                    this._keys.push(pool[Math.floor(Math.random() * pool.length)]);
                } else if (pool.includes(keyDef)) {
                    this._keys.push(keyDef);
                } else {
                    this._keys.push('ok');
                }
            }
            
            this._currentIndex = 0;
            this._timer = this._timeLimit;
            this._misses = 0;
            this._active = true;
            
            this.show();
            this.refresh();
        }

        update() {
            super.update();
            if (!this._active) return;

            this._timer--;
            
            if (TouchInput.isTriggered()) {
                const cx = TouchInput.x - this.x - this.padding;
                const cy = TouchInput.y - this.y - this.padding;
                for (const btn of this._touchButtons) {
                    if (cx >= btn.x && cx <= btn.x + btn.w && cy >= btn.y && cy <= btn.y + btn.h) {
                        TouchInput.clear();
                        this.processQteInput(btn.key);
                        return; 
                    }
                }
            }

            const mappedKeys = ['ok', 'cancel', 'up', 'down', 'left', 'right'];
            for (const key of mappedKeys) {
                if (Input.isTriggered(key)) {
                    this.processQteInput(key);
                    return; 
                }
            }

            if (this._timer <= 0) {
                SoundManager.playBuzzer();
                this._misses++;
                this.nextKey();
            } else {
                this.refreshTimerOnly();
            }
        }

        processQteInput(pressedKey) {
            const currentKey = this._keys[this._currentIndex];
            if (pressedKey === currentKey) {
                SoundManager.playOk();
                this.nextKey();
            } else {
                SoundManager.playBuzzer();
                this._misses++;
                this.nextKey();
            }
        }

        nextKey() {
            this._currentIndex++;
            if (this._currentIndex >= this._keys.length) {
                this.endQTE();
            } else {
                this._timer = this._timeLimit;
                this.refresh();
            }
        }

        endQTE() {
            this._active = false;
            this.hide();
            if (this._callback) {
                this._callback(this._misses, this._recipe);
            }
        }

        refresh() {
            this.contents.clear();
            if (!this._active) return;

            const currentKey = this._keys[this._currentIndex];
            const displayName = this._keyNames[currentKey] || currentKey.toUpperCase();
            
            this.changeTextColor(ColorManager.systemColor());
            this.contents.fontSize = 24;
            this.drawText("请按下对应按键：", 0, 5, this.innerWidth, "center");
            
            this.resetTextColor();
            this.contents.fontSize = 36;
            this.drawText(`[ ${displayName} ]`, 0, 35, this.innerWidth, "center");
            
            this.contents.fontSize = 20;
            this.drawText(`进度: ${this._currentIndex + 1} / ${this._keys.length}`, 0, 80, this.innerWidth, "center");
            this.changeTextColor("#ff6666");
            this.drawText(`失误: ${this._misses}`, 0, 105, this.innerWidth, "center");
            this.resetTextColor();

            this.drawTimerBar();
            this.drawTouchButtons(); 
        }

        refreshTimerOnly() {
            this.contents.clearRect(0, 130, this.innerWidth, 20);
            this.drawTimerBar();
        }

        drawTimerBar() {
            const width = this.innerWidth - 40;
            const height = 12;
            const x = 20;
            const y = 135;
            
            const rate = this._timer / this._timeLimit;
            const fillWidth = width * rate;
            
            this.contents.fillRect(x, y, width, height, "#333333");
            const color = rate > 0.5 ? "#4CAF50" : rate > 0.2 ? "#FFC107" : "#F44336";
            this.contents.fillRect(x, y, fillWidth, height, color);
        }

        drawTouchButtons() {
            this._touchButtons = [];
            const labels = [
                { key: 'up', text: '↑' },
                { key: 'down', text: '↓' },
                { key: 'left', text: '←' },
                { key: 'right', text: '→' },
                { key: 'ok', text: '确认' },
                { key: 'cancel', text: '取消' }
            ];

            const btnW = 70;
            const btnH = 50;
            const spacing = 10;
            const totalW = (btnW * 6) + (spacing * 5);
            const startX = (this.innerWidth - totalW) / 2;
            const startY = 170; // 进度条下方

            this.contents.fontSize = 20;
            for (let i = 0; i < labels.length; i++) {
                const bx = startX + i * (btnW + spacing);
                const by = startY;

                this.contents.fillRect(bx, by, btnW, btnH, "rgba(50, 50, 150, 0.6)");
                this.drawText(labels[i].text, bx, by + 10, btnW, "center");

                this._touchButtons.push({ x: bx, y: by, w: btnW, h: btnH, key: labels[i].key });
            }
        }
    }

})();