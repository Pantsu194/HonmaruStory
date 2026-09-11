/*:
 * @target MZ
 * @plugindesc [V7.1] 队伍扩展系统 - 稳定修复版。修复了进入战斗时偶发的 createLinearGradient 报错。
 * @author AI Assistant
 *
 * @param MaxBattleMembers
 * @text 最大参战人数
 * @type number
 * @min 1
 * @default 6
 * @desc 实际进入战斗的角色数量。
 *
 * @param MaxFollowers
 * @text 地图最大跟随人数
 * @type number
 * @min 1
 * @default 6
 * @desc 地图上显示的小尾巴数量。
 *
 * @param InactiveOpacity
 * @text 非行动角色透明度
 * @type number
 * @min 0
 * @max 255
 * @default 120
 * @desc 轮到某人行动时，其他队员的透明度。
 *
 * @param TouchSensitivity
 * @text 触屏滑动灵敏度
 * @type number
 * @min 10
 * @default 48
 * @desc 手指滑动多少像素触发一次滚动？数值越小越灵敏。
 *
 * @help
 * ============================================================================
 * [V7.1] 稳定修复版 - 更新说明
 * ============================================================================
 *
 * 修复了 V7.0 版本中的一个严重 Bug：
 * 报错：Failed to execute 'createLinearGradient' ... value is non-finite
 * 原因：在战斗开始瞬间，窗口尺寸尚未初始化完成时，计算坐标产生了无效值(NaN)。
 *
 * 本版本加入了“安全数值检查”，确保无论在什么加载阶段，都不会因为坐标计算错误
 * 而导致游戏崩溃。
 *
 * 功能与 V7.0 完全一致：
 * 1. 横向 4 列布局 + 左右滑动。
 * 2. 支持 触屏/鼠标拖拽 滑动。
 * 3. 非当前行动角色半透明。
 *
 * ============================================================================
 */

(() => {
    'use strict';

    const pluginName = "AdvancedPartySystem";
    const parameters = PluginManager.parameters(pluginName);
    const MAX_BATTLE_MEMBERS = Number(parameters['MaxBattleMembers'] || 6);
    const MAX_FOLLOWERS = Number(parameters['MaxFollowers'] || 6);
    const INACTIVE_OPACITY = Number(parameters['InactiveOpacity'] || 120);
    const TOUCH_SENSITIVITY = Number(parameters['TouchSensitivity'] || 48);
    
    const VISIBLE_COLS = 4;

    // =========================================================================
    // 1. 队伍与跟随者扩展
    // =========================================================================

    Game_Party.prototype.maxBattleMembers = function() {
        return MAX_BATTLE_MEMBERS;
    };

    const _Game_Followers_initialize = Game_Followers.prototype.initialize;
    Game_Followers.prototype.initialize = function() {
        _Game_Followers_initialize.call(this);
        if (this._data.length < MAX_FOLLOWERS) {
            for (let i = this._data.length; i < MAX_FOLLOWERS; i++) {
                this._data.push(new Game_Follower(i + 1));
            }
        }
    };

    // =========================================================================
    // 2. 战斗状态窗口 - 初始化与安全计算
    // =========================================================================

    const _Window_BattleStatus_initialize = Window_BattleStatus.prototype.initialize;
    Window_BattleStatus.prototype.initialize = function(rect) {
        _Window_BattleStatus_initialize.call(this, rect);
        this._scrollIndex = 0;
        this._touchLastX = 0;
        this._touchAcc = 0;
        this._isTouchScrolling = false;
    };

    Window_BattleStatus.prototype.maxCols = function() {
        return this.maxItems() > 0 ? this.maxItems() : 1; 
    };

    // 【安全修复】增加数值检查，防止 NaN
    Window_BattleStatus.prototype.itemWidth = function() {
        const innerWidth = this.innerWidth;
        // 如果窗口还没准备好(宽度无效)，直接返回0，防止计算出错
        if (!innerWidth || isNaN(innerWidth)) return 0;
        return Math.floor(innerWidth / VISIBLE_COLS);
    };

    Window_BattleStatus.prototype.maxRows = function() {
        return 1;
    };

    // 【安全修复】重写 itemRect，杜绝 non-finite 错误
    Window_BattleStatus.prototype.itemRect = function(index) {
        let itemWidth = this.itemWidth();
        let itemHeight = this.itemHeight();
        
        // 强制修正无效数值
        if (isNaN(itemWidth)) itemWidth = 0;
        if (isNaN(itemHeight)) itemHeight = 0;

        const colSpacing = this.colSpacing() || 0;
        // 确保 scrollIndex 存在
        const safeScrollIndex = this._scrollIndex || 0;

        const visualIndex = index - safeScrollIndex;
        const x = visualIndex * itemWidth + colSpacing / 2;
        const y = 0;
        let width = itemWidth - colSpacing;
        const height = itemHeight;

        // 防止负数宽度导致渲染错误
        if (width < 0) width = 0;

        // 最终返回安全的矩形
        return new Rectangle(x, y, width, height);
    };

    Window_BattleStatus.prototype.drawItem = function(index) {
        const actor = this.actor(index);
        const isInputPhase = BattleManager.isInputting();
        const currentActor = BattleManager.actor();
        
        if (isInputPhase && currentActor) {
            if (actor === currentActor) {
                this.contents.paintOpacity = 255; 
            } else {
                this.contents.paintOpacity = INACTIVE_OPACITY; 
            }
        } else {
            this.contents.paintOpacity = 255; 
        }

        this.drawItemImage(index);
        this.drawItemStatus(index);
        this.contents.paintOpacity = 255;
    };

    // =========================================================================
    // 3. 滚动与触控逻辑
    // =========================================================================

    Window_BattleStatus.prototype.scrollTo = function(index) {
        const maxScroll = Math.max(0, this.maxItems() - VISIBLE_COLS);
        const target = Math.max(0, Math.min(index, maxScroll));
        if (this._scrollIndex !== target) {
            this._scrollIndex = target;
            this.refresh();
            return true;
        }
        return false;
    };

    const _Window_BattleStatus_select = Window_BattleStatus.prototype.select;
    Window_BattleStatus.prototype.select = function(index) {
        _Window_BattleStatus_select.call(this, index);
        if (index >= 0) {
            if (index >= this._scrollIndex + VISIBLE_COLS) {
                this.scrollTo(index - VISIBLE_COLS + 1);
            } else if (index < this._scrollIndex) {
                this.scrollTo(index);
            }
        }
    };

    Window_BattleStatus.prototype.processTouch = function() {
        if (this.processTouchScroll()) {
            return;
        }
        Window_Selectable.prototype.processTouch.call(this);
    };

    Window_BattleStatus.prototype.processTouchScroll = function() {
        if (!this.isTouchedInsideFrame()) {
            this._isTouchScrolling = false;
            return false;
        }
        if (TouchInput.isTriggered()) {
            this._touchLastX = TouchInput.x;
            this._touchAcc = 0;
            this._isTouchScrolling = false;
            return false;
        }
        if (TouchInput.isPressed()) {
            const delta = TouchInput.x - this._touchLastX;
            this._touchLastX = TouchInput.x;
            this._touchAcc += delta;

            if (Math.abs(this._touchAcc) >= TOUCH_SENSITIVITY) {
                const direction = this._touchAcc > 0 ? -1 : 1; 
                if (this.scrollTo(this._scrollIndex + direction)) {
                    SoundManager.playCursor(); 
                    this._touchAcc = 0; 
                    this._isTouchScrolling = true; 
                    return true; 
                }
            }
            if (this._isTouchScrolling) {
                return true;
            }
        }
        if (TouchInput.isReleased()) {
            const wasScrolling = this._isTouchScrolling;
            this._isTouchScrolling = false;
            this._touchAcc = 0;
            return wasScrolling;
        }
        return false;
    };

    // =========================================================================
    // 4. 场景交互
    // =========================================================================

    const _Scene_Battle_update = Scene_Battle.prototype.update;
    Scene_Battle.prototype.update = function() {
        _Scene_Battle_update.call(this);
        this.updateStatusScrollHorizontal();
    };

    Scene_Battle.prototype.updateStatusScrollHorizontal = function() {
        if (this._statusWindow && this._actorCommandWindow.active) {
            if (Input.isRepeated('right')) {
                if (this._statusWindow.scrollTo(this._statusWindow._scrollIndex + 1)) {
                    SoundManager.playCursor();
                }
            }
            if (Input.isRepeated('left')) {
                if (this._statusWindow.scrollTo(this._statusWindow._scrollIndex - 1)) {
                    SoundManager.playCursor();
                }
            }
        }
    };

    const _Scene_Battle_changeInputWindow = Scene_Battle.prototype.changeInputWindow;
    Scene_Battle.prototype.changeInputWindow = function() {
        _Scene_Battle_changeInputWindow.call(this);
        if (BattleManager.isInputting() && BattleManager.actor()) {
            const actorIndex = BattleManager.actor().index();
            if (this._statusWindow) {
                this._statusWindow.select(actorIndex);
                this._statusWindow.refresh();
            }
        }
    };

    // =========================================================================
    // 5. 侧视战斗站位 (保持不变)
    // =========================================================================
    
    const _Sprite_Actor_setActorHome = Sprite_Actor.prototype.setActorHome;
    Sprite_Actor.prototype.setActorHome = function(index) {
        if ($gameSystem.isSideView()) {
            const startX = 600;
            const startY = 220; 
            const screenH = Graphics.boxHeight;
            const bottomUIHeight = 200;
            const availableHeight = screenH - startY - bottomUIHeight; 
            
            let stepY = 48;
            if (MAX_BATTLE_MEMBERS > 4) {
                stepY = availableHeight / (MAX_BATTLE_MEMBERS);
                if (stepY < 32) stepY = 32; 
            }
            const stepX = 32;

            const x = startX + index * stepX;
            const y = startY + index * stepY;

            this.setHome(x, y);
        } else {
            _Sprite_Actor_setActorHome.call(this, index);
        }
    };

})();