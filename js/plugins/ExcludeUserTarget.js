/*:
 * @target MZ
 * @plugindesc [技能增强] 允许技能目标排除施法者自身
 * @author RMMZ脚本助手
 *
 * @help
 * ============================================================================
 * 使用说明
 * ============================================================================
 * * 在数据库的【技能】或【物品】的备注栏中，添加以下标签之一：
 * * <排除施法者>
 * <Exclude User>
 * * 当该技能的范围设置为“我方全体”时，系统会在结算时自动将施法者本人剔除。
 * 动画、伤害、恢复以及附加状态都不会作用于施法者。
 */

(() => {
    'use strict';

    // 拦截 Game_Action 获取目标的方法
    const _Game_Action_makeTargets = Game_Action.prototype.makeTargets;
    Game_Action.prototype.makeTargets = function() {
        // 获取原本的默认目标列表
        let targets = _Game_Action_makeTargets.call(this);
        
        // 检查当前使用的技能/物品是否带有特定的备注标签
        if (this.item() && (this.item().meta['排除施法者'] || this.item().meta['Exclude User'])) {
            const subject = this.subject(); // 获取施法者
            // 过滤掉施法者，保留其他目标
            targets = targets.filter(target => target !== subject);
        }
        
        return targets;
    };
})();