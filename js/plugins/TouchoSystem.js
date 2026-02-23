/*:
 * @target MZ
 * @plugindesc [自定义] 刀帐系统 v31.0 - 双重置指令版
 * @author Gemini Custom
 *
 * @param HomeMapId
 * @text 初始基地地图ID
 * @desc 游戏开始时的默认基地地图ID。后续可用插件指令修改。
 * @type number
 * @default 1
 *
 * @command SetTouchoLocation
 * @text 1.修改角色所在地(文本)
 * @desc 仅修改菜单中显示的"当前所在: XXX"文本，不影响导航。
 * @arg actorId
 * @text 角色ID
 * @type actor
 * @arg mapId
 * @text 地图ID
 * @type number
 *
 * @command SetTouchoEvent
 * @text 2.修改角色关联事件(导航)
 * @desc 修改该角色导航箭头指向的事件ID。
 * @arg actorId
 * @text 角色ID
 * @type actor
 * @arg eventId
 * @text 目标事件ID
 * @desc 设置为0可禁用该角色的导航。
 * @type number
 *
 * @command SetHomeMap
 * @text 3.修改基地地图(全局)
 * @desc 修改允许使用导航功能的地图ID（例如搬家后）。
 * @arg mapId
 * @text 新基地地图ID
 * @type number
 * * @command ResetAllTouchoEvents
 * @text 4.重置所有角色导航(全局)
 * @desc 将所有角色的导航目标ID重置为数据库备注中填写的默认值。
 *
 * @command ResetAllTouchoLocations
 * @text 5.重置所有角色位置(文本)
 * @desc 将所有角色的"当前所在"显示重置为数据库备注中填写的默认值。
 *
 * @help
 * ============================================================================
 * 【v31.0 更新说明】
 * ============================================================================
 * 1. 新增指令：【重置所有角色位置(文本)】
 * - 使用此指令，可以将所有角色的“当前所在”地图ID，一键恢复为数据库
 * 备注 <TouchoMap:ID> 中填写的初始值。
 *
 * 2. 指令区分：
 * - 【重置所有角色导航】：重置的是箭头指向的 Event ID。
 * - 【重置所有角色位置】：重置的是菜单里显示的 Location 文本。
 *
 * ============================================================================
 * 基础配置回顾：
 * 角色备注：<TouchoMap:ID>   (初始所在地显示)
 * 角色备注：<TouchoEvent:ID> (初始导航事件ID)
 * 角色备注：<TouchoImg:文件名> (立绘)
 * 角色备注：<TouchoOffsetX:数值> (X轴微调)
 * 角色备注：<TouchoOffsetY:数值> (Y轴微调)
 * ============================================================================
 */

(() => {
    const PLUGIN_NAME = "TouchoSystem";
    const PARAM = PluginManager.parameters(PLUGIN_NAME);
    const DEFAULT_HOME_MAP_ID = Number(PARAM['HomeMapId'] || 1);

    // -------------------------------------------------------------------------
    // 0. 全局导航数据管理
    // -------------------------------------------------------------------------
    window.$touchoTargetId = 0; 

    // -------------------------------------------------------------------------
    // 1. 核心数据逻辑 & 插件指令
    // -------------------------------------------------------------------------
    
    // 指令1: 修改显示文本用的位置
    PluginManager.registerCommand(PLUGIN_NAME, "SetTouchoLocation", args => {
        const actor = $gameActors.actor(Number(args.actorId));
        if (actor) actor.setTouchoMapId(Number(args.mapId));
    });

    // 指令2: 修改导航关联的事件ID
    PluginManager.registerCommand(PLUGIN_NAME, "SetTouchoEvent", args => {
        const actor = $gameActors.actor(Number(args.actorId));
        if (actor) {
            actor.setTouchoEventId(Number(args.eventId));
        }
    });

    // 指令3: 修改全局基地地图ID
    PluginManager.registerCommand(PLUGIN_NAME, "SetHomeMap", args => {
        $gameSystem.setTouchoHomeMapId(Number(args.mapId));
    });

    // 指令4: 重置所有角色的【导航事件ID】
    PluginManager.registerCommand(PLUGIN_NAME, "ResetAllTouchoEvents", args => {
        for (let i = 1; i < $dataActors.length; i++) {
            const actor = $gameActors.actor(i);
            if (actor) {
                const defaultEventId = Number(actor.actor().meta.TouchoEvent || 0);
                actor.setTouchoEventId(defaultEventId);
            }
        }
        console.log("[TouchoSystem] All actor navigation targets have been reset.");
    });

    // 指令5: 【新增】重置所有角色的【所在地文本ID】
    PluginManager.registerCommand(PLUGIN_NAME, "ResetAllTouchoLocations", args => {
        for (let i = 1; i < $dataActors.length; i++) {
            const actor = $gameActors.actor(i);
            if (actor) {
                // 读取 <TouchoMap:ID>
                const defaultMapId = Number(actor.actor().meta.TouchoMap || 0);
                actor.setTouchoMapId(defaultMapId);
            }
        }
        console.log("[TouchoSystem] All actor location texts have been reset.");
    });

    const _Game_Map_setup = Game_Map.prototype.setup;
    Game_Map.prototype.setup = function(mapId) {
        _Game_Map_setup.call(this, mapId);
        window.$touchoTargetId = 0;
    };

    const _Game_System_initialize = Game_System.prototype.initialize;
    Game_System.prototype.initialize = function() {
        _Game_System_initialize.call(this);
        this._touchoHomeMapId = DEFAULT_HOME_MAP_ID;
    };

    Game_System.prototype.setTouchoHomeMapId = function(mapId) {
        this._touchoHomeMapId = mapId;
    };

    Game_System.prototype.touchoHomeMapId = function() {
        return (this._touchoHomeMapId !== undefined) ? this._touchoHomeMapId : DEFAULT_HOME_MAP_ID;
    };

    const _Game_Actor_setup = Game_Actor.prototype.setup;
    Game_Actor.prototype.setup = function(actorId) {
        _Game_Actor_setup.call(this, actorId);
        this.initTouchoData();
    };

    Game_Actor.prototype.initTouchoData = function() {
        const metaMap = this.actor().meta.TouchoMap;
        const metaEvent = this.actor().meta.TouchoEvent;
        this._touchoMapId = metaMap ? Number(metaMap) : 0;
        this._touchoEventId = metaEvent ? Number(metaEvent) : 0;
    };

    Game_Actor.prototype.setTouchoMapId = function(mapId) { this._touchoMapId = mapId; };
    Game_Actor.prototype.touchoMapId = function() {
        if (this._touchoMapId === undefined) this.initTouchoData();
        return this._touchoMapId;
    };

    Game_Actor.prototype.setTouchoEventId = function(eventId) { this._touchoEventId = eventId; };
    Game_Actor.prototype.touchoEventId = function() {
        if (this._touchoEventId === undefined) this.initTouchoData();
        return this._touchoEventId;
    };

    // -------------------------------------------------------------------------
    // 2. 菜单入口
    // -------------------------------------------------------------------------
    const _Window_MenuCommand_addOriginalCommands = Window_MenuCommand.prototype.addOriginalCommands;
    Window_MenuCommand.prototype.addOriginalCommands = function() {
        _Window_MenuCommand_addOriginalCommands.call(this);
        this.addCommand("刀帐", "toucho", true);
    };

    const _Scene_Menu_createCommandWindow = Scene_Menu.prototype.createCommandWindow;
    Scene_Menu.prototype.createCommandWindow = function() {
        _Scene_Menu_createCommandWindow.call(this);
        this._commandWindow.setHandler("toucho", () => SceneManager.push(Scene_Toucho));
    };

    // -------------------------------------------------------------------------
    // 3. 场景实现
    // -------------------------------------------------------------------------
    class Scene_Toucho extends Scene_MenuBase {
        create() {
            super.create();
            this.createListWindow();
            this.createStatusWindow();
            this.createActionWindow();
        }

        createListWindow() {
            const rect = this.listWindowRect();
            this._listWindow = new Window_TouchoList(rect);
            this._listWindow.setHandler("cancel", this.popScene.bind(this));
            this._listWindow.setHandler("ok", this.onListOk.bind(this)); 
            this.addWindow(this._listWindow);
        }

        createStatusWindow() {
            const rect = this.statusWindowRect();
            this._statusWindow = new Window_TouchoStatus(rect);
            this.addWindow(this._statusWindow);
            this._listWindow.setStatusWindow(this._statusWindow);
        }

        createActionWindow() {
            const rect = this.actionWindowRect();
            this._actionWindow = new Window_TouchoAction(rect);
            this._actionWindow.setHandler("navigate", this.onActionNavigate.bind(this));
            this._actionWindow.setHandler("cancel", this.onActionCancel.bind(this));
            this.addWindow(this._actionWindow);
        }

        listWindowRect() {
            const wx = 0;
            const wy = this.mainAreaTop();
            const ww = 240;
            const wh = Graphics.boxHeight - wy; 
            return new Rectangle(wx, wy, ww, wh);
        }

        statusWindowRect() {
            const wx = 240;
            const wy = this.mainAreaTop();
            const ww = Graphics.boxWidth - 240;
            const wh = Graphics.boxHeight - wy; 
            return new Rectangle(wx, wy, ww, wh);
        }

        actionWindowRect() {
            const w = 200;
            const h = this.calcWindowHeight(2, true);
            const x = (Graphics.boxWidth - w) / 2;
            const y = (Graphics.boxHeight - h) / 2;
            return new Rectangle(x, y, w, h);
        }

        onListOk() {
            const actor = this._listWindow.item();
            const currentMapId = $gameMap.mapId();
            const homeMapId = $gameSystem.touchoHomeMapId();
            const targetEventId = actor ? actor.touchoEventId() : 0;

            if (currentMapId === homeMapId && targetEventId > 0) {
                this._actionWindow.activate();
                this._actionWindow.open();
                this._actionWindow.select(0);
            } else {
                this._listWindow.activate();
            }
        }

        onActionNavigate() {
            console.log("[TouchoSystem] Action: Navigate triggered.");
            const actor = this._listWindow.item();
            if (!actor) return;

            if ($gameParty.allMembers().includes(actor)) {
                console.log("[TouchoSystem] Actor is already in party.");
                SoundManager.playBuzzer();
                $gameMessage.add("该角色已经在队伍中");
                SceneManager.goto(Scene_Map);
            } else {
                window.$touchoTargetId = actor.touchoEventId();
                console.log("[TouchoSystem] Navigation started. Target Event ID:", window.$touchoTargetId);
                SoundManager.playOk();
                $gameMessage.add("请跟随箭头方向");
                SceneManager.goto(Scene_Map);
            }
        }

        onActionCancel() {
            this._actionWindow.close();
            this._actionWindow.deactivate();
            this._listWindow.activate();
        }
    }

    // -------------------------------------------------------------------------
    // 4. 动作选择窗口
    // -------------------------------------------------------------------------
    class Window_TouchoAction extends Window_Command {
        initialize(rect) {
            super.initialize(rect);
            this.openness = 0;
            this.deactivate();
        }
        makeCommandList() {
            this.addCommand("导航", "navigate");
            this.addCommand("取消", "cancel");
        }
    }

    // -------------------------------------------------------------------------
    // 5. 左侧列表
    // -------------------------------------------------------------------------
    class Window_TouchoList extends Window_Selectable {
        initialize(rect) {
            super.initialize(rect);
            this.makeItemList();
            this.refresh();
            this.select(0);
            this.activate();
        }
        makeItemList() {
            this._data = [];
            if ($dataActors) {
                for (let i = 1; i < $dataActors.length; i++) {
                    const actor = $gameActors.actor(i);
                    if (actor) {
                        const switchId = Number(actor.actor().meta.TouchoSwitch || 0);
                        if (switchId > 0 && $gameSwitches.value(switchId)) {
                            this._data.push(actor);
                        }
                    }
                }
            }
        }
        item() { return this._data[this.index()]; }
        maxItems() { return this._data ? this._data.length : 0; }
        drawItem(index) {
            const actor = this._data[index];
            if (actor) {
                const rect = this.itemLineRect(index);
                this.resetTextColor();
                this.changePaintOpacity(true);
                this.drawText(actor.name() || "---", rect.x, rect.y, rect.width - 10);
            }
        }
        update() {
            super.update();
            if (this._statusWindow) {
                const index = this.index();
                if (index >= 0 && this._data && this._data[index]) {
                    this._statusWindow.setActor(this._data[index]);
                } else {
                    this._statusWindow.setActor(null);
                }
            }
        }
        setStatusWindow(statusWindow) { this._statusWindow = statusWindow; }
    }

    // -------------------------------------------------------------------------
    // 6. 右侧状态窗口
    // -------------------------------------------------------------------------
    class Window_TouchoStatus extends Window_Base {
        initialize(rect) { super.initialize(rect); this._actor = null; }
        setActor(actor) { if (this._actor !== actor) { this._actor = actor; this.refresh(); } }
        
        refresh() {
            this.contents.clear();
            if (!this._actor) return;
            this.resetTextColor();
            console.log("[TouchoSystem] Refreshing status window for:", this._actor.name());
            
            this.drawTouchoPortrait(() => {
                console.log("[TouchoSystem] Portrait ready. Drawing text overlay.");
                this.drawTouchoParameters();
            });
        }

        drawTouchoPortrait(onComplete) {
            const data = this._actor.actor();
            if (!data) {
                if (onComplete) onComplete(); 
                return;
            }

            const imgName = data.meta.TouchoImg;
            if (imgName) {
                const bitmap = ImageManager.loadPicture(imgName);
                bitmap.addLoadListener(() => {
                    const scale = Number(data.meta.TouchoScale || 1.0);
                    const offsetX = Number(data.meta.TouchoOffsetX || 0);
                    const offsetY = Number(data.meta.TouchoOffsetY || 0);

                    const sw = bitmap.width; const sh = bitmap.height;
                    const dw = sw * scale; const dh = sh * scale;
                    
                    let dx = this.innerWidth - dw; 
                    let dy = this.innerHeight - dh; 

                    dx += offsetX;
                    dy += offsetY;

                    this.contents.blt(bitmap, 0, 0, sw, sh, dx, dy, dw, dh);
                    
                    if (onComplete) onComplete();
                });
            } else {
                if (onComplete) onComplete();
            }
        }

        drawTouchoParameters() {
            const actor = this._actor;
            const lineHeight = this.lineHeight();
            const startX = 20; 
            let y = 10; 

            const params = [
                { label: "等级", value: actor.level },
                { label: "当前经验", value: actor.currentExp() },
                { label: "下一级需", value: actor.isMaxLevel() ? "------" : actor.nextRequiredExp() },
                
                { label: "HP", value: `${actor.hp} / ${actor.mhp}` },
                { label: "MP", value: `${actor.mp} / ${actor.mmp}` },
                { label: "CP", value: `${actor.tp} / ${actor.maxTp()}` },

                { label: "攻击", value: actor.atk },
                { label: "防御", value: actor.def },
                { label: "魔法攻击", value: actor.mat },
                { label: "魔法防御", value: actor.mdf },
                { label: "敏捷", value: actor.agi },
                { label: "幸运", value: actor.luk },
            ];

            for (const p of params) {
                this.changeTextColor(ColorManager.systemColor());
                this.drawText(p.label + ":", startX, y, 160);
                this.resetTextColor();
                this.drawText(p.value, startX + 130, y, 160, 'right'); 
                y += lineHeight;
            }

            y += lineHeight * 0.5;
            this.drawTouchoLocation(startX, y);
        }

        drawTouchoLocation(x, y) {
            this.changeTextColor(ColorManager.systemColor());
            this.drawText("当前所在:", x, y, 120);
            this.resetTextColor();

            let locationText = "----";
            if ($gameParty.allMembers().includes(this._actor)) {
                locationText = "已入队";
            } else {
                const mapId = (this._actor.touchoMapId) ? this._actor.touchoMapId() : 0;
                if (mapId > 0 && $dataMapInfos && $dataMapInfos[mapId]) {
                    locationText = $dataMapInfos[mapId].name;
                }
            }
            this.drawText(locationText, x + 110, y, 300);
        }
    }

    // -------------------------------------------------------------------------
    // 7. 地图导航箭头系统
    // -------------------------------------------------------------------------
    const _Spriteset_Map_createUpperLayer = Spriteset_Map.prototype.createUpperLayer;
    Spriteset_Map.prototype.createUpperLayer = function() {
        _Spriteset_Map_createUpperLayer.call(this);
        this.createTouchoGuideArrow();
    };

    Spriteset_Map.prototype.createTouchoGuideArrow = function() {
        this._touchoArrow = new Sprite_TouchoGuideArrow();
        this.addChild(this._touchoArrow);
    };

    class Sprite_TouchoGuideArrow extends Sprite {
        initialize() {
            super.initialize();
            this.anchor.x = 0.5;
            this.anchor.y = 0.5;
            this.z = 9;
            this.createBitmap();
            this.visible = false;
        }

        createBitmap() {
            const w = 48;
            const h = 48;
            this.bitmap = new Bitmap(w, h);
            const ctx = this.bitmap.context;
            ctx.fillStyle = "#FFD700"; 
            ctx.strokeStyle = "#000000"; 
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(w/2, h);      
            ctx.lineTo(w, 0);        
            ctx.lineTo(w/2, h * 0.3); 
            ctx.lineTo(0, 0);        
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }

        update() {
            super.update();
            this.updateVisibility();
            if (this.visible) {
                this.updatePosition();
                this.updateRotation();
                this.updateFloat();
            }
        }

        updateVisibility() {
            const targetId = window.$touchoTargetId;
            const homeMapId = $gameSystem.touchoHomeMapId(); 
            
            if (targetId > 0 && $gameMap.mapId() === homeMapId) {
                const event = $gameMap.event(targetId);
                if (event) {
                    const dist = $gameMap.distance($gamePlayer.x, $gamePlayer.y, event.x, event.y);
                    if (dist < 2) {
                        window.$touchoTargetId = 0; 
                        this.visible = false;
                    } else {
                        this.visible = true;
                    }
                } else {
                    this.visible = false; 
                }
            } else {
                this.visible = false;
            }
        }

        updatePosition() {
            this.x = $gamePlayer.screenX();
            this.y = $gamePlayer.screenY() - 64;
        }

        updateRotation() {
            const targetId = window.$touchoTargetId;
            const event = $gameMap.event(targetId);
            if (!event) return;
            const dx = event.screenX() - $gamePlayer.screenX();
            const dy = event.screenY() - $gamePlayer.screenY();
            const angle = Math.atan2(dy, dx) - Math.PI / 2;
            this.rotation = angle;
        }
        
        updateFloat() {
            const frame = Graphics.frameCount % 60;
            const floatY = Math.sin(frame / 60 * Math.PI * 2) * 5;
            this.y += floatY;
        }
    }

})();