// 打包资源保护插件 for RPG Maker MZ（由 check_deploy.py 自动生成，请勿手动编辑）
// 原理：MZ 打包工具会识别插件参数中 @type file 类型引用的文件并保留。
/*:
 * @target MZ
 * @plugindesc [打包资源保护] 通过 @type file 参数保留自定义目录文件，防止被“排除未使用的文件”删除。
 * @author 本丸
 *
 * @help
 * 本插件没有任何运行逻辑，仅用于打包部署时保留文件。
 * 所有参数由 check_deploy.py 在打包前自动维护，无需手动设置。
 *
 * @param maptravel01
 * @text 保留文件 img/maptravel/1_weixin
 * @type file
 * @dir img/maptravel
 * @ext .png
 * @desc 要保留的文件名（不带扩展名）
 * @default 1_weixin
 *
 * @param maptravel02
 * @text 保留文件 img/maptravel/2_jianghu
 * @type file
 * @dir img/maptravel
 * @ext .png
 * @desc 要保留的文件名（不带扩展名）
 * @default 2_jianghu
 *
 * @param maptravel03
 * @text 保留文件 img/maptravel/3_zhifeng
 * @type file
 * @dir img/maptravel
 * @ext .png
 * @desc 要保留的文件名（不带扩展名）
 * @default 3_zhifeng
 *
 * @param maptravel04
 * @text 保留文件 img/maptravel/4_zhanguo
 * @type file
 * @dir img/maptravel
 * @ext .png
 * @desc 要保留的文件名（不带扩展名）
 * @default 4_zhanguo
 *
 * @param maptravel05
 * @text 保留文件 img/maptravel/5_wujia
 * @type file
 * @dir img/maptravel
 * @ext .png
 * @desc 要保留的文件名（不带扩展名）
 * @default 5_wujia
 *
 * @param maptravel06
 * @text 保留文件 img/maptravel/6_chitianwu
 * @type file
 * @dir img/maptravel
 * @ext .png
 * @desc 要保留的文件名（不带扩展名）
 * @default 6_chitianwu
 *
 * @param maptravel07
 * @text 保留文件 img/maptravel/background
 * @type file
 * @dir img/maptravel
 * @ext .png
 * @desc 要保留的文件名（不带扩展名）
 * @default background
 *
 * @param maptravel08
 * @text 保留文件 img/maptravel/loc_mansion
 * @type file
 * @dir img/maptravel
 * @ext .png
 * @desc 要保留的文件名（不带扩展名）
 * @default loc_mansion
 *
 * @param maptravel09
 * @text 保留文件 img/maptravel/nothing
 * @type file
 * @dir img/maptravel
 * @ext .png
 * @desc 要保留的文件名（不带扩展名）
 * @default nothing
 *
 */

(function() {
    'use strict';
    // 无运行逻辑。参数仅用于打包部署时的文件识别与保留。
})();