// 简易护盾系统 for RPG Maker MZ
// 版本：1.9.0 - 核心稳定版 (移除了状态描述显示功能)
// 作者：AI Assistant

/*:
 * @target MZ
 * @plugindesc 允许技能和状态为角色提供可吸收伤害的护盾。已移除状态描述中显示护盾值的功能，以提高稳定性。
 * @author AI Assistant
 *
 * @param MaxShieldValue
 * @type number
 * @min 0
 * @default 9999
 * @text 护盾值上限
 * @desc 角色获得的护盾值的最大上限。设置为 0 表示无上限。
 *
 * @help
 * * --- 插件功能 ---
 *
 * 1. 创建护盾：
 * 在数据库的“状态”选项卡中，在你希望施加护盾的状态的备注栏中，
 * 添加以下标签：
 *
 * <Shield Formula: FORMULA>
 *
 * 2. 状态描述信息中显示护盾值：
 * 此功能已移除，以避免多角色显示错误。请使用其他插件或自定义脚本来显示护盾值。
 *
 * 3. 公式中可用的变量：
 * user: 施加者 (Game_Battler)
 * target: 目标 (Game_Battler)
 * a: user 的别名
 * b: target 的别名
 * v: 游戏变量函数，例如 v(1) 是游戏变量 1 的值。
 *
 */

(function() {
    'use strict';
    
    // 获取插件参数
    const pluginName = "SimpleShields";
    const parameters = PluginManager.parameters(pluginName);
    const maxShieldValue = Number(parameters['MaxShieldValue'] || 9999);
    
    // =========================================================================
    // 1. 数据管理器：解析备注标签 (核心)
    // =========================================================================
    
    const _DataManager_isDatabaseLoaded = DataManager.isDatabaseLoaded;
    DataManager.isDatabaseLoaded = function() {
        if (!_DataManager_isDatabaseLoaded.call(this)) return false;
        
        if (!this._shieldNotetagsProcessed) {
            this.processShieldNotetags();
            this._shieldNotetagsProcessed = true;
        }
        
        return true;
    };

    DataManager.processShieldNotetags = function() {
        const regex = /<Shield Formula: (.*)>/i;
        if ($dataStates) {
            for (const state of $dataStates) {
                if (state) {
                    const match = state.note.match(regex);
                    if (match) {
                        state.shieldFormula = match[1].trim();
                        console.log(`[SimpleShields] 状态 ${state.name} (ID:${state.id}) 的护盾公式已解析: ${state.shieldFormula}`);
                    }
                }
            }
        }
    };

    // =========================================================================
    // 2. 游戏单位 (Game_Battler)：管理护盾值 (核心)
    // =========================================================================
    
    const _Game_Battler_initMembers = Game_Battler.prototype.initMembers;
    Game_Battler.prototype.initMembers = function() {
        _Game_Battler_initMembers.call(this);
        this._shieldValue = 0;
    };

    const _Game_Battler_onBattleEnd = Game_Battler.prototype.onBattleEnd;
    Game_Battler.prototype.onBattleEnd = function() {
        _Game_Battler_onBattleEnd.call(this);
        this.clearShield();
    };

    Game_Battler.prototype.shieldValue = function() {
        return this._shieldValue || 0;
    };
    
    /**
     * 【已移除】Game_Battler.prototype.shieldValueText - 不再用于状态描述
     */

    Game_Battler.prototype.setShieldValue = function(value) {
        let finalValue = Math.max(0, Math.floor(value));
        
        if (maxShieldValue > 0) {
            finalValue = Math.min(finalValue, maxShieldValue);
        }
        
        if (finalValue !== this._shieldValue) {
            this._shieldValue = finalValue;
            this.refresh();
        }
    };

    Game_Battler.prototype.addShield = function(value) {
        this.setShieldValue(this.shieldValue() + value);
    };
    
    Game_Battler.prototype.clearShield = function() {
        this.setShieldValue(0);
    };

    // 核心修改：伤害吸收 (核心)
    const _Game_Battler_gainHp = Game_Battler.prototype.gainHp;
    Game_Battler.prototype.gainHp = function(value) {
        let remainingValue = value; 

        if (value < 0 && this.shieldValue() > 0) {
            const damage = -value; 
            const currentShield = this.shieldValue();
            
            const damageToShield = Math.min(currentShield, damage);
            const remainingDamage = damage - damageToShield;

            this.setShieldValue(currentShield - damageToShield);
            
            remainingValue = -remainingDamage;
            
            console.log(`[SimpleShields DMG ABSORB] 吸收伤害: ${damageToShield}. 剩余伤害: ${remainingDamage}. 剩余护盾: ${this.shieldValue()}`);
        }
        
        _Game_Battler_gainHp.call(this, remainingValue);
    };

    // =========================================================================
    // 3. 游戏动作 (Game_Action)：应用护盾 (核心)
    // =========================================================================
    
    const _Game_Action_itemEffectAddState = Game_Action.prototype.itemEffectAddState;
    Game_Action.prototype.itemEffectAddState = function(target, effect) {
        const stateWasAffected = target.isStateAffected(effect.dataId);
        
        _Game_Action_itemEffectAddState.call(this, target, effect);
        
        if (target.result().isStateAdded(effect.dataId) || stateWasAffected) {
            const state = $dataStates[effect.dataId];
            
            if (state && state.shieldFormula) {
                const user = this.subject();
                let shieldValue = 0;
                
                // 变量 vFunc 用于访问游戏变量
                const vFunc = $gameVariables.value.bind($gameVariables);
                // 使用 Function 动态执行公式，可访问 user, target, a, b, v
                const formulaFunction = new Function('user', 'target', 'a', 'b', 'v', 'return ' + state.shieldFormula);
                
                try {
                    const rawValue = formulaFunction(user, target, user, target, vFunc);
                    shieldValue = Math.floor(rawValue);
                } catch (e) {
                    console.error("SimpleShields 插件公式错误 (状态ID: " + state.id + "):", e);
                    shieldValue = 0;
                }
                
                if (shieldValue > 0) {
                    target.addShield(shieldValue); 
                    console.log(`[SimpleShields SUCCESS] 护盾已施加: ${target.name()} 获得 ${shieldValue} 护盾 (当前总护盾: ${target.shieldValue()})`);
                } 
            }
        }
    };
    
    // =========================================================================
    // 4. 【已移除】窗口绘制代码，不再支持 \SHIELD 控制字符或 Window_StatusBase 绘制
    // =========================================================================
    
})();