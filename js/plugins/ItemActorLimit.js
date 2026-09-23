/*:
 * @target MZ
 * @plugindesc [v2.1.0] [物品使用限制] 用物品备注标签指定「不可对某角色使用」（如强化素材1不可对审神者使用）
 * @author 鲸鱼娘 for 野生本丸物语
 *
 * @help
 * ============================================================================
 * ItemActorLimit v2.0.0 —— 「物品 × 角色」使用限制（备注标签版）
 * ============================================================================
 *
 * 【为什么需要它】
 * 原版 MZ 只能做到：
 *   - Items.json 的 occasion  （0=随时 / 1=仅战斗 / 2=仅菜单 / 3=不可使用）
 *   - Items.json 的 scope     （0=无 / 1=单个敌人 / 7=单个队友 / 8=全队友 …）
 * 这两项都是「全场生效」，无法表达「对审神者不能用、对刀男可以用」。
 * 本插件补上「物品 × 目标角色」这一维度。
 *
 * 【唯一的配置方式：备注标签】
 * 在数据库「物品 / 技能 / 武器 / 防具」的备注栏直接写标签即可，无需改插件参数。
 *
 *   <NoUseActor: 1>          禁止对 1 号角色使用（1 = 审神者，黑名单）
 *   <NoUseActor: 1,4,7>      禁止对 1、4、7 号角色使用
 *   <OnlyUseActor: 5,7>      只允许对 5、7 号角色使用（白名单，优先级高于黑名单）
 *
 * 要点：
 *   - 角色 ID 就是数据库「角色」页签的编号（1 = 审神者），逗号分隔，中英文逗号都认。
 *   - 标签可写在备注的任何位置，可与其他备注共存。
 *   - 两个标签同时存在时，白名单 OnlyUseActor 优先。
 *   - 参数留空或写错不生效，不会报错。
 *
 * 【示例：强化素材 1（物品 41）不可对审神者使用】
 *   数据库 → 物品 → 41 强化素材1 → 备注栏填写：
 *       <NoUseActor: 1>
 *
 * 【生效表现】
 *   - 物品列表中：队伍里没有任何人能用它时，该物品显示为灰色（不可选）。
 *   - 队友选择窗口中：确认被禁止的角色会播放拒绝音效（蜂鸣），且不会消耗物品。
 *   - 即使通过别名/事件强行指定，也不会对禁用角色产生效果（itemTargetActors 层拦截）。
 *
 * 【已知限制（主人已裁定保持现状，请勿再修改）】
 *   选人窗口里被禁止的角色【不会变灰】，光标也【不会自动跳过】。默认光标停在审神者
 *   时按确定，会响一声拒绝音效并停在原地——主人认为这个反馈已经够用。
 *
 *   原因（已查证，非猜测）：
 *     1. MZ 的 Window_MenuStatus.prototype.drawItem（rmmz_windows.js:1976）只调用
 *        drawPendingItemBackground / drawItemImage / drawItemStatus，全程不调用
 *        changePaintOpacity，所以 isEnabled 返回 false 不会带来任何视觉变化。
 *     2. isCurrentItemEnabled（rmmz_windows.js:2016）只在编队模式下起作用，
 *        非编队一律返回 true。
 *     3. 因此「变灰 + 光标跳过」必须重写绘制层与光标层，属侵入性改动。
 *
 *   已尝试并已回滚的方案（v2.1.0）：重写 Window_MenuActor.prototype.drawItem，
 *   用 changePaintOpacity(false) 包住绘制，并配合 paint() 触发重绘。
 *   实测在主人环境中仍未产生可见变化，故整体撤除。
 *
 * 【不影响的场景】
 *   - 不改动 occasion / scope / consumable 等原版字段，原版限制照常生效。
 *   - 仅拦截「对队友使用」，scope=8（全体队友）的物品仍然会作用于全队（不剔除个别成员）。
 *   - 插件关闭（status=false）即完全恢复原版行为，无残留。
 *
 * @param Debug
 * @text 调试输出
 * @type boolean
 * @default false
 */

(() => {
    'use strict';

    const pluginName = 'ItemActorLimit';
    const parameters = PluginManager.parameters(pluginName);

    const Debug = parameters['Debug'] === 'true';

    function log(...args) {
        if (Debug) console.log('[' + pluginName + ']', ...args);
    }

    // ------------------------------------------------------------------
    // 备注标签解析
    // ------------------------------------------------------------------

    /** 黑名单：<NoUseActor: 1,4> */
    const RE_NO_USE = /<NoUseActors?\s*:\s*([0-9，,\s]*)>/i;

    /** 白名单：<OnlyUseActor: 5,7> */
    const RE_ONLY_USE = /<OnlyUseActors?\s*:\s*([0-9，,\s]*)>/i;

    /** 把 "1,4,7" / "1，4" 解析成 [1,4,7]，非法片段自动丢弃 */
    function parseIdList(text) {
        return String(text || '')
            .split(/[\s,，]+/)
            .map(s => parseInt(s, 10))
            .filter(n => Number.isInteger(n) && n > 0);
    }

    /** 从物品备注中取出最终生效的限制（白名单优先） */
    function restrictionFor(item) {
        if (!item) return null;
        const note = String(item.note || '');
        if (!note) return null;
        const mOnly = note.match(RE_ONLY_USE);
        if (mOnly) return { deny: [], allow: parseIdList(mOnly[1]) };
        const mNo = note.match(RE_NO_USE);
        if (mNo) return { deny: parseIdList(mNo[1]), allow: [] };
        return null;
    }

    /** 该限制是否真的会拦住人（没配任何名单 = 不拦） */
    function isRestrictive(res) {
        return !!res && (res.deny.length > 0 || res.allow.length > 0);
    }

    /** 判定某物品是否允许对某角色使用 */
    function isAllowedFor(item, actor) {
        if (!item || !actor) return false;
        if (!actor.canUse(item)) return false;
        const res = restrictionFor(item);
        if (!isRestrictive(res)) return true;
        const id = actor.actorId();
        if (res.deny.indexOf(id) >= 0) return false;
        if (res.allow.length > 0 && res.allow.indexOf(id) < 0) return false;
        return true;
    }

    /** 取当前道具/技能场景正在查看的物品（非物品场景返回 null） */
    function sceneItem(win) {
        try {
            const scene = SceneManager._scene;
            if (!scene || typeof scene.item !== 'function') return null;
            if (win && scene._itemWindow && scene._itemWindow !== win && win instanceof Window_ItemList) return null;
            return scene.item() || null;
        } catch (e) {
            return null;
        }
    }

    /** 队伍里是否至少有一个人能用它 */
    function isUsableByAnyMember(item) {
        const members = $gameParty.members();
        for (let i = 0; i < members.length; i++) {
            if (isAllowedFor(item, members[i])) return true;
        }
        return false;
    }

    // ------------------------------------------------------------------
    // 结果缓存：以「队伍成员组合 + 物品 ID」为键，换人后自动失效
    // ------------------------------------------------------------------

    const memo = new Map();

    function memoKey(item) {
        const ids = $gameParty.members().map(a => a.actorId()).join(',');
        return ids + '|' + item.id;
    }

    function usableByAnyMember(item) {
        const key = memoKey(item);
        if (memo.has(key)) return memo.get(key);
        const result = isUsableByAnyMember(item);
        if (memo.size > 128) memo.clear();
        memo.set(key, result);
        return result;
    }

    // ------------------------------------------------------------------
    // Hook 1：物品列表 —— 队伍里没人能用就变灰
    // ------------------------------------------------------------------

    const _Window_ItemList_isEnabled = Window_ItemList.prototype.isEnabled;
    Window_ItemList.prototype.isEnabled = function(item) {
        if (!_Window_ItemList_isEnabled.call(this, item)) return false;
        if (!item) return true;
        return usableByAnyMember(item);
    };

    // ------------------------------------------------------------------
    // Hook 2：队友选择窗口 —— 被禁止的角色确认时播放拒绝音效（不变灰、不跳光标）
    // 注意：这里只拦「确认」，不做任何绘制。原因见插件头部【已知限制】。
    // ------------------------------------------------------------------

    const _Window_MenuActor_isEnabled = Window_MenuActor.prototype.isEnabled;
    Window_MenuActor.prototype.isEnabled = function(index) {
        if (!_Window_MenuActor_isEnabled.call(this, index)) return false;
        const actor = this.actor ? this.actor(index) : $gameParty.members()[index];
        if (!actor) return true;
        const item = sceneItem(this);
        if (!item) return true;
        return isAllowedFor(item, actor);
    };

    // ------------------------------------------------------------------
    // Hook 3：判定层兜底 —— 强行指定禁用角色也不生效
    // ------------------------------------------------------------------

    const _Scene_ItemBase_itemTargetActors = Scene_ItemBase.prototype.itemTargetActors;
    Scene_ItemBase.prototype.itemTargetActors = function() {
        const actors = _Scene_ItemBase_itemTargetActors.call(this);
        const item = this.item();
        if (!item || !isRestrictive(restrictionFor(item))) return actors;
        const action = new Game_Action(this.user());
        action.setItemObject(item);
        if (action.isForAll()) return actors; // 全体目标不剔除个别成员
        return actors.filter(actor => isAllowedFor(item, actor));
    };

    // ------------------------------------------------------------------
    // Hook 4：增减物品时清缓存
    // ------------------------------------------------------------------

    const _Game_Party_gainItem = Game_Party.prototype.gainItem;
    Game_Party.prototype.gainItem = function(item, amount, includeEquip) {
        memo.clear();
        return _Game_Party_gainItem.apply(this, arguments);
    };

    const _Game_Party_loseItem = Game_Party.prototype.loseItem;
    Game_Party.prototype.loseItem = function(item, amount, includeEquip) {
        memo.clear();
        return _Game_Party_loseItem.apply(this, arguments);
    };

    log('插件已加载（仅备注标签配置）');
})();