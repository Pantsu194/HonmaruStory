/*:
 * @target MZ
 * @plugindesc [夜袭系统-V9.1] Excel版 - 支持根据开关自动跳转分支
 * @author Gemini Assistant
 *
 * @help
 * ============================================================================
 * 【V9.1 新增功能：逻辑跳转 (JUMP)】
 * 你可以在 Excel 中根据开关状态，自动跳转到不同的剧情组。
 *
 * 【配置方法】
 * 1. speaker 列：填 "JUMP"
 * 2. text 列支持三种语法：
 * - Sw[1] | target_id   (当开关1为 ON 时跳转)
 * - !Sw[1] | target_id  (当开关1为 OFF 时跳转)
 * - target_id           (无条件强制跳转)
 *
 * 【执行逻辑】
 * 插件会按顺序检查 JUMP 行。
 * 一旦某一行条件满足 -> 立即跳转到新剧情组 -> 停止检查后续 JUMP 行。
 * ============================================================================
 *
 * @param ActorMapSetting
 * @text 角色ID映射表
 * @desc 配置 [夜袭系统用的ID] 对应 [数据库里的角色ID]。
 * @type struct<ActorMapStruct>[]
 * @default []
 *
 * @command init
 * @text 1. 初始化对话
 * @desc 准备对话数据。
 * @arg charVarId
 * @text 角色ID变量
 * @type variable
 * @default 10
 * @arg loveVarId
 * @text 2a.固定好感度变量
 * @type variable
 * @default 11
 * @arg loveOffset
 * @text 2b.好感度偏移量
 * @type number
 * @default 0
 * @arg type
 * @text 对话类型
 * @type string
 * @default talk
 * @arg specificGroupId
 * @text [可选]指定剧情组ID
 * @type string
 *
 * @command checkNext
 * @text 2. 检查还有下一句吗
 * @arg switchId
 * @text 结果开关ID
 * @type switch
 * @default 1
 *
 * @command next
 * @text 3. 读取下一句/检测选项
 * @arg outNameVarId
 * @text 存名字的变量
 * @type variable
 * @default 13
 * @arg outTextVarId
 * @text 存内容的变量
 * @type variable
 * @default 12
 *
 * @command showChoices
 * @text 4. 显示选项窗口
 */

/*~struct~ActorMapStruct:
 * @param nightId
 * @type number
 * @min 1
 * @param dbId
 * @type actor
 * @default 1
 */

(() => {
    const pluginName = "NightSystem_Excel";
    
    // V8.3 补丁：修复变量空值
    const _Game_Variables_value = Game_Variables.prototype.value;
    Game_Variables.prototype.value = function(variableId) {
        if (this._data[variableId] === "") return "";
        return _Game_Variables_value.call(this, variableId);
    };

    // V9.0 补丁：修复名字框
    const _Window_NameBox_setName = Window_NameBox.prototype.setName;
    Window_NameBox.prototype.setName = function(name) {
        const realText = this.convertEscapeCharacters(name);
        if (realText.trim() === "") name = "";
        _Window_NameBox_setName.call(this, name);
    };

    const parameters = PluginManager.parameters(pluginName);
    const rawActorMap = JSON.parse(parameters['ActorMapSetting'] || '[]');
    const ActorMap = {};
    rawActorMap.forEach(json => {
        const obj = JSON.parse(json);
        ActorMap[Number(obj.nightId)] = Number(obj.dbId);
    });

    var NightSystem = window.NightSystem || {};
    window.$dataNightDialogues = null;
    NightSystem._queue = [];
    NightSystem._currentCharId = 0;
    NightSystem._context = { charVar: 0, loveVar: 0, loveOffset: 0, type: "" };

    var _DataManager_loadDatabase = DataManager.loadDatabase;
    DataManager.loadDatabase = function() {
        _DataManager_loadDatabase.call(this);
        this.loadDataFile('$dataNightDialogues', 'NightDialogues.json');
    };

    function parseVariableString(str) {
        if (!str) return "";
        const match = str.match(/^\\V\[(\d+)\]$/i);
        if (match) return String($gameVariables.value(Number(match[1])));
        return String(str);
    }

    // --- 加载剧情组 ---
    NightSystem.loadGroup = function(targetGid) {
        if (!$dataNightDialogues) return;
        const charId = $gameVariables.value(this._context.charVar);
        console.log(`[夜袭V9.1] 跳转剧情组 -> ${targetGid}`);

        const targetRows = $dataNightDialogues.filter(item => {
            const rowActorId = String(item.actor_id).trim();
            const targetActorId = String(charId).trim();
            const rowGid = String(item.group_id).trim();
            return rowActorId === targetActorId && rowGid === targetGid;
        });

        if (targetRows.length > 0) {
            this._queue = targetRows;
        } else {
            console.warn(`[夜袭] 未找到目标剧情: ${targetGid}`);
            this._queue = [{speaker: "System", text: "（缺少剧情组: " + targetGid + "）"}];
        }
    };

    // --- 初始化 ---
    NightSystem.initDialogue = function(charVarId, loveVarId, loveOffset, type, specificGroupId) {
        this._queue = [];
        this._context = { charVar: charVarId, loveVar: loveVarId, loveOffset: loveOffset, type: type };
        
        const charId = $gameVariables.value(charVarId);
        this._currentCharId = charId;
        
        let loveVal = 0;
        if (loveOffset > 0) {
            const actualVarId = charId + loveOffset;
            loveVal = $gameVariables.value(actualVarId);
        } else {
            loveVal = $gameVariables.value(loveVarId);
        }

        let targetGid = parseVariableString(specificGroupId).trim();

        if (targetGid !== "") {
            this.loadGroup(targetGid);
            return;
        }

        if (!$dataNightDialogues) return;
        const rawRows = $dataNightDialogues.filter(item => {
            const rowActorId = String(item.actor_id).trim();
            const targetActorId = String(charId).trim();
            const rowType = String(item.type).trim();
            const targetType = String(type).trim();
            return rowActorId === targetActorId && rowType === targetType;
        });

        if (rawRows.length === 0) {
            this._queue.push({speaker: "System", text: "..."});
            return;
        }

        const groups = {};
        for (const row of rawRows) {
            const gid = String(row.group_id).trim();
            if (!groups[gid]) groups[gid] = [];
            groups[gid].push(row);
        }

        let maxThreshold = -1;
        for (const gid in groups) {
            const firstLine = groups[gid][0];
            const minLove = Number(firstLine.min_love) || 0;
            if (minLove <= loveVal) {
                if (minLove > maxThreshold) maxThreshold = minLove;
            }
        }

        const validGroupIDs = [];
        for (const gid in groups) {
            const firstLine = groups[gid][0];
            if (Number(firstLine.min_love) === maxThreshold) validGroupIDs.push(gid);
        }

        if (validGroupIDs.length === 0) {
             this._queue.push({speaker: "System", text: "..."});
             return;
        }

        const randomGid = validGroupIDs[Math.floor(Math.random() * validGroupIDs.length)];
        this._queue = groups[randomGid];
    };

    NightSystem.hasNext = function() {
        return this._queue.length > 0;
    };

    // --- 辅助：条件检查 ---
    NightSystem.checkCondition = function(condStr) {
        condStr = String(condStr).trim();
        if (condStr === "") return true; // 无条件

        // 检查 Sw[n] 或 !Sw[n]
        const match = condStr.match(/^(!?)Sw\[(\d+)\]$/i);
        if (match) {
            const isNot = match[1] === "!";
            const swId = parseInt(match[2]);
            const value = $gameSwitches.value(swId);
            return isNot ? !value : value;
        }
        return false;
    };

    // --- 读取下一句 (含 JUMP 和 CHOICE 逻辑) ---
    NightSystem.next = function(nameVarId, textVarId) {
        if (this._queue.length === 0) return;
        
        // 循环处理 JUMP，直到找到一条实义文本或队列为空
        let safetyCounter = 0;
        while (this._queue.length > 0) {
            if (safetyCounter++ > 100) {
                console.error("[夜袭] 检测到 JUMP 死循环，强制停止。");
                return;
            }

            const nextRow = this._queue[0]; // 偷看第一行
            const speakerKey = String(nextRow.speaker || "").trim().toUpperCase();

            // === 处理 JUMP 指令 ===
            if (speakerKey === "JUMP") {
                this._queue.shift(); // 消耗掉这行指令
                
                const parts = String(nextRow.text).split('|');
                let condition = "";
                let targetId = "";

                if (parts.length === 1) {
                    // 只有目标ID -> 无条件跳转
                    targetId = parts[0].trim();
                } else {
                    // 条件 | 目标ID
                    condition = parts[0].trim();
                    targetId = parts[1].trim();
                }

                if (this.checkCondition(condition)) {
                    // 条件满足 -> 执行跳转 (重置队列)
                    this.loadGroup(targetId);
                    // 循环继续，处理新队列的第一行
                    continue; 
                } else {
                    // 条件不满足 -> 忽略，检查下一行
                    continue;
                }
            }

            // === 处理 CHOICE 指令 ===
            if (speakerKey === "CHOICE") {
                $gameVariables.setValue(textVarId, -1);
                $gameVariables.setValue(nameVarId, ""); 
                return;
            }

            // === 找到普通文本，跳出循环去显示 ===
            break;
        }

        if (this._queue.length === 0) return; // JUMP 完了没东西了

        // 正常的显示逻辑
        const row = this._queue.shift();
        let name = "";
        const rawSpeaker = row.speaker !== undefined && row.speaker !== null ? String(row.speaker).trim() : "";
        const speakerKey = rawSpeaker.toUpperCase();
        
        if (speakerKey === "" || speakerKey === "NONE" || speakerKey === "0") {
            name = ""; 
        } else if (speakerKey === "SELF") {
            const dbId = ActorMap[this._currentCharId];
            const actor = $gameActors.actor(dbId); 
            name = actor ? actor.name() : "???";
        } else if (speakerKey === "PLAYER") {
            name = $gameParty.leader().name();
        } else if (/^V\[(\d+)\]$/i.test(rawSpeaker)) {
            const varId = parseInt(rawSpeaker.match(/^V\[(\d+)\]$/i)[1]);
            const actorId = $gameVariables.value(varId);
            const actor = $gameActors.actor(actorId);
            name = actor ? actor.name() : "???";
        } else if (/^\d+$/.test(rawSpeaker)) {
            const actorId = Number(rawSpeaker);
            const actor = $gameActors.actor(actorId);
            name = actor ? actor.name() : "???";
        } else {
            name = String(row.speaker); 
        }
        
        let content = row.text || "";
        content = String(content).replace(/\\n/g, '\n');

        $gameVariables.setValue(nameVarId, name);
        $gameVariables.setValue(textVarId, content);
    };

    NightSystem.processChoices = function() {
        const choices = [];
        while (this._queue.length > 0 && String(this._queue[0].speaker || "").trim().toUpperCase() === "CHOICE") {
            const row = this._queue.shift();
            const parts = String(row.text).split('|');
            const choiceText = parts[0].trim();
            const targetId = parts.length > 1 ? parts[1].trim() : "";
            choices.push({ name: choiceText, target: targetId });
        }
        if (choices.length === 0) return;
        $gameMessage.setChoices(choices.map(c => c.name), 0, -1);
        $gameMessage.setChoiceCallback(n => {
            const selectedChoice = choices[n];
            if (selectedChoice.target) this.loadGroup(selectedChoice.target);
        });
    };

    PluginManager.registerCommand(pluginName, "init", args => {
        const cVar = Number(args.charVarId);
        const lVar = Number(args.loveVarId);
        const lOffset = Number(args.loveOffset || 0);
        const type = String(args.type);
        const gid = String(args.specificGroupId || ""); 
        NightSystem.initDialogue(cVar, lVar, lOffset, type, gid);
    });

    PluginManager.registerCommand(pluginName, "checkNext", args => {
        const switchId = Number(args.switchId);
        $gameSwitches.setValue(switchId, NightSystem.hasNext());
    });

    PluginManager.registerCommand(pluginName, "next", args => {
        NightSystem.next(Number(args.outNameVarId), Number(args.outTextVarId));
    });
    
    PluginManager.registerCommand(pluginName, "showChoices", args => {
        NightSystem.processChoices();
    });

})();