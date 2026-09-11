/*:zh
 * @target MZ
 * @plugindesc [v3.3] 多区域大地图系统 - 确认窗口版
 * @author Gemini Assistant
 *
 * @help
 * ============================================================================
 * 使用说明
 * ============================================================================
 *
 * 1. 交互流程更新
 * 现在点击一个可用地点后，不会立即传送，而是弹出一个居中的确认窗口。
 * 玩家必须选择【确认按钮文字】才能传送，选择【取消按钮文字】则返回列表。
 *
 * 2. 状态逻辑（保持不变）
 * - 灰色（锁定）：点击会播放蜂鸣声，不弹出确认窗口。
 * - 白色（可用）：点击弹出确认窗口。
 *
 * ============================================================================
 *
 * @param basicSettings
 * @text --- 基础设置 ---
 * @default
 *
 * @param showInMenu
 * @text 是否添加到主菜单
 * @parent basicSettings
 * @type boolean
 * @default true
 *
 * @param menuName
 * @text 菜单选项名称
 * @parent basicSettings
 * @type string
 * @default 世界地图
 *
 * @param confirmText
 * @text 确认按钮文字
 * @parent basicSettings
 * @type string
 * @default 前往
 *
 * @param cancelText
 * @text 取消按钮文字
 * @parent basicSettings
 * @type string
 * @default 暂不
 *
 * @param highlightColor
 * @text 可用点颜色
 * @parent basicSettings
 * @desc 可传送地点的光圈颜色 (Hex)。
 * @default #FFD700
 *
 * @param lockedColor
 * @text 不可用点颜色
 * @parent basicSettings
 * @desc 不可传送地点(灰色状态)的光圈颜色 (Hex)。
 * @default #999999
 *
 * @param mapSettings
 * @text --- 地图配置 ---
 * @desc 配置所有大地图数据。
 * @type struct<MapConfig>[]
 * @default []
 *
 * @command openMap
 * @text 打开指定地图
 * @desc 强制打开某张大地图（无视当前位置）。
 * @arg mapId
 * @text 地图ID
 * @desc 对应配置中设置的【唯一ID】。
 * @type string
 * @default world
 *
 */

/*~struct~MapConfig:zh
 * @param mapId
 * @text 唯一ID
 * @desc 插件内部引用的ID (如 world)。
 * @type string
 * @default world
 *
 * @param bindMapIds
 * @text 绑定的游戏地图ID
 * @desc 当玩家处于这些地图ID时，菜单会自动打开这张大地图。
 * @type number[]
 * @default []
 *
 * @param mapImage
 * @text 图片文件名
 * @desc img/pictures/ 下的文件名（不带后缀）。
 * @default WorldMap
 * @require 1
 *
 * @param locations
 * @text 地点列表
 * @desc 该地图上包含的所有地点。
 * @type struct<LocationData>[]
 * @default []
 */

/*~struct~LocationData:zh
 * @param name
 * @text 地点名称
 * @type string
 * @default 未命名地点
 *
 * @param description
 * @text 地点描述
 * @type multiline_string
 * @default 
 *
 * @param switchId
 * @text 显示条件开关(可见性)
 * @desc OFF时完全不显示。ON或0时显示在列表中。
 * @type switch
 * @default 0
 *
 * @param unlockSwitchId
 * @text 解锁条件开关(可用性)
 * @desc OFF时显示为灰色且不可传送。ON或0时显示为白色且可传送。
 * @type switch
 * @default 0
 *
 * @param x
 * @text X 坐标
 * @type number
 * @default 100
 *
 * @param y
 * @text Y 坐标
 * @type number
 * @default 100
 *
 * @param mapId
 * @text 传送地图ID
 * @desc 0=不传送。
 * @type number
 * @default 0
 *
 * @param mapX
 * @text 传送X坐标
 * @type number
 * @default 0
 *
 * @param mapY
 * @text 传送Y坐标
 * @type number
 * @default 0
 */

(() => {
    const pluginName = "BigWorldMap";
    const parameters = PluginManager.parameters(pluginName);

    const config = {
        showInMenu: parameters['showInMenu'] === 'true',
        menuName: parameters['menuName'] || "世界地图",
        confirmText: parameters['confirmText'] || "前往",
        cancelText: parameters['cancelText'] || "暂不",
        highlightColor: parameters['highlightColor'] || '#FFD700',
        lockedColor: parameters['lockedColor'] || '#999999'
    };

    const rawMapSettings = JSON.parse(parameters['mapSettings'] || '[]');
    const mapsData = {}; 
    const bindMapIndex = {}; 

    rawMapSettings.forEach(mapJson => {
        const mapObj = JSON.parse(mapJson);
        const id = mapObj.mapId;
        
        const boundIds = JSON.parse(mapObj.bindMapIds || '[]').map(Number);
        boundIds.forEach(rmmzMapId => {
            bindMapIndex[rmmzMapId] = id;
        });

        const rawLocs = JSON.parse(mapObj.locations || '[]');
        const parsedLocs = rawLocs.map(locJson => {
            const locObj = JSON.parse(locJson);
            return {
                name: locObj.name,
                description: locObj.description || "", 
                x: Number(locObj.x) || 0,
                y: Number(locObj.y) || 0,
                switchId: Number(locObj.switchId) || 0,       
                unlockSwitchId: Number(locObj.unlockSwitchId) || 0, 
                mapId: Number(locObj.mapId) || 0,
                mapX: Number(locObj.mapX) || 0,
                mapY: Number(locObj.mapY) || 0
            };
        });
        mapsData[id] = {
            imageId: mapObj.mapImage,
            locations: parsedLocs
        };
    });

    function getCurrentContextMapId() {
        const currentMapId = $gameMap.mapId();
        return bindMapIndex[currentMapId] || null;
    }

    PluginManager.registerCommand(pluginName, "openMap", args => {
        const mapId = args.mapId;
        if (!mapsData[mapId]) {
            console.error(`BigWorldMap: 找不到ID为 "${mapId}" 的地图配置。`);
            return;
        }
        Scene_BigWorldMap.targetMapId = mapId;
        SceneManager.push(Scene_BigWorldMap);
    });

    // --- 主菜单集成：菜单项由 MenuHub 插件参数 menuItems 配置 ---
    // （动作: globalCall BigWorldMap.openFromMenu；可用条件: BigWorldMap.available）
    // 注意：勿在此处再调用 MenuHub.add 注册 bigWorldMap，会覆盖参数配置！

    Scene_Menu.prototype.commandBigWorldMap = function() {
        const contextMapId = getCurrentContextMapId();
        if (contextMapId) {
            Scene_BigWorldMap.targetMapId = contextMapId;
            SceneManager.push(Scene_BigWorldMap);
        } else {
            this._commandWindow.activate();
        }
    };

    //-----------------------------------------------------------------------------
    // Scene_BigWorldMap
    //-----------------------------------------------------------------------------
    class Scene_BigWorldMap extends Scene_MenuBase {
        create() {
            super.create();
            this._currentMapData = mapsData[Scene_BigWorldMap.targetMapId];
            this.createDescWindow();
            this.createMapWindow();
            this.createListWindow();
            // 【新增】创建确认窗口
            this.createConfirmWindow();
        }

        descWindowHeight() {
            return this.calcWindowHeight(2, true); 
        }

        createDescWindow() {
            const wx = 240;
            const wh = this.descWindowHeight();
            const wy = Graphics.boxHeight - wh; 
            const ww = Graphics.boxWidth - 240;
            const rect = new Rectangle(wx, wy, ww, wh);
            this._descWindow = new Window_MapDescription(rect);
            this.addWindow(this._descWindow);
        }

        createMapWindow() {
            const wx = 240;
            const wy = this.buttonAreaHeight();
            const ww = Graphics.boxWidth - 240;
            const wh = Graphics.boxHeight - wy; 
            const rect = new Rectangle(wx, wy, ww, wh);
            this._mapWindow = new Window_MapVisual(rect, this._currentMapData.imageId);
            this.addWindow(this._mapWindow);
        }

        createListWindow() {
            const rect = this.listWindowRect();
            this._listWindow = new Window_MapLocationList(rect, this._currentMapData.locations);
            this._listWindow.setHandler("ok", this.onListOk.bind(this)); // 名字改了
            this._listWindow.setHandler("cancel", this.popScene.bind(this));
            this._listWindow.setMapWindow(this._mapWindow);
            this._listWindow.setDescWindow(this._descWindow);
            this.addWindow(this._listWindow);
        }

        // 【新增】确认窗口逻辑
        createConfirmWindow() {
            const rect = this.confirmWindowRect();
            this._confirmWindow = new Window_MapConfirm(rect);
            this._confirmWindow.setHandler("confirm", this.onConfirmExecute.bind(this));
            this._confirmWindow.setHandler("cancel", this.onConfirmCancel.bind(this));
            this._confirmWindow.hide(); // 默认隐藏
            this.addWindow(this._confirmWindow);
        }

        confirmWindowRect() {
            const ww = 240;
            const wh = this.calcWindowHeight(2, true); // 2个选项的高度
            const wx = (Graphics.boxWidth - ww) / 2;
            const wy = (Graphics.boxHeight - wh) / 2;
            return new Rectangle(wx, wy, ww, wh);
        }

        listWindowRect() {
            const ww = 240;
            const wh = Graphics.boxHeight - this.buttonAreaHeight();
            const wx = 0;
            const wy = this.buttonAreaHeight();
            return new Rectangle(wx, wy, ww, wh);
        }

        // 当在列表上点击确定时
        onListOk() {
            const item = this._listWindow.item();
            if (item && item._isUnlocked && item.mapId > 0) {
                // 如果已解锁，不立即传送，而是打开确认窗口
                this._listWindow.deactivate();
                this._confirmWindow.show();
                this._confirmWindow.activate();
                this._confirmWindow.select(0); // 默认选中第一项
            } else {
                SoundManager.playBuzzer();
                this._listWindow.activate();
            }
        }

        // 在确认窗口点击“前往”
        onConfirmExecute() {
            const item = this._listWindow.item();
            this.fadeOutAll();
            $gamePlayer.reserveTransfer(item.mapId, item.mapX, item.mapY);
            SceneManager.goto(Scene_Map);
        }

        // 在确认窗口点击“取消”
        onConfirmCancel() {
            this._confirmWindow.hide();
            this._confirmWindow.deactivate();
            this._listWindow.activate();
        }
    }

    Scene_BigWorldMap.targetMapId = "";
    window.Scene_BigWorldMap = Scene_BigWorldMap;

    //-----------------------------------------------------------------------------
    // Window_MapConfirm (新增: 确认小窗口)
    //-----------------------------------------------------------------------------
    class Window_MapConfirm extends Window_Command {
        makeCommandList() {
            this.addCommand(config.confirmText, "confirm");
            this.addCommand(config.cancelText, "cancel");
        }
    }

    //-----------------------------------------------------------------------------
    // Window_MapLocationList
    //-----------------------------------------------------------------------------
    class Window_MapLocationList extends Window_Command {
        initialize(rect, locationList) {
            this._dataList = locationList || [];
            super.initialize(rect);
        }

        setMapWindow(window) {
            this._myMapWindow = window;
            this.updateTarget();
        }

        setDescWindow(window) {
            this._myDescWindow = window;
            this.updateTarget();
        }

        makeCommandList() {
            this._dataList.forEach((loc) => {
                const sId = loc.switchId;
                const isVisible = (sId === 0 || $gameSwitches.value(sId));

                if (isVisible) {
                    const uId = loc.unlockSwitchId;
                    const switchOk = (uId === 0 || $gameSwitches.value(uId));
                    const hasDestination = (loc.mapId > 0);
                    const isUnlocked = switchOk && hasDestination;
                    
                    const itemData = { ...loc, _isUnlocked: isUnlocked };
                    this.addCommand(loc.name, "location", true, itemData);
                }
            });
        }

        drawItem(index) {
            const item = this._list[index]; 
            const ext = item ? item.ext : null;
            
            if (ext) {
                this.changePaintOpacity(ext._isUnlocked);
            }
            super.drawItem(index);
            this.changePaintOpacity(1);
        }

        select(index) {
            super.select(index);
            this.updateTarget();
        }

        updateTarget() {
            if (!this._list) return;
            const item = this.item();
            
            if (this._myDescWindow) {
                const desc = item ? item.description : "";
                this._myDescWindow.setText(desc);
            }

            if (this._myMapWindow && this._myDescWindow) {
                const hasDesc = item && !!item.description;
                const totalAvailableHeight = Graphics.boxHeight - this._myMapWindow.y;
                const descHeight = this._myDescWindow.height;
                const targetHeight = hasDesc ? (totalAvailableHeight - descHeight) : totalAvailableHeight;

                if (this._myMapWindow.height !== targetHeight) {
                    this._myMapWindow.height = targetHeight;
                    this._myMapWindow.createContents(); 
                }

                if (item) {
                    this._myMapWindow.setTarget(item.x, item.y, item._isUnlocked);
                } else {
                    this._myMapWindow.setTarget(0, 0, false);
                }
            }
        }

        item() {
            if (!this._list) return null;
            return this._list[this.index()] ? this._list[this.index()].ext : null;
        }
    }

    //-----------------------------------------------------------------------------
    // Window_MapDescription
    //-----------------------------------------------------------------------------
    class Window_MapDescription extends Window_Base {
        initialize(rect) {
            super.initialize(rect);
            this._text = "";
            this.visible = false; 
        }

        setText(text) {
            if (this._text !== text) {
                this._text = text;
                this.refresh();
            }
            this.visible = !!text;
        }

        refresh() {
            this.contents.clear();
            if (this._text) {
                this.drawTextEx(this._text, 0, 0);
            }
        }
    }

    //-----------------------------------------------------------------------------
    // Window_MapVisual
    //-----------------------------------------------------------------------------
    class Window_MapVisual extends Window_Base {
        initialize(rect, imageName) {
            this._imageName = imageName;
            super.initialize(rect);
            this._targetX = 0;
            this._targetY = 0;
            this._isTargetUnlocked = false; 
            this.loadMapImage();
        }

        loadMapImage() {
            if (this._imageName) {
                this._mapBitmap = ImageManager.loadPicture(this._imageName);
                this._mapBitmap.addLoadListener(() => this.refresh());
            }
        }

        setTarget(x, y, isUnlocked) {
            this._targetX = x;
            this._targetY = y;
            this._isTargetUnlocked = isUnlocked;
            this.refresh();
        }

        refresh() {
            if (!this.contents) return; 
            this.contents.clear();
            this.drawMap();
            this.drawHighlight();
        }

        drawMap() {
            if (this._mapBitmap && this._mapBitmap.isReady()) {
                const bmp = this._mapBitmap;
                const dw = this.contentsWidth();
                const dh = this.contentsHeight();
                this.contents.blt(bmp, 0, 0, bmp.width, bmp.height, 0, 0, dw, dh);
            }
        }

        drawHighlight() {
            if (this._targetX <= 0 && this._targetY <= 0) return;
            if (!this._mapBitmap || !this._mapBitmap.isReady()) return;

            const bmp = this._mapBitmap;
            const dw = this.contentsWidth();
            const dh = this.contentsHeight();
            
            const scaleX = dw / bmp.width;
            const scaleY = dh / bmp.height;

            const drawX = this._targetX * scaleX;
            const drawY = this._targetY * scaleY;

            const ctx = this.contents.context;
            ctx.save();
            ctx.beginPath();
            ctx.arc(drawX, drawY, 15, 0, Math.PI * 2, false); 
            
            ctx.fillStyle = this._isTargetUnlocked ? config.highlightColor : config.lockedColor;
            
            ctx.globalAlpha = 0.6; 
            ctx.fill();
            
            ctx.lineWidth = 3;
            ctx.strokeStyle = "#FFFFFF";
            ctx.globalAlpha = 1;
            ctx.stroke();
            
            ctx.restore();
        }
    }

    // =========================================================================
    // 菜单全局入口（MenuHub 参数配置用）
    // 供 MenuHub 的 enabledCall / callTarget 调用，如：
    //   enabledType=globalCall, enabledCall=BigWorldMap.available
    //   actionType=globalCall,  callTarget=BigWorldMap.openFromMenu
    // =========================================================================
    window.BigWorldMap = window.BigWorldMap || {};
    window.BigWorldMap.available = function() {
        // 保留原 showInMenu 参数语义：关闭时菜单按钮不可用
        return config.showInMenu && !!getCurrentContextMapId();
    };
    window.BigWorldMap.openFromMenu = function() {
        const contextMapId = getCurrentContextMapId();
        if (contextMapId) {
            Scene_BigWorldMap.targetMapId = contextMapId;
            SceneManager.push(Scene_BigWorldMap);
        }
    };

})();