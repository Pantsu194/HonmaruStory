/*:
 * @target MZ
 * @plugindesc v1.0.0 D/E 图块槽位突破 256 格限制（每槽增至 512 格）
 * @author Codex
 * @help
 * 【功能】
 * 默认情况下 RPG Maker MZ 每个 B~E 图块槽位最多只能使用 256 个图块
 * （图片最大 768×768）。本插件为 D 和 E 槽位各追加一张 768×768 的
 * 扩展图片（D2、E2），使 D、E 槽位各自支持 512 个图块。
 *
 * 【原理】
 * MZ 引擎内部预留了未使用的 Tile ID 段：
 *   D2 图块 = Tile ID 1024~1279（对应 D2.png 的 0~255 格）
 *   E2 图块 = Tile ID 1280~1535（对应 E2.png 的 0~255 格）
 * 引擎的渲染公式天然支持这些 ID，插件只需注册扩展图片并补全标志位。
 *
 * 【使用方法】
 * 1. 准备两张 768×768 的图片（48px 图块，16×16 格）放入 img/tilesets/：
 *    xxx.png → D2 扩展图
 *    yyy.png → E2 扩展图
 * 2. 打开数据库 → 图块组 → 在目标图块组的【备注】中写入：
 *    <DE2: xxx, yyy>
 *    表示该图块组 D 槽位使用 xxx.png 作为扩展（D2），E 槽位使用 yyy.png（E2）。
 *    只想扩展其中一个时，可以写 <DE2: xxx,> 或 <DE2: ,yyy>。
 *
 * 【放置扩展图块】
 * 扩展图块无法在编辑器图块面板中显示/绘制（编辑器只认识每槽 256 格），
 * 请使用以下两种方式放置：
 *
 * 方式A：事件里的插件指令
 *   DE_TileExpansion SetTile x y layer slot index
 *     例：DE_TileExpansion SetTile 3 5 1 D2 12
 *         → 在坐标 (3,5)、第1层放置 D2 图片的第 12 格
 *     x,y   : 地图坐标
 *     layer : 图层（0=地面，1=中层，2=中层，3=上层）
 *     slot  : D2 或 E2
 *     index : 0~255（图片内从左到右、从上到下的格子序号）
 *   DE_TileExpansion ClearTile x y layer
 *     → 清除 (x,y) 指定图层的图块
 *   DE_TileExpansion SetFlag slot index flag
 *     → 修改扩展图块的通行标志
 *       常用值：1536=可通行（默认）；1551=不可通行；16=☆显示在角色上方
 *   DE_TileExpansion SetRaw x y layer tileId
 *     → 直接按 Tile ID 放置图块（高级用法，可放置任意图块）
 *
 * 方式B：地图备注（持久放置，进入地图/读档后自动生效）
 *   在地图属性的备注中写入：
 *   <DE2Tiles:
 *   D2:3,5,1,12; E2:2,4,0,7;
 *   >
 *   格式：槽位:x,y,图层,index;（分号分隔，可换行）
 *
 * 【注意事项】
 * - D2/E2 图片尺寸不要超过 768×768。
 * - 事件中通过插件指令动态放置的图块，在重新读档后需要重新触发放置；
 *   需要长期存在的图块请使用地图备注（方式B）。
 * - 修改图块组备注后需要重新进入游戏测试才会生效。
 * @param debug
 * @text 调试输出
 * @desc 开启后在控制台输出插件运行信息。
 * @type boolean
 * @default false
 * @param defaultFlag
 * @text 默认通行标志
 * @desc 扩展图块默认的通行标志值（1536=可通行）。
 * @type number
 * @default 1536
 */
(() => {
    "use strict";

    const pluginName = "DE_TileExpansion";
    const params = PluginManager.parameters(pluginName);
    const debug = String(params.debug || "").toLowerCase() === "true";
    const defaultFlag = Number(params.defaultFlag) || 1536;

    const DE_Ext = (window.DE_Ext = {});

    DE_Ext.D2_BASE = 1024; // D2 图块的 Tile ID 起点
    DE_Ext.E2_BASE = 1280; // E2 图块的 Tile ID 起点
    DE_Ext.TILE_END = 1536; // 扩展区间终点（不含）
    DE_Ext.NAMES_D2 = 9; // tilesetNames 数组中的 D2 图片下标
    DE_Ext.NAMES_E2 = 10; // tilesetNames 数组中的 E2 图片下标

    DE_Ext.log = function() {
        if (debug) {
            console.log("[DE_TileExpansion]", Array.prototype.slice.call(arguments));
        }
    };

    // 解析图块组备注：<DE2: d2文件名, e2文件名>
    DE_Ext.getNoteFiles = function(tileset) {
        if (!tileset || !tileset.note) {
            return null;
        }
        const m = tileset.note.match(/<DE2\s*:\s*([^,>]*)\s*,\s*([^,>]*)\s*>/i);
        if (!m) {
            return null;
        }
        const d2 = m[1].trim();
        const e2 = m[2].trim();
        if (!d2 && !e2) {
            return null;
        }
        return { d2: d2, e2: e2 };
    };

    // 扩展单个图块组：补全 tilesetNames（第 9、10 位）与标志位
    DE_Ext.setupTileset = function(tileset) {
        if (!tileset) {
            return;
        }
        const files = DE_Ext.getNoteFiles(tileset);
        if (!files) {
            return;
        }
        const names = tileset.tilesetNames;
        if (names.length < 11) {
            names.length = 11;
        }
        if (files.d2) {
            names[DE_Ext.NAMES_D2] = files.d2;
        }
        if (files.e2) {
            names[DE_Ext.NAMES_E2] = files.e2;
        }
        const flags = tileset.flags;
        if (flags && flags.length >= DE_Ext.TILE_END) {
            for (let i = DE_Ext.D2_BASE; i < DE_Ext.TILE_END; i++) {
                if (!flags[i]) {
                    flags[i] = defaultFlag;
                }
            }
        }
        DE_Ext.log("图块组已扩展:", tileset.id, files);
    };

    // 启动时扩展所有配置了备注的图块组
    DE_Ext.setupAllTilesets = function() {
        if (!$dataTilesets) {
            return;
        }
        for (const tileset of $dataTilesets) {
            if (tileset) {
                DE_Ext.setupTileset(tileset);
            }
        }
    };
    // 槽位名称 → Tile ID 起点
    DE_Ext.slotToBase = function(slot) {
        const s = String(slot || "").toUpperCase();
        if (s === "D2") {
            return DE_Ext.D2_BASE;
        }
        if (s === "E2") {
            return DE_Ext.E2_BASE;
        }
        return -1;
    };

    // 槽位 + 格子序号 → Tile ID
    DE_Ext.tileId = function(slot, index) {
        const base = DE_Ext.slotToBase(slot);
        if (base < 0) {
            throw new Error("DE_TileExpansion: 无效的槽位名（应为 D2 或 E2）: " + slot);
        }
        const i = Number(index);
        if (!isFinite(i) || i < 0 || i > 255) {
            throw new Error("DE_TileExpansion: index 必须在 0~255 之间: " + index);
        }
        return base + i;
    };

    DE_Ext.isValidCoord = function(x, y) {
        return x >= 0 && x < $dataMap.width && y >= 0 && y < $dataMap.height;
    };

    // 在地图数据中放置图块
    DE_Ext.setTile = function(x, y, layer, tileId) {
        if (!$dataMap || !DE_Ext.isValidCoord(x, y)) {
            DE_Ext.log("坐标无效:", x, y);
            return false;
        }
        const z = Number(layer);
        if (!isFinite(z) || z < 0 || z > 3) {
            DE_Ext.log("图层无效（应为0~3）:", layer);
            return false;
        }
        const index = (z * $dataMap.height + y) * $dataMap.width + x;
        $dataMap.data[index] = Number(tileId) || 0;
        DE_Ext.refreshTilemap();
        return true;
    };

    DE_Ext.clearTile = function(x, y, layer) {
        return DE_Ext.setTile(x, y, layer, 0);
    };

    // 修改扩展图块的通行标志
    DE_Ext.setFlag = function(slot, index, flag) {
        const tileId = DE_Ext.tileId(slot, index);
        const tileset = $gameMap.tileset();
        if (!tileset || !tileset.flags || tileId >= tileset.flags.length) {
            return false;
        }
        tileset.flags[tileId] = Number(flag) || 0;
        return true;
    };

    // 强制重绘地图图块
    DE_Ext.refreshTilemap = function() {
        const scene = SceneManager._scene;
        if (scene && scene._spriteset && scene._spriteset._tilemap) {
            scene._spriteset._tilemap.refresh();
        }
    };

    // 应用地图备注中的持久图块：<DE2Tiles: D2:x,y,layer,index; E2:...>
    DE_Ext.applyMapNoteTiles = function() {
        if (!$dataMap || !$dataMap.note) {
            return;
        }
        const m = $dataMap.note.match(/<DE2Tiles([\s\S]*?)>/i);
        if (!m) {
            return;
        }
        const re = /\b(D2|E2)\s*:\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/gi;
        let match;
        let count = 0;
        while ((match = re.exec(m[1])) !== null) {
            const slot = match[1].toUpperCase();
            const x = Number(match[2]);
            const y = Number(match[3]);
            const layer = Number(match[4]);
            const index = Number(match[5]);
            try {
                const tileId = DE_Ext.tileId(slot, index);
                if (DE_Ext.setTile(x, y, layer, tileId)) {
                    count++;
                }
            } catch (e) {
                DE_Ext.log(e.message);
            }
        }
        DE_Ext.log("地图备注图块已放置:", count);
    };
    // --- 引擎挂钩 ---

    // 数据库加载完成后扩展所有图块组
    const _DataManager_loadDatabase = DataManager.loadDatabase;
    DataManager.loadDatabase = function() {
        _DataManager_loadDatabase.call(this);
        DE_Ext.setupAllTilesets();
    };

    // 地图图块组设置时再次确保当前图块组已扩展
    const _Spriteset_Map_loadTileset = Spriteset_Map.prototype.loadTileset;
    Spriteset_Map.prototype.loadTileset = function() {
        DE_Ext.setupTileset($gameMap.tileset());
        _Spriteset_Map_loadTileset.call(this);
    };

    // 地图数据加载完成后应用持久图块（覆盖转移/读档/新游戏）
    const _Scene_Map_onMapLoaded = Scene_Map.prototype.onMapLoaded;
    Scene_Map.prototype.onMapLoaded = function() {
        DE_Ext.applyMapNoteTiles();
        _Scene_Map_onMapLoaded.call(this);
    };

    // --- 插件指令 ---

    const parseArgs = function(args) {
        return String(args || "").split(",").map(s => s.trim());
    };

    PluginManager.registerCommand(pluginName, "SetTile", function(args) {
        const a = parseArgs(args);
        try {
            DE_Ext.setTile(
                Number(a[0]),
                Number(a[1]),
                Number(a[2]),
                DE_Ext.tileId(a[3], a[4])
            );
        } catch (e) {
            console.error(e.message);
        }
    });

    PluginManager.registerCommand(pluginName, "ClearTile", function(args) {
        const a = parseArgs(args);
        DE_Ext.clearTile(Number(a[0]), Number(a[1]), Number(a[2]));
    });

    PluginManager.registerCommand(pluginName, "SetFlag", function(args) {
        const a = parseArgs(args);
        DE_Ext.setFlag(a[0], a[1], a[2]);
    });

    PluginManager.registerCommand(pluginName, "SetRaw", function(args) {
        const a = parseArgs(args);
        DE_Ext.setTile(Number(a[0]), Number(a[1]), Number(a[2]), Number(a[3]));
    });
})();
