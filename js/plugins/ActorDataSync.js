/*:
 * @target MZ
 * @plugindesc 旧存档角色数据定制化同步 (排除1号角色图像)
 * @author 脚本助手
 *
 * @help
 * 读档时自动执行以下操作，解决旧存档兼容性问题：
 * 1. 同步角色的脸图、行走图、SV战斗图为数据库最新设置（跳过1号角色的图像）。
 * 2. 如果数据库中更改了角色的初始职业，强制同步为新职业。
 * 3. 根据当前职业和等级，自动查漏补缺，学会所有应该掌握的新技能。
 */

(() => {
    const _DataManager_extractSaveContents = DataManager.extractSaveContents;
    DataManager.extractSaveContents = function(contents) {
        // 先执行系统默认的读档逻辑
        _DataManager_extractSaveContents.call(this, contents);
        
        // 遍历所有已实例化的角色
        if ($gameActors && $gameActors._data) {
            for (let i = 1; i < $gameActors._data.length; i++) {
                const actor = $gameActors._data[i];
                if (actor) {
                    const actorData = actor.actor(); // 获取该角色在数据库的最新静态数据
                    
                    if (actorData) {
                        // ==========================================
                        // 1. 同步图像资源 (增加判断：排除1号角色)
                        // ==========================================
                        if (actor.actorId() !== 1) {
                            actor._faceName = actorData.faceName;
                            actor._faceIndex = actorData.faceIndex;
                            actor._characterName = actorData.characterName;
                            actor._characterIndex = actorData.characterIndex;
                            
                            // 通常 SV 战斗图也是配套的，如果你希望1号角色的SV图也保留旧存档的，就放在这里一起排除。
                            actor._battlerName = actorData.battlerName; 
                        }

                        // ==========================================
                        // 2. 同步职业 (如果数据库里更换了角色的初始职业)
                        // ==========================================
                        // 注：如果你的游戏允许玩家自由转职，请将这段代码删除或注释掉！
                        if (actor._classId !== actorData.classId) {
                            // changeClass(classId, keepExp) -> true 表示保留当前等级和经验
                            actor.changeClass(actorData.classId, true);
                            console.log(`[数据同步] 角色ID:${i} 职业已同步为 ID:${actorData.classId}`);
                        }

                        // ==========================================
                        // 3. 查漏补缺：自动学会新技能
                        // ==========================================
                        const currentClass = actor.currentClass(); // 获取角色当前的职业数据
                        if (currentClass && currentClass.learnings) {
                            currentClass.learnings.forEach(learning => {
                                // 条件：角色当前等级 >= 技能要求等级 且 还没学过该技能
                                if (actor._level >= learning.level && !actor.isLearnedSkill(learning.skillId)) {
                                    actor.learnSkill(learning.skillId);
                                    console.log(`[数据同步] 角色ID:${i} 补学了新技能 ID:${learning.skillId}`);
                                }
                            });
                        }
                        
                        // ==========================================
                        // 4. 刷新角色状态以重新计算数值曲线
                        // ==========================================
                        actor.refresh();
                    }
                }
            }
        }
    };
})();