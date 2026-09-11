/*:
 * @target MZ
 * @plugindesc [立绘自动渐入] 拦截图片1的显示，自动完成透明度渐入动画。公共事件每分支只需1条ShowPicture。
 * @author Codex
 *
 * @param fadeSequence
 * @text 渐入透明度序列
 * @desc ShowPicture(opacity=40)之后依次显示的透明度值，逗号分隔。默认: 80,120,160,200,255
 * @type string
 * @default 80,120,160,200,255
 *
 * @param fadeInterval
 * @text 每步间隔帧数
 * @desc 两次透明度更新之间的等待帧数（1帧≈1/60秒）。默认: 3
 * @type number
 * @default 3
 *
 * @param fadeStartThreshold
 * @text 触发阈值
 * @desc 当图片1的opacity≤此值时，视为"起始帧"并触发自动渐入。默认: 50
 * @type number
 * @default 50
 *
 * @param fadeSwitchId
 * @text 控制开关ID
 * @desc 此开关为ON时才会触发自动渐入，OFF时showPicture行为与原生一致。默认: 40（自动渐入识别）
 * @type number
 * @default 40
 *
 * @help
 * ============================================================================
 * 【立绘自动渐入系统 v2.1】
 * ============================================================================
 *
 * ■ 工作原理
 *   插件拦截 $gameScreen.showPicture(1, ...) 调用。
 *   当"控制开关"为ON且图片1的 opacity ≤ 触发阈值时，
 *   自动在后续帧中按序列补全渐变。
 *
 * ■ 开关控制
 *   关联开关默认40号「自动渐入识别」。
 *   - ON：自动渐入生效（公共事件中的立绘显示自动补全渐变）
 *   - OFF：showPicture 行为与原生一致，不做任何干预
 *   建议在需要自动渐入的场景前将开关置ON，不需要时置OFF。
 *
 * ■ 公共事件使用（以加州清光为例）
 *   ◆注释：85-加州清光
 *   ◆条件分歧：变量1 == 85
 *     ◆显示图片：#1, 打刀/加州清光/Kashuu-1, 左上(0,0),
 *       (200,32), 宽度80%, 高度80%, 不透明度40, 普通
 *   ◆
 *   ：结束
 *
 *   仅此一条ShowPicture，剩余80→120→160→200→255由插件自动完成。
 *
 * ■ 参数说明
 *   - fadeSequence: 渐入序列。如果起始opacity不是40，确保序列值均大于起始值。
 *   - fadeInterval: 每步等待帧数。值越大渐入越慢。
 *   - fadeStartThreshold: 低于此值的opacity被识别为"起始帧"。
 *   - fadeSwitchId: 控制自动渐入开关的ID，默认40号「自动渐入识别」。
 * ============================================================================
 */

(() => {
    "use strict";

    const PARAMS = PluginManager.parameters("PortraitManager");

    // =====================================================================
    // 0. 参数解析
    // =====================================================================

    const FADE_SEQUENCE = (PARAMS["fadeSequence"] || "80,120,160,200,255")
        .split(",").map(Number).filter(n => !isNaN(n));

    const FADE_INTERVAL = Math.max(1, Number(PARAMS["fadeInterval"] || 3));

    const FADE_START_THRESHOLD = Number(PARAMS["fadeStartThreshold"] || 50);

    /** 控制自动渐入的开关ID，默认40号「自动渐入识别」 */
    const FADE_SWITCH_ID = Number(PARAMS["fadeSwitchId"] || 40);

    // =====================================================================
    // 1. 渐入状态机
    // =====================================================================

    const FadeState = {
        active: false,
        step: 0,
        timer: 0,
        cache: null,

        /**
         * 尝试触发自动渐入。由 showPicture 钩子调用。
         */
        tryStart(pictureId, name, origin, x, y, scaleX, scaleY, opacity, blendMode) {
            // 只处理图片1，且文件名有效
            if (pictureId !== 1 || !name) return;
            // 开关OFF时不做任何干预
            if (!$gameSwitches.value(FADE_SWITCH_ID)) return;
            // opacity高于阈值时不触发
            if (opacity > FADE_START_THRESHOLD) return;

            // 已有渐入进行中则重置
            this.active = true;
            this.step = 0;
            this.timer = 0;
            this.cache = { name, origin, x, y, scaleX, scaleY, blendMode };
        },

        /**
         * 每帧更新。由 Scene_Map.update 钩子驱动。
         */
        update() {
            if (!this.active) return;

            this.timer++;
            if (this.timer >= FADE_INTERVAL) {
                this.timer = 0;

                if (this.step < FADE_SEQUENCE.length) {
                    const c = this.cache;
                    const opacity = FADE_SEQUENCE[this.step];
                    // 调用原生 showPicture，绕过钩子避免递归
                    Game_Screen.prototype.showPicture.call(
                        $gameScreen,
                        1, c.name, c.origin, c.x, c.y,
                        c.scaleX, c.scaleY, opacity, c.blendMode
                    );
                    this.step++;
                } else {
                    this.active = false;
                    this.cache = null;
                }
            }
        },

        /** 强制停止渐入 */
        stop() {
            this.active = false;
            this.cache = null;
        },
    };

    // =====================================================================
    // 2. 钩子：拦截 showPicture
    // =====================================================================

    const _Game_Screen_showPicture = Game_Screen.prototype.showPicture;
    Game_Screen.prototype.showPicture = function(
        pictureId, name, origin, x, y, scaleX, scaleY, opacity, blendMode
    ) {
        _Game_Screen_showPicture.call(
            this, pictureId, name, origin, x, y, scaleX, scaleY, opacity, blendMode
        );
        FadeState.tryStart(pictureId, name, origin, x, y, scaleX, scaleY, opacity, blendMode);
    };

    // =====================================================================
    // 3. 钩子：Scene_Map 每帧推进渐入
    // =====================================================================

    const _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        _Scene_Map_update.call(this);
        FadeState.update();
    };

    // =====================================================================
    // 4. 全局暴露
    // =====================================================================

    window.PortraitFade = {
        stop: () => FadeState.stop(),
        isActive: () => FadeState.active,
        getSequence: () => FADE_SEQUENCE.slice(),
        getInterval: () => FADE_INTERVAL,
        getSwitchId: () => FADE_SWITCH_ID,
    };

})();