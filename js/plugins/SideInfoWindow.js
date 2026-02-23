/*:
 * @target MZ
 * @plugindesc [v2.0] 左侧独立信息窗口插件。支持动态修改窗口大小、位置和内容，并可一键重置。
 * @author Gemini Assistant
 *
 * @help
 * ============================================================================
 * 更新日志 v2.0
 * ============================================================================
 * 1. 新增【动态配置】功能：游戏中可随时修改窗口大小和位置。
 * 2. 新增【动态内容】功能：游戏中可随时修改每一行的文字内容。
 * 3. 新增【重置配置】功能：一键恢复到插件参数设置的默认状态。
 * 4. 存档支持：所有的修改都会被保存到存档中。
 *
 * ============================================================================
 * 插件指令详解
 * ============================================================================
 *
 * 1. 【打开/关闭/刷新】(基础指令)
 * - 与旧版相同，用于控制显示。
 *
 * 2. 【设置窗口尺寸】(新)
 * - 可以在游戏中直接改变窗口的 X, Y, 宽, 高。
 * - 场景：换了背景图，原来的位置挡住了关键画面，临时挪一下。
 *
 * 3. 【修改单行数据】(新)
 * - 修改指定行号（从1开始）的标签和数值。
 * - 如果指定了不存在的行号（例如原来只有4行，你设置第5行），会自动新增一行。
 * - 场景：从“探索模式”切换到“战斗情报模式”，更改显示的文字。
 *
 * 4. 【重置配置】(新)
 * - 将窗口的位置、大小、内容全部恢复成你在插件参数里填写的默认值。
 *
 * ============================================================================
 * 文本代码支持
 * ============================================================================
 * \V[n], \N[n], \I[n], \C[n] 等均可用。
 *
 * @param windowSettings
 * @text --- 默认窗口设置 ---
 * @desc 游戏开始时或重置后的默认配置。
 * @default
 *
 * @param windowX
 * @text 默认 X 坐标
 * @parent windowSettings
 * @type number
 * @min 0
 * @default 0
 *
 * @param windowY
 * @text 默认 Y 坐标
 * @parent windowSettings
 * @type number
 * @min 0
 * @default 60
 *
 * @param windowWidth
 * @text 默认窗口宽度
 * @parent windowSettings
 * @type number
 * @min 50
 * @default 180
 *
 * @param windowHeight
 * @text 默认窗口高度
 * @parent windowSettings
 * @type number
 * @min 50
 * @default 450
 *
 * @param valueAlign
 * @text 数值对齐方式
 * @parent windowSettings
 * @type select
 * @option 右对齐 (推荐)
 * @value right
 * @option 左对齐
 * @value left
 * @option 紧随
 * @value auto
 * @default right
 *
 * @param dataList
 * @text --- 默认显示数据 ---
 * @desc 游戏开始时或重置后的默认内容。
 * @type struct<DataEntry>[]
 * @default []
 *
 * @command open
 * @text 打开信息窗口
 * @desc 显示左侧信息窗口。
 *
 * @command close
 * @text 关闭信息窗口
 * @desc 隐藏左侧信息窗口。
 *
 * @command refresh
 * @text 刷新数据
 * @desc 如果变量发生了变化，调用此指令更新窗口显示。
 *
 * @command setRect
 * @text 设置窗口尺寸位置
 * @desc 动态调整窗口的大小和位置。不输入参数则保持原样。
 * @arg x
 * @text X坐标
 * @type number
 * @desc 留空则不修改。
 * @arg y
 * @text Y坐标
 * @type number
 * @desc 留空则不修改。
 * @arg width
 * @text 宽度
 * @type number
 * @desc 留空则不修改。
 * @arg height
 * @text 高度
 * @type number
 * @desc 留空则不修改。
 *
 * @command setLine
 * @text 修改单行数据
 * @desc 修改或新增某一行的数据内容。
 * @arg index
 * @text 行号 (从1开始)
 * @type number
 * @min 1
 * @default 1
 * @desc 要修改哪一行？如果超过当前总行数，会新增一行。
 * @arg label
 * @text 标签文字
 * @type string
 * @desc 例如：体力。留空则清除该行文字。
 * @arg value
 * @text 数值内容
 * @type string
 * @desc 例如：\V[1]。
 * @arg lineBreak
 * @text 是否换行
 * @type boolean
 * @desc true:数值在下一行; false:数值在右侧。
 * @default false
 *
 * @command reset
 * @text 重置回默认配置
 * @desc 将窗口位置、大小、内容全部恢复为插件参数中的设置。
 */

/*~struct~DataEntry:
 * @param label
 * @text 数据标签
 * @type string
 * @default 属性
 *
 * @param value
 * @text 数据内容
 * @type string
 * @default \V[1]
 *
 * @param lineBreak
 * @text 是否换行
 * @type boolean
 * @default false
 */

(() => {
    const pluginName = "SideInfoWindow";
    const parameters = PluginManager.parameters(pluginName);
    
    // --- 1. 解析默认参数 ---
    const defaultSettings = {
        x: Number(parameters['windowX'] || 0),
        y: Number(parameters['windowY'] || 60),
        width: Number(parameters['windowWidth'] || 180),
        height: Number(parameters['windowHeight'] || 450),
        align: parameters['valueAlign'] || 'right'
    };

    const parseDataList = (jsonStr) => {
        try {
            const raw = JSON.parse(jsonStr || '[]');
            return raw.map(item => JSON.parse(item));
        } catch (e) {
            return [];
        }
    };
    const defaultDataList = parseDataList(parameters['dataList']);

    // --- 2. Game_System 扩展 (用于存档和管理动态数据) ---
    const _Game_System_initialize = Game_System.prototype.initialize;
    Game_System.prototype.initialize = function() {
        _Game_System_initialize.call(this);
        this.initSideInfoWindow();
    };

    Game_System.prototype.initSideInfoWindow = function() {
        // 深拷贝默认配置，确保修改不影响原始默认值
        this._sideInfoConfig = {
            rect: { ...defaultSettings },
            data: defaultDataList.map(item => ({ ...item })),
            isOpen: false
        };
    };

    // 获取当前配置（兼容旧存档）
    Game_System.prototype.getSideInfoConfig = function() {
        if (!this._sideInfoConfig) {
            this.initSideInfoWindow();
        }
        return this._sideInfoConfig;
    };

    // 重置配置
    Game_System.prototype.resetSideInfoConfig = function() {
        this.initSideInfoWindow();
    };

    // 动态修改窗口矩形
    Game_System.prototype.setSideInfoRect = function(x, y, w, h) {
        const config = this.getSideInfoConfig();
        if (x !== "" && x !== undefined) config.rect.x = Number(x);
        if (y !== "" && y !== undefined) config.rect.y = Number(y);
        if (w !== "" && w !== undefined) config.rect.width = Number(w);
        if (h !== "" && h !== undefined) config.rect.height = Number(h);
    };

    // 动态修改行数据
    Game_System.prototype.setSideInfoLine = function(index, label, value, lineBreak) {
        const config = this.getSideInfoConfig();
        const arrayIndex = index - 1; // 转换为0基索引
        
        // 确保数组长度足够
        if (arrayIndex >= config.data.length) {
            for (let i = config.data.length; i <= arrayIndex; i++) {
                config.data.push({ label: "", value: "", lineBreak: "false" });
            }
        }

        config.data[arrayIndex] = {
            label: String(label || ""),
            value: String(value || ""),
            lineBreak: String(lineBreak)
        };
    };

    // --- 3. 插件指令注册 ---

    PluginManager.registerCommand(pluginName, "open", args => {
        $gameSystem.getSideInfoConfig().isOpen = true;
        const scene = SceneManager._scene;
        if (scene && scene._sideInfoWindow) {
            scene._sideInfoWindow.open();
            scene._sideInfoWindow.refresh();
        }
    });

    PluginManager.registerCommand(pluginName, "close", args => {
        $gameSystem.getSideInfoConfig().isOpen = false;
        const scene = SceneManager._scene;
        if (scene && scene._sideInfoWindow) {
            scene._sideInfoWindow.close();
        }
    });

    PluginManager.registerCommand(pluginName, "refresh", args => {
        const scene = SceneManager._scene;
        if (scene && scene._sideInfoWindow) {
            scene._sideInfoWindow.refresh();
        }
    });

    PluginManager.registerCommand(pluginName, "setRect", args => {
        $gameSystem.setSideInfoRect(args.x, args.y, args.width, args.height);
        const scene = SceneManager._scene;
        if (scene && scene._sideInfoWindow) {
            scene._sideInfoWindow.updateRect(); // 立即应用新尺寸
            scene._sideInfoWindow.refresh();
        }
    });

    PluginManager.registerCommand(pluginName, "setLine", args => {
        $gameSystem.setSideInfoLine(
            Number(args.index), 
            args.label, 
            args.value, 
            args.lineBreak === 'true'
        );
        const scene = SceneManager._scene;
        if (scene && scene._sideInfoWindow) {
            scene._sideInfoWindow.refresh();
        }
    });

    PluginManager.registerCommand(pluginName, "reset", args => {
        // 保存当前的开启状态，避免重置后自动关闭（如果原来是开着的）
        const wasOpen = $gameSystem.getSideInfoConfig().isOpen;
        
        $gameSystem.resetSideInfoConfig();
        $gameSystem.getSideInfoConfig().isOpen = wasOpen;

        const scene = SceneManager._scene;
        if (scene && scene._sideInfoWindow) {
            scene._sideInfoWindow.updateRect();
            scene._sideInfoWindow.refresh();
            if (!wasOpen) scene._sideInfoWindow.close();
        }
    });

    // --- 4. 窗口实现 ---
    class Window_SideInfo extends Window_Base {
        initialize(rect) {
            super.initialize(rect);
            this.opacity = 255;
            this.openness = 0;
            // 初始时根据存档状态决定是否显示，但通常由事件控制 open
            // 为了防止读档后消失，我们需要检查存档
            if ($gameSystem.getSideInfoConfig().isOpen) {
                this.openness = 255;
            }
            this.refresh();
        }

        // 核心：从 Game_System 获取当前最新配置
        updateRect() {
            const config = $gameSystem.getSideInfoConfig();
            if (config && config.rect) {
                this.move(config.rect.x, config.rect.y, config.rect.width, config.rect.height);
                this.createContents(); // 大小改变后需要重建内容层
            }
        }

        refresh() {
            if (this.contents) {
                this.contents.clear();
                this.drawDataItems();
            }
        }

        drawDataItems() {
            const config = $gameSystem.getSideInfoConfig();
            if (!config || !config.data) return;

            const list = config.data;
            const align = config.rect.align || 'right';
            let y = 0;
            const lineHeight = this.lineHeight();
            const padding = 10;

            list.forEach(data => {
                const label = data.label || "";
                const value = data.value || "";
                // 兼容 boolean 和 string 类型的 lineBreak
                const isLineBreak = (data.lineBreak === true || data.lineBreak === 'true');

                // 1. 绘制标签
                this.drawTextEx(label, 0, y);

                // 2. 绘制数值
                if (isLineBreak) {
                    y += lineHeight;
                    this.drawTextEx(value, padding, y);
                    y += lineHeight + 5;
                } else {
                    const labelWidth = this.textSizeEx(label).width;
                    const valueWidth = this.textSizeEx(value).width;
                    let valueX = 0;

                    if (align === 'right') {
                        valueX = this.innerWidth - valueWidth;
                    } else if (align === 'auto') {
                        valueX = labelWidth + 10;
                    } else {
                        // left
                        valueX = Math.max(this.innerWidth / 2, labelWidth + 10);
                    }

                    this.drawTextEx(value, valueX, y);
                    y += lineHeight + 5;
                }
            });
        }
    }

    // --- 5. 场景集成 ---
    const _Scene_Map_createAllWindows = Scene_Map.prototype.createAllWindows;
    Scene_Map.prototype.createAllWindows = function() {
        _Scene_Map_createAllWindows.call(this);
        this.createSideInfoWindow();
    };

    Scene_Map.prototype.createSideInfoWindow = function() {
        // 创建时直接读取存档中的配置（如果还没初始化过，会自动初始化默认值）
        const config = $gameSystem.getSideInfoConfig().rect;
        const rect = new Rectangle(config.x, config.y, config.width, config.height);
        
        this._sideInfoWindow = new Window_SideInfo(rect);
        this.addWindow(this._sideInfoWindow);
    };

    const _Scene_Battle_createAllWindows = Scene_Battle.prototype.createAllWindows;
    Scene_Battle.prototype.createAllWindows = function() {
        _Scene_Battle_createAllWindows.call(this);
        this.createSideInfoWindow();
    };
    Scene_Battle.prototype.createSideInfoWindow = Scene_Map.prototype.createSideInfoWindow;

})();