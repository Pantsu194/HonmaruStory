/*:
 * @target MZ
 * @plugindesc [夜袭系统-V10.8] Excel版 - CG显示/体型适配/淡入淡出/对话等待/设置开关 + 跳转
 * @author Gemini Assistant
 *
 * @help
 * ============================================================================
 * 【V10.8 新增功能：体型适配 CG】
 * - 按审神者体型自动选择对应后缀的 CG：开关3(成男)→_mas / 开关4(成女)→_fem / 开关5(幼年)→_kid
 * - 例如表格填 cg_鹤丸_1，成女会优先找 cg_鹤丸_1_fem，找不到则自动回退 cg_鹤丸_1
 * - 后缀可配置：CgSuffixAdultM / CgSuffixAdultF / CgSuffixChild（默认 mas/fem/kid）
 * ============================================================================
 * 【V10.7 新增功能：设置菜单「CG显示」开关】
 * - ESC 菜单 → 设置 → 新增「CG显示」选项（ON/OFF，随设置存档保存）
 * - 关闭后：夜间剧情不再播放 CG（显示/隐藏/淡入淡出全部跳过），对话不受影响
 * - 实现：扩展 ConfigManager（cgEnabled 持久化）+ Window_Options（追加选项）
 * ============================================================================
 * 【V10.6 新增功能：CG 动画期间对话等待】
 * - 显示/隐藏 CG 时，对话会暂停，等动画完全播完才继续下一句
 * - 实现：next 命令消费 cg 指令行后，累计动画帧数并调用 Game_Interpreter.wait
 *   （首次加载图片时额外等待最多 1 秒，确保淡入从图片就绪后才算）
 * ============================================================================
 * 【V10.5 新增功能：CG 淡入淡出】
 * - 显示 CG 时淡入：先以透明度 0 显示，再渐变到目标透明度（时长 CgFadeIn 帧）
 * - 隐藏 CG（#hide）时淡出：先渐变到透明度 0，动画结束后移除图片
 * - 时长参数：CgFadeIn（淡入帧数）/ CgFadeOut（淡出帧数），0=关闭，默认 30（约0.5秒）
 * ============================================================================
 * 【V10.0 新增功能：CG 显示 (type=cg 指令行)】
 * 无需修改表格结构！在现有表格中新增 type=cg 的指令行：
 *
 * 【配置方法】
 * 1. type 列：填 "cg"
 * 2. speaker 列：留空
 * 3. text 列支持以下语法：
 * - 图片名                       显示图片（默认 fit 等比缩放居中全屏）
 * - 图片名,x,y                   指定位置显示（中心坐标）
 * - 图片名,x,y,缩放%,透明度      完整控制（缩放%为整数，透明度 0-255）
 * - #hide                        隐藏当前 CG（带淡出）
 * - 留空                         忽略该行（图片保持上一张）
 *
 * 【示例】
 *   type  speaker  text
 *   talk  NONE     夜深了，脚步声传来……
 *   cg             夜袭_cg1            ← 显示图片（淡入）
 *   talk  SELF     （推门而入）还没睡？
 *   cg             #hide              ← 隐藏图片（淡出）
 *
 * 【执行逻辑】
 * - cg 指令行不输出台词（不动变量），按表格行序与台词混排执行
 * - 图片素材放 img/pictures/ 下（可带子目录如 cg/xxx），名称不带扩展名
 * - 切换：下一条 cg 指令是新图 → 直接替换（新图淡入）
 * - 隐藏：#hide 指令（淡出）；init 新对话自动清旧图；场景切换天然清场
 * - 图片槽位用插件参数 CgPictureId 指定，避开事件立绘(1~14)与滤镜图
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
 * @param CgPictureId
 * @text CG图片槽ID
 * @desc 夜袭CG使用的图片槽位ID（避开事件立绘 1~14 与滤镜图）。默认 90。
 * @type number
 * @min 1
 * @max 100
 * @default 90
 *
 * @param CgScaleMode
 * @text CG缩放模式
 * @desc fit=等比缩放居中填满全屏；full=拉伸填满；raw=原样显示（配合 text 的缩放%）。
 * @type select
 * @option 等比居中(fit)
 * @value fit
 * @option 拉伸填满(full)
 * @value full
 * @option 原样显示(raw)
 * @value raw
 * @default fit
 *
 * @param CgFolder
 * @text CG子目录
 * @desc CG图片所在子目录（相对 img/pictures/）。text 只填图片名时自动拼上此前缀；留空则直接用图片名。
 * @type string
 * @default cg
 *
 * @param CgFadeIn
 * @text CG淡入帧数
 * @desc 显示CG时的淡入动画时长（帧，60帧=1秒）。0=关闭淡入。默认 30（约0.5秒）。
 * @type number
 * @min 0
 * @max 600
 * @default 30
 *
 * @param CgFadeOut
 * @text CG淡出帧数
 * @desc 隐藏CG（#hide）时的淡出动画时长（帧，60帧=1秒）。0=关闭淡出。默认 30（约0.5秒）。
 * @type number
 * @min 0
 * @max 600
 * @default 30
 *
 * @param CgSuffixAdultM
 * @text 成男体型后缀
 * @desc 开关3（成男审神者）ON 时，CG 图片名自动追加此后缀（如 cg_鹤丸_1_mas）；该图不存在时自动回退无后缀版。
 * @type string
 * @default mas
 *
 * @param CgSuffixAdultF
 * @text 成女体型后缀
 * @desc 开关4（成女审神者）ON 时，CG 图片名自动追加此后缀（如 cg_鹤丸_1_fem）；该图不存在时自动回退无后缀版。
 * @type string
 * @default fem
 *
 * @param CgSuffixChild
 * @text 幼年体型后缀
 * @desc 开关5（幼年审神者）ON 时，CG 图片名自动追加此后缀（如 cg_鹤丸_1_kid）；该图不存在时自动回退无后缀版。
 * @type string
 * @default kid
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

    // V10.0 参数：CG 图片槽位与缩放模式
    const CgPictureId = Math.max(1, Math.min(100, Number(parameters['CgPictureId'] || 90) || 90));
    const CgScaleMode = String(parameters['CgScaleMode'] || 'fit').trim().toLowerCase() || 'fit';
    // V10.1 参数：CG 子目录（text 只填图片名时自动拼上此前缀）
    const CgFolder = String(parameters['CgFolder'] || 'cg').trim().replace(/^\/+|\/+$/g, '');
    // V10.5 参数：CG 淡入/淡出帧数（0=关闭）
    const CgFadeIn = Math.max(0, Number(parameters['CgFadeIn'] || 30) || 0);
    const CgFadeOut = Math.max(0, Number(parameters['CgFadeOut'] || 30) || 0);
    // V10.8 参数：体型后缀（开关3成男/开关4成女/开关5幼年）
    const CgSuffixAdultM = String(parameters['CgSuffixAdultM'] || 'mas').trim();
    const CgSuffixAdultF = String(parameters['CgSuffixAdultF'] || 'fem').trim();
    const CgSuffixChild = String(parameters['CgSuffixChild'] || 'kid').trim();

    // V10.7：设置菜单「CG显示」开关 —— 扩展 ConfigManager（localStorage 持久化）
    if (typeof ConfigManager !== "undefined") {
        // V10.9：CG 显示是中途加入的功能 —— 老存档的 localStorage 里可能已被程序默默写入
        //        cgEnabled=true（那只是旧默认值，不代表玩家主动开过 CG）。
        //        故新增 cgUserToggled 标记：
        //          · 玩家从未在设置里主动切换过 -> 一律按 OFF 处理（新老存档一致）
        //          · 玩家主动切过一次之后       -> 之后完全尊重其选择
        if (ConfigManager.cgUserToggled === undefined) ConfigManager.cgUserToggled = false;
        if (ConfigManager.cgEnabled === undefined) ConfigManager.cgEnabled = false;
        const _ConfigManager_makeData = ConfigManager.makeData;
        ConfigManager.makeData = function() {
            const config = _ConfigManager_makeData.call(this);
            config.cgEnabled = this.cgEnabled;
            config.cgUserToggled = this.cgUserToggled;
            return config;
        };
        const _ConfigManager_applyData = ConfigManager.applyData;
        ConfigManager.applyData = function(config) {
            _ConfigManager_applyData.call(this, config);
            this.cgUserToggled = this.readFlag(config, "cgUserToggled", false);
            // 玩家没主动设置过 -> 无论老存档里存了什么，都按 OFF
            this.cgEnabled = this.cgUserToggled
                ? this.readFlag(config, "cgEnabled", false)
                : false;
        };
    }

    // V10.7：设置菜单加「CG显示」选项（ON/OFF 由 Window_Options 原生切换与显示）
    if (typeof Window_Options !== "undefined") {
        const _Window_Options_addGeneralOptions = Window_Options.prototype.addGeneralOptions;
        Window_Options.prototype.addGeneralOptions = function() {
            _Window_Options_addGeneralOptions.call(this);
            this.addCommand("CG显示", "cgEnabled");
        };
        // V10.9：玩家一旦在设置里主动切换过「CG显示」，就记下标记，此后尊重其选择
        const _Window_Options_changeValue = Window_Options.prototype.changeValue;
        Window_Options.prototype.changeValue = function(symbol, value) {
            const lastValue = this.getConfigValue(symbol);
            _Window_Options_changeValue.call(this, symbol, value);
            if (symbol === "cgEnabled" && lastValue !== value) {
                ConfigManager.cgUserToggled = true;
            }
        };
    }

    var NightSystem = window.NightSystem || {};
    window.$dataNightDialogues = null;
    NightSystem._queue = [];
    NightSystem._currentCharId = 0;
    NightSystem._context = { charVar: 0, loveVar: 0, loveOffset: 0, type: "" };
    NightSystem._cgFadeToken = 0; // V10.5：淡出动画令牌，防止淡出途中换图导致旧图误删
    NightSystem._cgWaitFrames = 0; // V10.6：CG 动画期间需等待的帧数（由 next 命令回调执行 wait）

    // V10.8：当前体型后缀（按开关 3/4/5 判定，互斥取一）
    NightSystem.bodySuffix = function() {
        if (typeof $gameSwitches === "undefined" || !$gameSwitches) return "";
        if ($gameSwitches.value(3)) return CgSuffixAdultM;
        if ($gameSwitches.value(4)) return CgSuffixAdultF;
        if ($gameSwitches.value(5)) return CgSuffixChild;
        return "";
    };

    // V10.8.1：图片文件是否存在——优先用 NW.js 的 Node fs 同步检查（不产生控制台 404 噪音），
    // 非 NW.js 环境（如浏览器预览）回退同步 XHR 探测（status 0/200 视为存在）。
    NightSystem.pictureExists = function(fullName) {
        try {
            const hasNode = typeof process !== "undefined" && process.versions && process.versions.node;
            if (hasNode && typeof require === "function") {
                const fs = require("fs");
                const path = require("path");
                const p = path.join(process.cwd(), "img", "pictures", fullName + ".png");
                return fs.existsSync(p);
            }
        } catch (e) { /* 回退 XHR */ }
        try {
            const url = "img/pictures/" + Utils.encodeURI(fullName) + ".png";
            const xhr = new XMLHttpRequest();
            xhr.open("GET", url, false); // 同步
            xhr.send();
            return xhr.status === 0 || xhr.status === 200;
        } catch (e) {
            return false;
        }
    };

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

    // --- V10.0：CG 图片指令处理 ---
    // text 列语法：图片名 | 图片名,x,y | 图片名,x,y,缩放%,透明度 | #hide | 留空
    // V10.1：text 只填图片名时自动拼上 CgFolder 子目录（默认 cg/），兼容已有子目录的写法
    // V10.5：显示淡入（opacity 0→目标，CgFadeIn 帧）；隐藏淡出（opacity→0 后移除，CgFadeOut 帧）
    NightSystem.processCg = function(cmd) {
        // V10.7：设置菜单关闭 CG 显示时，跳过全部 CG 指令（不显示/不隐藏/不等待）
        if (typeof ConfigManager !== "undefined" && ConfigManager.cgEnabled === false) {
            $gameScreen.erasePicture(CgPictureId); // 顺带清掉可能残留的图
            return;
        }

        cmd = String(cmd || "").trim();
        if (cmd === "") return; // 留空：忽略，图片保持上一张

        const low = cmd.toLowerCase();
        if (low === "#hide" || low === "hide" || low === "none" || low === "#none") {
            // V10.5：淡出后移除（带令牌防误删），关闭淡出则直接移除
            // V10.6：淡出动画期间对话等待（帧数计入 _cgWaitFrames，由 next 命令回调 wait）
            const token = ++NightSystem._cgFadeToken;
            const pic = $gameScreen.picture(CgPictureId);
            if (!pic) return;
            if (CgFadeOut > 0) {
                console.log(`[夜袭CG] 淡出: 图片槽 ${CgPictureId} 用时 ${CgFadeOut} 帧`);
                $gameScreen.movePicture(CgPictureId, pic.origin(), pic.x(), pic.y(), pic.scaleX(), pic.scaleY(), 0, pic.blendMode(), CgFadeOut, 0);
                const ms = Math.ceil((CgFadeOut / 60) * 1000);
                setTimeout(() => {
                    if (NightSystem._cgFadeToken !== token) return; // 期间换图/清除，放弃删除
                    $gameScreen.erasePicture(CgPictureId);
                }, ms);
                NightSystem._cgWaitFrames += CgFadeOut; // V10.6：等淡出播完再继续
            } else {
                $gameScreen.erasePicture(CgPictureId);
            }
            return;
        }

        const parts = cmd.split(",").map(s => s.trim());
        const rawName = parts.shift();
        if (!rawName) return;

        // 图片全名：已有子目录（含 / 或 \）则直接用，否则自动拼 CgFolder 前缀
        let fullName = rawName;
        if (!rawName.includes("/") && !rawName.includes("\\") && CgFolder) {
            fullName = CgFolder + "/" + rawName;
        }

        // V10.8：体型后缀适配——先试「图片名_后缀」（如 cg_鹤丸_1_fem），
        // 不存在则自动回退无后缀版（搜索不到就默认显示没有后缀的 CG）
        const suffix = NightSystem.bodySuffix();
        if (suffix) {
            const suffixed = fullName + "_" + suffix;
            if (NightSystem.pictureExists(suffixed)) {
                fullName = suffixed;
            } else {
                console.log(`[夜袭CG] 未找到体型后缀图 ${suffixed}，回退 ${fullName}`);
            }
        }

        // 坐标默认全屏居中（fit 模式下按图片尺寸等比缩放）
        const screenW = Graphics.width || 816;
        const screenH = Graphics.height || 624;
        const x = parts[0] !== undefined && parts[0] !== "" ? Number(parts[0]) : Math.floor(screenW / 2);
        const y = parts[1] !== undefined && parts[1] !== "" ? Number(parts[1]) : Math.floor(screenH / 2);
        const scalePct = parts[2] !== undefined && parts[2] !== "" ? Number(parts[2]) : 100;
        const opacity = parts[3] !== undefined && parts[3] !== "" ? Number(parts[3]) : 255;

        // V10.4：重要！MZ 的 showPicture 缩放参数是【百分比】语义（100=原尺寸 100%）！
        // Sprite_Picture.updateScale 会做 scale.x = picture.scaleX() / 100，
        // 所以这里必须传 sx*100（如 fit 算得 0.564 → 传 56.4），否则图会缩成几像素。
        const bitmap = ImageManager.loadPicture(fullName);

        const calcScale = () => {
            let sx = scalePct; // 百分比
            let sy = scalePct;
            let origin = 1;
            const imgW = bitmap ? bitmap.width : 0;
            const imgH = bitmap ? bitmap.height : 0;
            if (CgScaleMode !== "raw" && imgW > 0 && imgH > 0) {
                if (CgScaleMode === "fit") {
                    const s = Math.min(screenW / imgW, screenH / imgH) * scalePct;
                    sx = s;
                    sy = s;
                } else if (CgScaleMode === "full") {
                    sx = (screenW / imgW) * scalePct;
                    sy = (screenH / imgH) * scalePct;
                }
            } else if (CgScaleMode === "raw") {
                origin = 0;
            }
            return { sx, sy, origin };
        };

        // V10.6：等待帧数在【同步阶段】累加（图片首次加载时 doShow 是异步的，
        // 不能等 doShow 里再累加，否则 next 回调已检查完 _cgWaitFrames 就错过了）
        const needsLoad = !(bitmap && bitmap.isReady && bitmap.isReady());
        if (CgFadeIn > 0) {
            NightSystem._cgWaitFrames += CgFadeIn;          // 动画帧数
            if (needsLoad) NightSystem._cgWaitFrames += 60; // 首次加载缓冲（最多 1 秒）
        }

        const doShow = (tag) => {
            const { sx, sy, origin } = calcScale();
            console.log(`[夜袭CG] ${tag}显示: ${fullName} 缩放=${sx.toFixed(1)}%x${sy.toFixed(1)}% 原点=${origin} @(${x},${y}) 淡入=${CgFadeIn}帧`);
            NightSystem._cgFadeToken++; // 新图显示，旧淡出令牌作废
            if (CgFadeIn > 0) {
                // V10.5 淡入：先 0 透明度显示，再渐变到目标透明度
                $gameScreen.showPicture(CgPictureId, fullName, origin, x, y, sx, sy, 0, 0);
                $gameScreen.movePicture(CgPictureId, origin, x, y, sx, sy, opacity, 0, CgFadeIn, 0);
            } else {
                $gameScreen.showPicture(CgPictureId, fullName, origin, x, y, sx, sy, opacity, 0);
            }
        };

        if (bitmap && bitmap.isReady && bitmap.isReady()) {
            doShow("就绪直接"); // 已缓存/已加载完成：直接正确缩放显示
        } else if (bitmap && bitmap.addLoadListener) {
            // 未就绪：等待加载完成再显示（加载中不显示，避免闪帧）
            let shown = false;
            bitmap.addLoadListener(() => {
                shown = true;
                doShow("加载后");
            });
            // 兜底：MZ _onError 不触发回调，轮询检测加载失败/超时
            let tries = 0;
            const poll = setInterval(() => {
                tries++;
                if (bitmap.isReady()) {
                    clearInterval(poll);
                    if (!shown) doShow("轮询就绪");
                } else if (bitmap.isError() || tries > 30) {
                    clearInterval(poll);
                    if (bitmap.isError()) {
                        console.warn(`[夜袭CG] 图片加载失败: ${fullName}（检查 img/pictures/${fullName}.png 是否存在）`);
                    } else if (!shown) {
                        console.warn(`[夜袭CG] 图片加载超时: ${fullName}（强制按原始尺寸显示）`);
                        $gameScreen.showPicture(CgPictureId, fullName, CgScaleMode === "raw" ? 0 : 1, x, y, scalePct, scalePct, opacity, 0);
                    }
                }
            }, 100);
        } else {
            doShow("兜底");
        }
    };

    // V10.0：初始化对话时清掉旧 CG，防止残留
    // V10.5：递增令牌使未完成的淡出定时器失效，避免误删新图
    NightSystem.clearCg = function() {
        if (typeof $gameScreen === "undefined" || !$gameScreen) return;
        try {
            NightSystem._cgFadeToken++;
            $gameScreen.erasePicture(CgPictureId);
        } catch (e) { /* 场景未就绪时忽略 */ }
    };

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
        this.clearCg(); // V10.0：新对话先清旧 CG
        
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
        // V10.0：筛选时纳入 type=cg 指令行（与目标 type 同组混排）
        const rawRows = $dataNightDialogues.filter(item => {
            const rowActorId = String(item.actor_id).trim();
            const targetActorId = String(charId).trim();
            const rowType = String(item.type).trim().toLowerCase();
            const targetType = String(type).trim().toLowerCase();
            return rowActorId === targetActorId && (rowType === targetType || rowType === "cg");
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

        // V10.3 修复：剔除「只有 cg 指令行、没有目标 type 台词行」的组——
        // cg 行只依附于同组台词生效，不得单独成为 init 候选组（否则选中后无台词、对话直接结束）
        for (const gid of Object.keys(groups)) {
            const hasDialogue = groups[gid].some(r => String(r.type).trim().toLowerCase() !== "cg");
            if (!hasDialogue) delete groups[gid];
        }
        if (Object.keys(groups).length === 0) {
            this._queue.push({speaker: "System", text: "..."});
            return;
        }

        // V10.0：好感度阈值只看组内第一条非 cg 行（cg 指令行不参与阈值判定）
        const firstDialogueLine = (rows) => rows.find(r => String(r.type).trim().toLowerCase() !== "cg") || rows[0];

        let maxThreshold = -1;
        for (const gid in groups) {
            const firstLine = firstDialogueLine(groups[gid]);
            const minLove = Number(firstLine.min_love) || 0;
            if (minLove <= loveVal) {
                if (minLove > maxThreshold) maxThreshold = minLove;
            }
        }

        const validGroupIDs = [];
        for (const gid in groups) {
            const firstLine = firstDialogueLine(groups[gid]);
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

            // === V10.0：处理 CG 指令行 (type=cg) ===
            if (String(nextRow.type || "").trim().toLowerCase() === "cg") {
                this._queue.shift(); // 消耗指令行
                this.processCg(nextRow.text); // 执行图片指令（不输出台词）
                continue; // 继续取下一条
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

    // V10.6：next 命令回调用普通函数以取得 this（Game_Interpreter），
    // 若本句消费了 CG 指令（淡入/淡出动画），用 this.wait() 让事件等动画播完再继续
    PluginManager.registerCommand(pluginName, "next", function(args) {
        NightSystem.next(Number(args.outNameVarId), Number(args.outTextVarId));
        const waitFrames = NightSystem._cgWaitFrames || 0;
        NightSystem._cgWaitFrames = 0; // 清空，避免下次 next 重复等待
        if (waitFrames > 0 && typeof this.wait === "function") {
            this.wait(waitFrames);
        }
    });
    
    PluginManager.registerCommand(pluginName, "showChoices", args => {
        NightSystem.processChoices();
    });

})();