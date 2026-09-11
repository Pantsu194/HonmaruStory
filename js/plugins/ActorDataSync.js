/*:
 * @target MZ
 * @plugindesc 旧存档角色数据定制化同步 (排除1号角色图像)
 * @author 脚本助手
 * @param weaponSyncMode
 * @text 本体武器同步模式
 * @desc 读档时将刀剑男子的本体武器同步为数据库初始装备（仅武器槽，1号审神者不处理）。force=始终覆盖武器槽；empty=仅当武器槽为空时补发。
 * @type select
 * @option 始终覆盖(force)
 * @value force
 * @option 仅空槽补发(empty)
 * @value empty
 * @default force
 * @param syncSkillRemoval
 * @text 技能同步-移除过时技能
 * @desc 读档时若角色已学会的技能，其条目在当前职业学习表中已不存在（数据库里删掉了该学习条目），则从角色身上移除该技能。true=启用移除；false=只补学、不删除。
 * @type boolean
 * @default true
 * @param protectedSkillsByClass
 * @text 职业保护技能表(旧式)
 * @desc 【推荐改用职业备注标签 <SyncProtectSkill: 172,173>，见下方帮助】此参数保留仅作兼容备选，与职业备注同时配置时会合并。格式：职业ID:技能ID,技能ID2;职业ID2:技能ID3。留空=仅使用职业备注标签。
 * @type string
 * @default 
 * @param showSyncNotice
 * @text 读档后显示同步提示
 * @desc 读档时若实际执行了存档同步（图像/职业/技能/本体武器任一发生变更），加载完成后弹出对话框提示玩家。true=显示；false=不显示。
 * @type boolean
 * @default true
 * @param syncNoticeText
 * @text 同步提示文本
 * @desc 同步完成后弹出的对话框文本，可包含 \\c[6] 等消息控制码。
 * @type string
 * @default 进行了存档更新
 *
 * @help
 * 读档时自动执行以下操作，解决旧存档兼容性问题：
 * 1. 同步角色的脸图、行走图、SV战斗图为数据库最新设置（跳过1号角色的图像）。
 * 2. 如果数据库中更改了角色的初始职业，强制同步为新职业。
 * 3. 双向校准职业技能：补学所有“按当前等级应当学会但还没学”的新技能；
 *    同时移除“已学会、但其学习条目已从当前职业学习表中删除”的过时技能
 *    （可用 syncSkillRemoval 参数整体开关）。
 * 4. 将刀剑男子的本体武器同步为数据库初始装备（默认始终覆盖武器槽，可用 weaponSyncMode 参数改为仅空槽补发）。
 * 5. 若本次读档实际执行了上述任一同步，加载完成后弹出对话框提示“进行了存档更新”
 *    （可通过 showSyncNotice / syncNoticeText 参数开关与改文案）。
 *
 * 【移除技能的边界说明】
 * - 仅当某技能的“学习条目”从职业学习表（learnings）中被整个删除时，读档才会回收它。
 * - 只调整学习等级（条目仍在）不会触发移除，避免误伤正常成长中的角色。
 * - 通过事件/脚本等方式直接学会、且不在职业学习表里的技能（例如演练场事件授予的技能），
 *   默认也会被回收。需要保留某职业的这类技能时，请为该职业配置“职业保护技能”：
 *
 * 【职业保护技能 - 推荐配置方式（职业备注标签）】
 * 打开 RPG Maker 编辑器的数据库 → 职业，选中要保护技能的职业，在右侧「备注」栏写入：
 *   <SyncProtectSkill: 172,173>
 * 表示：该职业的角色即使已学会 172/173，且这两个技能不在本职业学习表里，也不会被回收；
 * 其他职业遇到 172/173 仍会正常移除。技能 ID 用逗号/顿号/空格分隔均可；
 * 也可写多条同名标签（如 <SyncProtectSkill: 172> 和 <SyncProtectSkill: 173>），效果等同一条。
 * 每个职业各自维护自己的备注，互不影响，无需在插件管理器里记 ID 对照表。
 *
 * 【职业保护技能 - 兼容旧式配置（插件参数）】
 * protectedSkillsByClass 参数仍可用：格式 职业ID:技能ID,技能ID2;职业ID2:技能ID3
 * （分隔符用英文或中文符号均可）。与职业备注同时配置时会合并取并集。
 * - 1号审神者的技能同样参与双向校准，如需保留请给其职业配置保护。
 */

(() => {
    // 插件参数
    const _pluginParams = PluginManager.parameters("ActorDataSync");

    // ================================================================
    // 职业保护技能表（两种配置方式，读取时合并取并集）：
    // 1) 职业备注标签（推荐）：<SyncProtectSkill: 172,173>，写在职业备注栏，
    //    每个职业维护自己的标签，支持多条同名标签合并。
    // 2) protectedSkillsByClass 插件参数（旧式兼容）：职业ID:技能ID,技能ID2;职业ID2:技能ID3
    // ================================================================

    // 解析技能 ID 列表字符串（逗号/顿号/空白分隔均可）
    function parseSkillIdList(raw) {
        const set = new Set();
        if (raw === undefined || raw === null) return set;
        String(raw)
            .split(/[,，、\s]+/)
            .forEach(s => {
                const id = Number(s.trim());
                if (id > 0) set.add(id);
            });
        return set;
    }

    // 解析旧式插件参数：职业ID -> Set<技能ID>
    function parseProtectedSkillsParam(raw) {
        const map = new Map();
        if (!raw) return map;
        String(raw)
            .split(/[;；]/)
            .forEach(segment => {
                segment = segment.trim();
                if (!segment) return;
                const pair = segment.split(/[:：]/);
                if (pair.length < 2) return;
                const classId = Number(pair[0].trim());
                if (!classId || classId <= 0) return;
                const set = parseSkillIdList(pair[1]);
                if (set.size > 0) map.set(classId, set);
            });
        return map;
    }

    // 解析职业数据库备注里的 <SyncProtectSkill: 172,173> 标签
    function parseClassNotesProtection() {
        const map = new Map();
        if (!$dataClasses) return map;
        $dataClasses.forEach((cls, classId) => {
            if (!cls || !cls.note) return;
            const tagPattern = /<SyncProtectSkill\s*[:：]\s*([^>]+)>/gi;
            let match;
            while ((match = tagPattern.exec(cls.note)) !== null) {
                const set = parseSkillIdList(match[1]);
                if (set.size === 0) continue;
                if (!map.has(classId)) map.set(classId, new Set());
                set.forEach(id => map.get(classId).add(id));
            }
        });
        return map;
    }

    // 合并两种配置；懒构建（读档时数据库必然已加载），构建一次后缓存
    let _protectionMap = null;
    function protectionMap() {
        if (_protectionMap) return _protectionMap;
        _protectionMap = new Map();
        [parseProtectedSkillsParam(_pluginParams["protectedSkillsByClass"]), parseClassNotesProtection()].forEach(source => {
            source.forEach((set, classId) => {
                if (!_protectionMap.has(classId)) _protectionMap.set(classId, new Set());
                set.forEach(id => _protectionMap.get(classId).add(id));
            });
        });
        return _protectionMap;
    }

    // 本体武器同步模式 (force / empty)
    const SYNC_WEAPON_MODE = _pluginParams["weaponSyncMode"] || "force";
    // 是否在读档后弹出同步提示
    const SHOW_SYNC_NOTICE = String(_pluginParams["showSyncNotice"] || "true") !== "false";
    // 同步提示文本
    const SYNC_NOTICE_TEXT = _pluginParams["syncNoticeText"] || "进行了存档更新";
    // 是否移除已学会但学习条目已从职业学习表中删除的过时技能
    const SYNC_SKILL_REMOVAL = String(_pluginParams["syncSkillRemoval"] || "true") !== "false";

    // 本次读档是否实际执行过同步（仅插件内存标记，不写入存档）
    let syncedThisLoad = false;

    const _DataManager_extractSaveContents = DataManager.extractSaveContents;
    DataManager.extractSaveContents = function(contents) {
        syncedThisLoad = false;
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
                        // 1. 同步图像资源 (增加判断：排除 1 号角色)
                        // ==========================================
                        if (actor.actorId() !== 1) {
                            let imageChanged = false;
                            if (actor._faceName !== actorData.faceName || actor._faceIndex !== actorData.faceIndex) {
                                actor._faceName = actorData.faceName;
                                actor._faceIndex = actorData.faceIndex;
                                imageChanged = true;
                            }
                            if (actor._characterName !== actorData.characterName || actor._characterIndex !== actorData.characterIndex) {
                                actor._characterName = actorData.characterName;
                                actor._characterIndex = actorData.characterIndex;
                                imageChanged = true;
                            }
                            // 通常 SV 战斗图也是配套的，如果你希望1号角色的SV图也保留存档的，就放在这里一起排除。
                            if (actor._battlerName !== actorData.battlerName) {
                                actor._battlerName = actorData.battlerName;
                                imageChanged = true;
                            }
                            if (imageChanged) {
                                syncedThisLoad = true;
                                console.log(`[数据同步] 角色ID:${i} 图像资源已同步`);
                            }
                        }

                        // ==========================================
                        // 2. 同步职业 (如果数据库里更换了角色的初始职业)
                        // ==========================================
                        // 注：如果你的游戏允许玩家自由转职，请将这段代码删除或注释掉！
                        if (actor._classId !== actorData.classId) {
                            // changeClass(classId, keepExp) -> true 表示保留当前等级和经验
                            actor.changeClass(actorData.classId, true);
                            syncedThisLoad = true;
                            console.log(`[数据同步] 角色ID:${i} 职业已同步为 ID:${actorData.classId}`);
                        }

                        // ==========================================
                        // 3. 双向校准：补学新技能 + 移除过时技能
                        // ==========================================
                        const currentClass = actor.currentClass(); // 获取角色当前的职业数据
                        if (currentClass && currentClass.learnings) {
                            // 3a. 查漏补缺：自动学会新技能
                            currentClass.learnings.forEach(learning => {
                                // 条件：角色当前等级 >= 技能要求等级 且 还没学过该技能
                                if (actor._level >= learning.level && !actor.isLearnedSkill(learning.skillId)) {
                                    actor.learnSkill(learning.skillId);
                                    syncedThisLoad = true;
                                    console.log(`[数据同步] 角色ID:${i} 补学了新技能 ID:${learning.skillId}`);
                                }
                            });

                            // 3b. 移除过时技能：学习条目已从职业学习表中删除的已学技能
                            // 判据：技能不在当前职业 learnings 的任何条目中（条目仍在则只调等级不触发回收），
                            // 且不在该职业的保护技能名单中 -> forgetSkill。
                            if (SYNC_SKILL_REMOVAL) {
                                const learningSkillIds = new Set(
                                    currentClass.learnings.map(learning => learning.skillId)
                                );
                                const protectedSkills =
                                    protectionMap().get(actorData.classId) || new Set();
                                const staleSkillIds = actor._skills.filter(
                                    skillId => !learningSkillIds.has(skillId) && !protectedSkills.has(skillId)
                                );
                                staleSkillIds.forEach(skillId => {
                                    actor.forgetSkill(skillId);
                                    syncedThisLoad = true;
                                    console.log(`[数据同步] 角色ID:${i} 已移除职业学习表中不再存在的技能 ID:${skillId}`);
                                });
                            }
                        }

                        // ==========================================
                        // 4. 同步本体武器 (跟随数据库初始装备，仅武器槽；排除 1 号审神者)
                        // ==========================================
                        // 本工程装备类型表: ['', '武器', '副手', '宝物', '刀装/防具', '御守', '马匹']，武器槽 etype=1。
                        // forceChangeEquip 直接装备，不需要背包里有该武器，与刀身事件的补发逻辑一致。
                        if (actor.actorId() !== 1) {
                            const weaponSlot = actor.equipSlots().indexOf(1);
                            if (weaponSlot >= 0) {
                                const dbWeaponId = (actorData.equips && actorData.equips[weaponSlot]) || 0;
                                if (dbWeaponId > 0 && $dataWeapons[dbWeaponId]) {
                                    const currentWeapon = actor._equips[weaponSlot];
                                    const currentId = currentWeapon ? currentWeapon._itemId : 0;
                                    const shouldSync = SYNC_WEAPON_MODE === "empty" ? currentId === 0 : true;
                                    if (currentId !== dbWeaponId && shouldSync) {
                                        actor.forceChangeEquip(weaponSlot, $dataWeapons[dbWeaponId]);
                                        syncedThisLoad = true;
                                        console.log(`[数据同步] 角色ID:${i} 本体武器已同步为 ID:${dbWeaponId}`);
                                    }
                                }
                            }
                        }

                        // ==========================================
                        // 5. 刷新角色状态以重新计算数值曲线
                        // ==========================================
                        actor.refresh();
                    }
                }
            }
        }
    };

    // 读档完成后（首次进入地图场景时）若本次执行过同步，弹出提示对话框
    // 此时 Window_Message 已在 isReady() -> onMapLoaded() -> createAllWindows() 中创建，
    // 后续每帧 Window_Message.update() 会自动消费 $gameMessage 中的文本。
    const _Scene_Map_start = Scene_Map.prototype.start;
    Scene_Map.prototype.start = function() {
        _Scene_Map_start.call(this);
        if (syncedThisLoad && SHOW_SYNC_NOTICE && $gameMessage) {
            $gameMessage.add(SYNC_NOTICE_TEXT);
        }
        syncedThisLoad = false;
    };
})();
