// 事件日志插件 for RPG Maker MZ - 无时间显示版本
// 版本：2.2
// 作者：AI Assistant

/*:
 * @target MZ
 * @plugindesc 记录并查看游戏中的关键事件日志。
 * @author AI Assistant
 * @help
 * 使用说明：
 * 
 * 【插件命令】
 * 1. 记录事件 - 添加一条事件记录
 *   示例：EventLogger log 获得了传说之剑
 * 
 * 2. 打开事件日志 - 打开日志查看场景
 *   示例：EventLogger open
 * 
 * 3. 清空事件日志 - 清除所有记录
 *   示例：EventLogger clear
 * 
 * @command log
 * @text 记录事件
 * @desc 记录一条新的事件信息。
 * 
 * @arg message
 * @type string
 * @text 事件内容
 * @desc 要记录的事件内容。
 * 
 * @command open
 * @text 打开事件日志
 * @desc 打开事件日志场景。
 * 
 * @command clear
 * @text 清空事件日志
 * @desc 清空所有事件记录。
 */

(() => {
    'use strict';

    const pluginName = "EventLogger";
    let _eventLogs = [];

    // 初始化日志数据
    function initLogData() {
        if (!_eventLogs || _eventLogs.length === 0) {
            _eventLogs = [];
        }
    }

    // 注册插件命令
    PluginManager.registerCommand(pluginName, "log", function(args) {
        logEvent(args.message);
    });

    PluginManager.registerCommand(pluginName, "open", function(args) {
        SceneManager.push(Scene_EventLog);
    });

    PluginManager.registerCommand(pluginName, "clear", function(args) {
        _eventLogs = [];
    });

    // 记录事件的函数 - 简化版本（无时间记录）
    function logEvent(message) {
        if (!_eventLogs) {
            _eventLogs = [];
        }
        
        // 简化：直接记录消息，不记录时间
        const entry = {
            text: message
        };
        _eventLogs.push(entry);
    }

    // 事件日志场景
    class Scene_EventLog extends Scene_MenuBase {
        create() {
            super.create();
            this.createHelpWindow();
            this.createLogWindow();
        }

        createHelpWindow() {
            const rect = this.helpWindowRect();
            this._helpWindow = new Window_Help(rect);
            this._helpWindow.setText("事件日志");
            this.addWindow(this._helpWindow);
        }

        createLogWindow() {
            if (!this._helpWindow) {
                this.createHelpWindow();
            }
            
            const rect = this.logWindowRect();
            
            if (!this.isValidRectangle(rect)) {
                console.error('Invalid rect in createLogWindow, using safe default.');
                rect = new Rectangle(0, 36, Graphics.boxWidth, Graphics.boxHeight - 36);
            }
            
            this._logWindow = new Window_EventLog(rect);
            this._logWindow.setHandler('cancel', this.popScene.bind(this));
            this.addWindow(this._logWindow);
        }

        // 定义帮助窗口的矩形区域
        helpWindowRect() {
            const width = Graphics.boxWidth;
            const height = this.calcWindowHeight(1, true);
            const x = 0;
            const y = 0;
            return new Rectangle(x, y, width, height);
        }

        logWindowRect() {
            const helpWindowHeight = (this._helpWindow && typeof this._helpWindow.height === 'number') ? 
                this._helpWindow.height : 36;
            
            const boxWidth = typeof Graphics.boxWidth === 'number' ? Graphics.boxWidth : 816;
            const boxHeight = typeof Graphics.boxHeight === 'number' ? Graphics.boxHeight : 624;

            const wx = 0;
            const wy = helpWindowHeight;
            const ww = boxWidth;
            const wh = boxHeight - helpWindowHeight;

            if (this.isValidRectangleParams(wx, wy, ww, wh)) {
                return new Rectangle(wx, wy, ww, wh);
            } else {
                console.error('Invalid rectangle parameters in logWindowRect:', { wx, wy, ww, wh });
                return new Rectangle(0, 36, boxWidth, boxHeight - 36);
            }
        }

        // 从Window_Base继承的方法来计算窗口高度
        calcWindowHeight(numLines, includePadding) {
            const padding = 24; // Window_Base的标准内边距
            const lineHeight = 36; // Window_Base的标准行高
            return includePadding ? numLines * lineHeight + padding : numLines * lineHeight;
        }

        isValidRectangle(rect) {
            return rect instanceof Rectangle && 
                   typeof rect.x === 'number' && 
                   typeof rect.y === 'number' && 
                   typeof rect.width === 'number' && 
                   typeof rect.height === 'number' &&
                   !isNaN(rect.x) && !isNaN(rect.y) && !isNaN(rect.width) && !isNaN(rect.height);
        }

        isValidRectangleParams(x, y, width, height) {
            return [x, y, width, height].every(param => typeof param === 'number' && !isNaN(param));
        }
    }

    // 事件日志窗口
    class Window_EventLog extends Window_Selectable {
        initialize(rect) {
            if (!(rect instanceof Rectangle)) {
                console.error('Invalid rect provided to Window_EventLog. Expected Rectangle, got:', typeof rect, rect);
                const safeRect = new Rectangle(0, 0, Graphics.boxWidth, Graphics.boxHeight);
                super.initialize(safeRect);
            } else {
                const { x, y, width, height } = rect;
                if ([x, y, width, height].some(isNaN)) {
                    console.error('Rectangle has invalid properties, using default.');
                    const safeRect = new Rectangle(0, 0, Graphics.boxWidth, Graphics.boxHeight);
                    super.initialize(safeRect);
                } else {
                    super.initialize(rect);
                }
            }
            this.refresh();
            this.activate();
            this.select(0);
        }

        maxItems() {
            return _eventLogs ? _eventLogs.length : 0;
        }

        drawItem(index) {
            if (!_eventLogs || index >= _eventLogs.length) return;
            
            const entry = _eventLogs[index];
            if (entry) {
                const rect = this.itemRect(index);
                this.resetTextColor();
                // 修改：直接绘制文本，不显示时间
                this.drawText(entry.text, rect.x, rect.y, rect.width);
            }
        }
    }

    // 数据管理
    const _DataManager_createGameObjects = DataManager.createGameObjects;
    DataManager.createGameObjects = function() {
        _DataManager_createGameObjects.call(this);
        initLogData();
    };

    const _DataManager_makeSaveContents = DataManager.makeSaveContents;
    DataManager.makeSaveContents = function() {
        const contents = _DataManager_makeSaveContents.call(this);
        contents.eventLogs = _eventLogs || [];
        return contents;
    };

    const _DataManager_extractSaveContents = DataManager.extractSaveContents;
    DataManager.extractSaveContents = function(contents) {
        _DataManager_extractSaveContents.call(this, contents);
        _eventLogs = contents.eventLogs || [];
    };

})();