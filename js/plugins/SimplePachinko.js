/*:
 * @target MZ
 * @plugindesc [v3.4] 简易柏青哥 - 音效修复与UI对齐版
 * @author AI Assistant
 *
 * @help
 * ============================================================================
 * 【游戏机制】
 * 1. 核心玩法:
 * 玩家决定一次投入多少颗珠子（投入数）以及期望的倍率。
 * 珠子从顶部随机位置落下，依靠运气落入底部的奖口。
 *
 * 2. 风险与回报:
 * - 倍率越高，底部的奖口数量越少 (最难10倍仅1个口)。
 * - 投入数越多，同时落下的珠子越多，命中概率增加，但消耗也大。
 * - 单颗珠子中奖奖励 = 当前倍率。
 * - 获得分数 = 投入数 * 当前倍率 (每次中奖都会累加此分数)。
 *
 * 3. 操作方式 (键盘/手柄):
 * - [左/右] : 调整投入弹珠数量 (1~10)。
 * - [上/下] : 调整奖励倍率 (2, 4, 6, 8, 10)。
 * - [确定/Z] : 发射 (扣除投入的弹珠，开始掉落)。
 * - [取消/X] : 退出游戏。
 *
 * 4. 操作方式 (触屏/鼠标):
 * - 点击屏幕上的虚拟按钮进行对应操作。
 *
 * ============================================================================
 *
 * @param VariableBallCount
 * @text 持有珠子变量ID
 * @type variable
 * @default 1
 *
 * @param VariableWinCount
 * @text 累计得分变量ID
 * @type variable
 * @default 0
 *
 * @param ColorBG
 * @text 背景颜色
 * @default #222222
 *
 * @param ColorBorder
 * @text 边框颜色
 * @default #444444
 *
 * @param ColorBall
 * @text 钢珠颜色
 * @default #EEEEEE
 *
 * @param ColorPin
 * @text 钉子颜色
 * @default #FFD700
 *
 * @param ColorPocket
 * @text 奖口颜色
 * @default #FF5555
 *
 * @command open
 * @text 开始柏青哥
 * @desc 打开小游戏场景
 */

(() => {
    'use strict';
    const pluginName = "SimplePachinko";
    const parameters = PluginManager.parameters(pluginName);
    
    const SETTINGS = {
        ballVarId: Number(parameters['VariableBallCount'] || 1),
        winVarId: Number(parameters['VariableWinCount'] || 0),
        
        // 颜色
        colorBG: String(parameters['ColorBG'] || "#222222"),
        colorBorder: String(parameters['ColorBorder'] || "#444444"),
        colorBall: String(parameters['ColorBall'] || "#EEEEEE"),
        colorPin: String(parameters['ColorPin'] || "#FFD700"),
        colorPocket: String(parameters['ColorPocket'] || "#FF5555"),
        
        // 物理参数
        gravity: 0.2,       // 重力
        bounce: 0.6,        // 弹性
        friction: 0.98,     // 空气阻力
        pinRadius: 3,
        ballRadius: 5,
        pocketRadius: 18,
        
        // 游戏限制
        maxWager: 10,       // 最大单次投入
        multipliers: [2, 4, 6, 8, 10] // 可选倍率
    };

    // -------------------------------------------------------------------------
    // Plugin Command
    // -------------------------------------------------------------------------
    PluginManager.registerCommand(pluginName, "open", args => {
        SceneManager.push(Scene_Pachinko);
    });

    // -------------------------------------------------------------------------
    // Graphics Helper (Drawing)
    // -------------------------------------------------------------------------
    const GraphicsHelper = {
        createCircle(radius, color, hasBorder = false) {
            const size = radius * 2 + 2;
            const bitmap = new Bitmap(size, size);
            const ctx = bitmap.context;
            const cx = size / 2, cy = size / 2;
            
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2, false);
            ctx.fillStyle = color;
            ctx.fill();
            
            // 高光
            ctx.beginPath();
            ctx.arc(cx - radius * 0.3, cy - radius * 0.3, radius * 0.2, 0, Math.PI * 2, false);
            ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
            ctx.fill();

            if (hasBorder) {
                ctx.lineWidth = 2;
                ctx.strokeStyle = "rgba(0,0,0,0.3)";
                ctx.stroke();
            }
            return bitmap;
        },

        createPocket(radius, color) {
            const size = radius * 2 + 4;
            const bitmap = new Bitmap(size, size);
            const ctx = bitmap.context;
            const cx = size / 2, cy = size / 2;

            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2, false);
            ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
            ctx.fill();
            
            ctx.lineWidth = 4;
            ctx.strokeStyle = color;
            ctx.stroke();
            return bitmap;
        },

        createBoardBG(width, height, leftWall, rightWall) {
            const bitmap = new Bitmap(width, height);
            bitmap.fillRect(0, 0, width, height, SETTINGS.colorBorder);
            bitmap.fillRect(leftWall, 0, rightWall - leftWall, height, SETTINGS.colorBG);
            return bitmap;
        },

        // 创建虚拟按钮位图
        createButton(width, height, text, color = "#666666") {
            const bitmap = new Bitmap(width, height);
            const ctx = bitmap.context;
            const radius = 10;
            
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(radius, 0);
            ctx.lineTo(width - radius, 0);
            ctx.quadraticCurveTo(width, 0, width, radius);
            ctx.lineTo(width, height - radius);
            ctx.quadraticCurveTo(width, height, width - radius, height);
            ctx.lineTo(radius, height);
            ctx.quadraticCurveTo(0, height, 0, height - radius);
            ctx.lineTo(0, radius);
            ctx.quadraticCurveTo(0, 0, radius, 0);
            ctx.closePath();
            ctx.fill();
            
            // 边框
            ctx.lineWidth = 2;
            ctx.strokeStyle = "#FFFFFF";
            ctx.stroke();

            // 文字
            bitmap.fontSize = 24;
            bitmap.textColor = "#FFFFFF";
            bitmap.drawText(text, 0, 0, width, height, "center");
            
            return bitmap;
        }
    };

    // -------------------------------------------------------------------------
    // Virtual Button Sprite
    // -------------------------------------------------------------------------
    class Sprite_VirtualButton extends Sprite {
        constructor(width, height, text, color, callback) {
            super();
            this.bitmap = GraphicsHelper.createButton(width, height, text, color);
            this._callback = callback;
            this._width = width;
            this._height = height;
            this._pressed = false;
            this.anchor.set(0.5);
        }

        update() {
            super.update();
            this.processTouch();
        }

        processTouch() {
            if (TouchInput.isTriggered()) {
                if (this.isTouched()) {
                    this._pressed = true;
                    this.scale.set(0.95);
                    // 【修复】按下时不播放声音，只在触发功能时播放
                }
            } else if (TouchInput.isReleased()) {
                if (this._pressed) {
                    this._pressed = false;
                    this.scale.set(1.0);
                    if (this.isTouched()) {
                        this._callback();
                    }
                }
            }
        }

        isTouched() {
            const x = TouchInput.x;
            const y = TouchInput.y;
            return x >= this.x - this._width/2 && x <= this.x + this._width/2 &&
                   y >= this.y - this._height/2 && y <= this.y + this._height/2;
        }
    }

    // -------------------------------------------------------------------------
    // Scene Class
    // -------------------------------------------------------------------------
    class Scene_Pachinko extends Scene_MenuBase {
        create() {
            super.create();
            // 游戏状态
            this._balls = [];
            this._pins = [];
            this._pockets = [];
            this._wager = 1;          
            this._multIndex = 0;      
            
            // 布局边界
            this._boardLeft = 200;
            this._boardRight = Graphics.width - 200;
            
            this.generateBitmaps();
            this.createBackground();
            this.createPins();      
            this.createPockets();   
            this.createBallLayer();
            this.createUI();        
            this.createControls();  
            
            this.refreshPockets();
        }

        generateBitmaps() {
            this._bmpBall = GraphicsHelper.createCircle(SETTINGS.ballRadius, SETTINGS.colorBall);
            this._bmpPin = GraphicsHelper.createCircle(SETTINGS.pinRadius, SETTINGS.colorPin, true);
            this._bmpPocket = GraphicsHelper.createPocket(SETTINGS.pocketRadius, SETTINGS.colorPocket);
        }

        createBackground() {
            this._bgSprite = new Sprite();
            this._bgSprite.bitmap = GraphicsHelper.createBoardBG(
                Graphics.width, Graphics.height, this._boardLeft, this._boardRight
            );
            this.addChild(this._bgSprite);
        }

        createPins() {
            const startX = this._boardLeft + 30;
            const endX = this._boardRight - 30;
            const startY = 100;
            const endY = 450;
            const gap = 36;

            let row = 0;
            for (let y = startY; y < endY; y += gap * 0.866) {
                const offset = (row % 2 === 0) ? 0 : gap / 2;
                for (let x = startX + offset; x < endX; x += gap) {
                    if (y > 380 && Math.abs(x - Graphics.width/2) < 150) continue;

                    const pin = new Sprite();
                    pin.bitmap = this._bmpPin;
                    pin.anchor.set(0.5);
                    pin.x = x;
                    pin.y = y;
                    this.addChild(pin);
                    this._pins.push({x: x, y: y});
                }
                row++;
            }
        }

        createPockets() {
            this._pocketLayer = new Sprite();
            this.addChild(this._pocketLayer);
        }

        createBallLayer() {
            this._ballContainer = new Sprite();
            this.addChild(this._ballContainer);
        }

        createUI() {
            // 左上角，高度增加到 320 以防止内容被切断
            const rect = new Rectangle(10, 10, 180, 320);
            this._infoWindow = new Window_PachinkoInfo(rect);
            this.addChild(this._infoWindow);
            this.refreshInfo();
        }

        // 【修改】重新设计按钮布局，使其完美对齐
        createControls() {
            this._hudLayer = new Sprite();
            this.addChild(this._hudLayer);
            
            const btnW = 60, btnH = 60;
            
            // 定义左侧十字键的中心点
            const centerX = 95; 
            const centerY = 440; // 稍微靠下，避免挡住上面的信息
            const dist = 55;     // 按钮间距（半径）

            // 1. 上 (倍率+)
            this._hudLayer.addChild(new Sprite_VirtualButton(btnW, btnH, "↑", "#444444", () => {
                this.changeMultiplier(1);
            }));
            const btnUp = this._hudLayer.children[0];
            btnUp.x = centerX;
            btnUp.y = centerY - dist;

            // 2. 左 (数量-)
            this._hudLayer.addChild(new Sprite_VirtualButton(btnW, btnH, "←", "#444444", () => {
                this.changeWager(-1);
            }));
            const btnLeft = this._hudLayer.children[1];
            btnLeft.x = centerX - dist;
            btnLeft.y = centerY;

            // 3. 右 (数量+)
            this._hudLayer.addChild(new Sprite_VirtualButton(btnW, btnH, "→", "#444444", () => {
                this.changeWager(1);
            }));
            const btnRight = this._hudLayer.children[2];
            btnRight.x = centerX + dist;
            btnRight.y = centerY;

            // 4. 下 (倍率-)
            this._hudLayer.addChild(new Sprite_VirtualButton(btnW, btnH, "↓", "#444444", () => {
                this.changeMultiplier(-1);
            }));
            const btnDown = this._hudLayer.children[3];
            btnDown.x = centerX;
            btnDown.y = centerY + dist;

            // 右侧控制区
            const rightBaseX = Graphics.width - 100;
            
            // 5. 退出按钮
            this._hudLayer.addChild(new Sprite_VirtualButton(120, 50, "退出", "#AA4444", () => {
                SoundManager.playCancel(); // 退出时添加取消音效
                this.popScene();
            }));
            const exitBtn = this._hudLayer.children[4];
            exitBtn.x = rightBaseX;
            exitBtn.y = 40;

            // 6. 发射按钮
            this._hudLayer.addChild(new Sprite_VirtualButton(140, 140, "发射!", "#44AA44", () => {
                this.tryDropBalls();
            }));
            const fireBtn = this._hudLayer.children[5];
            fireBtn.x = rightBaseX;
            fireBtn.y = Graphics.height - 100;
        }

        getCurrentMultiplier() {
            return SETTINGS.multipliers[this._multIndex];
        }

        refreshPockets() {
            this._pocketLayer.removeChildren();
            this._pockets = [];

            const mult = this.getCurrentMultiplier();
            const count = 6 - (mult / 2);
            
            const areaWidth = this._boardRight - this._boardLeft - 40;
            const segment = areaWidth / (count + 1);
            const startX = this._boardLeft + 20;
            const baseY = 520;

            for (let i = 1; i <= count; i++) {
                const px = startX + segment * i;
                const py = baseY;
                
                const sprite = new Sprite();
                sprite.bitmap = this._bmpPocket;
                sprite.anchor.set(0.5);
                sprite.x = px;
                sprite.y = py;
                
                sprite.update = function() {
                    this.scale.set(1 + Math.sin(Date.now() / 200) * 0.05);
                };

                this._pocketLayer.addChild(sprite);
                this._pockets.push({
                    x: px, y: py, 
                    radius: SETTINGS.pocketRadius,
                    reward: mult
                });
            }
        }

        changeWager(dir) {
            this._wager += dir;
            if (this._wager < 1) this._wager = 1;
            if (this._wager > SETTINGS.maxWager) this._wager = SETTINGS.maxWager;
            SoundManager.playCursor();
            this.refreshInfo();
        }

        changeMultiplier(dir) {
            const oldIndex = this._multIndex;
            this._multIndex += dir;
            if (this._multIndex < 0) this._multIndex = 0;
            if (this._multIndex >= SETTINGS.multipliers.length) this._multIndex = SETTINGS.multipliers.length - 1;
            
            if (oldIndex !== this._multIndex) {
                SoundManager.playCursor();
                this.refreshPockets();
                this.refreshInfo();
            }
        }

        refreshInfo() {
            this._infoWindow.setValues(this._wager, this.getCurrentMultiplier());
        }

        tryDropBalls() {
            const currentHeld = $gameVariables.value(SETTINGS.ballVarId);
            if (currentHeld < this._wager) {
                SoundManager.playBuzzer();
                return;
            }

            $gameVariables.setValue(SETTINGS.ballVarId, currentHeld - this._wager);
            SoundManager.playOk(); 
            this.refreshInfo();

            for (let i = 0; i < this._wager; i++) {
                this.spawnBall(i * 5); 
            }
        }

        spawnBall(delayFrames) {
            const sprite = new Sprite();
            sprite.bitmap = this._bmpBall;
            sprite.anchor.set(0.5);
            
            const randX = this._boardLeft + 20 + Math.random() * (this._boardRight - this._boardLeft - 40);
            
            sprite.x = randX;
            sprite.y = -20; 

            const ball = {
                sprite: sprite,
                x: randX,
                y: -20,
                vx: (Math.random() - 0.5) * 2, 
                vy: 0,
                delay: delayFrames,
                active: false
            };
            
            this._balls.push(ball);
            this._ballContainer.addChild(sprite);
        }

        update() {
            super.update();
            this.updateInput();
            this.updatePhysics();
            this._infoWindow.refresh(); 
        }

        updateInput() {
            if (Input.isRepeated('right')) this.changeWager(1);
            if (Input.isRepeated('left')) this.changeWager(-1);
            if (Input.isRepeated('up')) this.changeMultiplier(1);
            if (Input.isRepeated('down')) this.changeMultiplier(-1);
            
            if (Input.isTriggered('ok')) this.tryDropBalls();
            if (Input.isTriggered('cancel')) this.popScene();
        }

        updatePhysics() {
            for (let i = this._balls.length - 1; i >= 0; i--) {
                const ball = this._balls[i];
                
                if (ball.delay > 0) {
                    ball.delay--;
                    ball.sprite.visible = false;
                    continue;
                }
                ball.sprite.visible = true;
                ball.active = true;

                ball.vy += SETTINGS.gravity;
                ball.vx *= SETTINGS.friction;
                ball.vy *= SETTINGS.friction;

                ball.x += ball.vx;
                ball.y += ball.vy;

                for (const pin of this._pins) {
                    if (Math.abs(ball.x - pin.x) > 20 || Math.abs(ball.y - pin.y) > 20) continue;
                    
                    const dx = ball.x - pin.x;
                    const dy = ball.y - pin.y;
                    const distSq = dx*dx + dy*dy;
                    const minDist = SETTINGS.ballRadius + SETTINGS.pinRadius;

                    if (distSq < minDist * minDist) {
                        const dist = Math.sqrt(distSq);
                        const nx = dx / dist;
                        const ny = dy / dist;
                        
                        const dot = ball.vx * nx + ball.vy * ny;
                        ball.vx = (ball.vx - 2 * dot * nx) * SETTINGS.bounce;
                        ball.vy = (ball.vy - 2 * dot * ny) * SETTINGS.bounce;
                        
                        const overlap = minDist - dist;
                        ball.x += nx * overlap;
                        ball.y += ny * overlap;

                        ball.vx += (Math.random() - 0.5);
                        
                        if (Math.abs(ball.vy) > 1) {
                            const pitch = 120 + Math.random() * 40;
                            AudioManager.playSe({name: "Cursor1", volume: 30, pitch: pitch, pan: 0});
                        }
                        break; 
                    }
                }

                if (ball.x < this._boardLeft + SETTINGS.ballRadius) {
                    ball.x = this._boardLeft + SETTINGS.ballRadius;
                    ball.vx *= -0.6;
                } else if (ball.x > this._boardRight - SETTINGS.ballRadius) {
                    ball.x = this._boardRight - SETTINGS.ballRadius;
                    ball.vx *= -0.6;
                }

                let removed = false;
                for (const pkt of this._pockets) {
                    const dx = ball.x - pkt.x;
                    const dy = ball.y - pkt.y;
                    if (dx*dx + dy*dy < pkt.radius * pkt.radius) {
                        this.onWin(pkt.reward);
                        removed = true;
                        break;
                    }
                }

                if (!removed && ball.y > Graphics.height + 20) {
                    removed = true;
                }

                ball.sprite.x = ball.x;
                ball.sprite.y = ball.y;

                if (removed) {
                    this._ballContainer.removeChild(ball.sprite);
                    this._balls.splice(i, 1);
                }
            }
        }

        onWin(multiplier) {
            const currentBalls = $gameVariables.value(SETTINGS.ballVarId);
            const rewardBalls = multiplier; 
            $gameVariables.setValue(SETTINGS.ballVarId, currentBalls + rewardBalls);
            
            if (SETTINGS.winVarId > 0) {
                const currentScore = $gameVariables.value(SETTINGS.winVarId);
                const scoreGain = this._wager * multiplier;
                $gameVariables.setValue(SETTINGS.winVarId, currentScore + scoreGain);
            }
            AudioManager.playSe({name: "Shop1", volume: 90, pitch: 100 + (multiplier * 5), pan: 0});
        }
    }

    // -------------------------------------------------------------------------
    // Info Window
    // -------------------------------------------------------------------------
    class Window_PachinkoInfo extends Window_Base {
        initialize(rect) {
            super.initialize(rect);
            this.opacity = 0;
            this._wagerVal = 1;
            this._multVal = 2;
            this.refresh();
        }

        setValues(wager, mult) {
            if (this._wagerVal !== wager || this._multVal !== mult) {
                this._wagerVal = wager;
                this._multVal = mult;
                this.refresh();
            }
        }

        refresh() {
            this.contents.clear();
            const ctx = this.contents.context;
            
            // 绘制深色半透明背景以便看清文字
            ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
            ctx.fillRect(0, 0, this.contentsWidth(), this.contentsHeight());
            
            const balls = $gameVariables.value(SETTINGS.ballVarId);
            const score = SETTINGS.winVarId > 0 ? $gameVariables.value(SETTINGS.winVarId) : 0;
            
            const width = this.contentsWidth();
            let y = 10;
            const lh = 32; 
            
            // 1. 持有珠子
            this.changeTextColor(ColorManager.systemColor());
            this.drawText("持有珠子", 10, y, width - 20, 'left');
            this.resetTextColor();
            y += lh;
            this.drawText(balls, 10, y, width - 20, 'right');
            y += lh + 10; 

            // 2. 本局得分
            this.changeTextColor(ColorManager.systemColor());
            this.drawText("本局得分", 10, y, width - 20, 'left');
            this.resetTextColor();
            y += lh;
            this.drawText(score, 10, y, width - 20, 'right');
            y += lh + 10;

            // 分割线
            this.contents.fillRect(10, y, width - 20, 2, "rgba(255,255,255,0.3)");
            y += 10;

            // 3. 动态参数
            this.changeTextColor(ColorManager.crisisColor()); 
            this.drawText(`投入: ${this._wagerVal} 颗`, 10, y, width - 20, 'left');
            y += lh;
            this.drawText(`倍率: x${this._multVal}`, 10, y, width - 20, 'left');
        }
    }
})();