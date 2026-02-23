// 人物选择窗口插件 for RPG Maker MZ
// 版本：2.6.0 - 交互优化版 (增加确认弹窗 + 支持原生滚动)
// 作者：AI Assistant

/*:
 * @target MZ
 * @plugindesc 人物选择窗口。布局仿TouchoSystem，列表支持滚动，增加确认弹窗防止误操作。
 * @author AI Assistant
 * * @help
 * ============================================================================
 * 版本 2.6.0 更新说明：
 * 1. 列表操作优化：支持鼠标/触摸上下拖动滚动。
 * 2. 交互安全锁：选中人物按确定后，会弹出[确定/取消]小窗口，方便查看立绘。
 * ============================================================================
 * * 使用说明：
 * * 【插件命令】
 * 1. 打开人物选择窗口
 * CharacterSelect open
 * * 2. 添加人物
 * CharacterSelect add id|name|face
 * 示例：CharacterSelect add 1|战士|Warrior
 * * 3. 删除人物
 * CharacterSelect remove id
 * 示例：CharacterSelect remove 1
 * * 4. 清空人物列表
 * CharacterSelect clear
 * * 5. 设置存储变量
 * CharacterSelect setVariable variableId
 * 示例：CharacterSelect setVariable 5
 * * 【插件参数】
 * - 存储变量ID：选择确认后存储人物数字的变量ID
 * - 初始人物数据：JSON格式的初始人物列表
 * * 注意：立绘文件应放在 img/pictures/ 文件夹中
 * * @command open
 * @text 打开人物选择窗口
 * @desc 打开人物选择窗口。
 * * @command add
 * @text 添加人物
 * @desc 添加一个新人物到选择列表。
 * * @arg data
 * @type string
 * @text 人物数据
 * @desc 人物数据，格式：id|name|face
 * * @command remove
 * @text 删除人物
 * @desc 从选择列表中删除指定人物。
 * * @arg id
 * @type number
 * @text 人物ID
 * @desc 要删除的人物ID
 * * @command clear
 * @text 清空人物列表
 * @desc 清空所有人物。
 * * @command setVariable
 * @text 设置存储变量
 * @desc 设置选择确认后存储人物ID的变量ID。
 * * @command hide
 * @text 临时隐藏人物
 * @desc 临时从列表中隐藏指定ID的人物。
 * @arg id
 * @type string
 * @text 人物ID/变量引用
 * @desc 要隐藏的人物ID。支持直接输入数字或变量引用 (例如: V[5] 读取变量5的值)。
 * * @command show
 * @text 恢复显示人物
 * @desc 恢复显示临时隐藏的指定ID的人物。
 * @arg id
 * @type string
 * @text 人物ID/变量引用
 * @desc 要恢复显示的人物ID。支持直接输入数字或变量引用 (例如: V[5] 读取变量5的值)。
 *
 * @arg variableId
 * @type variable
 * @text 变量ID
 * @desc 存储人物ID的变量ID
 * * @param variableId
 * @text 存储变量ID
 * @type variable
 * @desc 选择确认后存储人物数字的变量ID
 * @default 1
 * * @param initialCharacters
 * @text 初始人物数据
 * @type string
 * @desc JSON格式的初始人物数据
 * @default [{"id":1,"name":"战士","face":"Warrior"},{"id":2,"name":"法师","face":"Mage"},{"id":3,"name":"盗贼","face":"Thief"}]
 */

(function() {
    'use strict';

    const pluginName = "CharacterSelect";
    const parameters = PluginManager.parameters(pluginName);
    let storageVariableId = Number(parameters['variableId'] || 1);
    const initialCharacters = JSON.parse(parameters['initialCharacters'] || '[]');

    // 全局人物数据存储
    let _characterData = [];
    
    // 立绘缓存对象
    const _faceCache = {};

    // 初始化人物数据
    function initCharacterData() {
        if (!_characterData || _characterData.length === 0) {
            _characterData = initialCharacters.slice().map(char => ({ ...char, visible: true })); 
            _characterData.sort((a, b) => a.id - b.id);
        }
        _characterData.forEach(char => {
            if (char.visible === undefined) {
                char.visible = true;
            }
        });
    }

    // 预加载立绘
    function preloadFaces() {
        const characters = getCharacterData();
        characters.forEach(character => {
            if (character.face && !_faceCache[character.face]) {
                const bitmap = ImageManager.loadPicture(character.face);
                _faceCache[character.face] = bitmap;
            }
        });
    }

    // 获取立绘位图
    function getFaceBitmap(faceName) {
        if (!faceName) return null;
        if (!_faceCache[faceName]) {
            _faceCache[faceName] = ImageManager.loadPicture(faceName);
        }
        return _faceCache[faceName];
    }

    // 注册插件命令
    PluginManager.registerCommand(pluginName, "open", function(args) {
        preloadFaces();
        SceneManager.push(Scene_CharacterSelect);
    });

    PluginManager.registerCommand(pluginName, "add", function(args) {
        addCharacter(args.data);
    });

    PluginManager.registerCommand(pluginName, "remove", function(args) {
        removeCharacter(Number(args.id));
    });

    PluginManager.registerCommand(pluginName, "clear", function(args) {
        clearCharacters();
    });

    PluginManager.registerCommand(pluginName, "setVariable", function(args) {
        setStorageVariable(Number(args.variableId));
    });
    
    PluginManager.registerCommand(pluginName, "hide", function(args) {
        const charId = getIdFromArg(args.id);
        if (charId > 0) hideCharacter(charId);
    });

    PluginManager.registerCommand(pluginName, "show", function(args) {
        const charId = getIdFromArg(args.id);
        if (charId > 0) showCharacter(charId);
    });
    
    // 数据操作函数
    function addCharacter(data) {
        initCharacterData();
        const parts = String(data).split('|');
        if (parts.length >= 3) {
            const id = parseInt(parts[0]) || 0;
            const name = parts[1].trim();
            const face = parts[2].trim();
            const characterData = { id, name, face, visible: true };

            if (id > 0 && name) {
                const existingIndex = _characterData.findIndex(char => char.id === id);
                if (existingIndex >= 0) {
                    characterData.visible = _characterData[existingIndex].visible === false ? false : true; 
                    _characterData[existingIndex] = characterData;
                } else {
                    _characterData.push(characterData);
                }
                _characterData.sort((a, b) => a.id - b.id);
                if (face && !_faceCache[face]) {
                    _faceCache[face] = ImageManager.loadPicture(face);
                }
            }
        }
    }
    
    function getIdFromArg(arg) {
        const argStr = String(arg).trim();
        const match = argStr.match(/v\[(\d+)\]/i); 
        if (match) {
            const varId = parseInt(match[1]);
            if (varId > 0) return $gameVariables.value(varId);
        }
        return parseInt(argStr) || 0;
    }
    
    function hideCharacter(id) {
        initCharacterData(); 
        const character = _characterData.find(char => char.id === id);
        if (character) character.visible = false;
    }

    function showCharacter(id) {
        initCharacterData(); 
        const character = _characterData.find(char => char.id === id);
        if (character) character.visible = true;
    }

    function removeCharacter(id) {
        initCharacterData();
        const index = _characterData.findIndex(char => char.id === id);
        if (index >= 0) _characterData.splice(index, 1);
    }

    function clearCharacters() {
        _characterData = [];
    }

    function setStorageVariable(variableId) {
        if (variableId > 0) storageVariableId = variableId;
    }
    
    function getCharacterData() {
        initCharacterData();
        return _characterData.filter(char => char.visible === true);
    }

    // ======================================================================
    // 窗口类定义
    // ======================================================================

    // 1. 人物列表窗口 (支持原生滚动)
    class Window_CharacterList extends Window_Selectable {
        constructor(rect) {
            super(rect);
            this._characters = getCharacterData();
            if (this._characters.length > 0) {
                this.select(0);
            }
            this.refresh();
            this.activate();
        }

        maxItems() {
            return this._characters ? this._characters.length : 0;
        }

        drawItem(index) {
            if (!this._characters || index >= this._characters.length) return;
            const character = this._characters[index];
            if (character) {
                const rect = this.itemLineRect(index); 
                this.changeTextColor(ColorManager.normalColor());
                const nameX = rect.x + 5;
                const nameWidth = rect.width - 40; 
                this.drawText(character.name, nameX, rect.y, nameWidth);
                
                // 选中标记
                if (index === this.index()) {
                    this.changeTextColor(ColorManager.systemColor());
                    this.drawText("✓", rect.x + rect.width - 30, rect.y, 30, "right");
                }
            }
        }
        
        select(index) {
            super.select(index);
            // 每次光标移动都通知场景更新右侧
            if (this._onCursorMove) {
                this._onCursorMove();
            }
        }
        
        selectedCharacter() {
            const index = this.index();
            if (index >= 0 && index < this._characters.length) {
                return this._characters[index];
            }
            return null;
        }
        
        setCursorMoveHandler(method) {
            this._onCursorMove = method;
        }
        
        refreshData() {
            this._characters = getCharacterData();
            this.refresh();
            if (this._characters.length > 0) {
                this.select(0);
            } else {
                this.select(-1);
            }
        }
        
        isOkEnabled() { return true; }
        isCancelEnabled() { return true; }
    }

    // 2. 确认弹窗 (新增)
    class Window_CharacterConfirm extends Window_Command {
        initialize(rect) {
            super.initialize(rect);
            this.openness = 0; // 默认关闭
            this.deactivate();
        }
        
        makeCommandList() {
            this.addCommand("确定选择", "ok");
            this.addCommand("再看看", "cancel");
        }
    }

    // 3. 人物立绘窗口
    class Window_CharacterFace extends Window_Base {
        constructor(rect) {
            super(rect);
            this._character = null;
            this._faceBitmap = null;
            this.refresh();
        }

        setCharacter(character) {
            this._character = character;
            this._faceBitmap = null; 
            if (character && character.face) {
                this._faceBitmap = getFaceBitmap(character.face);
            }
            this.refresh();
        }

        refresh() {
            this.contents.clear();
            const rect = this.baseTextRect();
            
            if (this._character) {
                let y = 10;
                // 绘制立绘
                if (this._character.face) {
                    const faceWidth = 400; 
                    const faceHeight = 600; 
                    const faceX = (rect.width - faceWidth) / 2;
                    const faceY = 80; 
                    
                    if (this._faceBitmap) {
                        if (this._faceBitmap.isReady()) {
                            const scale = Math.min(faceWidth / this._faceBitmap.width, faceHeight / this._faceBitmap.height);
                            const drawWidth = this._faceBitmap.width * scale;
                            const drawHeight = this._faceBitmap.height * scale;
                            const drawX = (rect.width - drawWidth) / 2;
                            const drawY = faceY + (faceHeight - drawHeight) / 2;
                            this.contents.blt(this._faceBitmap, 0, 0, this._faceBitmap.width, this._faceBitmap.height, drawX, drawY, drawWidth, drawHeight);
                        } else {
                            this.drawText("立绘加载中...", 0, faceY + 100, rect.width, "center");
                            setTimeout(() => {
                                if (this._character && this._faceBitmap && this._faceBitmap.isReady()) {
                                    this.refresh();
                                }
                            }, 100);
                        }
                    } else {
                        this.drawText("立绘加载失败", 0, faceY + 100, rect.width, "center");
                    }
                }
                
                // 绘制信息
                this.changeTextColor(ColorManager.normalColor());
                this.contents.fontSize = 32;
                this.drawText(this._character.name, 0, y, rect.width, "center");
                y += this.lineHeight();
                this.contents.fontSize = 20;
                this.changeTextColor(ColorManager.systemColor());
                this.drawText(`ID: ${this._character.id}`, 0, y, rect.width, "center");
                
                // 底部提示
                const hintY = rect.height - this.lineHeight() * 2;
                this.resetFontSettings();
                this.contents.fontSize = 18;
                this.changeTextColor(ColorManager.systemColor());
                this.drawText("选中后点击 [确定] 完成选择", 0, hintY, rect.width, "center");
                this.drawText("列表可上下拖动", 0, hintY + this.lineHeight(), rect.width, "center");

            } else {
                this.changeTextColor(ColorManager.normalColor());
                this.drawText("请从左侧选择一个人物", 0, rect.height / 2 - 20, rect.width, "center");
            }
        }
    }

    // ======================================================================
    // 场景类定义 (含确认逻辑)
    // ======================================================================

    class Scene_CharacterSelect extends Scene_MenuBase {
        create() {
            super.create();
            this.createListWindow();
            this.createFaceWindow();
            this.createConfirmWindow(); // 新增
            
            const characters = getCharacterData();
            if (characters && characters.length > 0) {
                this._faceWindow.setCharacter(characters[0]);
            } else {
                this._faceWindow.setCharacter(null);
            }
        }

        createListWindow() {
            const rect = this.listWindowRect();
            this._listWindow = new Window_CharacterList(rect);
            
            this._listWindow.setHandler('cancel', () => this.popScene());
            // 绑定 OK 到 confirm 流程，而不是直接退出
            this._listWindow.setHandler('ok', this.onListOk.bind(this));
            this._listWindow.setCursorMoveHandler(this.onCursorMove.bind(this));
            
            this.addWindow(this._listWindow);
        }
        
        createFaceWindow() {
            const rect = this.faceWindowRect();
            this._faceWindow = new Window_CharacterFace(rect);
            this.addWindow(this._faceWindow);
        }

        // 新增：创建确认小窗口
        createConfirmWindow() {
            const w = 240;
            const h = this.calcWindowHeight(2, true);
            const x = (Graphics.boxWidth - w) / 2;
            const y = (Graphics.boxHeight - h) / 2;
            const rect = new Rectangle(x, y, w, h);
            
            this._confirmWindow = new Window_CharacterConfirm(rect);
            this._confirmWindow.setHandler('ok', this.onConfirmOk.bind(this));
            this._confirmWindow.setHandler('cancel', this.onConfirmCancel.bind(this));
            this.addWindow(this._confirmWindow);
        }

        listWindowRect() {
            const wx = 0;
            const wy = this.mainAreaTop();
            const ww = 240;
            const wh = Graphics.boxHeight - wy;
            return new Rectangle(wx, wy, ww, wh);
        }

        faceWindowRect() {
            const wx = 240;
            const wy = this.mainAreaTop();
            const ww = Graphics.boxWidth - 240;
            const wh = Graphics.boxHeight - wy;
            return new Rectangle(wx, wy, ww, wh);
        }
        
        onCursorMove() {
            const characters = getCharacterData();
            const index = this._listWindow.index();
            
            if (characters && index >= 0 && index < characters.length) {
                const character = characters[index];
                this._faceWindow.setCharacter(character);
            } else {
                this._faceWindow.setCharacter(null);
            }
        }
        
        // 列表点击 OK 时，不直接退出，而是打开确认窗口
        onListOk() {
            this._listWindow.deactivate();
            this._confirmWindow.open();
            this._confirmWindow.activate();
            this._confirmWindow.select(0);
        }

        // 确认窗口：点击确定
        onConfirmOk() {
            const character = this._listWindow.selectedCharacter();
            if (character) {
                $gameVariables.setValue(storageVariableId, character.id);
                console.log(`人物选择确认: ${character.name} (ID: ${character.id})`);
                this.popScene();
            }
        }

        // 确认窗口：点击取消
        onConfirmCancel() {
            this._confirmWindow.close();
            this._confirmWindow.deactivate();
            this._listWindow.activate();
        }
        
        start() {
            super.start();
            this._listWindow.activate();
        }
    }

    // 数据管理
    const _DataManager_createGameObjects = DataManager.createGameObjects;
    DataManager.createGameObjects = function() {
        _DataManager_createGameObjects.call(this);
        initCharacterData();
    };

    const _DataManager_makeSaveContents = DataManager.makeSaveContents;
    DataManager.makeSaveContents = function() {
        const contents = _DataManager_makeSaveContents.call(this);
        contents.characterSelectData = _characterData;
        contents.characterSelectVariableId = storageVariableId;
        return contents;
    };

    const _DataManager_extractSaveContents = DataManager.extractSaveContents;
    DataManager.extractSaveContents = function(contents) {
        _DataManager_extractSaveContents.call(this, contents);
        _characterData = contents.characterSelectData || [];
        storageVariableId = contents.characterSelectVariableId || storageVariableId;
    };
})();