//=============================================================================
// RPG Maker MZ - HelpSystem.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [V1.5] 百科帮助系统 - 修复滚动抖动版
 * @author AI Assistant
 *
 * @help HelpSystem.js
 * ============================================================================
 * 功能说明
 * ============================================================================
 * 此插件提供了一个完整的“词条百科/帮助系统”。
 * * 【V1.5 更新】
 * - 核心修复：彻底解决了右侧详情窗口使用方向键滚动时长文本疯狂抖动的问题。
 * * ============================================================================
 * 插件命令
 * ============================================================================
 * @command open
 * @text 打开帮助系统
 * @desc 强制打开帮助/百科场景。
 *
 * @command unlock
 * @text 解锁词条
 * @desc 通过词条ID解锁并显示该词条。
 * @arg id
 * @type string
 * @text 词条ID
 *
 * @command lock
 * @text 锁定(隐藏)词条
 * @desc 锁定并隐藏特定词条。
 * @arg id
 * @type string
 * @text 词条ID
 *
 * @command unlockAll
 * @text 解锁全部词条
 * @desc 解锁插件参数中配置的所有词条。
 *
 * ============================================================================
 * 插件参数
 * ============================================================================
 * @param MenuSettings
 * @text --- 主菜单设置 ---
 * @default
 *
 * @param ShowInMenu
 * @parent MenuSettings
 * @text 是否在主菜单显示
 * @type boolean
 * @default true
 *
 * @param MenuName
 * @parent MenuSettings
 * @text 主菜单选项名称
 * @type string
 * @default 百科图鉴
 *
 * @param Entries
 * @text 词条数据库
 * @type struct<HelpEntry>[]
 * @default []
 *
 */

/*~struct~HelpEntry:
 * @param id
 * @text 词条唯一ID
 * @type string
 * @desc 用于插件命令解锁的内部ID（英数），如: basic_combat
 * * @param title
 * @text 词条标题
 * @type string
 * @desc 显示在左侧列表中的名称
 *
 * @param isUnlocked
 * @text 默认是否解锁
 * @type boolean
 * @default true
 * * @param description
 * @text 详细文字内容
 * @type multiline_string
 * @desc 支持长文本，系统会自动处理换行。
 * * @param image
 * @text 附图 (可选)
 * @type file
 * @dir img/pictures/
 * @desc 显示在文字下方的图片文件（留空则不显示图片）。
 */

(() => {
    'use strict';

    const pluginName = "HelpSystem";
    const parameters = PluginManager.parameters(pluginName);
    
    const config = {
        showInMenu: String(parameters['ShowInMenu']) !== 'false',
        menuName: parameters['MenuName'] || "百科图鉴"
    };

    const rawEntries = JSON.parse(parameters['Entries'] || '[]');
    
    // 解析插件参数
    const $dataHelpEntries = rawEntries.map(entryStr => {
        const entry = JSON.parse(entryStr);
        return {
            id: (entry.id || "").trim(),
            title: (entry.title || "").trim(),
            isUnlocked: String(entry.isUnlocked) !== 'false', 
            description: (entry.description || "").replace(/\\n/g, '\n'),
            image: entry.image || ""
        };
    });

    // =========================================================================
    // 主菜单集成：菜单项由 MenuHub 插件参数 menuItems 配置（动作: pluginCommand HelpSystem open）
    // =========================================================================
    // 暴露菜单可用性判断（MenuHub enabledCall 用），保留原 ShowInMenu 参数语义
    window.HelpSystem = window.HelpSystem || {};
    window.HelpSystem.menuEnabled = function() {
        return config.showInMenu;
    };

    Scene_Menu.prototype.commandHelpSystem = function() {
        SceneManager.push(Scene_HelpSystem);
    };

    // =========================================================================
    // Game_System 数据扩展
    // =========================================================================
    const _Game_System_initialize = Game_System.prototype.initialize;
    Game_System.prototype.initialize = function() {
        _Game_System_initialize.call(this);
        this.initHelpSystemData();
    };

    Game_System.prototype.initHelpSystemData = function() {
        if (!this._unlockedHelpEntries) {
            this._unlockedHelpEntries = [];
        }
        if (!this._knownHelpEntries) {
            this._knownHelpEntries = [];
        }
        
        for (const entry of $dataHelpEntries) {
            if (!this._knownHelpEntries.includes(entry.id)) {
                this._knownHelpEntries.push(entry.id);
                if (entry.isUnlocked) {
                    if (!this._unlockedHelpEntries.includes(entry.id)) {
                        this._unlockedHelpEntries.push(entry.id);
                    }
                }
            }
        }
    };

    Game_System.prototype.unlockHelpEntry = function(id) {
        this.initHelpSystemData();
        if (!$dataHelpEntries.find(e => e.id === id)) {
            console.warn(`[HelpSystem] 词条ID "${id}" 不存在。`);
            return;
        }
        if (!this._unlockedHelpEntries.includes(id)) {
            this._unlockedHelpEntries.push(id);
        }
    };

    Game_System.prototype.lockHelpEntry = function(id) {
        this.initHelpSystemData();
        const index = this._unlockedHelpEntries.indexOf(id);
        if (index >= 0) {
            this._unlockedHelpEntries.splice(index, 1);
        }
    };
    
    Game_System.prototype.getUnlockedHelpEntries = function() {
        this.initHelpSystemData();
        return $dataHelpEntries.filter(entry => this._unlockedHelpEntries.includes(entry.id));
    };

    // =========================================================================
    // 插件命令注册
    // =========================================================================
    PluginManager.registerCommand(pluginName, "open", () => {
        SceneManager.push(Scene_HelpSystem);
    });

    PluginManager.registerCommand(pluginName, "unlock", args => {
        $gameSystem.unlockHelpEntry(args.id);
    });

    PluginManager.registerCommand(pluginName, "lock", args => {
        $gameSystem.lockHelpEntry(args.id);
    });

    PluginManager.registerCommand(pluginName, "unlockAll", () => {
        for (const entry of $dataHelpEntries) {
            $gameSystem.unlockHelpEntry(entry.id);
        }
    });

    // =========================================================================
    // Window_HelpList (左侧词条列表)
    // =========================================================================
    class Window_HelpList extends Window_Selectable {
        initialize(rect) {
            super.initialize(rect);
            this._data = [];
            this.makeItemList(); 
            this.refresh();
            this.activate();
            this.select(0);
        }

        makeItemList() {
            this._data = $gameSystem.getUnlockedHelpEntries();
        }

        maxItems() {
            return this._data ? this._data.length : 0;
        }

        item() {
            return this._data && this.index() >= 0 ? this._data[this.index()] : null;
        }

        drawItem(index) {
            const entry = this._data[index];
            if (entry) {
                const rect = this.itemLineRect(index);
                this.resetTextColor();
                this.drawText(entry.title, rect.x, rect.y, rect.width);
            }
        }

        select(index) {
            const prevIndex = this.index();
            super.select(index);
            if (index !== prevIndex || (index === 0 && prevIndex === -1)) {
                this.callHandler('cursorMove');
            }
        }
    }

    // =========================================================================
    // Window_HelpDetail (右侧详细内容)
    // =========================================================================
    class Window_HelpDetail extends Window_Scrollable {
        initialize(rect) {
            super.initialize(rect);
            this._entry = null;
            this._totalHeight = 0;
            this._contentImage = null; 
        }

        setEntry(entry) {
            if (this._entry !== entry) {
                this._entry = entry;
                this._scrollY = 0;
                this._scrollTargetY = 0;
                this.origin.y = 0;
                
                if (entry && entry.image) {
                    this._contentImage = ImageManager.loadPicture(entry.image);
                    this._contentImage.addLoadListener(this.refresh.bind(this));
                } else {
                    this._contentImage = null;
                }
                
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
            this._totalHeight = this.drawEntryDetails(true);
            this.createContents();
            this.drawEntryDetails(false);
        }

        drawEntryDetails(simulate) {
            if (!this._entry) return 0;
            
            let currentY = 10;
            const padding = 10;
            const contentWidth = this.innerWidth - padding * 2;
            const startX = padding;

            // 1. 绘制标题
            this.contents.fontSize = 28;
            if (!simulate) {
                this.changeTextColor(ColorManager.systemColor());
                this.drawText(this._entry.title, startX, currentY, contentWidth, "center");
                const lineY = currentY + 40;
                this.contents.fillRect(startX, lineY, contentWidth, 2, "rgba(255,255,255,0.5)");
            }
            currentY += 60;

            // 2. 绘制文本描述 (自动换行)
            this.contents.fontSize = 22;
            if (!simulate) this.resetTextColor();
            
            const lineHeight = 32;
            const text = this._entry.description;
            
            if (text) {
                let currentLine = "";
                for (let i = 0; i < text.length; i++) {
                    const char = text[i];
                    if (char === '\n') {
                        if (!simulate) this.contents.drawText(currentLine, startX, currentY, contentWidth, lineHeight);
                        currentLine = "";
                        currentY += lineHeight;
                        continue;
                    }
                    
                    const testLine = currentLine + char;
                    if (this.textWidth(testLine) > contentWidth && currentLine.length > 0) {
                        if (!simulate) this.contents.drawText(currentLine, startX, currentY, contentWidth, lineHeight);
                        currentLine = char;
                        currentY += lineHeight;
                    } else {
                        currentLine = testLine;
                    }
                }
                if (currentLine.length > 0) {
                    if (!simulate) this.contents.drawText(currentLine, startX, currentY, contentWidth, lineHeight);
                    currentY += lineHeight;
                }
            }

            // 3. 绘制图片
            currentY += 20; 
            if (this._contentImage && this._contentImage.isReady()) {
                const bmp = this._contentImage;
                let drawWidth = bmp.width;
                let drawHeight = bmp.height;
                
                if (drawWidth > contentWidth) {
                    const ratio = contentWidth / drawWidth;
                    drawWidth = contentWidth;
                    drawHeight = Math.floor(drawHeight * ratio);
                }
                
                const drawX = startX + (contentWidth - drawWidth) / 2; 
                
                if (!simulate) {
                    this.contents.blt(bmp, 0, 0, bmp.width, bmp.height, drawX, currentY, drawWidth, drawHeight);
                }
                currentY += drawHeight;
            } else if (this._entry.image && !simulate) {
                this.contents.drawText("Loading image...", startX, currentY, contentWidth, "center");
                currentY += 50;
            }

            // 增加一点底部缓冲空间
            currentY += 50; 
            return currentY;
        }

        // ==========================================================
        // 【关键修复：无延迟强制同步滚动】
        // ==========================================================
        update() {
            super.update();
            this.processKeyboardScroll();
            // 强制将底层渲染的画布原点 Y 轴和滚动的内部数值同步，杜绝过渡动画造成的抖动
            this.origin.y = this._scrollY; 
        }

        processKeyboardScroll() {
            if (this.active) {
                const scrollSpeed = 30;
                let direction = 0;
                
                if (Input.isPressed("down")) direction = 1;
                if (Input.isPressed("up")) direction = -1;
                if (Input.isPressed("pagedown")) direction = 10;
                if (Input.isPressed("pageup")) direction = -10;

                if (direction !== 0) {
                    const max = this.maxScrollY();
                    let newY = this._scrollY + (direction * scrollSpeed);
                    
                    // 钳制滚动范围，防止越界
                    if (newY < 0) newY = 0;
                    if (newY > max) newY = max;
                    
                    // 直接赋值取代 scrollTo 的平滑插值，防止连续按键时的冲突抖动
                    this._scrollY = newY;
                    this._scrollTargetY = newY;
                }
            }
        }
    }

    // =========================================================================
    // Scene_HelpSystem (主场景)
    // =========================================================================
    class Scene_HelpSystem extends Scene_MenuBase {
        create() {
            super.create();
            this.createListWindow();
            this.createDetailWindow();
        }

        createListWindow() {
            const wx = 0;
            const wy = this.mainAreaTop();
            const ww = 240; 
            const wh = Graphics.boxHeight - wy;
            const rect = new Rectangle(wx, wy, ww, wh);
            
            this._listWindow = new Window_HelpList(rect);
            this._listWindow.setHandler('cancel', this.popScene.bind(this));
            this._listWindow.setHandler('ok', this.onListOk.bind(this));
            this._listWindow.setHandler('cursorMove', this.onCursorMove.bind(this));
            
            this.addWindow(this._listWindow);
        }

        createDetailWindow() {
            const wx = 240; 
            const wy = this.mainAreaTop();
            const ww = Graphics.boxWidth - 240; 
            const wh = Graphics.boxHeight - wy;
            const rect = new Rectangle(wx, wy, ww, wh);
            
            this._detailWindow = new Window_HelpDetail(rect);
            this.addWindow(this._detailWindow);
            
            this.onCursorMove();
        }

        onCursorMove() {
            const item = this._listWindow.item();
            if (this._detailWindow) {
                this._detailWindow.setEntry(item);
            }
        }

        onListOk() {
            this._listWindow.deactivate();
            this._detailWindow.activate();
        }

        update() {
            super.update();
            if (this._detailWindow.active && (Input.isTriggered('cancel') || TouchInput.isCancelled())) {
                SoundManager.playCancel();
                this._detailWindow.deactivate();
                this._listWindow.activate();
            }
        }
    }
})();