// 简易锻刀系统 - 最终修复版 for RPG Maker MZ
// 版本：28.22 - 界面文案清爽版（去掉标题括号注释）
// 作者：AI Assistant (由 Gemini 修改以支持存档)
//
// V28.22 改动（相对 V28.21）—— 去掉界面标题后的括号注释（主人要求「让界面清爽一点」）：
//   [改] 锻造 x1（投入一次素材）    -> 锻造 x1
//   [改] 锻造 x10（同一配方连续十次） -> 锻造 x10
//   [改] 返回（不锻造）             -> 返回
//   [改] 可锻造列表（点击配方即开锻） -> 可锻造列表
//   [改] 更改配方（点击即选用）      -> 更改配方
//        这些说明本来就与帮助窗、列表内容重复；而且 TEN_PULL_MENU 的 label 还会
//        带进结果提示（原样会输出「锻造 x1（投入一次素材）完成，共 1 把：」，很啰嗦）。
//   [改] 结果提示补一个空格：`${label}完成` -> `${label} 完成`
//        （去掉括号后「锻造 x1完成」读起来挤在一起）
//   [保留] 结果窗备注行的括号（「（素材只够 N 次）」等）是**状态说明**不是标题注释，
//          按主人要求只清理标题类括号，这些保留。
//   [新增] 测试台第 22 组：界面文案清爽检查
//          · 五处旧文案（含括号）在代码里必须消失（先剔除注释行再查，
//            否则会把刻意保留的「改前」注释当成真文案 —— 测试自己骗自己）
//          · 菜单四项必须是干净写法
//          · 单次 / 十连两条结果路径的标题行都不许带括号
//
// V28.21 改动（相对 V28.20）—— 分隔符加空格，并修掉它带出来的两个连带 bug：
//   [改] 分隔符由「｜」改成「 ｜ 」（左右各一个半角空格）—— 主人反馈「贴得太紧」。
//        · 本次配方：10 ｜ 10 ｜ 10 ｜ 10
//        · 素材明细：冷却材 1000 ｜ 10
//        · 结论行：最多可锻 10 次（10 ｜ 10 ｜ 10 ｜ 10 × 10）
//        · 十连结果每行两把：… × 4 ｜ … × 3
//        · 列表「配方：」描述：木炭 10 ｜ 玉钢 10
//        （表头「持有｜需求」保持紧凑不空格，它只是给下面明细做注释）
//   [修] **连带 bug ①**：结果窗的 parseResultLines() 还在按全角空格 "　" 切两格，
//        V28.20 把产物行改成「｜」拼接之后一行两把切不开、缩成一格且数量为空。
//        现在按 /[｜　]/ 切（兼容旧文本），并在最后一个乘号处拆名字与数量，
//        兼容 "× 4" / " x4" / "x4" 三种历史写法。
//   [修] **连带 bug ②**：结果窗每个格子是「名字左对齐 + 数量右对齐」两个独立绘制区，
//        把「名字 × 4 ｜ 名字 × 4」整串塞进一格会互相压字、右格数量被裁。
//        现在名字仍在 y+2（20 号），数量改到 y+24 单独一行右对齐，
//        并按格子可用宽度自动缩字（16 -> 12 号），保证数量永远完整可见。
//   [新增] 测试台第 14.1c 组：**真往返**测试
//        旧测试用手写样本，样本没跟着实现改 → 全绿放行（假绿第七次）。
//        现在改成「showResult 实产文本 → 真实解析器」，实现一改测试就红。
//        另加：左右两列都必须画出数量（右格不许被裁）。
//
// V28.20 改动（相对 V28.19）—— 锻刀界面两处修正（主人要求）：
//   [修] 「最多可锻 N 次（…）」那一行下缘仍被挡住。
//        根因（查源码 + 手算复核，不是猜）：MZ 的 Window_Base.drawText 把行高写死成
//        lineHeight() = 36（js/rmmz_windows.js:217），20 号字整行要占到 y+36；
//        结论行 y = 74 + 2*26 + 10 = 136，底边 136 + 36 = 172，而旧标题窗高 184，
//        只剩 12px 余量，字体降部一压就贴住下边框。
//        现在标题窗高 184 -> 216（余 44px），命令窗 220 -> 230。
//   [改] 锻刀界面上所有连续出现的素材数量改用全角「｜」分隔，提升辨识度：
//          · 本次配方：10｜10｜10｜10（原 join(" ")）
//          · 素材明细：冷却材 560｜10（原 "560 / 10"），表头同步改成「持有｜需求」
//          · 结论行：最多可锻 10 次（10｜10｜10｜10 × 10）
//          · 十连结果窗：每行 2 把之间用「｜」（原全角空格），产物计数统一「× N」
//          · 列表「配方：」描述：木炭 10｜玉钢 10（原 "木炭: 10, 玉钢: 10"）
//   [新增] 测试台第 21 组：底边留白与数量分隔
//          · 标题窗高 >= 结论行 y + MZ 行高 36，且底部余量 >= 12px
//          · 结论行 / 配方行 / 明细行的分隔符必须是「｜」，不许再出现空格拼接
//          · 「不足」标签必须落在格内，不许窜出窗口右缘
//
// V28.19 改动（相对 V28.18）—— 主菜单两处微调（主人要求）：
//   [改] 「锻　刀」里的全角空格去掉，直接写「锻刀」。
//   [改] 主菜单字号 22 -> 26（与工程基准字号 System.json 的 fontSize 一致），
//        文字 y 偏移由 16 改为 12（(64-39)/2），保持垂直居中。
//        「可锻造列表」26 号约 130px，内容宽 524px，宽度充裕。
//
// V28.18 改动（相对 V28.17）—— 三处微调（主人要求）：
//   [改] 主菜单窗口由 560x400 缩到 560x320 并垂直居中（y=152）。
//        原来 400 高只放 4 项，下面空了一大块。
//   [改] 主菜单只保留主功能文字：「锻刀 / 可锻造列表 / 素材信息 / 退出工坊」。
//        副标题与蓝色小字说明全部去掉；itemHeight 80 -> 64，每项一行 22 号字居中。
//        （tenPullPreview() 保留但不再在菜单里显示，供别处按需使用）
//   [改] 可锻造列表的排版与「更改配方」列表完全统一：
//          · itemHeight 80 -> 56、maxVisibleItems 5 -> 7（与配方列表相同）
//          · 第一行：〖物品名〗19 号字 + 右侧「可锻 N 次」/「素材不足」16 号字右对齐
//          · 第二行：「配方：木炭 15  玉钢 15 …」14 号字
//          · 背景矩形高度与选中边框也改成与配方列表一致
//   [改] 消耗描述去掉「(持有 N)」—— 带持有量会把每行挤得很长、换行难看。
//        需要看持有量可以进「素材信息」页；能不能负担由物品名灰显表示。
//   [新增] 测试台第 20 组：列表与主菜单排版统一
//          · 两个列表的 itemHeight / maxVisibleItems 必须一致
//          · 两个 drawItem 的排版要素逐项对齐（名字 19 / 数字 16 右对齐 / 配方 14 / 左边距 12 / 名字 y 偏移 3）
//          · 消耗描述不许再输出「持有」
//          · 主菜单每项只画一行主文案（drawText 调用数 = 4）
//          · 主菜单窗口高度与内容匹配（不留大片空白）
//
// V28.17 改动（相对 V28.16）—— 界面整合（主人要求）：
//   [整合] 主菜单由 5 项并为 4 项：
//            · 原「开始锻刀」与「十连锻刀」合并为「锻刀」
//              （十连界面本来就能单次锻，两个入口是重复的）
//            · 保留「可锻造列表」「素材信息」「退出工坊」
//            窗口高度随之 480 -> 400，使 4 项仍垂直居中。
//   [改] 「可锻造列表」点选配方后**直接进入锻刀界面**并带上该配方，
//        不再回到投料界面预填素材数量。玩家在锻刀界面选「锻造 x1 / x10」。
//   [删] 投料场景 Scene_MaterialInput、素材投料窗 Window_MaterialInputFixed、
//        数字输入窗 Window_ForgeNumberInputFixed 全部移除（整合后成为死代码）。
//        连带移除 _prefillCosts 这个静态中转变量。
//   [搬] findMatchingItems 原挂在 Scene_MaterialInput 上、被十连场景原型借用，
//        现正式成为 Scene_ForgeTenPull 自己的方法。
//   [保留] TEN_PULL_MAX / TEN_PULL_MENU 两个常量补回（随删除块一起丢失过）。
//   [新增] 测试台第 19 组：界面整合检查
//          · 三个废弃类与 _prefillCosts 在活跃代码里必须消失
//          · 主菜单绑定 forge/list/materials/cancel，不得再有 tenForge
//          · 列表点选后进入 Scene_ForgeTenPull 并带上配方，且场景创建时能读到
//          · findMatchingItems 仍在 Scene_ForgeTenPull 上且行为不变
//
// V28.16 改动（相对 V28.15）—— 更改配方仍然无效（探针定案）：
//   [根因] ★ 两个问题叠在一起：
//     ① 人家误判了返回方式。探针日志（主人提供）只出现 [R1] 与 [R4]/[R5]，**没有 [R2]/[R3]**：
//          [R1] onRecipeOk 选中 costs=[15,15,15,15] -> gameTemp 已写入
//          [R4] 十连场景 create() 完成，_recipeValues=[10,10,10,10]   ← create() 又跑了一次
//          [R5] drawTitle 使用配方 [10,10,10,10]
//        说明从配方列表返回时，MZ 是把十连场景**整个重建**（走 create()），
//        并不是调用 resume() —— 所以人家 V28.15 那条 resume 路根本走不到。
//     ② 键名不一致：onRecipeOk 写 _forgePendingRecipe，create() 读 _forgeTenPullRecipe，
//        于是即使重建也取不到值，配方在重建时被当成「没有待换配方」而丢弃。
//   [修复] 统一成唯一中转键 $gameTemp._forgeTenPullRecipe，
//        onRecipeOk / create / resume 三处全部使用同一个键。
//   [新增] 测试台第 18 组按**真实流程**重写：
//        不再假设走 resume，而是模拟「选中 -> 场景重建 -> create() 读取」这条真实路径，
//        并加了静态检查「活跃代码里不许再出现旧键名」。
//
// V28.15 改动（相对 V28.14）—— 更改配方无效（主人反馈：选完别的配方还是 10,10,10,10）：
//   [根因] ★ 又是「pop/goto 只是排期」的坑（第三次）。
//        SceneManager.pop = function() { if (this._stack.length > 0) this.goto(this._stack.pop()); };
//        SceneManager.goto = function(sceneClass) {
//            if (sceneClass) this._nextScene = new sceneClass();   // ← 只改 _nextScene
//            if (this._scene) this._scene.stop();
//        };
//        「pop 前抓 SceneManager._scene 再回调」拿到的其实是配方列表自己，
//        那个对象上没有 applyRecipe，于是静默什么都不做 —— 换配方完全失效。
//   [修复] 改走 $gameTemp 中转 + resume()：
//            Scene_ForgeRecipeList.onRecipeOk:  $gameTemp._forgePendingRecipe = costs.slice(); SceneManager.pop();
//            Scene_ForgeTenPull.resume:         读 $gameTemp._forgePendingRecipe -> applyRecipe() -> 置回 null
//   [新增] 测试台第 18 组：更改配方往返。
//          并把 push/goto/pop 桩件改成**严格复刻 MZ 的排期语义**
//          （goto 只写 _nextScene，当帧 _scene 不变；新增 changeScene() 模拟下一帧切换）——
//          这样「靠当帧 _scene 取前一个场景」这类错误以后会被测出来。
//
// V28.14 改动（相对 V28.13）—— 结果窗排版优化（主人要求：字号与物品界面相同、有中线、每行两个一左一右）：
//   [改] refreshText 重写为【两列表格】：
//          · 物品名 20 号字 / 数量 16 号字 —— 与工程里的物品列表窗口（Window_ForgeList）一致
//          · 中间一条贯穿整张表格的竖中线（在内容宽的正中间）
//          · 每格底部一条细分隔线
//          · 表头「刀身 / 数量」+ 标题行居中
//          · 备注（素材不足 / 99 上限）用灰色小字排在表格下方
//   [新增] parseResultLines()：把结果文本解析成 { title, pairs, notes }；
//          pairs 每项为 [左格, 右格]，每格 { name, count }。
//   [新增] drawFlatLine()：画纯色细线。
//          不能直接 contents.fillRect —— 位图会套用描边设置，1px 的线会把描边也画出来变粗；
//          这里临时把 outlineWidth 设为 0，画完恢复。
//   [容量] 最坏情况（10 种产物）：标题 32 + 表头 30 + 5 行 x 44 + 备注 26 = 308px <= 内容高 364px，
//          一窗放得下，不需要滚动。
//   [新增] 测试台第 14 组重写为表格排版断言：字号（名字 20 / 数量 16）、
//          左右两列的 x 坐标各成一组、数量右对齐、中线位于内容宽正中、每格文字不超格宽。
//
// V28.13 改动（相对 V28.12）—— 结果窗改用 Window_Base 后崩掉：
//   [根因] setHandler / callHandler 只定义在 Window_Selectable 上（rmmz_windows.js L1032/L1040），
//        Window_Base 根本没有。人家 V28.12 换基类时凭印象以为这是通用方法，于是运行到
//        Scene_ForgeTenResult.create() 直接抛 TypeError: this._resultWindow.setHandler is not a function。
//   [修复] 结果窗自己接管输入：
//          · 自己存 handler（_resultHandlers）+ setHandler / callResultHandler
//          · 自己实现 processHandling（确定/取消 -> 关闭）
//          · 自己实现 processTouch + isTouchedInside（点在窗口内 -> 关闭）
//          · 自己实现 isOpenAndActive（MZ 也只把它放在 Window_Selectable 上）
//          · ★ 重写 update() 里显式调用 processHandling / processTouch ——
//            Window_Base.update 并不会调用它们（那两个方法同样只存在于 Window_Selectable），
//            不自己接上就会出现「窗口开着但按什么都没反应、关不掉」
//   [清理] 删掉一段残留的重复定义（旧版 processTouch/processHandling 里调用了
//          Window_Base.prototype.processTouch —— 那个方法根本不存在，会二次崩溃）
//   [升级] tools/check-mz-api.js 提到 v2：
//          · 解析插件里的继承关系，能判断「Window_Base 子类调用 setHandler」是错的
//          · 新增「成员变量方法调用」检查（this._resultWindow.setHandler()）
//          · 自测样本同步扩充，自测不过就不输出结论
//   [新增] 测试台第 17 组：完整跑一遍 Scene_ForgeTenResult.create()，
//          断言全程不抛错、窗口具备全部被调用的方法、update() 不抛错。
//          （这个 bug 本该在这里被抓到 —— 以前只测「画得对不对」，从没跑过 create() 本身）
//
// V28.12 改动（相对 V28.11）—— 结果窗排版优化（主人反馈「排版非常丑」）：
//   [改] 产物【每行 2 把】，不再全挤在一行断字。
//        标题 1 行 + 产出行 ceil(种数/2) 行 + 备注 1 行；
//        10 种产物共 7 行 x 30px = 210px，窗口内容高 364px 完全放得下。
//   [改] ★ 结果窗由 Window_Selectable 改为 Window_Base —— 去掉闪烁的光标格子。
//        原来继承 Window_Selectable 会带出：
//          · 一个「光标格子」（MZ 用 itemBackColor1/2 画的黄色渐变底）—— 纯文本结果窗上很丑
//          · 滚动基座（updateOrigin / scrollBaseY）—— 曾把内容整体搬走，造成「字不见了」的怪象
//          · paint() -> drawAllItems() -> drawItem() 刷新链 —— 反过来会清掉绘制的字
//        现在只需要「显示一段文本 + 按确定/取消关闭」，Window_Base 正合适：
//        没有光标、没有滚动、没有刷新链，refreshText() 是唯一绘字入口。
//   [改] 相应移除 maxItems / drawItem / isCurrentItemEnabled 等列表控件相关方法。
//   [新增] 测试台第 16 组：断言结果窗必须派生自 Window_Base、不含列表控件方法，
//          并验证「每行最多 2 把」「每行宽度都放得进窗口」。
//
// V28.11 改动（相对 V28.10）—— 结果窗口空白的真正原因（探针实测确认）：
//   [根因] ★ MZ 1.10 的 SceneManager.push 根本不支持传参数！
//        源码：
//          SceneManager.push = function(sceneClass) {
//              this._stack.push(this._scene.constructor);
//              this.goto(sceneClass);            // 只传类名
//          };
//          SceneManager.goto = function(sceneClass) {
//              if (sceneClass) this._nextScene = new sceneClass();   // 一个参数都不传
//          };
//        所以人家写的 SceneManager.push(Scene_ForgeTenResult, text) 里的 text 被直接丢掉，
//        场景构造时 arguments.length === 0，_resultText 永远是空字符串 → 结果窗必然空白。
//        探针实测：push 时 args[0] 长度 73，进入 initialize 时 arguments数 = 0。
//   [修复] 改用 $gameTemp 中转（MZ 里跨场景传值的正确做法）：
//            showResult:  $gameTemp._forgeTenResultText = text; SceneManager.push(Scene_ForgeTenResult);
//            create():    this._resultText = $gameTemp._forgeTenResultText || "";
//                         $gameTemp._forgeTenResultText = null;   // 用完即清
//   [修复] 同一个坑还有第二处：投料界面把配方传给十连场景也用了 push 第二参数，
//        改为 $gameTemp._forgeTenPullRecipe 中转。否则十连界面看不到当前投的配方。
//   [新增] 测试台第 15 组：跨场景传值测试。
//        并把 push/goto 桩件改成严格复刻 MZ —— 只接受一个参数、场景构造时 arguments.length === 0，
//        同时断言「showResult 必须写 $gameTemp」「push 不得携带多余参数」。
//
// V28.9 改动（相对 V28.8）—— 结果窗口仍然空白，两个真因：
//   [修复] ★ split("\\n") 写错：JS 里 "\\n" 是「反斜杠 + n」两个字符，不是换行符！
//        而 showResult 造文本时用的 join("\\n") 同样产出两个字符的字面量。
//        于是「用两字符去拆两字符」虽然能拆开，但游戏消息窗会把字面量 \n 转成真换行，
//        结果窗再拿 split("\\n") 去拆真换行 —— 永远拆不开，整段被当成一行，超宽被裁，
//        窗口看上去一片空白。两处都改成 "\n"。
//   [修复] drawItem 改为留空：MZ 的 Window_Selectable.paint() 会先 contents.clear()
//        再 drawAllItems() -> drawItem()。把绘字塞进 drawItem 会被 MZ 的刷新流程反复清掉。
//        现在 refreshText() 是唯一画字入口，只由「窗口初始化完成」与「灌入文本」显式调用。
//   [新增] refreshText 再加一层按宽度折行：产物多或备注有多个道具名时，单行会超宽被裁。
//   [新增] 测试台第 14 组：换行往返测试 + 超长文本折行测试。
//        （这个 bug 原测试没抓到，因为样本用真换行、实现两端都用错的分隔符，各自自洽）
//
// V28.8 改动（相对 V28.7）—— 十连结果窗口空白：
//   [修复] 三个叠加的原因，全是人家凭印象用 API：
//     1) drawTextEx 内部第一句是 resetFontSettings()，会把 contents.fontSize 重置回默认 ——
//        V28.1 那句「改 19 号字省空间」其实一直无效，实测行高始终 42。
//     2) drawTextEx 必须带 width：width 为 undefined 时 calcTextHeight 算出 NaN，
//        processAllText 一个字符都不画 —— 这就是「结果窗口整片空白」的直接原因。
//     3) 文本灌得太早：new 完就 setResultText（内部 refresh），那时窗口还没 addWindow，画不到内容上。
//   [改] refreshText() 成为唯一绘字入口，用 contents.drawText 逐行画：
//        位图真实签名是 Bitmap.drawText(text, x, y, maxWidth, lineHeight, align)，
//        而 Window_Base.drawText(text, x, y, maxWidth, align) 内部固定用 lineHeight()=36 当行高。
//        所以直接调位图、行高自己定为 30、字号 17。
//   [改] 结果文本排版：产物合并成一行（「名字 xN，名字 xN…」），整段固定 3~4 行。
//        内容宽 564px、字号 17 时一行约 33 个全角字符，逐行列 10 把会撑爆窗口。
//   [改] setResultText 改在 addWindow 之后调用。
//   [新增] 测试台加通用防护：全程拦截 Window_Base.drawText，
//          一旦有调用把 lineHeight 误当 align 传进来就报错（第 14 组断言）。
//
// V28.7 改动（相对 V28.6）：
//   [修复] ★ 显示十连结果时崩溃：TypeError: this.scrollTop is not a function
//          Window_ForgeTenResult.setResultText 里调了 scrollTop()，
//          而本工程 MZ 1.10 的 Window_Scrollable 只有 scrollTo(x, y) / smoothScrollTo(x, y)，
//          根本没有 scrollTop —— 跑到「显示十连结果」那一步直接抛错。
//          现改为 scrollToTop()：优先 scrollTo(0,0)，其次 smoothScrollTo(0,0)，都没有就跳过。
//   [新增] tools/check-mz-api.js：把 js/rmmz_*.js 载进 vm 拿到真实原型链，
//          再逐个检查插件里每个 this 方法调用是否真的存在，杜绝此类「凭印象调 API」。
//          该工具内置自测（故意放一个 scrollTop 样本），自测不过就不输出结论。
//
// V28.6 改动（相对 V28.5）—— 配方列表改为 MZ 原生滚动：
//   [修复] 撤回 V28.4 对 itemRect / scrollBaseX / scrollBaseY / contentsHeight 的接管。
//          实测证实这套「自作聪明」的补丁会和 MZ 1.10 的滚动机制打架：
//            Window_Scrollable.scrollBlockHeight() 默认取 itemHeight()
//            updateOrigin() 会按真实滚动值调用 updateScrollBase() -> moveCursorBy(-deltaY) 并回调 paint()
//          人家把 itemRect 里的 scrollBase 抠掉，引擎却照样按滚动值搬内容，
//          两边对不上就出现「只有第一行文字留在原位、其余蒸发」以及「配方式叠在一起」。
//   [改] Window_ForgeRecipeList 写法现在与工程内已正常工作的 Window_ForgeList 完全一致：
//        只提供 itemHeight() / maxCols() / maxItems() / drawItem()，滚动、光标、可见项全交给引擎。
//        drawItem 内部坐标一律以 itemRect 为基准（rect.y + n），不再用绝对坐标。
//   [保留] createWindows 里 select(0) + refresh() 作为打开列表时的绘制保险。
//
// V28.5 改动（相对 V28.4）：
//   [修复] 配方列表第一次打开可能整片空白：补一次显示用的重绘保险。
//
// V28.4 改动（相对 V28.3）：
//   [修复] 配方列表项内部布局重排；配方列表补标准 initialize 与声音方法。
//   （注：同版本里对 itemRect 的接管已在 V28.6 撤回）
//
// V28.3 改动（相对 V28.2）：
//   [新增] 十连界面菜单加「更改配方」——不用退回投料界面重投，直接在本页换配方
//   [新增] Scene_ForgeRecipeList / Window_ForgeRecipeList
//   [修复] 十连标题窗最后一行「最多可锻…」被切掉：窗口高 132 -> 184，内部整块重排
//   [修复] 十连命令窗按 4 项重算：4 x 44 + 36 + 8 = 220
//
// V28.2 改动（相对 V28.1）—— 修「窗口位置对了但内容显示不全」：
//   [修复] 主菜单蓝色预览行底边 76 > 每项高 70；每项高改 80，窗口高 420 -> 480
//   [修复] 主菜单 drawText 宽度误填窗口宽 560（内容宽只有 524）——「蓝色提示文字出框」的直接原因
//   [修复] 十连命令窗：MZ 命令项高 = lineHeight(36)+8 = 44，3 项需 132，内容区只有 108，只显示 2 项
//   [修复] 十连标题窗红色「不足」标签右越界 26px
//   [修复] 投料窗「十连锻刀」行底边 51 > 项高 50 被裁
//   [修复] 数字输入窗按钮第二行底边 240 > 内容区 234 被裁 6px；窗口高 270 -> 300
//   [修复] 十连结果窗按默认字号 28（行高 42）只放得下 8 行；改 19 号字
//
// V28.1 改动（相对 V28.0）：
//   [修复] 十连界面布局错位：命令窗底边超出屏幕 40px 且压住帮助窗。改为钉底 + 定高 + 自上而下排布。
//
// V28.0 改动（相对 V27.0）：
//   [新增] 主菜单第 2 项「十连锻刀」：同一配方连续锻造，一次最多 10 把
//   [新增] 十连结果窗口：单个窗口内列举本次获得的全部刀名
//   [修复] 数字输入窗不再把预填值归零（setup 保留当前值）
//   [修复] 素材不足时给出文字提示（原来只有蜂鸣器）
//   [修复] 玩家一件素材都没投时给出文字提示
//   [修复] 道具上限 99 保护：满 99 时不再静默丢失，改为提示并跳过
//   [修复] 数值输入上限 = min(持有量, 未满上限)，避免无意义的满额输入
//   [修复] 配方未命中时的提示文案不再谎称「锻造完成」
//   [修复] 可锻造列表显示持有量，便于判断能不能负担

/*:
 * @target MZ
 * @plugindesc 一个可配置的简易锻刀系统，支持玩家输入素材数量决定锻造结果，支持同配方十连锻刀。(V28.18)
 * @author AI Assistant
 *
 * @help
 * 使用方法：
 * 1. 打开锻刀界面：SimpleForge open
 * 2. 设置可锻造物品范围：SimpleForge setRange start end
 * - start: 起始物品ID
 * - end: 结束物品ID
 * 3. 设置特定锻造列表：SimpleForge setList item1 item2 item3 ...
 * - 使用物品ID列表，用空格分隔
 * 4. 清空可锻造列表：SimpleForge clearList
 * 5. 设置锻造素材：SimpleForge setMaterial varId varName
 * - varId: 游戏变量ID
 * - varName: 素材名称（显示用）
 * 6. 设置锻造消耗：SimpleForge setCost itemId cost1 cost2 ...
 * - itemId: 物品ID
 * - cost1, cost2...: 对应素材的消耗数量
 *
 * 界面说明（V28.17）：
 * 主菜单共 4 项：
 *   [1] 锻刀       —— 进入锻刀界面：选配方，然后选锻一次还是连续十次
 *   [2] 可锻造列表 —— 查看全部配方与持有量；点选某个配方会直接进入锻刀界面
 *   [3] 素材信息   —— 查看各素材当前持有量
 *   [4] 退出工坊
 *
 * 锻刀界面（原「开始锻刀」与「十连锻刀」已整合 —— 十连界面本来就能单次锻）：
 *   [1] 锻造 x1     —— 按当前配方锻一次
 *   [2] 锻造 x10    —— 按当前配方连锻十次，结果在一个窗口里统一展示
 *   [3] 更改配方    —— 打开配方列表，选另一个配方（不用退回主菜单）
 *   [4] 返回        —— 回到上一级（主菜单或可锻造列表）
 *   顶部标题窗会显示当前配方、各素材「持有/需求」与最多可锻次数。
 *
 * 十连规则：
 * - 十连严格使用「同一个配方」投料 10 次，总消耗 = 配方消耗 x 实际锻打次数。
 * - 若同档位有多把刀共享同一配方，则结果在这几把刀之间随机（沿用单次锻刀规则）。
 * - 素材不足以支撑 10 次时，会按可行的最大次数锻造；一次都锻不了则直接提示并返回。
 *
 * 修改消耗/配方的推荐做法（素材与消耗都写在事件里）：
 *   SimpleForge setMaterial 70 木炭
 *   SimpleForge setCost 50 10 10 10 10
 *   SimpleForge setList 50 51 52
 *
 * 示例：
 * SimpleForge setRange 11 20
 * SimpleForge setMaterial 1 铁矿石
 * SimpleForge setMaterial 2 煤炭
 * SimpleForge setCost 11 5 3
 * SimpleForge setCost 12 8 5
 *
 * @command open
 * @text 打开锻刀界面
 * @desc 打开锻刀主界面。
 *
 * @command setRange
 * @text 设置锻造物品范围
 * @desc 设置可锻造物品的ID范围，会添加到现有列表中。
 *
 * @arg start
 * @type number
 * @text 起始ID
 * @desc 可锻造物品的起始ID。
 *
 * @arg end
 * @type number
 *
 * @text 结束ID
 * @desc 可锻造物品的结束ID。
 *
 * @command setList
 * @text 设置锻造物品列表
 * @desc 设置特定的可锻造物品ID列表，会添加到现有列表中。
 *
 * @arg items
 * @type string
 * @text 物品ID列表
 * @desc 用空格分隔的物品ID列表，例如: 11 13 15 17 19
 *
 * @command clearList
 * @text 清空锻造列表
 * @desc 清空所有可锻造物品。
 *
 * @command setMaterial
 * @text 设置锻造素材
 * @desc 设置锻造所需的素材变量。
 *
 * @arg varId
 * @type number
 * @text 变量ID
 * @desc 用于存储素材数量的游戏变量ID。
 *
 * @arg varName
 * @type string
 * @text 素材名称
 * @desc 素材的显示名称。
 *
 * @command setCost
 * @text 设置锻造消耗
 * @desc 设置锻造特定物品所需的素材消耗。
 *
 * @arg itemId
 *
 * @type number
 * @text 物品ID
 * @desc 要设置消耗的物品ID。
 *
 * @arg costs
 * @type string
 * @text 消耗数量
 * @desc 用空格分隔的素材消耗数量，顺序与设置的素材变量对应。
 */

(function() {
    'use strict';

    // =========================================================================
    //  [新] 挂钩 Game_System 以实现存档兼容性
    // =========================================================================

    // 1. 别名 Game_System.prototype.initialize
    const _Game_System_initialize = Game_System.prototype.initialize;
    Game_System.prototype.initialize = function() {
        _Game_System_initialize.call(this);
        // 2. 初始化插件数据
        this.initSimpleForgeData();
    };

    // 3. 定义初始化方法
    Game_System.prototype.initSimpleForgeData = function() {
        // 检查数据是否已存在 (兼容旧存档)
        if (!this._simpleForgeData) {
            this._simpleForgeData = {
                availableItems: [], // 可锻造的物品ID列表
                materials: [],      // 锻造素材列表 [{id, name}]
                costs: {}           // 物品消耗 {itemId: [cost1, cost2, ...]}
            };
        }
    };

    // [新] 辅助函数，用于在访问前确保 $gameSystem 上的数据存在
    // 这主要用于防止从没有此数据的旧存档加载时出错
    function ensureForgeData() {
        if ($gameSystem && !$gameSystem._simpleForgeData) {
            $gameSystem.initSimpleForgeData();
        }
    }
    
    // **新增辅助函数：检查点是否在矩形内**
    function isPointInRect(x, y, rect) {
        return x >= rect.x && x < rect.x + rect.width && y >= rect.y && y < rect.y + rect.height;
    }
    
    const PLUGIN_NAME = "SimpleForge";
    
    // [旧] 存储锻造配置 (已被移至 $gameSystem._simpleForgeData)
    /*
    const _forgeData = {
        availableItems: [], // 可锻造的物品ID列表
        useRange: false,    // 是否使用范围模式
        rangeStart: 1,      // 范围起始
        rangeEnd: 10,       // 范围结束
        materials: [],      // 锻造素材列表 [{id, name}]
        costs: {}           // 物品消耗 {itemId: [cost1, cost2, ...]}
    };
    */
    
    // 初始化默认范围
    function initializeForgeData() {
        // [新] 确保 $gameSystem 上的数据存在
        ensureForgeData();
        // (原内容已移至 Game_System.prototype.initSimpleForgeData)
    }
    
    // 添加物品到列表，避免重复
    function addItemsToForgeList(newItems) {
        ensureForgeData(); // [新]
        for (const id of newItems) {
            if ($dataItems[id] && !$gameSystem._simpleForgeData.availableItems.includes(id)) { // [改]
                $gameSystem._simpleForgeData.availableItems.push(id); // [改]
            }
        }
    }
    
    /**
     * 获取物品的消耗描述。
     * [V28.18] 去掉「持有 N」—— 带持有量会把每行挤得很长、换行难看。
     * 想知道的持有量可以看「素材信息」页；能不能负担由物品名的灰显表示。
     */
    function getCostDescription(itemId) {
        ensureForgeData();
        const costs = $gameSystem._simpleForgeData.costs[itemId];
        if (!costs || $gameSystem._simpleForgeData.materials.length === 0) {
            return "无需素材";
        }
        
        let description = "";
        for (let i = 0; i < costs.length; i++) {
            if (i >= $gameSystem._simpleForgeData.materials.length) break;
            
            const material = $gameSystem._simpleForgeData.materials[i];
            const cost = costs[i];
            
            // [V28.20] 素材之间用「 ｜ 」分隔（左右留半角空格，避免贴字）；
            // 之前是 ", "（半角逗号+空格，中文串里几乎看不见）或 "木炭: 10"，格式不统一。
            if (description !== "") description += " ｜ ";
            description += `${material.name} ${cost}`;
        }
        
        return description;
    }
    
    // [V28.0 新增] 当前素材是否够这个配方（列表里用来给不够的配方打标记）
    function canAffordCost(itemId) {
        ensureForgeData();
        const costs = $gameSystem._simpleForgeData.costs[itemId];
        if (!costs || costs.length === 0) return false;
        return countPossibleForges(costs) > 0;
    }
    
    // =========================================================================
    //  [V28.0 新增] 辅助函数：道具上限保护、数量文本、可锻次数
    // =========================================================================
    
    /**
     * 安全的道具获得：检查 99 上限，避免 gainItem 静默丢弃。
     * @param {object} item   $dataItems 中的道具对象
     * @param {number} amount 想要获得的数量
     * @param {Array}  warnings 溢出时把物品名推进这个数组
     * @return {number} 实际获得的数量
     */
    function safeGainItem(item, amount, warnings) {
        if (!item || amount <= 0) return 0;
        const held = $gameParty.numItems(item);
        const room = Math.max(0, 99 - held);   // 道具默认上限 99
        const gained = Math.min(amount, room);
        
        if (gained > 0) {
            $gameParty.gainItem(item, gained);
        }
        if (gained < amount && warnings) {
            warnings.push(item.name);
        }
        return gained;
    }
    
    // 把数量数组格式化成 "10 ｜ 10 ｜ 10 ｜ 10" 这样的文本
    // [V28.20] 素材数量之间用全角「｜」分隔，左右各留一个半角空格。
    // 之前是 join(" ")，但 20/26 号字下半角空格只有 5~6px，连着两个数字（如「10 10 10 10」）
    // 根本分不清是几个数；换成全角竖线后每组数量一眼可辨。
    // 单写「10｜10」又太贴字（主人反馈「贴得太紧」），所以两边各留一个空格。
    function formatAmounts(values) {
        if (!values || values.length === 0) return "0";
        return values.join(" ｜ ");
    }
    
    // [V28.0] 计算某个配方当前最多能锻打几次（不含道具 99 上限的产物判断）
    // 十连和「可锻次数」提示都靠它，避免各处重复计算。
    function countPossibleForges(costs) {
        ensureForgeData();
        if (!costs || costs.length === 0) return 0;
        
        let possible = Infinity;
        const materials = $gameSystem._simpleForgeData.materials;
        
        for (let i = 0; i < costs.length; i++) {
            const cost = costs[i];
            if (cost <= 0) continue;
            if (i >= materials.length) break;
            const held = $gameVariables.value(materials[i].id);
            possible = Math.min(possible, Math.floor(held / cost));
        }
        
        if (possible === Infinity) return 0;
        return Math.max(0, possible);
    }

    // 注册插件命令
    PluginManager.registerCommand(PLUGIN_NAME, "open", function(args) {
        console.log("SimpleForge: 插件命令被调用");
        try {
            initializeForgeData(); // [保留] 这个函数现在只调用 ensureForgeData()
            SceneManager.push(Scene_SimpleForge);
        } catch (error) {
            console.error("SimpleForge: 打开场景失败:", error);
            $gameMessage.add("锻刀系统暂时无法打开，请检查系统配置。");
        }
    });

    PluginManager.registerCommand(PLUGIN_NAME, "setRange", function(args) {
        ensureForgeData(); // [新]
        const start = parseInt(args.start);
        const end = parseInt(args.end);
        
        if (isNaN(start) || isNaN(end) || start <= 0 || end <= 0) {
            console.error("SimpleForge: 无效的物品ID范围", args);
            $gameMessage.add("设置锻造范围失败：参数无效");
            return;
        }
        
        if (start > end) {
            console.error("SimpleForge: 起始ID不能大于结束ID", args);
            $gameMessage.add("设置锻造范围失败：起始ID不能大于结束ID");
            return;
        }
        
        // 收集范围内的所有物品ID
        const newItems = [];
        for (let i = start; i <= end; i++) {
            if ($dataItems[i]) {
                newItems.push(i);
            }
        }
        
        // 添加到现有列表
        const beforeCount = $gameSystem._simpleForgeData.availableItems.length; // [改]
        addItemsToForgeList(newItems);
        const addedCount = $gameSystem._simpleForgeData.availableItems.length - beforeCount; // [改]
        
        console.log(`SimpleForge: 添加锻造范围 ${start} - ${end}, 新增物品: ${addedCount}, 总计: ${$gameSystem._simpleForgeData.availableItems.length}`); // [改]
        //$gameMessage.add(`已添加锻造范围 ${start} 到 ${end}\\n新增 ${addedCount} 种物品，当前总计 ${$gameSystem._simpleForgeData.availableItems.length} 种`); // [改]
    });

    PluginManager.registerCommand(PLUGIN_NAME, "setList", function(args) {
        ensureForgeData(); // [新]
        if (!args.items || typeof args.items !== 'string') {
            console.error("SimpleForge: 物品列表参数无效", args);
            $gameMessage.add("设置锻造列表失败：参数无效");
            return;
        }
        
        const itemIds = args.items.split(' ').map(id => parseInt(id.trim())).filter(id => !isNaN(id) && id > 0);
        
        if (itemIds.length === 0) {
            console.error("SimpleForge: 没有有效的物品ID", args);
            $gameMessage.add("设置锻造列表失败：没有有效的物品ID");
            return;
        }
        
        // 验证物品是否存在并添加到列表
        const beforeCount = $gameSystem._simpleForgeData.availableItems.length; // [改]
        const validItems = [];
        
        for (const id of itemIds) {
            if ($dataItems[id]) {
                validItems.push(id);
            } else {
                console.warn(`SimpleForge: 物品ID ${id} 不存在，已跳过`);
            }
        }
        
        addItemsToForgeList(validItems);
        const addedCount = $gameSystem._simpleForgeData.availableItems.length - beforeCount; // [改]
        
        console.log(`SimpleForge: 添加锻造列表 ${validItems.join(', ')}, 新增物品: ${addedCount}, 总计: ${$gameSystem._simpleForgeData.availableItems.length}`); // [改]
        //$gameMessage.add(`已添加 ${addedCount} 种物品到锻造列表\\n当前总计 ${$gameSystem._simpleForgeData.availableItems.length} 种`); // [改]
    });

    PluginManager.registerCommand(PLUGIN_NAME, "clearList", function(args) {
        ensureForgeData(); // [新]
        const previousCount = $gameSystem._simpleForgeData.availableItems.length; // [改]
        $gameSystem._simpleForgeData.availableItems = []; // [改]
        
        console.log(`SimpleForge: 清空锻造列表，之前有 ${previousCount} 种物品`);
        $gameMessage.add(`已清空锻造列表，移除了 ${previousCount} 种物品`);
    });

    PluginManager.registerCommand(PLUGIN_NAME, "setMaterial", function(args) {
        ensureForgeData(); // [新]
        const varId = parseInt(args.varId);
        const varName = args.varName;
        
        if (isNaN(varId) || varId <= 0) {
            console.error("SimpleForge: 无效的变量ID", args);
            $gameMessage.add("设置锻造素材失败：变量ID无效");
            return;
        }
        
        if (!varName || varName.trim() === "") {
            console.error("SimpleForge: 素材名称不能为空", args);
            $gameMessage.add("设置锻造素材失败：素材名称不能为空");
            return;
        }
        
        // 添加或更新素材
        const existingIndex = $gameSystem._simpleForgeData.materials.findIndex(m => m.id === varId); // [改]
        if (existingIndex >= 0) {
            $gameSystem._simpleForgeData.materials[existingIndex].name = varName; // [改]
            console.log(`SimpleForge: 更新锻造素材 ${varId}: ${varName}`);
            //$gameMessage.add(`已更新锻造素材: ${varName}`);
        } else {
            $gameSystem._simpleForgeData.materials.push({ id: varId, name: varName }); // [改]
            console.log(`SimpleForge: 添加锻造素材 ${varId}: ${varName}, 总计: ${$gameSystem._simpleForgeData.materials.length}`); // [改]
            //$gameMessage.add(`已添加锻造素材: ${varName}`);
        }
    });

    PluginManager.registerCommand(PLUGIN_NAME, "setCost", function(args) {
        ensureForgeData(); // [新]
        const itemId = parseInt(args.itemId);
        const costsStr = args.costs;
        
        if (isNaN(itemId) || itemId <= 0) {
            console.error("SimpleForge: 无效的物品ID", args);
            $gameMessage.add("设置锻造消耗失败：物品ID无效");
            return;
        }
        
        if (!costsStr || typeof costsStr !== 'string') {
            console.error("SimpleForge: 消耗参数无效", args);
            $gameMessage.add("设置锻造消耗失败：消耗参数无效");
            return;
        }
        
        const costValues = costsStr.split(' ').map(cost => parseInt(cost.trim())).filter(cost => !isNaN(cost) && cost >= 0);
        
        if (costValues.length === 0) {
            console.error("SimpleForge: 没有有效的消耗值", args);
            $gameMessage.add("设置锻造消耗失败：没有有效的消耗值");
            return;
        }
        
        $gameSystem._simpleForgeData.costs[itemId] = costValues; // [改]
        
        console.log(`SimpleForge: 设置物品 ${itemId} 的消耗为 ${costValues.join(', ')}`);
        //$gameMessage.add(`已设置物品 #${itemId} 的锻造消耗`);
    });

    // =========================================================================
    // 主场景类定义
    // =========================================================================
    
    function Scene_SimpleForge() {
        this.initialize.apply(this, arguments);
    }

    Scene_SimpleForge.prototype = Object.create(Scene_MenuBase.prototype);
    Scene_SimpleForge.prototype.constructor = Scene_SimpleForge;

    Scene_SimpleForge.prototype.create = function() {
        Scene_MenuBase.prototype.create.call(this);
        this.createWindows();
    };

    Scene_SimpleForge.prototype.createWindows = function() {
		// 创建主窗口
		// [V28.18] 改为「仅主功能文字」的单行排版后，4 项 × 64 = 256，加内边距共需 292。
		// 窗口 320 高、垂直居中（(624-320)/2 = 152），不再有下部空白。
		const rect = new Rectangle(80, 152, 560, 320);
		this._mainWindow = new Window_SimpleForge(rect);
		
		// 设置处理器
		this._mainWindow.setHandler('forge', this.onForge.bind(this));
		this._mainWindow.setHandler('list', this.onShowForgeList.bind(this));
		this._mainWindow.setHandler('materials', this.onShowMaterials.bind(this));
		this._mainWindow.setHandler('cancel', this.popScene.bind(this));
		
		// 添加到场景
		this.addWindow(this._mainWindow);
		
		// 激活窗口
		this._mainWindow.activate();
		
		// 【核心修复】：设置输入保护罩，忽略激活时残留的输入，防止点击穿透。
		// 10 帧（约 0.16 秒）足以消除残余点击。
		if (this._mainWindow.setTouchGuard) {
			this._mainWindow.setTouchGuard(10); 
		}
	};

    /**
     * [V28.17] 主菜单「锻刀」入口 —— 整合原「开始锻刀」与「十连锻刀」。
     *
     * 十连界面本来就能单次锻（菜单里有「锻造 x1」），所以两个入口是重复的。
     * 现在统一进 Scene_ForgeTenPull：在那里选配方、选 x1 还是 x10。
     */
    Scene_SimpleForge.prototype.onForge = function() {
        ensureForgeData();
        // 检查是否有可锻造的物品
        if ($gameSystem._simpleForgeData.availableItems.length === 0) {
            $gameMessage.add("没有可锻造的物品，请先设置锻造范围或列表。");
            SoundManager.playBuzzer();
            this.setupMessageCallback();
            return;
        }
        
        // 检查是否有设置素材
        if ($gameSystem._simpleForgeData.materials.length === 0) {
            $gameMessage.add("没有设置锻造素材，请先设置锻造素材。");
            SoundManager.playBuzzer();
            this.setupMessageCallback();
            return;
        }
        
        SceneManager.push(Scene_ForgeTenPull);
    };

    Scene_SimpleForge.prototype.onShowForgeList = function() {
        ensureForgeData(); // [新]
        // 检查是否有可锻造的物品
        if ($gameSystem._simpleForgeData.availableItems.length === 0) { // [改]
            $gameMessage.add("当前没有可锻造的物品。");
            this.setupMessageCallback();
            return;
        }
        
        // 创建可锻造列表场景
        SceneManager.push(Scene_ForgeList);
    };

    Scene_SimpleForge.prototype.onShowMaterials = function() {
        // 创建素材信息场景
        SceneManager.push(Scene_MaterialInfo);
    };

    Scene_SimpleForge.prototype.setupMessageCallback = function() {
        // 保存当前场景引用
        const scene = this;
        
        // 重写消息系统的更新方法，检测消息是否结束
        const originalUpdate = Scene_Message.prototype.update;
        Scene_Message.prototype.update = function() {
            originalUpdate.call(this);
            
            // 检查消息是否已经结束
            if (!this._messageWindow || !this._messageWindow.isOpening() && !this._messageWindow.isClosing()) {
                if (this._messageWindow && this._messageWindow.isClosed()) {
                    // 恢复原始更新方法
                    Scene_Message.prototype.update = originalUpdate;
                    
                    // 重新打开锻刀界面
                    setTimeout(function() {
                        SceneManager.push(Scene_SimpleForge);
                    }, 10);
                }
            }
        };
        
        // 关闭当前场景
        this.popScene();
    };

    // =========================================================================
    // 可锻造列表场景
    // =========================================================================
    
    function Scene_ForgeList() {
        this.initialize.apply(this, arguments);
    }

    Scene_ForgeList.prototype = Object.create(Scene_MenuBase.prototype);
    Scene_ForgeList.prototype.constructor = Scene_ForgeList;

    Scene_ForgeList.prototype.create = function() {
        Scene_MenuBase.prototype.create.call(this);
        this.createWindows();
    };

    // 【修改】：重写创建窗口方法，修改标题提示并绑定 'ok' 事件
    Scene_ForgeList.prototype.createWindows = function() {
        ensureForgeData(); // [新]
        // 创建标题窗口
        this._titleWindow = new Window_Base(new Rectangle(80, 40, 600, 60));
        // [V28.22] 标题去掉括号注释「（点击配方即开锻）」，点选即开锻由帮助窗说明
        this._titleWindow.drawText("可锻造列表", 0, 0, 600, "center");
        this._titleWindow.drawText(`总计: ${$gameSystem._simpleForgeData.availableItems.length} 种物品`, 0, 30, 600, "center"); 
        this.addWindow(this._titleWindow);
        
        // 创建列表窗口
        // [V28.18] 高度与「更改配方」列表对齐：每项 56，可见 7 项
        const listRect = new Rectangle(80, 108, 600, 400);
        this._listWindow = new Window_ForgeList(listRect);
        
        // 【新增】：绑定确定键/鼠标点击处理器
        this._listWindow.setHandler('ok', this.onItemOk.bind(this));
        this._listWindow.setHandler('cancel', this.popScene.bind(this));
        this.addWindow(this._listWindow);
        
        // 与「更改配方」列表一致：建好后显式重绘一次
        this._listWindow.select(0);
        this._listWindow.refresh();
        
        // 激活列表窗口
        this._listWindow.activate();
    };

    /**
     * [V28.17] 点选配方后直接进入锻刀界面，并把该配方带过去。
     *
     * 以前是「带回投料界面预填素材数量」，现在投料界面已整合进锻刀界面，
     * 所以这里直接把配方交给 Scene_ForgeTenPull（用 $gameTemp 中转 —— MZ 的 push 不支持传参）。
     * 玩家在锻刀界面里再选「锻造 x1」还是「锻造 x10」。
     */
    Scene_ForgeList.prototype.onItemOk = function() {
        ensureForgeData();
        const index = this._listWindow.index();
        const itemId = $gameSystem._simpleForgeData.availableItems[index];
        const costs = $gameSystem._simpleForgeData.costs[itemId];
        
        if (!costs || costs.length === 0) {
            SoundManager.playBuzzer();
            $gameMessage.add("这个物品没有设置消耗，无法作为配方。");
            return;
        }
        
        // 用与锻刀界面一致的中转键（create() 会读取并清空）
        $gameTemp._forgeTenPullRecipe = costs.slice();
        
        SoundManager.playOk();
        SceneManager.push(Scene_ForgeTenPull);
    };

    // =========================================================================
    // 素材信息场景
    // =========================================================================
    
    function Scene_MaterialInfo() {
        this.initialize.apply(this, arguments);
    }

    Scene_MaterialInfo.prototype = Object.create(Scene_MenuBase.prototype);
    Scene_MaterialInfo.prototype.constructor = Scene_MaterialInfo;

    Scene_MaterialInfo.prototype.create = function() {
        Scene_MenuBase.prototype.create.call(this);
        this.createWindows();
    };

    Scene_MaterialInfo.prototype.createWindows = function() {
        // 创建标题窗口
        this._titleWindow = new Window_Base(new Rectangle(80, 50, 600, 60));
        this._titleWindow.drawText("锻造素材信息", 0, 0, 600, "center");
        this.addWindow(this._titleWindow);
        
        // 创建素材窗口
        const materialRect = new Rectangle(80, 120, 600, 380);
        this._materialWindow = new Window_MaterialInfo(materialRect);
        this._materialWindow.setHandler('cancel', this.popScene.bind(this));
        this.addWindow(this._materialWindow);
        
        // 激活素材窗口
        this._materialWindow.activate();
    };

    // =========================================================================
    // 素材信息窗口（只读展示各素材持有量）
    // =========================================================================
    
    function Window_MaterialInfo() {
        this.initialize.apply(this, arguments);
    }

    Window_MaterialInfo.prototype = Object.create(Window_Selectable.prototype);
    Window_MaterialInfo.prototype.constructor = Window_MaterialInfo;

    Window_MaterialInfo.prototype.initialize = function(rect) {
        Window_Selectable.prototype.initialize.call(this, rect);
        this.refresh();
        this.select(0);
        this.activate();
    };

    Window_MaterialInfo.prototype.playOkSound = function() {
        SoundManager.playOk();
    };

    Window_MaterialInfo.prototype.playCancelSound = function() {
        SoundManager.playCancel();
    };

    Window_MaterialInfo.prototype.playBuzzerSound = function() {
        SoundManager.playBuzzer();
    };

    Window_MaterialInfo.prototype.isOkEnabled = function() {
        return this.isOpenAndActive();
    };

    Window_MaterialInfo.prototype.isCancelEnabled = function() {
        return this.isOpenAndActive();
    };

    Window_MaterialInfo.prototype.isTouchOkEnabled = function() {
        return this.isOpenAndActive();
    };

    Window_MaterialInfo.prototype.maxItems = function() {
        ensureForgeData();
        return $gameSystem._simpleForgeData.materials.length;
    };

    Window_MaterialInfo.prototype.itemHeight = function() {
        return 60;
    };

    Window_MaterialInfo.prototype.maxCols = function() {
        return 1;
    };

    Window_MaterialInfo.prototype.maxVisibleItems = function() {
        return 6;
    };

    Window_MaterialInfo.prototype.drawItem = function(index) {
        const rect = this.itemRect(index);
        ensureForgeData();
        
        if (index >= $gameSystem._simpleForgeData.materials.length) return;
        
        const material = $gameSystem._simpleForgeData.materials[index];
        const currentAmount = $gameVariables.value(material.id);
        
        // 绘制项目背景
        this.contents.fillRect(rect.x, rect.y, rect.width, rect.height - 2, "rgba(0, 0, 0, 0.5)");
        
        // 绘制选中状态的边框
        if (index === this.index()) {
            this.contents.fillRect(rect.x, rect.y, rect.width, 2, "rgba(255, 255, 255, 0.8)");
            this.contents.fillRect(rect.x, rect.y + rect.height - 2, rect.width, 2, "rgba(255, 255, 255, 0.8)");
            this.contents.fillRect(rect.x, rect.y, 2, rect.height, "rgba(255, 255, 255, 0.8)");
            this.contents.fillRect(rect.x + rect.width - 2, rect.y, 2, rect.height, "rgba(255, 255, 255, 0.8)");
        }
        
        // 绘制素材图标和名称 - 左侧区域
        this.contents.fontSize = 20;
        this.drawText(`● ${material.name}`, rect.x + 15, rect.y + 15, 300, "left");
        
        // 绘制持有数量 - 右侧区域
        this.contents.fontSize = 22;
        const amountText = `持有: ${currentAmount}`;
        const amountWidth = this.textWidth(amountText);
        this.drawText(amountText, rect.x + rect.width - amountWidth - 20, rect.y + 15, amountWidth, "left");
        
        // 恢复默认字体大小
        this.contents.fontSize = 28;
    };

    Window_MaterialInfo.prototype.isCurrentItemEnabled = function() {
        return false; // 列表项不可选择，仅供查看
    };

    // 处理取消键
    Window_MaterialInfo.prototype.processCancel = function() {
        this.playCancelSound();
        this.callHandler('cancel');
    };

    // =========================================================================
	// 主窗口类定义 - 【最终修复点：添加触摸保护罩】
	// =========================================================================
		
	function Window_SimpleForge() {
		this.initialize.apply(this, arguments);
	}

	Window_SimpleForge.prototype = Object.create(Window_Selectable.prototype);
	Window_SimpleForge.prototype.constructor = Window_SimpleForge;

	Window_SimpleForge.prototype.initialize = function(rect) {
		Window_Selectable.prototype.initialize.call(this, rect);
		this._touchGuard = 0; // <<--- 新增：触摸保护帧数计数器
		this.refresh();
		this.select(0);
		this.activate();
	};

	// **新增：设置触摸保护的帧数**
	Window_SimpleForge.prototype.setTouchGuard = function(frames) {
		this._touchGuard = frames;
	};

	// **覆写：更新方法，处理触摸保护**
	Window_SimpleForge.prototype.update = function() {
		Window_Selectable.prototype.update.call(this);
		
		// 如果触摸保护计数器大于 0，则每帧递减
		if (this._touchGuard > 0) {
			this._touchGuard--;
		}
	};

	// **覆写：触摸处理方法，实现保护逻辑**
	Window_SimpleForge.prototype.processTouch = function() {
		if (this._touchGuard > 0) {
			// 如果保护罩开启，则忽略触摸输入，防止点击穿透
			return; 
		}
		// 调用父类的原始触摸处理逻辑
		Window_Selectable.prototype.processTouch.call(this);
	};

	// 添加缺失的声音方法
	Window_SimpleForge.prototype.playOkSound = function() {
		SoundManager.playOk();
	};

	Window_SimpleForge.prototype.playCancelSound = function() {
		SoundManager.playCancel();
	};

	Window_SimpleForge.prototype.playBuzzerSound = function() {
		SoundManager.playBuzzer();
	};

	// 确保输入方法可用
	Window_SimpleForge.prototype.isOkEnabled = function() {
		return this.isOpenAndActive();
	};

	Window_SimpleForge.prototype.isCancelEnabled = function() {
		return this.isOpenAndActive();
	};

	Window_SimpleForge.prototype.isTouchOkEnabled = function() {
		// 在这里也检查保护罩，防止在 processTouch 之前被调用
		return this.isOpenAndActive() && this._touchGuard === 0;
	};

	// 窗口内容
	Window_SimpleForge.prototype.maxItems = function() {
		return 4; // [V28.18] 锻刀 / 可锻造列表 / 素材信息 / 退出工坊
	};

	Window_SimpleForge.prototype.itemHeight = function() {
		// 单项只画一行主文案（22 号字，行高 33），64 足够且留白均匀
		return 64;
	};
	
	// [V28.17] 锻刀项下方的预览文案（显示当前配方的可锻次数）
	Window_SimpleForge.prototype.tenPullPreview = function() {
		ensureForgeData();
		
		if ($gameSystem._simpleForgeData.availableItems.length === 0 ||
		    $gameSystem._simpleForgeData.materials.length === 0) {
			return "尚未设置配方";
		}
		
		const possible = this.getTenPullPossibleCount();
		if (possible <= 0) {
			return "素材不足，暂时无法锻刀";
		}
		return `当前配方最多可锻 ${possible} 次`;
	};
	
	// [V28.0 新增] 当前素材下十连最多能锻几次（上限 10）
	Window_SimpleForge.prototype.getTenPullPossibleCount = function() {
		ensureForgeData();
		
		const data = $gameSystem._simpleForgeData;
		let best = 0;
		
		for (const itemId of data.availableItems) {
			const costs = data.costs[itemId];
			if (!costs || costs.length === 0) continue;
		// 十连始终按同一配方投料，所以取「最好的那个配方」能撑几次
			const possible = countPossibleForges(costs);
			if (possible > best) best = possible;
		}
		
		return Math.min(10, best);
	};

	Window_SimpleForge.prototype.drawItem = function(index) {
		const rect = this.itemRect(index);
		// [V28.1 修复] 一律用 contentsWidth() 而不是 rect.width。
		// rect.width = itemWidth = innerWidth = 窗口宽-36 = 524，而原来填的 560（= 窗口宽）比内容区还宽，
		// 居中时会往右偏出去，这就是「蓝色提示文字出框」的原因。
		const cw = this.contentsWidth();
		
		// 绘制项目背景
		this.contents.fillRect(rect.x, rect.y, cw, rect.height - 4, "rgba(0, 0, 0, 0.5)");
		
		// 绘制选中状态的边框
		if (index === this.index()) {
			this.contents.fillRect(rect.x, rect.y, cw, 4, "rgba(255, 255, 255, 0.8)");
			this.contents.fillRect(rect.x, rect.y + rect.height - 4, cw, 4, "rgba(255, 255, 255, 0.8)");
			this.contents.fillRect(rect.x, rect.y, 4, rect.height, "rgba(255, 255, 255, 0.8)");
			this.contents.fillRect(rect.x + cw - 4, rect.y, 4, rect.height, "rgba(255, 255, 255, 0.8)");
		}
		
		// 绘制选项内容
		// [V28.19] 字号 22 -> 26（与工程基准字号一致），文字垂直居中 (64-39)/2 ≈ 12
		this.contents.fontSize = 26;
		switch(index) {
			case 0:
				this.drawText("锻刀", rect.x, rect.y + 12, cw, "center");
				break;
			case 1:
				this.drawText("可锻造列表", rect.x, rect.y + 12, cw, "center");
				break;
			case 2:
				this.drawText("素材信息", rect.x, rect.y + 12, cw, "center");
				break;
			case 3:
				this.drawText("退出工坊", rect.x, rect.y + 12, cw, "center");
				break;
		}
		
		// 恢复默认字体大小
		this.contents.fontSize = 28;
	};

	Window_SimpleForge.prototype.isCurrentItemEnabled = function() {
		return true;
	};

	// 处理确定键 (确保键盘/手柄输入也在保护罩内)
	Window_SimpleForge.prototype.processOk = function() {
		// 检查输入保护罩
		if (this._touchGuard > 0) {
			return;
		}
		
		if (this.isCurrentItemEnabled()) {
			this.playOkSound();
			const index = this.index();
			
			switch(index) {
				case 0:
					this.callHandler('forge');
					break;
				case 1:
					this.callHandler('list');
					break;
				case 2:
					this.callHandler('materials');
					break;
				case 3:
					this.callHandler('cancel');
					break;
			}
		} else {
			this.playBuzzerSound();
		}
	};

	// 处理取消键
	Window_SimpleForge.prototype.processCancel = function() {
		if (this._touchGuard > 0) {
			return;
		}
		this.playCancelSound();
		this.callHandler('cancel');
	};

    // =========================================================================
    // 可锻造列表窗口
    // =========================================================================
    
    function Window_ForgeList() {
        this.initialize.apply(this, arguments);
    }

    Window_ForgeList.prototype = Object.create(Window_Selectable.prototype);
    Window_ForgeList.prototype.constructor = Window_ForgeList;

    Window_ForgeList.prototype.initialize = function(rect) {
        Window_Selectable.prototype.initialize.call(this, rect);
        this.refresh();
        this.select(0);
        this.activate();
    };

    // 添加缺失的声音方法 
    Window_ForgeList.prototype.playOkSound = function() {
        SoundManager.playOk();
    };

    Window_ForgeList.prototype.playCancelSound = function() {
        SoundManager.playCancel();
    };

    Window_ForgeList.prototype.playBuzzerSound = function() {
        SoundManager.playBuzzer();
    };

    // 确保输入方法可用
    Window_ForgeList.prototype.isOkEnabled = function() {
        return this.isOpenAndActive();
    };

    Window_ForgeList.prototype.isCancelEnabled = function() {
        return this.isOpenAndActive();
    };

    Window_ForgeList.prototype.isTouchOkEnabled = function() {
        return this.isOpenAndActive();
    };

    Window_ForgeList.prototype.maxItems = function() {
        ensureForgeData(); // [新]
        return $gameSystem._simpleForgeData.availableItems.length; // [改]
    };

    // [V28.18] 80 -> 56，与「更改配方」列表统一（同样的两行文字排得下，且能多显示两行）
    Window_ForgeList.prototype.itemHeight = function() {
        return 56;
    };

    Window_ForgeList.prototype.maxCols = function() {
        return 1;
    };

    Window_ForgeList.prototype.maxVisibleItems = function() {
        return 7;   // [V28.18] 5 -> 7，与「更改配方」列表一致
    };

    Window_ForgeList.prototype.drawItem = function(index) {
        ensureForgeData(); // [新]
        const rect = this.itemRect(index);
        const itemId = $gameSystem._simpleForgeData.availableItems[index]; // [改]
        const item = $dataItems[itemId];
        
        if (!item) return;
        
        // 绘制项目背景（高度与「更改配方」列表一致）
        this.contents.fillRect(rect.x, rect.y, rect.width, rect.height, "rgba(0, 0, 0, 0.5)");
        
        // 绘制选中状态的边框
        if (index === this.index()) {
            this.contents.fillRect(rect.x, rect.y, rect.width, 2, "rgba(255, 255, 255, 0.8)");
            this.contents.fillRect(rect.x, rect.y + rect.height - 2, rect.width, 2, "rgba(255, 255, 255, 0.8)");
            this.contents.fillRect(rect.x, rect.y, 2, rect.height, "rgba(255, 255, 255, 0.8)");
            this.contents.fillRect(rect.x + rect.width - 2, rect.y, 2, rect.height, "rgba(255, 255, 255, 0.8)");
        }
        
        // [V28.18] 排版与「更改配方」列表完全统一：
        //   第一行  物品名（19 号）                  右侧：可锻 N 次 / 素材不足（16 号，右对齐）
        //   第二行  配方：木炭 15  玉钢 15 …（14 号）
        // 两者都是 itemHeight 56 的单列列表，看起来才一致。
        const affordable = canAffordCost(itemId);
        const innerX = rect.x + 12;
        const innerW = rect.width - 24;
        
        // 第一行：物品名 + 右侧可锻次数
        this.contents.fontSize = 19;
        if (!affordable) this.changeTextColor(ColorManager.textColor(8));
        this.drawText(`〖${item.name}〗`, innerX, rect.y + 3, innerW - 190, "left");
        this.resetTextColor();
        
        this.contents.fontSize = 16;
        const possible = countPossibleForges($gameSystem._simpleForgeData.costs[itemId] || []);
        if (possible > 0) {
            this.changeTextColor(ColorManager.systemColor());
            this.drawText(`可锻 ${Math.min(TEN_PULL_MAX, possible)} 次`,
                          innerX + innerW - 180, rect.y + 4, 180, "right");
            this.resetTextColor();
        } else {
            this.changeTextColor(ColorManager.textColor(18));
            this.drawText("素材不足", innerX + innerW - 180, rect.y + 4, 180, "right");
            this.resetTextColor();
        }
        
        // 第二行：配方明细
        this.contents.fontSize = 14;
        const costDesc = getCostDescription(itemId);
        const lines = this.wrapText(costDesc, innerW);
        this.drawText("配方：" + (lines[0] || "未设置"),
                      innerX, rect.y + 26, innerW, "left");
        
        // 恢复默认字体大小
        this.contents.fontSize = 28;
    };

    // 文本换行函数
    // [V28.0] 分隔符由「, 」改为「,」——消耗描述里带了括号，原来的写法对不上新格式
    Window_ForgeList.prototype.wrapText = function(text, maxWidth) {
        const words = text.split(',');
        const lines = [];
        let currentLine = '';
        
        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            const testLine = currentLine ? currentLine + ',' + word : word;
            const testWidth = this.textWidth(testLine);
            
            if (testWidth > maxWidth && currentLine !== '') {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        }
        
        if (currentLine) {
            lines.push(currentLine);
        }
        
        return lines;
    };

    Window_ForgeList.prototype.isCurrentItemEnabled = function() {
        return true; // 要快速跳转，列表项可以被选择
    };

    // 处理取消键
    Window_ForgeList.prototype.processCancel = function() {
        this.playCancelSound();
        this.callHandler('cancel');
    };
    
    // =========================================================================
    // [V28.17] 锻刀场景 —— 整合原「开始锻刀」与「十连锻刀」
    // =========================================================================
    
    // 一次最多连锻几次
    const TEN_PULL_MAX = 10;
    
    // 菜单文案（菜单行与帮助窗共用，避免两处文案不一致）
    // [V28.22] 去掉标题后的括号注释（主人要求「让界面清爽一点」）：
    //   锻造 x1（投入一次素材）      -> 锻造 x1
    //   锻造 x10（同一配方连续十次） -> 锻造 x10
    //   返回（不锻造）               -> 返回
    // 这些说明本来就和下面的帮助窗重复，而且 label 还会带进结果提示
    // （「锻造 x1（投入一次素材）完成，共 1 把：」读起来很啰嗦）。
    const TEN_PULL_MENU = {
        x1: "锻造 x1",
        x10: "锻造 x10",
        recipe: "更改配方",
        close: "返回"
    };
    
    function Scene_ForgeTenPull() {
        this.initialize.apply(this, arguments);
    }
    
    Scene_ForgeTenPull.prototype = Object.create(Scene_MenuBase.prototype);
    Scene_ForgeTenPull.prototype.constructor = Scene_ForgeTenPull;
    
    /**
     * [V28.17] 严格全等匹配：投入的素材数量与某个配方的消耗完全一致才算命中。
     *
     * 这个方法原来挂在 Scene_MaterialInput 上（十连场景靠原型借用）。
     * 投料界面整合进锻刀界面后，正式搬到本场景名下，成为它自己的能力。
     */
    Scene_ForgeTenPull.prototype.findMatchingItems = function(inputValues) {
        ensureForgeData();
        const inputs = inputValues || this._recipeValues || [];
        const matchedItems = [];
        
        // 遍历所有可锻造物品
        for (const itemId of $gameSystem._simpleForgeData.availableItems) {
            const costs = $gameSystem._simpleForgeData.costs[itemId];
            
            // 如果没有设置消耗，跳过
            if (!costs) continue;
            
            // 检查消耗是否与输入匹配
            let isMatch = true;
            for (let i = 0; i < inputs.length; i++) {
                const inputAmount = inputs[i];
                const costAmount = (i < costs.length) ? costs[i] : 0;
                
                // 如果输入了这种素材，但消耗不匹配
                if (inputAmount > 0 && inputAmount !== costAmount) {
                    isMatch = false;
                    break;
                }
                
                // 如果没有输入这种素材，但物品需要这种素材
                if (inputAmount === 0 && costAmount > 0) {
                    isMatch = false;
                    break;
                }
            }
            
            if (isMatch) {
                matchedItems.push(itemId);
            }
        }
        
        return matchedItems;
    };
        Scene_ForgeTenPull.prototype.initialize = function(recipeValues) {
        Scene_MenuBase.prototype.initialize.call(this);
        this._recipeValues = (recipeValues && recipeValues.length) ? recipeValues.slice() : null;
        this._forgingInProgress = false;
        this._tenPullExecuted = false;
    };
    
    Scene_ForgeTenPull.prototype.create = function() {
        Scene_MenuBase.prototype.create.call(this);
        ensureForgeData();
        
        // [V28.16 修复] 统一用 $gameTemp._forgeTenPullRecipe 这一个中转键。
        //
        // 实测（探针日志）证实：从配方列表返回时，MZ 是把十连场景**重建**一次，
        // 而不是调 resume() —— 所以根本走不到 resume 那条路。
        // 而 create() 读的键是 _forgeTenPullRecipe，onRecipeOk 写的却是 _forgePendingRecipe，
        // 两个键名对不上，配方就在重建时丢掉了（现象：换完配方还是 10,10,10,10）。
        // 现在 onRecipeOk 与 create() 用同一个键。
        const pendingRecipe = $gameTemp._forgeTenPullRecipe;
        $gameTemp._forgeTenPullRecipe = null;
        if (!this._recipeValues && pendingRecipe && pendingRecipe.length) {
            this._recipeValues = pendingRecipe.slice();
        }
        
        // 还是没有配方，就用「可锻造列表」里第一项的配方作为默认值
        if (!this._recipeValues) {
            const items = $gameSystem._simpleForgeData.availableItems;
            if (items.length > 0) {
                const firstCosts = $gameSystem._simpleForgeData.costs[items[0]];
                if (firstCosts) this._recipeValues = firstCosts.slice();
            }
        }
        

        this.createWindows();
    };

    /**
     * [V28.15 修复] 从配方列表回来时，套用选中的配方。
     *
     * 之前是靠「pop 前抓 SceneManager._scene 再回调」，结果失效 —— 原因同 V28.11：
     *   SceneManager.pop() 只是把前一场景排期到 _nextScene，**当帧 _scene 根本没换**，
     *   所以人家抓到的其实是配方列表自己，那个对象上根本没有 applyRecipe，于是静默什么都不做。
     * 现在改成走 $gameTemp 中转：配方列表把成本写进 $gameTemp._forgePendingRecipe，
     * 本场景在 resume()（被重新激活）时读取并套用。
     */
    Scene_ForgeTenPull.prototype.resume = function() {
        if (Scene_MenuBase.prototype.resume) {
            Scene_MenuBase.prototype.resume.call(this);
        }
        
        // 与 create() / onRecipeOk 用同一个中转键
        const pending = $gameTemp._forgeTenPullRecipe;
        $gameTemp._forgeTenPullRecipe = null;
        if (pending && pending.length > 0) {
            this.applyRecipe(pending);
        }
    };
    
    /**
     * [V28.3 修复] 十连界面布局（第二次修）。
     *
     * V28.2 之后主人反馈「窗口内还是文字显示不全」，截图上标题窗最后一行「最多可锻…」
     * 被切掉半截、上面还压着一条深色带。根因是标题窗高度给得太紧（132），
     * 结论行底边几乎贴住下边框；同时整块垂直居中会让标题窗下沿靠近底部的消息窗。
     *
     * [V28.20 修复] 主人反馈「最多可锻…」那一行**下缘仍有遮挡**。
     * 这次是算过的，不是拍的：
     *   MZ 的 Window_Base.drawText 把行高写死成 lineHeight() = 36（见 rmmz_windows.js:217），
     *   字号 20 的字基线落在行内偏下位置 => 整行实际要占到 y+36 才算干净。
     *   旧值：结论行 y = 74 + 2*26 + 10 = 136，136 + 36 = 172，而窗口内容高只有 184，
     *   余量 12px —— 降部一压就贴住下边框。
     *   现在标题窗给到 216：216 - 172 = 44px 余量，怎么压都不会碰到下边框。
     *   另外「持有 / 需求」与结论行里的素材数量改用全角「｜」分隔，
     *   因为 20 号字下空格会被压缩得几乎看不见，连着两个数字会糊成一团。
     */
    Scene_ForgeTenPull.prototype.createWindows = function() {
        const boxW = Graphics.boxWidth;
        const boxH = Graphics.boxHeight;
        const margin = 80;
        const gap = 10;
        const contentW = boxW - margin * 2;
        // [V28.20] 配方行(8..44) + 表头(50..80) + 素材两行(74..126) + 结论行(136..172)，底部余 44px
        const titleH = 216;
        // MZ Window_Command 每项高 = lineHeight(36) + 8 = 44，4 项需 176，加基准内边距 36 共 212，
        // 再留 18px 余量避免第四行贴住下边框
        const menuH = 230;
        
        // 帮助窗：钉在画面底部
        this.createHelpWindow();
        const helpH = this._helpWindow.height;
        this._helpWindow.y = boxH - helpH;
        this._helpWindow.setText("十连锻刀：同一配方连续锻造，一次最多 10 把。");
        
        // 自上而下排布，从画面上方起，避开底部的消息窗
        const blockH = titleH + gap + menuH;
        const availH = this._helpWindow.y;
        let titleY = Math.max(24, Math.round((availH - blockH) / 2));
        titleY = Math.min(titleY, Math.max(24, availH - blockH - gap));
        
        // 标题窗：本次配方 + 素材持有量 + 可锻次数
        this._titleWindow = new Window_Base(new Rectangle(margin, titleY, contentW, titleH));
        this._titleWindow.padding = 0;   // 让 drawTitle 里的坐标 = 内容区坐标，避免再算一次内边距
        this.addWindow(this._titleWindow);
        this.drawTitle();
        
        // 命令窗：x1 / x10 / 更改配方 / 返回
        this._commandWindow = new Window_ForgeTenPullCommand(
            new Rectangle(margin, titleY + titleH + gap, contentW, menuH));
        this._commandWindow.setHandler('x1', this.onForgeOnce.bind(this));
        this._commandWindow.setHandler('x10', this.onForgeTen.bind(this));
        this._commandWindow.setHandler('recipe', this.onOpenRecipeList.bind(this));
        this._commandWindow.setHandler('cancel', this.onClose.bind(this));
        this._commandWindow.setHelpWindow(this._helpWindow);
        this._commandWindow.setRecipeContext(this._recipeValues);
        this.addWindow(this._commandWindow);
        this._commandWindow.activate();
    };
    
    // 标题窗内容：本次配方 + 各素材够不够 + 可锻次数
    // 注意：标题窗 padding 已设为 0，这里的 0 就是窗口内容区左边缘
    Scene_ForgeTenPull.prototype.drawTitle = function() {

        this._titleWindow.contents.clear();
        
        const w = this._titleWindow.contentsWidth();
        const pad = 8;
        const labelW = 112;                       // 左侧「本次配方：」标签宽度
        const halfW = Math.floor(w / 2);          // 两列，每列一半
        const nameW = 64;                         // 素材名列宽（留一个字给数值列的左空格）
        const tagW = 36;                          // 「不足」标签宽度
        
        // 没有配方可用，直接提示
        if (!this._recipeValues || this._recipeValues.length === 0) {
            this._titleWindow.contents.fontSize = 22;
            this._titleWindow.drawText("当前没有可用的配方。", 0, 60, w, "center");
            this._titleWindow.contents.fontSize = 28;
            return;
        }
        
        const materials = $gameSystem._simpleForgeData.materials;
        const possible = countPossibleForges(this._recipeValues);
        const times = Math.min(TEN_PULL_MAX, possible);
        
        // 第一行：配方（左标签 + 右配方），字号放大以便看清
        this._titleWindow.contents.fontSize = 20;
        this._titleWindow.drawText("本次配方：", pad, 12, labelW, "left");
        this._titleWindow.contents.fontSize = 26;
        this._titleWindow.drawText(formatAmounts(this._recipeValues), pad + labelW, 8, w - labelW - pad * 2, "left");
        
        // 第二行：表头
        // [V28.20] 表头与明细统一用「 ｜ 」，和结论行、配方行的分隔符保持一致
        // （表头保持紧凑不空格，因为它只是给下面明细做注释）
        this._titleWindow.contents.fontSize = 15;
        this._titleWindow.changeTextColor(ColorManager.systemColor());
        this._titleWindow.drawText("素材", pad, 50, 80, "left");
        this._titleWindow.drawText("持有｜需求", pad + 76, 50, 140, "left");
        this._titleWindow.resetTextColor();
        
        // 第三行起：素材明细，两列网格
        this._titleWindow.contents.fontSize = 17;
        const entries = [];
        for (let i = 0; i < this._recipeValues.length; i++) {
            const cost = this._recipeValues[i];
            if (cost <= 0 || i >= materials.length) continue;
            entries.push({
                name: materials[i].name,
                held: $gameVariables.value(materials[i].id),
                cost: cost,
            });
        }
        
        entries.forEach((e, i) => {
            const col = i % 2;
            const row = Math.floor(i / 2);
            const x = pad + col * halfW;
            // [V28.20] 名称 72px + 「持有｜需求」= nameW 偏移；两列都按减去「不足」标签后的宽度落字，
            // 避免 4 位数字时右半格被窗口内容宽截掉。
            const valW = halfW - nameW - tagW - 10;
            const y = 74 + row * 26;
            const enough = e.held >= e.cost;
            
            this._titleWindow.drawText(e.name, x, y, nameW, "left");
            this._titleWindow.drawText(`${e.held} ｜ ${e.cost}`, x + nameW, y, valW, "left");
            if (!enough) {
                this._titleWindow.changeTextColor(ColorManager.textColor(18)); // 红色
                // 贴在每一格的右端（右列正好是内容区右缘），不会窜出窗口
                this._titleWindow.drawText("不足", x + halfW - tagW - 8, y, tagW, "right");
                this._titleWindow.resetTextColor();
            }
        });
        
        // 结论行：跟着素材行数往下排。
        // [V28.20] MZ 的 drawText 行高固定 36（rmmz_windows.js:217 写死 lineHeight()），
        // 所以这里要按 36 算占位：2 行素材 → y = 74 + 2*26 + 10 = 136，底边 136 + 36 = 172。
        // 旧窗口高 184，只剩 12px 余量 —— 20 号字的降部一压就贴住下边框，主人看到的就是这个。
        // 现在窗口高 216，余 44px，彻底不贴边。
        const rows = Math.max(1, Math.ceil(entries.length / 2));
        this._titleWindow.contents.fontSize = 20;
        const line = (possible <= 0)
            ? "素材不足，一次都锻不动。"
            : `最多可锻 ${times} 次（${formatAmounts(this._recipeValues)} × ${times}）`;
        const lineY = 74 + rows * 26 + 10;
        this._titleWindow.drawText(line, 0, lineY, w, "center");
        
        this._titleWindow.contents.fontSize = 28;
    };
    
    // 返回不锻造：退回投料界面
    Scene_ForgeTenPull.prototype.onClose = function() {
        SoundManager.playCancel();
        this.popScene();
    };
    
    // [V28.3 新增] 更改配方：打开配方列表
    Scene_ForgeTenPull.prototype.onOpenRecipeList = function() {
        ensureForgeData();
        
        if ($gameSystem._simpleForgeData.availableItems.length === 0) {
            $gameMessage.add("当前没有可选的配方。");
            SoundManager.playBuzzer();
            return;
        }
        
        SoundManager.playOk();
        SceneManager.push(Scene_ForgeRecipeList);
    };
    
    // [V28.3 新增] 配方列表选好之后回调（由 Scene_ForgeRecipeList 调用）
    Scene_ForgeTenPull.prototype.applyRecipe = function(costs) {
        if (!costs || costs.length === 0) return;
        this._recipeValues = costs.slice();
        this.drawTitle();
        
        // 光标回到「锻造 x10」，方便选完配方顺手就锻
        if (this._commandWindow && this._commandWindow.select) {
            this._commandWindow.select(1);
        }
    };
    
    // 「锻造 x1」：借用同一个配方，只锻一次
    Scene_ForgeTenPull.prototype.onForgeOnce = function() {
        this.startForge(TEN_PULL_MENU.x1, 1, 0);
    };
    
    // 「锻造 x10」：同配方连锻十次
    Scene_ForgeTenPull.prototype.onForgeTen = function() {
        this.startForge(TEN_PULL_MENU.x10, 10, 1);
    };
    
    /**
     * 执行锻造。
     * @param {string} label        显示用名称
     * @param {number} times        尝试锻造次数
     * @param {number} minTimes     少于这个次数就当作素材不足直接提示
     */
    Scene_ForgeTenPull.prototype.startForge = function(label, times, minTimes) {
        ensureForgeData();
        
        if (this._forgingInProgress) return;
        
        // 配方缺失保护
        if (!this._recipeValues || this._recipeValues.length === 0) {
            $gameMessage.add("当前没有可用的配方。");
            SoundManager.playBuzzer();
            return;
        }
        
        // 素材可行性预检：能锻几次就锻几次
        const possible = countPossibleForges(this._recipeValues);
        
        if (possible < Math.max(1, minTimes)) {
            if (possible <= 0) {
                $gameMessage.add(`${label}失败：素材不足，一件都锻不出来。`);
            } else {
                $gameMessage.add(`${label}失败：素材只够锻 ${possible} 次，不足 ${minTimes} 次。`);
            }
            SoundManager.playBuzzer();
            return;
        }
        
        const actualTimes = Math.min(times, possible);
        this._forgingInProgress = true;
        
        // 停用菜单，防止重复触发
        this._commandWindow.deactivate();
        
        // 开始锻造
        const records = this.doForgeLoop(actualTimes);
        this._forgingInProgress = false;
        this._tenPullExecuted = true;
        
        // 展示结果（单次直接用游戏消息窗，多次用专门的结果窗）
        this.showResult(label, actualTimes, possible, records);
    };
    
    /**
     * 循环锻造。
     * 沿用单次锻刀的规则：严格全等匹配配方 → 命中池内等概率随机；
     * 未命中则从全部可锻造物品中随机（与单次锻刀保持一致，不额外制造规则差异）。
     * @return {Array} [{itemId, name, doubled}]
     */
    Scene_ForgeTenPull.prototype.doForgeLoop = function(times) {
        const records = [];
        const materials = $gameSystem._simpleForgeData.materials;
        const data = $gameSystem._simpleForgeData;
        const overflowWarnings = [];
        
        for (let n = 0; n < times; n++) {
            // 1) 先确认素材够（够才扣，避免任何超扣）
            let enough = true;
            for (let i = 0; i < this._recipeValues.length; i++) {
                const cost = this._recipeValues[i];
                if (cost <= 0 || i >= materials.length) continue;
                if ($gameVariables.value(materials[i].id) < cost) {
                    enough = false;
                    break;
                }
            }
            if (!enough) break;
            
            // 2) 扣素材
            for (let i = 0; i < this._recipeValues.length; i++) {
                const cost = this._recipeValues[i];
                if (cost <= 0 || i >= materials.length) continue;
                const held = $gameVariables.value(materials[i].id);
                $gameVariables.setValue(materials[i].id, held - cost);
            }
            
            // 3) 匹配配方并抽产物
            const matched = this.findMatchingItems(this._recipeValues);
            let itemId;
            if (matched.length > 0) {
                itemId = matched[Math.floor(Math.random() * matched.length)];
            } else if (data.availableItems.length > 0) {
                itemId = data.availableItems[Math.floor(Math.random() * data.availableItems.length)];
            } else {
                break;
            }
            
            const item = $dataItems[itemId];
            if (!item) continue;
            
            // 4) 获得物品（带上限保护，满 99 时记下来，不静默吞掉）
            const gained = safeGainItem(item, 1, overflowWarnings);
            
            records.push({
                itemId: itemId,
                name: item.name,
                doubled: (gained === 0)
            });
        }
        
        this._overflowWarnings = overflowWarnings;
        return records;
    };
    
    // 结果展示
    Scene_ForgeTenPull.prototype.showResult = function(label, actualTimes, possible, records) {
        // 一次都没锻成
        if (records.length === 0) {
            $gameMessage.add(`${label}失败：素材不足，一件都锻不出来。`);
            SoundManager.playBuzzer();
            this._commandWindow.activate();
            return;
        }
        
        // 统计各产物数量（结果用「名字 xN」汇总，方便主人一眼看完）
        const counts = {};
        const order = [];
        for (const r of records) {
            if (!counts[r.name]) { counts[r.name] = 0; order.push(r.name); }
            counts[r.name]++;
        }
        
        const lines = [];
        // [V28.12] 结果排版：标题一行，然后【每行 2 把】。
        // 之前是把产物全挤在一行，10 种产物时会折成 4 行、断字难看；
        // 现在每行固定 2 项，最多 5 行产物 + 1 行标题 + 1 行备注 = 7 行，窗口放得下。
        // [V28.20] 每行两把之间由全角空格改成「｜」，计数统一成「× N」。
        // 全角空格在 20 号字下几乎看不出分界，「小狐丸 x3 三日月宗近 x2」会连成一串；
        // 另外「x3」这种半角 x 在中文语境里也容易被读成字母。
        // [V28.20] 结果排版：每行 2 把，两把之间用「｜」分隔。
        // [V28.22] label 与「完成」之间补一个空格 —— 去掉括号注释后
        // 「锻造 x1完成，共 1 把：」读起来挤在一起，加空格后是「锻造 x1 完成，共 1 把：」。
        lines.push(`${label} 完成，共 ${records.length} 把：`);
        const PRODUCTS_PER_ROW = 2;
        for (let i = 0; i < order.length; i += PRODUCTS_PER_ROW) {
            const row = order.slice(i, i + PRODUCTS_PER_ROW)
                .map(name => `${name} × ${counts[name]}`);
            lines.push(row.join(" ｜ "));
        }
        
        // 备注行：只锻到一半 / 素材不足
        if (records.length < actualTimes) {
            lines.push(`（素材耗尽，实际只锻了 ${records.length} 次）`);
        } else if (possible < TEN_PULL_MAX) {
            lines.push(`（素材只够 ${possible} 次）`);
        }
        
        // 满 99 被吞掉的部分
        const warnings = this._overflowWarnings || [];
        if (warnings.length > 0) {
            const uniq = [];
            for (const w of warnings) { if (uniq.indexOf(w) < 0) uniq.push(w); }
            lines.push(`（${uniq.join("、")} 已达 99 件上限，多出的刀身没能收进库房）`);
        }
        
        let text = lines.join("\n");
        

        // 单次结果 → 用游戏原本的消息窗，保持和旧版一致的观感
        if (records.length === 1) {
            $gameMessage.add(text);
            SoundManager.playOk();
            $gameTemp._forgeResultShowing = true;
            SceneManager.goto(Scene_Map);
            return;
        }
        
        // 多次结果 → 用一个专门的窗口把全部产物列出来
        SoundManager.playOk();
        
        // [V28.11 关键修复] 用 $gameTemp 中转，不能靠 push 传参！
        //
        // MZ 1.10 的 SceneManager.push 只接受一个参数：
        //     SceneManager.push = function(sceneClass) {
        //         this._stack.push(this._scene.constructor);
        //         this.goto(sceneClass);
        //     };
        //     SceneManager.goto = function(sceneClass) {
        //         if (sceneClass) this._nextScene = new sceneClass();   // ← 一个参数都不传
        //     };
        // 所以 SceneManager.push(Scene_ForgeTenResult, text) 里的 text 会被直接丢掉，
        // 场景构造时 arguments.length === 0，_resultText 永远是空字符串 —— 结果窗必然空白。
        // 这正是「十连结果窗口一片空白」的真正原因。
        $gameTemp._forgeTenResultText = text;
        SceneManager.push(Scene_ForgeTenResult);
    };
    
    // =========================================================================
    // [V28.0 新增] 十连菜单窗口（3 项：x1 / x10 / 返回）
    // =========================================================================
    
    function Window_ForgeTenPullCommand() {
        this.initialize.apply(this, arguments);
    }
    
    Window_ForgeTenPullCommand.prototype = Object.create(Window_Command.prototype);
    Window_ForgeTenPullCommand.prototype.constructor = Window_ForgeTenPullCommand;
    
    Window_ForgeTenPullCommand.prototype.initialize = function(rect) {
        Window_Command.prototype.initialize.call(this, rect);
        this._recipeValues = null;
        this._touchGuard = 0;
    };
    
    Window_ForgeTenPullCommand.prototype.setRecipeContext = function(values) {
        this._recipeValues = values;
    };
    
    // 菜单行
    Window_ForgeTenPullCommand.prototype.makeCommandList = function() {
        this.addCommand(TEN_PULL_MENU.x1, 'x1', true);
        this.addCommand(TEN_PULL_MENU.x10, 'x10', true);
        this.addCommand(TEN_PULL_MENU.recipe, 'recipe', true);
        this.addCommand(TEN_PULL_MENU.close, 'cancel', true);
    };
    
    Window_ForgeTenPullCommand.prototype.numVisibleRows = function() {
        return 4;
    };
    
    // 帮助窗文案
    Window_ForgeTenPullCommand.prototype.updateHelp = function() {
        if (!this._helpWindow) return;
        
        const symbol = this.currentSymbol();
        if (symbol === 'x1') {
            this._helpWindow.setText("单次锻造：按当前配方投入一次素材。");
        } else if (symbol === 'x10') {
            this._helpWindow.setText("十连锻刀：按当前配方连续投入十次素材，结果在一个窗口里统一展示。");
        } else if (symbol === 'recipe') {
            this._helpWindow.setText("更改配方：从可锻造列表里另选一个配方。");
        } else {
            this._helpWindow.setText("返回上一页继续调整素材数量。");
        }
    };
    
    // =========================================================================
    // [V28.3 新增] 更改配方用的配方列表场景
    // =========================================================================
    
    function Scene_ForgeRecipeList() {
        this.initialize.apply(this, arguments);
    }
    
    Scene_ForgeRecipeList.prototype = Object.create(Scene_MenuBase.prototype);
    Scene_ForgeRecipeList.prototype.constructor = Scene_ForgeRecipeList;
    
    Scene_ForgeRecipeList.prototype.create = function() {
        Scene_MenuBase.prototype.create.call(this);
        ensureForgeData();
        this.createWindows();
    };
    
    Scene_ForgeRecipeList.prototype.createWindows = function() {
        const boxH = Graphics.boxHeight;
        const margin = 80;
        const contentW = Graphics.boxWidth - margin * 2;
        
        // 帮助窗钉底
        this.createHelpWindow();
        this._helpWindow.y = boxH - this._helpWindow.height;
        this._helpWindow.setText("选择一个配方，返回后十连将按它投料。");
        
        // 标题窗
        this._titleWindow = new Window_Base(new Rectangle(margin, 40, contentW, 60));
        // [V28.22] 标题去掉括号注释「（点击即选用）」
        this._titleWindow.drawText("更改配方", 0, 0, contentW - 36, "center");
        this.addWindow(this._titleWindow);
        
        // 列表窗
        const listY = this._titleWindow.y + this._titleWindow.height + 8;
        const listH = this._helpWindow.y - listY - 8;
        this._listWindow = new Window_ForgeRecipeList(new Rectangle(margin, listY, contentW, listH));
        this._listWindow.setHandler('ok', this.onRecipeOk.bind(this));
        this._listWindow.setHandler('cancel', this.popScene.bind(this));
        this.addWindow(this._listWindow);
        
        // [V28.4/V28.5] 清单建好后显式再重绘一次。
        // 之前实测出现过「窗口构造期间那次 refresh 没画到内容位图上」的情况（drawItem 一次都没被调用）。
        // 此刻窗口已完全构造并加进场景，这里补一次 select(0) + refresh() 是安全且廉价的保险，
        // 保证打开列表时一定是从第 1 项开始、且内容已绘制。
        this._listWindow.select(0);
        this._listWindow.refresh();
        
        this._listWindow.activate();
    };
    
    Scene_ForgeRecipeList.prototype.onRecipeOk = function() {
        ensureForgeData();
        const index = this._listWindow.index();
        const itemId = $gameSystem._simpleForgeData.availableItems[index];
        const costs = $gameSystem._simpleForgeData.costs[itemId];
        
        if (!costs || costs.length === 0) {
            SoundManager.playBuzzer();
            $gameMessage.add("这个物品没有设置消耗，无法作为配方。");
            return;
        }
        
        SoundManager.playOk();
        
        // [V28.15 修复] 不能靠「pop 前抓 SceneManager._scene 再回调」——
        // SceneManager.pop() 只是把前一场景排期到 _nextScene，当帧 _scene 不变，
        // 抓到的其实是本场景自己，回调永远不生效（换配方静默失效）。
        // [V28.16 修复] 用 $gameTemp._forgeTenPullRecipe —— 与 create() 读的**同一个键**。
        // 之前这里写的是 _forgePendingRecipe，而 create() 读的是 _forgeTenPullRecipe，
        // 键名不一致，配方在场景重建时就丢了。
        // （探针证实：从配方列表返回时 MZ 会重建十连场景，走 create() 而不是 resume()）
        $gameTemp._forgeTenPullRecipe = costs.slice();
        SceneManager.pop();
    };
    
    function Window_ForgeRecipeList() {
        this.initialize.apply(this, arguments);
    }
    
    Window_ForgeRecipeList.prototype = Object.create(Window_Selectable.prototype);
    Window_ForgeRecipeList.prototype.constructor = Window_ForgeRecipeList;
    
    // [V28.4] 补上标准初始化。
    // MZ 的 Window_Selectable.initialize 自己不调 refresh，而且结尾会 deactivate()、_index = -1，
    // 所以本工程其它窗口（Window_SimpleForge / Window_ForgeList / Window_MaterialInfo …）
    // 都统一显式 refresh() + select(0) + activate()。这里之前漏了，跟它们保持一致。
    Window_ForgeRecipeList.prototype.initialize = function(rect) {
        Window_Selectable.prototype.initialize.call(this, rect);
        this.refresh();
        this.select(0);
        this.activate();
    };
    
    // 与工程其它窗口保持一致的声音方法
    Window_ForgeRecipeList.prototype.playOkSound = function() {
        SoundManager.playOk();
    };
    
    Window_ForgeRecipeList.prototype.playCancelSound = function() {
        SoundManager.playCancel();
    };
    
    Window_ForgeRecipeList.prototype.playBuzzerSound = function() {
        SoundManager.playBuzzer();
    };
    
    Window_ForgeRecipeList.prototype.isOkEnabled = function() {
        return this.isOpenAndActive();
    };
    
    Window_ForgeRecipeList.prototype.isCancelEnabled = function() {
        return this.isOpenAndActive();
    };
    
    Window_ForgeRecipeList.prototype.isTouchOkEnabled = function() {
        return this.isOpenAndActive();
    };
    
    /**
     * [V28.5 重写] 之前 V28.4 人家自作聪明接管了 itemRect / scrollBase / contentsHeight，
     * 结果和 MZ 1.10 的滚动机制打架：
     *   Window_Scrollable.scrollBlockHeight() 默认就取 itemHeight()，
     *   updateOrigin() 会按真实滚动值调用 updateScrollBase() -> moveCursorBy(-deltaY)，
     *   并回调 paint()。人家把 itemRect 里的 scrollBase 抠掉，MZ 却照样按滚动值搬内容，
     *   两边对不上，越滚越偏，于是只有第一行文字留在原位、其余全被挪出可见区。
     *
     * 现在改回 MZ 原生滚动，写法完全对齐工程里已经正常工作的 Window_ForgeList：
     *   - 不覆盖 itemRect / contentsHeight / scrollBase
     *   - 只提供 itemHeight() / maxCols() / maxItems() / drawItem()
     * 这样 15 项、每屏 6 行的滚动与光标都由引擎负责。
     */
    Window_ForgeRecipeList.prototype.itemHeight = function() {
        return 56;
    };
    
    Window_ForgeRecipeList.prototype.maxCols = function() {
        return 1;
    };
    
    Window_ForgeRecipeList.prototype.maxItems = function() {
        ensureForgeData();
        return $gameSystem._simpleForgeData.availableItems.length;
    };
    
    Window_ForgeRecipeList.prototype.drawItem = function(index) {
        ensureForgeData();
        const rect = this.itemRect(index);
        const itemId = $gameSystem._simpleForgeData.availableItems[index];
        const item = $dataItems[itemId];
        const costs = $gameSystem._simpleForgeData.costs[itemId];
        
        if (!item) return;
        
        // 背景与选中边框：坐标一律取自 itemRect，保证与引擎的滚动/光标一致
        this.contents.fillRect(rect.x, rect.y, rect.width, rect.height, "rgba(0, 0, 0, 0.5)");
        if (index === this.index()) {
            this.contents.fillRect(rect.x, rect.y, rect.width, 2, "rgba(255, 255, 255, 0.8)");
            this.contents.fillRect(rect.x, rect.y + rect.height - 2, rect.width, 2, "rgba(255, 255, 255, 0.8)");
            this.contents.fillRect(rect.x, rect.y, 2, rect.height, "rgba(255, 255, 255, 0.8)");
            this.contents.fillRect(rect.x + rect.width - 2, rect.y, 2, rect.height, "rgba(255, 255, 255, 0.8)");
        }
        
        const affordable = canAffordCost(itemId);
        const innerX = rect.x + 12;
        const innerW = rect.width - 24;
        
        // 第一行：物品名 + 右侧可锻次数
        this.contents.fontSize = 19;
        if (!affordable) this.changeTextColor(ColorManager.textColor(8));
        this.drawText(`〖${item.name}〗`, innerX, rect.y + 3, innerW - 190, "left");
        this.resetTextColor();
        
        this.contents.fontSize = 16;
        const possible = costs ? countPossibleForges(costs) : 0;
        if (possible > 0) {
            this.changeTextColor(ColorManager.systemColor());
            this.drawText(`可锻 ${Math.min(TEN_PULL_MAX, possible)} 次`,
                          innerX + innerW - 180, rect.y + 4, 180, "right");
            this.resetTextColor();
        } else {
            this.changeTextColor(ColorManager.textColor(18));
            this.drawText("素材不足", innerX + innerW - 180, rect.y + 4, 180, "right");
            this.resetTextColor();
        }
        
        // 第二行：配方明细
        this.contents.fontSize = 14;
        const parts = [];
        const materials = $gameSystem._simpleForgeData.materials;
        if (costs) {
            for (let i = 0; i < costs.length; i++) {
                if (costs[i] <= 0 || i >= materials.length) continue;
                parts.push(`${materials[i].name} ${costs[i]}`);
            }
        }
        this.drawText(parts.length ? ("配方：" + parts.join("   ")) : "配方：未设置",
                      innerX, rect.y + 26, innerW, "left");
        
        this.contents.fontSize = 28;
    };
    
    // =========================================================================
    // [V28.0 新增] 十连结果窗口（一个窗口列全部产物）
    // =========================================================================
    
    function Scene_ForgeTenResult() {
        this.initialize.apply(this, arguments);
    }
    
    Scene_ForgeTenResult.prototype = Object.create(Scene_MenuBase.prototype);
    Scene_ForgeTenResult.prototype.constructor = Scene_ForgeTenResult;
    
    Scene_ForgeTenResult.prototype.initialize = function(text) {

        Scene_MenuBase.prototype.initialize.call(this);
        this._resultText = text || "";

    };
    
    Scene_ForgeTenResult.prototype.create = function() {
        Scene_MenuBase.prototype.create.call(this);
        
        // [V28.11 关键修复] 结果文本从 $gameTemp 取。
        // 原因见 Scene_ForgeTenPull.showResult 里的说明：MZ 1.10 的 SceneManager.push
        // 不支持往场景构造函数传参数，push(cls, text) 里的 text 会被直接丢掉。
        this._resultText = $gameTemp._forgeTenResultText || "";
        $gameTemp._forgeTenResultText = null;   // 用完即清，避免影响下一次
        

        this._resultWindow = new Window_ForgeTenResult(new Rectangle(80, 70, 600, 400));
        this._resultWindow.setHandler('ok', this.onClose.bind(this));
        this._resultWindow.setHandler('cancel', this.onClose.bind(this));
        // 触摸保护：避免打开瞬间误触直接关掉
        this._resultWindow.setTouchGuard(10);
        this.addWindow(this._resultWindow);
        
        // 文本要等窗口真正加进场景之后再灌
        this._resultWindow.setResultText(this._resultText);
        
        this._resultWindow.activate();
    };
    
    Scene_ForgeTenResult.prototype.onClose = function() {
        SoundManager.playCancel();
        // 直接回地图，避免退回到十连菜单
        SceneManager.goto(Scene_Map);
    };
    
    /**
     * [V28.13 修复] 结果窗改用 Window_Base 后，输入要自己接。
     *
     * 教训：人家 V28.12 换基类时，以为 setHandler/callHandler 是通用方法，
     * 其实它们只定义在 Window_Selectable 上（rmmz_windows.js L1032 / L1040），
     * Window_Base 根本没有 —— 于是运行到 create() 就抛
     *   TypeError: this._resultWindow.setHandler is not a function
     *
     * 这个窗口只需要「显示文本 + 按确定/取消关闭」，自己在基类基础上接输入即可：
     *   - 自己存 handler（selfHandlers）
     *   - 重写 processHandling：确定/取消 -> 触发对应 handler
     *   - 重写 processTouch：点一下就当确定
     * 这样既没有光标格子（不走 Window_Selectable 那一套），又能正常关闭。
     */
    function Window_ForgeTenResult() {
        this.initialize.apply(this, arguments);
    }
    
    Window_ForgeTenResult.prototype = Object.create(Window_Base.prototype);
    Window_ForgeTenResult.prototype.constructor = Window_ForgeTenResult;
    
    Window_ForgeTenResult.prototype.initialize = function(rect) {
        Window_Base.prototype.initialize.call(this, rect);
        this._resultText = "";
        this._touchGuard = 0;
        this._resultHandlers = {};
        this.refreshText();
    };
    
    // 自己实现的处理器注册（替代 Window_Selectable 的 setHandler）
    Window_ForgeTenResult.prototype.setHandler = function(symbol, method) {
        this._resultHandlers[symbol] = method;
    };
    
    // 自己实现的处理器调用
    Window_ForgeTenResult.prototype.callResultHandler = function(symbol) {
        if (this._resultHandlers && this._resultHandlers[symbol]) {
            this._resultHandlers[symbol]();
        }
    };
    
    Window_ForgeTenResult.prototype.isOpenAndActive = function() {
        return this.isOpen() && this.active;
    };
    
    Window_ForgeTenResult.prototype.setResultText = function(text) {
        this._resultText = text || "";
        this.refreshText();
    };
    
    // 触摸保护：避免窗口刚打开的瞬间，玩家上一次点击穿透过来直接把它关掉
    Window_ForgeTenResult.prototype.setTouchGuard = function(frames) {
        this._touchGuard = frames;
    };
    
    Window_ForgeTenResult.prototype.update = function() {
        Window_Base.prototype.update.call(this);
        if (this._touchGuard > 0) {
            this._touchGuard--;
        }
        // [V28.13] Window_Base.update 不会调用 processHandling / processTouch
        // （那两个方法只存在于 Window_Selectable），所以这里必须自己接上，
        // 否则窗口开着但按什么都没反应、关不掉。
        if (!this.isOpenAndActive()) return;
        this.processHandling();
        this.processTouch();
    };
    
    // 键盘 / 手柄：确定或取消都关闭
    Window_ForgeTenResult.prototype.processHandling = function() {
        if (this._touchGuard > 0) return;
        if (Input.isTriggered("ok") || Input.isTriggered("cancel")) {
            SoundManager.playOk();
            this.callResultHandler("ok");
        }
    };
    
    // 触摸：点在窗口矩形内就当确定
    // 注：isTouchedInsideFrame 只定义在 Window_Scrollable 上，Window_Base 没有，自己判一下
    Window_ForgeTenResult.prototype.processTouch = function() {
        if (this._touchGuard > 0) return;
        if (!TouchInput.isTriggered()) return;
        if (this.isTouchedInside()) {
            SoundManager.playOk();
            this.callResultHandler("ok");
        }
    };
    
    // 判断本次触摸点是否落在窗口范围内
    Window_ForgeTenResult.prototype.isTouchedInside = function() {
        const tx = TouchInput.x - this.x;
        const ty = TouchInput.y - this.y;
        return tx >= 0 && tx < this.width && ty >= 0 && ty < this.height;
    };
    
    /**
     * [V28.14 改版] 结果窗排版：物品界面风格的两列表格。
     *
     * 主人的要求：「字号与物品界面的字号相同，排版也类似物品界面的排版，
     *               有一条中线，每行两个一左一右」
     *
     * 对照工程里那个物品/配方列表窗口（Window_ForgeList / Window_ForgeRecipeList）：
     *   物品名 20 号字、数量 16 号字、右侧数字右对齐 —— 这里沿用同一套。
     * 布局（每行两个，中间一条竖线分隔）：
     *
     *   ┌──────────────────────┬──────────────────────┐
     *   │ 山姥切国广·刀身      │ 大和守安定·刀身      │
     *   │                x2    │                x4    │
     *   ├──────────────────────┼──────────────────────┤   ← 每格底部一条细分隔线
     *   │ 陆奥守吉行·刀身      │ 压切长谷部·刀身      │
     *   │                x2    │                x1    │
     *   └──────────────────────┴──────────────────────┘
     */
    Window_ForgeTenResult.prototype.refreshText = function() {
        if (!this.contents) return;
        this.contents.clear();
        if (!this._resultText) return;
        
        const data = this.parseResultLines();
        const cw = this.contentsWidth();
        const ch = this.contentsHeight();
        
        const NAME_SIZE = 20;         // 与物品界面一致
        const COUNT_SIZE = 16;
        const ROW_H = 44;             // 一格两行字的高度
        const DIVIDER_AT = Math.floor(cw / 2);   // 中线的 x 坐标
        const COL_GAP = 14;           // 文字与中线之间留的空隙（也用于消除行尾空格）
        const LEFT_NAME_W = DIVIDER_AT - COL_GAP * 2;
        const RIGHT_NAME_W = cw - DIVIDER_AT - COL_GAP * 2;
        
        let y = 4;
        
        // ---------- 标题（跨整行居中） ----------
        this.contents.fontSize = NAME_SIZE;
        this.contents.drawText(data.title, 0, y, cw, 30, "center");
        y += 32;
        
        // ---------- 表头 + 一条横线 ----------
        this.contents.fontSize = COUNT_SIZE;
        this.changeTextColor(ColorManager.systemColor());
        this.contents.drawText("刀身", 0, y + 4, DIVIDER_AT - COL_GAP, "left");
        this.contents.drawText("数量", DIVIDER_AT + COL_GAP, y + 4, RIGHT_NAME_W + COL_GAP, "right");
        this.resetTextColor();
        this.drawFlatLine(0, y + 26, cw, "rgba(255, 255, 255, 0.35)");
        y += 30;
        
        // ---------- 产物表格：每行两个，一左一右 ----------
        const tableTop = y;
        for (let i = 0; i < data.pairs.length; i++) {
            if (y + ROW_H > ch) break;          // 超出可见区就不再画
            const pair = data.pairs[i];
            
            pair.forEach((entry, col) => {
                if (!entry) return;
                const isLeft = (col === 0);
                const nameX = isLeft ? COL_GAP : DIVIDER_AT + COL_GAP;
                const nameW = isLeft ? LEFT_NAME_W : RIGHT_NAME_W;
                const numX = isLeft ? COL_GAP : DIVIDER_AT + COL_GAP;
                const numW = isLeft ? (DIVIDER_AT - COL_GAP * 2) : (cw - DIVIDER_AT - COL_GAP * 2);
                
                // 名字（20 号，与物品界面一致）
                // [V28.20] 只画名字；数量不再单独占一行（见下方）
                this.contents.fontSize = NAME_SIZE;
                this.contents.drawText(entry.name, nameX, y + 2, nameW, 30, "left");

                // 数量行：名字下面那行右对齐
                // [V28.20 修复] 分隔符改成「 ｜ 」并统一计数格式后，一格＝两个独立绘制区
                // （名字左对齐 + 数量右对齐），「名字 × 4 ｜ 名字 × 4」整串塞进一格会互相压字、
                // 右格的数量会被裁掉。所以这里把「× N」当成第二行来画，
                // 名字与数量都不会被截断，同时和中线两侧的排版保持一致。
                if (entry.count !== "" && entry.count !== undefined && entry.count !== null) {
                    const num = `× ${entry.count}`;
                    // 自动缩字：长名字（如「山姥切国广·刀身」 160px）后 16 号放不下整串时，
                    // 逐级降到 12 号，保证数量永远完整可见（不折行、不裁切）。
                    const room = numW - COL_GAP;
                    // measureTextWidth 按当前 fontSize 量宽，所以先切成基准字号量一次，再按比例缩
                    this.contents.fontSize = COUNT_SIZE;
                    let size = COUNT_SIZE;
                    while (size > 12 && this.contents.measureTextWidth(num) * size / COUNT_SIZE > room) {
                        size--;
                    }
                    this.contents.fontSize = size;
                    this.changeTextColor(ColorManager.systemColor());
                    this.contents.drawText(num, numX, y + 24, numW, 20, "right");
                    this.resetTextColor();
                }
            });
            
            // 每格底部一条细分隔线
            this.drawFlatLine(0, y + ROW_H - 5, cw, "rgba(255, 255, 255, 0.18)");
            y += ROW_H;
        }
        
        // ---------- 中线（贯穿整个表格） ----------
        if (y > tableTop) {
            this.drawFlatLine(DIVIDER_AT, tableTop, 2, y - tableTop, "rgba(255, 255, 255, 0.45)");
        }
        
        // ---------- 备注（有则画在表格下方） ----------
        if (y + 30 <= ch && data.notes.length > 0) {
            y += 4;
            this.contents.fontSize = COUNT_SIZE;
            this.changeTextColor(ColorManager.textColor(8));   // 灰色，弱化
            data.notes.forEach(note => {
                if (y + 26 > ch) return;
                this.contents.drawText(note, COL_GAP, y, cw - COL_GAP * 2, 26, "left");
                y += 26;
            });
            this.resetTextColor();
        }
        
        this.contents.fontSize = 28;
    };
    
    // [V28.14] 画一条纯色细线。
    // 不能直接用 contents.fillRect —— 位图会套用描边设置，1px 的线会把描边也画出来变粗。
    // 临时把描边宽度设为 0，画完恢复。
    Window_ForgeTenResult.prototype.drawFlatLine = function(x, y, w, h, color) {
        if (!this.contents) return;
        const bmp = this.contents;
        const oldWidth = bmp.outlineWidth;
        const oldColor = bmp.outlineColor;
        bmp.outlineWidth = 0;
        bmp.outlineColor = "rgba(0, 0, 0, 0)";
        bmp.fillRect(x, y, w, h, color || "rgba(255, 255, 255, 0.4)");
        bmp.outlineWidth = oldWidth;
        bmp.outlineColor = oldColor;
    };
    
    /**
     * 把 showResult 造出来的结果文本解析成表格结构。
     *
     * 约定格式（由 Scene_ForgeTenPull.showResult 生成）：
     *   第 1 行        标题：十连锻刀完成，共 N 把：
     *   中间若干行     产物，每行两个，用全角空格「　」分隔，形如「刀名 x2」
     *   （ 开头）行     备注
     */
    Window_ForgeTenResult.prototype.parseResultLines = function() {
        const out = { title: "", pairs: [], notes: [] };
        const raw = String(this._resultText).split("\n");
        
        raw.forEach((line, i) => {
            const t = line.trim();
            if (t === "") return;
            
            if (i === 0) { out.title = t; return; }
            
            if (t.charAt(0) === "（") { out.notes.push(t); return; }
            
            // 产物行：按分隔符切成最多两格
            // [V28.20 修复] 分隔符从全角空格改成「 ｜ 」之后，这里**必须同步改**，
            // 否则一行两把会切不开、缩成左格一格且数量为空。
            // 兼容旧存档/旧文本：全角空格也一并当分隔符认。
            const cells = t.split(/[｜　]/).map(s => s.trim()).filter(s => s !== "");
            const pair = [];
            for (let c = 0; c < 2; c++) {
                const cell = cells[c];
                if (!cell) { pair.push(null); continue; }
                // 名字里可能自带 " × 4" / " x4" / "×4"，统一在最后一个乘号处切
                const m = cell.match(/^(.*?)\s*[×xX]\s*(\d+)$/);
                if (m) {
                    pair.push({ name: m[1], count: Number(m[2]) });
                } else {
                    pair.push({ name: cell, count: "" });
                }
            }
            out.pairs.push(pair);
        });
        
        return out;
    };
    
    // =========================================================================
    // 全局导出
    // =========================================================================
    
    window.Scene_SimpleForge = Scene_SimpleForge;
    window.Window_SimpleForge = Window_SimpleForge;
    window.Scene_ForgeList = Scene_ForgeList;
    window.Window_ForgeList = Window_ForgeList;
    window.Scene_MaterialInfo = Scene_MaterialInfo;
    window.Window_MaterialInfo = Window_MaterialInfo;
    // [V28.0] 十连相关
    window.Scene_ForgeTenPull = Scene_ForgeTenPull;
    window.Window_ForgeTenPullCommand = Window_ForgeTenPullCommand;
    window.Scene_ForgeTenResult = Scene_ForgeTenResult;
    window.Window_ForgeTenResult = Window_ForgeTenResult;
    // [V28.3] 更改配方
    window.Scene_ForgeRecipeList = Scene_ForgeRecipeList;
    window.Window_ForgeRecipeList = Window_ForgeRecipeList;

})();