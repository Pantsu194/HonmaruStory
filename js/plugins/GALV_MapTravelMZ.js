//-----------------------------------------------------------------------------
//  Galv's Map Travel
//-----------------------------------------------------------------------------
//  For: RPGMAKER MV
//  Galv_MapTravelMZ.js
//-----------------------------------------------------------------------------
//  2020-09-07 - Version 1.1 - code tweaks, added ability to prevent player
//                             from cancelling out of the scene
//  2020-09-05 - Version 1.0 - release
//-----------------------------------------------------------------------------
// Terms can be found at:
// galvs-scripts.com
//-----------------------------------------------------------------------------

var Imported = Imported || {};
Imported.Galv_MapTravel = true;

var Galv = Galv || {};        // Galv's main object
Galv.MAPT = Galv.MAPT || {};  // Plugin object
Galv.MAPT.pluginName = "GALV_MapTravelMZ";

//-----------------------------------------------------------------------------
/*:
 * @plugindesc (v.1.1) 一个新场景，允许您通过在地图上选择地点来进行快速旅行
 * @url http://galvs-scripts.com
 * @target MZ
 * @author Galv
 *
 * @param varMap
 * @text 传送地图变量
 * @type number
 * @desc 用于存储玩家将要传送到的地图ID的游戏内变量
 * @default 1
 *
 * @param xVar
 * @text 传送X变量
 * @type number
 * @desc 用于存储玩家将要传送到的X坐标的游戏内变量
 * @default 2
 *
 * @param yVar
 * @text 传送Y变量
 * @desc 用于存储玩家将要传送到的Y坐标的游戏内变量
 * @default 3
 *
 * @param textConfirm
 * @text 确认文本
 * @desc 确认窗口中显示的用于执行旅行的文本
 * @default Travel (旅行)
 *
 * @param textCancel
 * @text 取消文本
 * @desc 确认窗口中显示的用于取消的文本
 * @default Cancel (取消)
 *
 * @param windowWidth
 * @text 确认窗口宽度
 * @desc 确认窗口的宽度
 * @default 180
 *
 * @param spriteFrames
 * @text 默认地点帧数
 * @type number
 * @desc 地点图像的默认动画帧数
 * @default 3
 *
 * @param frameSpeed
 * @text 帧速度
 * @type number
 * @desc 帧动画的速度（值越小越快）
 * @default 10
 *
 *
 * @command createMap
 * @text 创建地图
 * @desc 创建一张可在游戏过程中调用的地图。
 *
 * @arg mapId
 * @text 地图 ID
 * @type number
 * @default 0
 * @desc 地图的识别编号（不必与编辑器的地图 ID 相同）
 *
 * @arg mapImage
 * @text 地图图片
 * @desc 要使用的地图图形的名称，来自 /img/maptravel/
 *
 * @arg bgImages
 * @text 背景图片
 * @type string[]
 * @defalt imagename,0,0,255
 * @desc 背景设置列表。每个设置应为：图片名称,X移动量,Y移动量,不透明度
 *
 * @arg fgImages
 * @text 前景图片
 * @type string[]
 * @defalt imagename,0,0,255
 * @desc 前景设置列表。每个设置应为：图片名称,X移动量,Y移动量,不透明度
 *
 *
 * @command setLocation
 * @text 设置地点
 * @desc 在您创建的旅行地图上创建一个地点。
 *
 * @arg mapId
 * @text 地图 ID
 * @type number
 * @default 0
 * @desc 您创建的地图的识别编号
 *
 * @arg name
 * @text 地点名称
 * @desc 地点的名称（也用于引用它）
 *
 * @arg image
 * @text 图片名称
 * @desc 要使用的地点图形的名称，来自 /img/maptravel/
 *
 * @arg mx
 * @text X 位置
 * @type number
 * @default 0
 * @desc 地点在您的地图图形上的 X 坐标
 *
 * @arg my
 * @text Y 位置
 * @type number
 * @default 0
 * @desc 地点在您的地图图形上的 Y 坐标
 *
 * @arg tmid
 * @text 传送地图 ID
 * @type number
 * @default 0
 * @desc 传送地图 ID - 要传送到的游戏内地图 ID
 *
 * @arg tx
 * @text 传送地图 X
 * @type number
 * @default 0
 * @desc 要传送到的游戏内地图 X 坐标
 *
 * @arg ty
 * @text 传送地图 Y
 * @type number
 * @default 0
 * @desc 要传送到的游戏内地图 Y 坐标
 *
 * @arg desc
 * @text 地点描述
 * @desc 选中地点时显示的描述。使用 | 符号来指定换行
 *
 * @arg f
 * @text 动画帧数
 * @type number
 * @default 3
 * @desc 地点图片中的动画帧数。留空则使用插件默认值
 *
 *
 * @command openMap
 * @text 打开地图
 * @desc 打开地图旅行场景，选择您已创建的 ID。
 *
 * @arg mapId
 * @text 地图 ID
 * @type number
 * @default 0
 * @desc 您创建的地图的识别编号
 *
 * @arg preventCancel
 * @text 阻止取消
 * @type boolean
 * @default false
 * @desc 玩家是否可以取消退出地图旅行场景，true 或 false。
 *
 * @help
 * Galv's
 * ----------------------------------------------------------------------------
 * 此插件创建了一个新的场景，玩家可以使用鼠标或键盘在地图图片上选择
 * 地点来进行快速旅行。
 *
 * 此插件不是即插即用的，用户需要具备创建自己的地图图形和理解基本
 * javascript（例如数组和字符串）的技能。
 *
 * ----------------------------------------------------------------------------
 * 图形
 * ----------------------------------------------------------------------------
 *
 * 此地图旅行场景中的图形位于一个新文件夹中（您需要添加到您的项目）：
 * YourProject/img/maptravel/
 *
 * 地图图形可以是您想要的任何尺寸，它控制着您在地图旅行场景中滚动的
 * 区域大小。
 *
 * 地点图形也可以是任何尺寸，但需要地点图片高度的 3 倍来容纳 3 帧。
 * 每帧在不同时间显示：
 * 顶部：地图上的默认状态
 * 中间：选中地点时
 * 底部：地点被禁用时
 * 请查看插件演示以获取地点图形示例。
 *
 * 请确保您在插件设置中设置了 3 个地点变量，并且不要在游戏中将这些
 * 变量用于其他任何用途。这些变量将用于存储在“传送”事件命令中使用的
 * mapid、x、y 值。
 *
 *
 * ----------------------------------------------------------------------------
 * 插件命令
 * ----------------------------------------------------------------------------
 * 步骤 1. 创建地图
 * ---------------------
 * 要创建一张用于地图旅行场景的新地图，请使用插件命令：
 *
 * Create a Map
 *
 * 此命令允许您指定地图图片、背景图片和前景图片供您的地图使用。
 * 指定一个 ID 来指代您创建的这张旅行地图。
 *
 *
 * 步骤 2. 设置地点和物体
 * -------------------------------------
 * 您可以根据需要在地图上添加任意数量的地点，为每个添加的地点使用
 * 下面的脚本调用。
 *
 * Set a Location
 *
 *
 * 步骤 3. 调用场景
 * --------------------------
 * 要打开地图旅行场景，让玩家快速旅行到已添加到他们地图上的地点：
 *
 * Open Map
 *
 *
 * 所有这些操作也可以通过脚本调用完成。
 * 额外的功能也可以通过脚本调用完成，请阅读下方以了解更多信息。
 *
 *
 * ----------------------------------------------------------------------------
 * 脚本调用
 * ----------------------------------------------------------------------------
 * 步骤 1. 创建地图
 * ---------------------
 * 要创建一张用于地图旅行场景的新地图，请使用此脚本调用：
 *
 * Galv.MAPT.createMap(id,"mapImage",[[bg],[bg]],[[fg],[fg]]);
 *
 * 信息：
 * id          = 标识您创建的地图的唯一编号
 * "mapImage"  = 要使用的地图图形的名称，来自 /img/maptravel/
 * 此图片将决定场景中地图的大小
 * [bg]        = 一个数组，用于设置地图图片后面的背景图形
 * 您可以拥有任意数量的 bg 数组，每个数组应包含：
 * ["bgimage",xmove,ymove,opacity] （背景图片,x移动量,y移动量,不透明度）
 * [fg]        = 工作方式与 bg 数组相同，但用于前景图片
 * ["fgimage",xmove,ymove,opacity] （前景图片,x移动量,y移动量,不透明度）
 *
 *
 *
 * 步骤 2. 设置地点和物体
 * -------------------------------------
 * 您可以根据需要在地图上添加任意数量的地点，为每个添加的地点使用
 * 下面的脚本调用。
 *
 * Galv.MAPT.setLocation(id,"name","image",mx,my,tmid,tx,ty,"desc",f);
 *
 * 信息：
 * id          = 标识您在上方创建的地图的唯一编号
 * "name"      = 地点的名称（也用于引用它）
 * "image"     = 要使用的地点图形的名称，来自 /img/maptravel/
 * 此图形要求在精灵图表中有 3 行，分别对应：
 * 顶部 = 正常，中间 = 活跃（选中），底部 = 禁用
 * mx          = 地点在您的地图图形上的 X 坐标
 * my          = 地点在您的地图图形上的 Y 坐标
 * tmid        = 传送地图 ID - 要传送到的游戏内地图 ID
 * tx          = 要传送到的游戏内地图 X 坐标
 * ty          = 要传送到的游戏内地图 Y 坐标
 * "desc"      = 选中地点时显示的简短描述。
 * 使用 | 符号来指定换行。
 * f           = 地点图片中的动画帧数。如果不包含此属性，则使用插件设置的默认帧数
 *
 * 请注意，如果您想更改先前设置的地点，可以使用相同的名称，通过 setLocation
 * 来覆盖它。
 *
 * 除了地点之外，您还可以添加“物体”，它们的工作方式类似，但精灵图表
 * 中只有一行图形，并且不会出现在地点列表中。
 *
 * Galv.MAPT.setObject(id,"name","image",mx,my,f);
 * Galv.MAPT.removeObject(id,"name");
 *
 *
 * 步骤 3. 调用场景
 * --------------------------
 * 要打开地图旅行场景，让玩家快速旅行到已添加到他们地图上的地点：
 *
 * Galv.MAPT.openMap(id,p);   // 上方设置的用于打开地图的唯一 ID
 * // 如果地图未创建，则不发生任何事
 * // p 为 true 或 false。如果为 true，则阻止
 * // 玩家取消退出
 * // 地图旅行场景。
 *
 *
 *
 * 其他脚本调用
 * -------------------
 *
 * Galv.MAPT.hasMap(id)      // 在条件分支的 '脚本' 中使用，检查玩家的游戏中
 * // 是否已创建该地图
 *
 * Galv.MAPT.mapSelected     // 在场景运行后在条件分支中使用，
 * // 检查玩家是否选择了地点
 *
 *
 * Galv.MAPT.initLocation(id,"name"); // 将地图场景的起始地点设置为
 * // 特定地图 ID 上的此地点
 *
 * Galv.MAPT.enableLocation(id,"name",s); // s 可以是 true 或 false，用于
 * // 将地图 ID 中的地点 "name" 设置为
 * // 启用或禁用
 *
 * Galv.MAPT.removeLocation(id,"name"); // 从 mapid 列表中移除地点
 *
 * Galv.MAPT.editLocation(id,"name","attribute",value); // 编辑地点
 *
 * // id = 您正在编辑的地图 ID
 * // "name" = 您正在编辑的地点名称
 * // "attribute" = 您想要编辑的属性。它可以是：
 * //               "image"           value = "imageName" （图片名称）
 * //               "mapXY"           value = [x,y] （地图上的 X,Y 坐标）
 * //               "transfer"        value = [mapid,x,y] （传送地图 ID,X,Y）
 * //               "desc"            value = "description here" （描述文本）
 * // value = 要更改为的值。各属性的值类型如上所示。
 *
 * 示例
 * Galv.MAPT.editLocation(0,"Your Mansion","desc","A new description!");
 * (将地图 0 上名为 "Your Mansion" 的地点的描述更改为 "A new description!")
 *
 * 或者，您也可以通过使用 Galv.MAPT.setLocation(id,"name","image",mx,my,tmid,tx,ty,"desc");
 * 并输入与您要覆盖的地点相同的名称，来直接覆盖整个地点。
 *
 * ----------------------------------------------------------------------------
 */

//-----------------------------------------------------------------------------
//  CODE STUFFS
//-----------------------------------------------------------------------------

Galv.MAPT.plugin = PluginManager.parameters(Galv.MAPT.pluginName);
Galv.MAPT.mapVar = Number(Galv.MAPT.plugin["varMap"]);
Galv.MAPT.xVar = Number(Galv.MAPT.plugin["xVar"]);
Galv.MAPT.yVar = Number(Galv.MAPT.plugin["yVar"]);
Galv.MAPT.txtConfirm = Galv.MAPT.plugin["textConfirm"];
Galv.MAPT.txtCancel = Galv.MAPT.plugin["textCancel"];
Galv.MAPT.cWinWidth = Number(Galv.MAPT.plugin["windowWidth"]);
Galv.MAPT.defaultFrames = Number(Galv.MAPT.plugin["spriteFrames"]);
Galv.MAPT.fSpeed = Number(Galv.MAPT.plugin["frameSpeed"]);
Galv.MAPT.cancelled = false;
Galv.MAPT.active = 0;


// PLUGIN COMMANDS
//-----------------------------------------------------------------------------

PluginManager.registerCommand(Galv.MAPT.pluginName, "createMap", args => {
    const id = Number(args.mapId);
	const mapImage = args.mapImage;
	const backgrounds = Galv.MAPT.bgfgArray(args.bgImages);
	const foregrounds = Galv.MAPT.bgfgArray(args.fgImages);
	Galv.MAPT.createMap(id,mapImage,backgrounds,foregrounds);
});

PluginManager.registerCommand(Galv.MAPT.pluginName, "setLocation", args => {
	const mapid = Number(args.mapId);
	const mx = Number(args.mx);
	const my = Number(args.my);
	const tmid = Number(args.tmid);
	const tx = Number(args.tx);
	const ty = Number(args.ty);
	const frames = Number(args.f);
	Galv.MAPT.setLocation(mapid,args.name,args.image,mx,my,tmid,tx,ty,args.desc,frames);
});

PluginManager.registerCommand(Galv.MAPT.pluginName, "openMap", args => {
	const preventCancel = args.preventCancel == "false" ? false : true;
    Galv.MAPT.openMap(Number(args.mapId),preventCancel);
});

Galv.MAPT.bgfgArray = function(arrays) {
	arrays = arrays.split('",');
	for (let i = 0; i < arrays.length; i++) {
		let s = arrays[i];
		s = s.replace(/\[/g, '').replace(/\]/g, '').replace(/"/g, '');
		s = s.split(',');
		for (let i2 = 1; i2 < s.length; i2++) {
			s[i2] = Number(s[i2]);
		}
		arrays[i] = s;
	}
	return arrays;
};


Galv.MAPT.createMap = function(id,mapImage,backgrounds,foregrounds) {
	backgrounds = backgrounds || [];  // array of arrays with image details ["img",xm,ym,opac]
	foregrounds = foregrounds || [];  // array of arrays with image details ["img",xm,ym,opac]
	$gameSystem._travelMaps.maps[id] = {image:mapImage, backgrounds: backgrounds, foregrounds: foregrounds, locations: {}, objects: {}};
};

Galv.MAPT.setLocation = function(mapid,name,image,mx,my,tmid,tx,ty,desc,frames) {
	if (!Galv.MAPT.hasMap(mapid)) return;
	$gameSystem._travelMaps.maps[mapid].locations[name] = {name:name, image:image, mapXY:[mx,my], transfer:[tmid,tx,ty], enabled:true, desc: desc,frames:frames || Galv.MAPT.defaultFrames};
};

Galv.MAPT.setObject = function(mapid,name,image,mx,my,frames) {
	if (!Galv.MAPT.hasMap(mapid)) return;
	$gameSystem._travelMaps.maps[mapid].objects[name] = {name:name, image:image, mapXY:[mx,my],frames:frames || Galv.MAPT.defaultFrames};
};

Galv.MAPT.hasMap = function(id) {
	return $gameSystem._travelMaps.maps[id];
};

Galv.MAPT.openMap = function(id,preventCancel) {
	if (Galv.MAPT.hasMap(id)) {
		Galv.MAPT.cancelled = false;
		$gameSystem._TravelMapPreventCancel = preventCancel;
		$gameSystem._travelMapsId = id;
		SceneManager.push(Scene_MapTravel);
	}
};

Galv.MAPT.enableLocation = function(mapid,name,status) {
	if (Galv.MAPT.hasMap(mapid)) {
		$gameSystem._travelMaps.maps[mapid].locations[name].enabled = status;
	}
};

Galv.MAPT.removeLocation = function(mapid,name) {
	if (Galv.MAPT.hasMap(mapid)) {
		delete($gameSystem._travelMaps.maps[mapid].locations[name]);
	}
};

Galv.MAPT.removeObject = function(mapid,name) {
	if (Galv.MAPT.hasMap(mapid)) {
		delete($gameSystem._travelMaps.maps[mapid].objects[name]);
	}
};

Galv.MAPT.initLocation = function(mapid,name) {
	if ($gameSystem._travelMaps.maps[mapid]) {
		$gameSystem._travelMaps.maps[mapid].current = name;
		$gameSystem._travelMaps.current = null;
	} else {
		$gameSystem._travelMaps.current = name;
	}
};

Galv.MAPT.editLocation = function(mapid,name,attribute,value) {
	if (Galv.MAPT.hasMap(mapid)) {
		const loc = $gameSystem._travelMaps.maps[mapid].locations[name];
		if (loc) loc[attribute] = value;
	}
};


//-----------------------------------------------------------------------------
//  IMAGEMANAGER
//-----------------------------------------------------------------------------
ImageManager.loadMapTravelGraphic = function(filename, hue) {
    return this.loadBitmap('img/maptravel/', filename, hue, true);
};


//-----------------------------------------------------------------------------
//  SCENE SYSTEM
//-----------------------------------------------------------------------------
Galv.MAPT.Game_System_initialize = Game_System.prototype.initialize;
Game_System.prototype.initialize = function() {
	Galv.MAPT.Game_System_initialize.call(this);
	this._travelMaps = {maps:{},current:null};  // to store and reference all travel map details
	this._travelMapsId = 0; // set to map id to use in travelmap scene
};




//-----------------------------------------------------------------------------
//  SCENE MAP TRAVEL
//-----------------------------------------------------------------------------

function Scene_MapTravel() {
    this.initialize(...arguments);
}

Scene_MapTravel.prototype = Object.create(Scene_MenuBase.prototype);
Scene_MapTravel.prototype.constructor = Scene_MapTravel;

Scene_MapTravel.prototype.initialize = function() {
    Scene_MenuBase.prototype.initialize.call(this);
};

Scene_MapTravel.prototype.createVars = function() {
	this._currentMousePos = {x:TouchInput.x,y:TouchInput.y};
	const current = this.data().current || $gameSystem._travelMaps.current || null;
	if (current && this.data().locations[current]) {
		Galv.MAPT.active = current;
	} else {
		Galv.MAPT.active = 0;
	}
	Galv.MAPT.scrollTarget = null;
	this._prepRelease = false;
	this._drag = {x:0,y:0,sx:0,sy:0};
};

Scene_MapTravel.prototype.start = function() {
	this.createVars();
    Scene_MenuBase.prototype.start.call(this);
	this._menuActive = true;
};

Scene_MapTravel.prototype.create = function() {
    Scene_MenuBase.prototype.create.call(this);
	this._needRefresh = true; // need refresh to refresh sizes once map image loads
	this.createBackgrounds();
	this.createMap();
	this.createLocations();
	this.createObjects();
	this.createForegrounds();
	this.createLocWindow();
	this.createLocListWindow();
	this.createConfirmWindow();
};

Scene_MapTravel.prototype.createBackground = function() {
	Scene_MenuBase.prototype.createBackground.call(this);
};

Scene_MapTravel.prototype.data = function() {
	return $gameSystem._travelMaps.maps[$gameSystem._travelMapsId];
};

Scene_MapTravel.prototype.createBackgrounds = function() {
	this._bgSprites = [];
	const bgs = this.data().backgrounds;
	
	for (let i = 0; i < bgs.length; i++) {
		this._bgSprites[i] = new TilingSprite();
		this._bgSprites[i].width = Graphics.width;
		this._bgSprites[i].height = Graphics.height;
		this._bgSprites[i].bitmap = ImageManager.loadMapTravelGraphic(bgs[i][0],null,'images/');
		this._bgSprites[i].opacity = bgs[i][3];
		this.addChild(this._bgSprites[i]);
	};
};

Scene_MapTravel.prototype.createMap = function() {
	this.mapSprite = new Sprite();
	const filename = this.data().image;
	this.mapSprite.bitmap = ImageManager.loadMapTravelGraphic(filename,null,'images/');
	this.addChild(this.mapSprite);
};

Scene_MapTravel.prototype.createLocations = function() {
	this._locations = [];
	const locs = this.data().locations;
	for (let l in locs) {
		this._locations.push(new Sprite_MapTravelIcon(locs[l].name));
	};
	for (let i = 0; i < this._locations.length; i++) {
		this.mapSprite.addChild(this._locations[i]);
	};
};

Scene_MapTravel.prototype.createObjects = function() {
	this._objects = [];
	const objs = this.data().objects;
	for (let o in objs) {
		this._objects.push(new Sprite_MapTravelIconObj(objs[o].name));
	};
	for (let i = 0; i < this._objects.length; i++) {
		this.mapSprite.addChild(this._objects[i]);
	};
};
	
Scene_MapTravel.prototype.createForegrounds = function() {		
	this._fgSprites = [];
	const fgs = this.data().foregrounds;
	
	for (let i = 0; i < fgs.length; i++) {
		this._fgSprites[i] = new TilingSprite();
		this._fgSprites[i].width = Graphics.width;
		this._fgSprites[i].height = Graphics.height;
		this._fgSprites[i].bitmap = ImageManager.loadMapTravelGraphic(fgs[i][0],null,'images/');
		this._fgSprites[i].opacity = fgs[i][3];
		this.addChild(this._fgSprites[i]);
	};
};

Scene_MapTravel.prototype.createLocWindow = function() {	
	this._locationWindow = new Window_MapTravelLocation();
    this.addChild(this._locationWindow);
};

Scene_MapTravel.prototype.createLocListWindow = function() {	
	this._locationListWindow = new Window_MapTravelList(0,0,Graphics.width / 3,Graphics.height - this._locationWindow.height);
	this._locationListWindow.activate();
    this.addChild(this._locationListWindow);
};

Scene_MapTravel.prototype.createConfirmWindow = function() {	
	this._confirmWindow = new Window_MapTravelConfirm(this.calcWindowHeight(2, true));
	this._confirmWindow.setHandler('confirm', this.confirmOk.bind(this));
	this._confirmWindow.setHandler('cancel', this.confirmCancel.bind(this));
	this._confirmWindow.deactivate();
    this.addChild(this._confirmWindow);
};

Scene_MapTravel.prototype.openConfirm = function() {
	if (Galv.MAPT.active && this.data().locations[Galv.MAPT.active].enabled) {	
		this._confirmWindow.activate();
		this._confirmWindow.open();
		this._confirmWindow.select(0);
		this._locationListWindow.deactivate();
	} else {
		SoundManager.playBuzzer();
	}
};

Scene_MapTravel.prototype.closeConfirm = function() {
	this._confirmWindow.deactivate();
	this._confirmWindow.close();
	this._confirmWindow.select(-1);
	this._locationListWindow.activate();
};

Scene_MapTravel.prototype.confirmOk = function() {
	this.setTransfer();
};

Scene_MapTravel.prototype.confirmCancel = function() {
	this.closeConfirm();
};

Scene_MapTravel.prototype.setTransfer = function() {
	if (Galv.MAPT.active) {	
		if (this.data().locations[Galv.MAPT.active].enabled) {
			this.doTransfer();
			SoundManager.playOk();
		} else {
			SoundManager.playBuzzer();
		}
	}
};

Scene_MapTravel.prototype.doTransfer = function() {
	const vars = this.data().locations[Galv.MAPT.active].transfer;
	$gameVariables.setValue(Galv.MAPT.mapVar,vars[0]);
	$gameVariables.setValue(Galv.MAPT.xVar,vars[1]);
	$gameVariables.setValue(Galv.MAPT.yVar,vars[2]);
	Galv.MAPT.mapSelected = true;
	SceneManager.goto(Scene_Map);
	Galv.MAPT.active = false;
};

Scene_MapTravel.prototype.doExitScene = function() {
	if ($gameSystem._TravelMapPreventCancel) return;
	SceneManager.pop();
};

Scene_MapTravel.prototype.update = function() {
	this.updateControls();
	this.updateLayers();
	Scene_MenuBase.prototype.update.call(this);
	this.updateRefresh();
	this.updateScroll();
};

Scene_MapTravel.prototype.updateScroll = function() {
	if (Galv.MAPT.scrollTarget) {
		const tx = Galv.MAPT.scrollTarget[0];
		const ty = Galv.MAPT.scrollTarget[1];
		const cx = Math.floor(this.mapSprite.x - Graphics.width / 1.5);
		const cy = Math.floor(this.mapSprite.y - (Graphics.height / 2) + (this._locationWindow.height / 2));
		
		let dist = Math.max(Math.round(Math.abs(tx + cx) * 0.1),1);
		let speed = Math.min(dist,15);
		if (-tx > cx) this.scrollLeft(speed);
		if (-tx < cx) this.scrollRight(speed);
		
		dist = Math.max(Math.round(Math.abs(ty + cy) * 0.1),1);
		speed = Math.min(dist,15);
		if (-ty > cy) this.scrollUp(speed);
		if (-ty < cy) this.scrollDown(speed);
	}
};

Scene_MapTravel.prototype.scrollLeft = function(speed) {
	this.mapSprite.x = Math.min(this.mapSprite.x + speed,0);
};

Scene_MapTravel.prototype.scrollRight = function(speed) {
	const m = this.mapSprite.bitmap.width;
	this.mapSprite.x = Math.max(this.mapSprite.x - speed,Graphics.width - m);
};

Scene_MapTravel.prototype.scrollUp = function(speed) {
	this.mapSprite.y = Math.min(this.mapSprite.y + speed,0);
};

Scene_MapTravel.prototype.scrollDown = function(speed) {
	const m = this.mapSprite.bitmap.height;
	this.mapSprite.y = Math.max(this.mapSprite.y - speed,Graphics.height - m);
};

Scene_MapTravel.prototype.updateControls = function() {
	if (this._needRefresh) return;
	this.updateKeyboardControls();
	this.updateMouseControls();
};

Scene_MapTravel.prototype.updateKeyboardControls = function() {
	if (!Galv.MAPT.active) {
		// If no location is selected, keyboard keys scroll around
		const speed = Input.isPressed('shift') ? 20 : 8;
		if (Input.isPressed('right') && !Input.isPressed('left')) {
			this.scrollRight(speed);
		} else if (Input.isPressed('left') && !Input.isPressed('right')) {
			this.scrollLeft(speed);
		}
		if (Input.isPressed('up') && !Input.isPressed('down')) {
			this.scrollUp(speed);
		} else if (Input.isPressed('down') && !Input.isPressed('up')) {
			this.scrollDown(speed);
		}
		
		if (Input.isTriggered('cancel') || TouchInput.isCancelled()) {
			Galv.MAPT.mapSelected = false;
			this.doExitScene();
		} else if (Input.isTriggered('ok')) {
			let selectClosest = null;
			let dist = 999999;
			for (let i = 0; i < this._locations.length; i++) {
				let a = this._locations[i].x + this.mapSprite.x - Graphics.width / 1.5;
				let b = this._locations[i].y + this.mapSprite.y - (Graphics.height / 2) + (this._locationWindow.height / 2);
				let dist2 = Math.sqrt( a * a + b * b );
				if (dist2 < dist) {
					selectCloset = this._locations[i];
					dist = dist2;
				}
			};	
			Galv.MAPT.active = selectCloset._name || this._locations[0]._name;
			this.refreshLocations();
		}
	} else {
		// If location is selected, cancel unselects location and no scrolling.
		if (!this._confirmWindow.active) {
			if (Input.isTriggered('cancel') || TouchInput.isCancelled()) {
				Galv.MAPT.active = null;
				Galv.MAPT.scrollTarget = null;
				this.refreshLocations();
			} else if (Input.isTriggered('ok')) {
				this.openConfirm();
			}
		}
	}
};

Scene_MapTravel.prototype.updateMouseControls = function() {
	if (!this._confirmWindow.active) {
		if (TouchInput.isPressed()) {
			if (TouchInput.isTriggered()) {
				if(this._locationListWindow.isTouchedInsideFrame()) {
					// Touch/click the list window
					if (this._locationListWindow.index() == this._locationListWindow.hitIndex()) this.openConfirm();
				} else {
					// Touch/click the map
					Galv.MAPT.scrollTarget = null;
					this._drag = {x:Number(TouchInput.x),y:Number(TouchInput.y),sx:Number(this.mapSprite.x),sy:Number(this.mapSprite.y)};
					this._triggeredIn = true;
				}
			}
			if (this._triggeredIn) {
				// Touched the map, not the list
				this.mapSprite.x = Math.max(Math.min(0,this._drag.sx - this._drag.x + TouchInput.x), Graphics.width - this.mapSprite.bitmap.width);
				this.mapSprite.y = Math.max(Math.min(0,this._drag.sy - this._drag.y + TouchInput.y), Graphics.height - this.mapSprite.bitmap.height);
				this._prepRelease = true;
			}
		} else if (this._prepRelease && this._triggeredIn) {
			for (let i = 0; i < this._locations.length; i++) {
				if (this._locations[i].isButtonTouched()) {
					if (Galv.MAPT.active === this._locations[i]._name) {
						this.openConfirm();
					} else {
						Galv.MAPT.active = this._locations[i]._name;
						break;
					}
				}
			}
			this.refreshLocations();
			this._prepRelease = false;
			this._triggeredIn = false;
	
		} else {
			this._triggeredIn = false;
		}
	}
};

Scene_MapTravel.prototype.refreshLocations = function() {
	for (let i = 0; i < this._locations.length; i++) {
		this._locations[i].refresh();
	}
};

Scene_MapTravel.prototype.updateRefresh = function() {
	if (this._needRefresh) {
		for (let i = 0; i < this._bgSprites.length; i++) {
			this._bgSprites[i].width = this.mapSprite.bitmap.width;
			this._bgSprites[i].height = this.mapSprite.bitmap.height;
			this._bgSprites[i].x = this.mapSprite.x;
			this._bgSprites[i].y = this.mapSprite.y;
		};
		for (let i = 0; i < this._fgSprites.length; i++) {
			this._fgSprites[i].width = this.mapSprite.bitmap.width;
			this._fgSprites[i].height = this.mapSprite.bitmap.height;
			this._fgSprites[i].x = this.mapSprite.x;
			this._fgSprites[i].y = this.mapSprite.y;
		};
		this._needRefresh = false;
	};
};

Scene_MapTravel.prototype.updateLayers = function() {
	const bgs = this.data().backgrounds;
	for (let i = 0; i < this._bgSprites.length; i++) {
		this._bgSprites[i].x = this.mapSprite.x;
		this._bgSprites[i].y = this.mapSprite.y;
		this._bgSprites[i].origin.x += bgs[i][1];
		this._bgSprites[i].origin.y += bgs[i][2];
	};	
	const fgs = this.data().foregrounds;
	for (let i = 0; i < this._fgSprites.length; i++) {
		this._fgSprites[i].x = this.mapSprite.x;
		this._fgSprites[i].y = this.mapSprite.y;
		this._fgSprites[i].origin.x += fgs[i][1];
		this._fgSprites[i].origin.y += fgs[i][2];
	};
};


//-----------------------------------------------------------------------------
// Sprite_MapTravelIcon
//-----------------------------------------------------------------------------

function Sprite_MapTravelIcon() {
    this.initialize(...arguments);
}

Sprite_MapTravelIcon.prototype = Object.create(Sprite.prototype);
Sprite_MapTravelIcon.prototype.constructor = Sprite_MapTravelIcon;

Sprite_MapTravelIcon.prototype.initialize = function(name) {
	this._isReady = false;
	this._enabled = true;
	this._sy = -1;
	this._sx = 0;
	this._fIndex = 0;
	this._ticker = 0;
    Sprite.prototype.initialize.call(this);
	this._name = name;
	this.cacheBitmap();
	this.anchor.y = 0.5;
	this.anchor.x = 0.5;
	const data = this.data();
	this.x = data.mapXY[0];
	this.y = data.mapXY[1];
	this._frames = data.frames;
};

Sprite_MapTravelIcon.prototype.data = function() {
	return $gameSystem._travelMaps.maps[$gameSystem._travelMapsId].locations[this._name];
};

Sprite_MapTravelIcon.prototype.cacheBitmap = function() {
	this._pw = 0;
	this._ph = 0;
	this.bitmap = ImageManager.loadMapTravelGraphic(this.data().image);
};

Sprite_MapTravelIcon.prototype.setBitmap = function() {
	this._pw = this.bitmap.width / this._frames;
	this._ph = this.bitmap.height / 3;
	
	if (!this.data().enabled) {
		this._enabled = false;
		this._sy = this._ph * 2;
	}
	this.updateBitmap();
};

Sprite_MapTravelIcon.prototype.updateBitmap = function() {
	if (this._enabled) this._sy = Galv.MAPT.active === this._name ? this._ph : 0;
	this.setFrame(this._sx, this._sy, this._pw, this._ph);
};

Sprite_MapTravelIcon.prototype.update = function() {
    Sprite.prototype.update.call(this);
	if (!this._isReady && ImageManager.isReady()) {
		this.setBitmap();
		this._isReady = true;
	}
	
	if (this._ticker >= Galv.MAPT.fSpeed) {
		this._fIndex += 1;
		if (this._fIndex >= this._frames) this._fIndex = 0;
		this._sx = this._fIndex * this._pw;
		this.setFrame(this._sx, this._sy, this._pw, this._ph);
		this._ticker = 0;
	} else {
		this._ticker += 1;
	}
};

Sprite_MapTravelIcon.prototype.refresh = function() {
	this.updateBitmap();
};

Sprite_MapTravelIcon.prototype.isButtonTouched = function() {
    const x = this.canvasToLocalX(TouchInput.x + this.width * 0.5);
    const y = this.canvasToLocalY(TouchInput.y + this.height * 0.5);
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
};

Sprite_MapTravelIcon.prototype.canvasToLocalX = function(x) {
    let node = this;
    while (node) {
        x -= node.x;
        node = node.parent;
    }
    return x;
};

Sprite_MapTravelIcon.prototype.canvasToLocalY = function(y) {
    let node = this;
    while (node) {
        y -= node.y;
        node = node.parent;
    }
    return y;
};


//-----------------------------------------------------------------------------
// Sprite_MapTravelIconObj
//-----------------------------------------------------------------------------

function Sprite_MapTravelIconObj() {
    this.initialize(...arguments);
}

Sprite_MapTravelIconObj.prototype = Object.create(Sprite_MapTravelIcon.prototype);
Sprite_MapTravelIconObj.prototype.constructor = Sprite_MapTravelIconObj;

Sprite_MapTravelIconObj.prototype.data = function() {
	return $gameSystem._travelMaps.maps[$gameSystem._travelMapsId].objects[this._name];
};

Sprite_MapTravelIconObj.prototype.updateBitmap = function() {
	this.setFrame(this._sx, 0, this._pw, this._ph);
};

Sprite_MapTravelIconObj.prototype.setBitmap = function() {
	this._pw = this.bitmap.width / this._frames;
	this._ph = this.bitmap.height;
	this.updateBitmap();
};

Sprite_MapTravelIconObj.prototype.isButtonTouched = function() {
};


//-----------------------------------------------------------------------------
// Window_MapTravelLocation
//-----------------------------------------------------------------------------

function Window_MapTravelLocation() {
    this.initialize(...arguments);
}

Window_MapTravelLocation.prototype = Object.create(Window_Base.prototype);
Window_MapTravelLocation.prototype.constructor = Window_MapTravelLocation;

Window_MapTravelLocation.prototype.initialize = function() {
    const width = Graphics.width; // - 40;
    const height = this.fittingHeight(2);
    Window_Base.prototype.initialize.call(this, new Rectangle(0, 0, width, height));
	this.y = Graphics.height;
	this._currentLocation = null;
};

Window_MapTravelLocation.prototype.data = function() {
	return $gameSystem._travelMaps.maps[$gameSystem._travelMapsId].locations[Galv.MAPT.active];
};

Window_MapTravelLocation.prototype.refresh = function() {
    this.contents.clear();
	if (Galv.MAPT.active) {
		const desc = this.data().desc.split("|");
		for (let i = 0; i < desc.length; i++) {
			this.drawTextEx(desc[i], $gameSystem.windowPadding(), this.lineHeight() * i);
		}
		this._currentLocation = Galv.MAPT.active;
	}
};

Window_MapTravelLocation.prototype.update = function() {
	if (Galv.MAPT.active) {
		this.y = Math.max(this.y -= 12,Graphics.height - this.height);
	} else {
		this.y = Math.min(Graphics.height,this.y += 12);
	}
	if (this._currentLocation != Galv.MAPT.active) {
		this.refresh();
	}
};


//-----------------------------------------------------------------------------
// Window_MapTravelList
//-----------------------------------------------------------------------------

function Window_MapTravelList() {
    this.initialize(...arguments);
}

Window_MapTravelList.prototype = Object.create(Window_Selectable.prototype);
Window_MapTravelList.prototype.constructor = Window_MapTravelList;

Window_MapTravelList.prototype.initialize = function(x, y, width, height) {
	Window_Selectable.prototype.initialize.call(this, new Rectangle(0, 0, width, height));
	this._data = [];
	this.refresh();
	this._currentActive = -1;
	this.x = -width;
};

Window_MapTravelList.prototype.maxCols = function() {
	return 1;
};

Window_MapTravelList.prototype.spacing = function() {
	return 48;
};

Window_MapTravelList.prototype.maxItems = function() {
	return this._data ? this._data.length : 1;
};

Window_MapTravelList.prototype.data = function() {
	return $gameSystem._travelMaps.maps[$gameSystem._travelMapsId];
};

Window_MapTravelList.prototype.item = function() {
	const index = this.index();
	return this._data && index >= 0 ? this._data[index] : null;
};

Window_MapTravelList.prototype.isCurrentItemEnabled = function() {
	return this.isEnabled(this.item());
};

Window_MapTravelList.prototype.isEnabled = function(item) {
	return item && item.enabled;
};

Window_MapTravelList.prototype.makeItemList = function() {
	this._data = [];
	const locs = this.data().locations;
	for (let l in locs) {
		this._data.push(locs[l]);
	};
};

Window_MapTravelList.prototype.drawItem = function(index) {
	const item = this._data[index];
	if (item) {
		const rect = this.itemRect(index);
		rect.width -= $gameSystem.windowPadding();
		this.changePaintOpacity(this.isEnabled(item));
		this.drawText(item.name,rect.x + 10,rect.y,rect.width - 10,"left");
		this.changePaintOpacity(1);
	}
};

Window_MapTravelList.prototype.refresh = function() {
    this.makeItemList();
    this.createContents();
    this.drawAllItems();
};

Window_MapTravelList.prototype.update = function() {
	if (Galv.MAPT.active) {	
		this.x = Math.min(this.x + 15,0);
	} else {
		this.x = Math.max(this.x - 15,-this.width);
		return;
	}
	
	Window_Selectable.prototype.update.call(this);
	if (Galv.MAPT.active != this._currentActive) {
		// select item
		let id = -1;
		for (let i = 0; i < this._data.length; i++) {
			if (this._data[i].name === Galv.MAPT.active) {
				this._currentActive = Galv.MAPT.active;
				Galv.MAPT.scrollTarget = this.data().locations[Galv.MAPT.active].mapXY;
				id = i;
				break;
			}
		}
		this.select(id);
	}
};

Window_MapTravelList.prototype.select = function(index) {
	Window_Selectable.prototype.select.call(this,index);
	const item = this.item();
	if (item) {
		Galv.MAPT.active = this.item().name;
		if (SceneManager._scene.refreshLocations) SceneManager._scene.refreshLocations();
	}
};

Window_MapTravelList.prototype.onTouch = function(triggered) {
	const lastIndex = this.index();
	const x = this.canvasToLocalX(TouchInput.x);
	const y = this.canvasToLocalY(TouchInput.y);
	const hitIndex = this.hitTest(x, y);
	if (hitIndex >= 0 && triggered) {
		if (hitIndex === this.index()) {
			if (triggered) {
				SceneManager._scene.openConfirm();
			}
		} else {
			this.select(hitIndex);
		}
	}
	if (this.index() !== lastIndex) {
		SoundManager.playCursor();		
	}
};


//-----------------------------------------------------------------------------
//  Window_MapTravelConfirm
//-----------------------------------------------------------------------------

function Window_MapTravelConfirm() {
    this.initialize(...arguments);
}

Window_MapTravelConfirm.prototype = Object.create(Window_Command.prototype);
Window_MapTravelConfirm.prototype.constructor = Window_MapTravelConfirm;

Window_MapTravelConfirm.prototype.initialize = function(height) {
    Window_Command.prototype.initialize.call(this, new Rectangle(0,0,Galv.MAPT.cWinWidth,height));
    this.updatePlacement();
    this.openness = 0;
};

Window_MapTravelConfirm.prototype.windowWidth = function() {
    return Galv.MAPT.cWinWidth;
};

Window_MapTravelConfirm.prototype.updatePlacement = function() {
	this.x = (Graphics.width - this.windowWidth()) *  0.7;
	this.y = (Graphics.height - this.height) / 2 - 54;
};

Window_MapTravelConfirm.prototype.makeCommandList = function() {
	this.addCommand(Galv.MAPT.txtConfirm,   'confirm');
	this.addCommand(Galv.MAPT.txtCancel,   'cancel');
};

Window_MapTravelConfirm.prototype.processOk = function() {
    Window_Command.prototype.processOk.call(this);
};