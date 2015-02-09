/**
 * app类，包含app操作常用的方法集合
 * @type {Object}
 */
var app = {
    /**
     * 用户点击返回的时间原始值
     * @type {Number}
     */
    exitTime: 0,
    /**
     * 构建应用方法，只调用一次
     * @return {[type]} [description]
     */
    create: function() {
        var that = this;
        // 检测是否选择旅行地点，如果没有选择，强制跳转到选择页面
        that.checkLocation(true);
        // 初始化旅游地点选择控件
        that.initLocationSelector();
        // 注册app监听事件
        that.bindEvents();
        // 初始化panel的内容为正在加载...
        $.each(config.toolHashs, function(index, idStr) {
            // 日出日落时间不需要从服务器动态加载，所以不需要显示loading
            if (idStr == "#RCRLSJ") return;
            that.initPanelLoading($(idStr));
        });
        // 初始化日期选择控件
        $('#date-input')
        .val($.maya.utils.formatDate(new Date()))
        .on("change", function(e) {
            that.calc_res();
        })
        .datepicker({
            monthNames: ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"],
            shortDayNames: ["日", "一", "二", "三", "四", "五", "六"]
        });

        that.initialize();
    },
    /**
     * 应用初始化，可以多次调用
     * @return {[type]} [description]
     */
    initialize: function() {
        var that = this;
        // 初始化旅游地点信息
        that.showLocation();
        // 初始化日出日落时间
        that.calc_res();
        // 初始化音乐播放控件
        that.initMusicPlayer();

        console.log("intialize end.");
    },
    /**
     * 注册app需要监听的事件
     * @return {[type]} [description]
     */
    bindEvents: function() {
        document.addEventListener("deviceready", this.onDeviceReady, false);
    },
    // deviceready Event Handler
    //
    // The scope of 'this' is the event. In order to call the 'receivedEvent'
    // function, we must explicitly call 'app.receivedEvent(...);'
    onDeviceReady: function() {
        // Now safe to use device APIs
        //
        // fix a bug ios7 & ios8
        app.fixStatusBarIssue();

        // 点击返回按钮
        document.addEventListener("backbutton", function() {
            var hash = location.hash || "#main";
            if(hash.indexOf("#main") > -1) {
                // 实现按两次返回键退出程序
                if ((new Date()).valueOf() - app.exitTime > 2000) {
                    $.maya.utils.showNotice("再按一次退出程序");
                    app.exitTime = (new Date()).valueOf();
                } else {
                    // 停止音乐播放
                    $(".music-area").musicplayer("pause");
                    navigator.app.exitApp();
                }
            }
            else {
                //navigator.app.backHistory();
                $.ui.goBack();
            }
        }, false);
        
        /*
        // 转为后台应用，停止音乐播放
        document.addEventListener("pause", function() {
            $(".music-area").musicplayer("pause");
        }, false);
        
        // 应用恢复为前台进程，播放音乐
        document.addEventListener("resume", function() {
            $(".music-area").musicplayer("play");
        }, false);*/

        setTimeout(function() {
            // 隐藏splashscreen
            navigator.splashscreen && navigator.splashscreen.hide();
        }, 3000);
    },
    /**
     * 初始化音乐播放器
     * @return {[type]} [description]
     */
    initMusicPlayer: function() {
        $(".music-area").musicplayer({
            did: $.maya.appData.getItem("Id") || 0,
            serviceUrl: config.serviceUrl + "/services/musics"
        });
    },
    /**
     * 初始化旅游地点选择控件
     * @return {[type]} [description]
     */
    initLocationSelector: function() {
        var that = this;
        // 初始化旅游地点选择控件
        $("#citybox22 .citybox-bd").locationsetter({
            serviceUrl: config.serviceUrl + '/services/locations',
            onSelect: function(district) {
                that.saveLocation(district);
                $.ui.hideModal();

                $.maya.utils.afterAfuiTransitionCompleted(function() {
                    // 关闭侧边栏
                    if ($.ui.isSideMenuOn()) $.ui.toggleSideMenu(false);
                    // 重新加载当前页面
                    that.reloadPage();
                    // 重新初始化应用
                    that.initialize();

                    that.showTips();
                });
            }
        });
    },
    /**
     * 显示全局提示
     * @return {[type]} [description]
     */
    showTips: function() {
        // show tips
        if (!$.maya.appData.getItem("ShowTips")) {
            $.maya.utils.alert({ message: "您知道吗？单击右下角的音乐图标可以暂停或者播放旅行音乐，双击则可以切换音乐" });
            $.maya.appData.setItem("ShowTips", true);
        };
    },
    /**
     * 重置旅游地点选择器
     * @return {[type]} [description]
     */
    resetLocationSelector: function() {
        var that = this;
        $("#citybox22 .citybox-bd").locationsetter("reset");
    },
    /**
     * 重新加载当前页面
     * @return {[type]} [description]
     */
    reloadPage: function() {
        // 重新加载当前页面内容
        var hash = location.hash;
        if (hash && config.toolHashs.indexOf(hash) > -1) {
            // 说明：可以触发a的click事件，
            // 但是$.ui.loadDiv方法不会触发panel的load事件
            //$("#main .navbtn a[href=" + href + "]").trigger("click");
            if (hash.toUpperCase() != "#RCRLSJ") {
                app.loadArticle($(hash).get(0));
            }
        };
    },
    /**
     * 显示文章内容
     * @param  {[type]} panel 当前的panel的dom对象
     * @return {[type]}       [description]
     */
    loadArticle: function(panel) {
        var el = $(panel);
        var that = this;

        // 检测并且强制要求选择旅行地点
        if (!that.checkLocation(true)) return;

        // afui动画完成之后执行回调方法
        // 这样可以避免页面多个效果重叠导致卡顿的问题
        $.maya.utils.afterAfuiTransitionCompleted(function() {
            var ajaxSettings = {
                url: config.serviceUrl + "/services/articles",
                dataType: "html",
                data: {
                    type: el.prop("id").toUpperCase(),
                    did: $.maya.appData.getItem("Id")
                }
            }

            if (that.currAjaxRequest) {
                that.currAjaxRequest.abort();
            }

            that.currAjaxRequest = $.ajax(ajaxSettings).done(function(htmlContent) {
                var idStr = el.prop("id"),
                    htmlLocation = '<div class="headinfo"><p class="infotitle"><i class="icon-position"></i>您当前查询的城市</p><p class="infocont"><a href="javascript:$.ui.showModal(\'#pageCity\',\'slide\');">未知城市</a> <span>未设置经纬度</span></p></div>';

                // 实时汇率
                // 货币换算
                if (idStr != "SSHL" && idStr != "HBDH") {
                    htmlContent = htmlLocation + htmlContent;
                };

                $.ui.updatePanel(idStr, htmlContent);

                that.showLocation();
            }).fail(function(jqXHR, textStatus, errorThrown) {
                that.initExceptionContent(panel);
                $.maya.utils.showNotice("网络不给力");
            }).always(function() {
                that.currAjaxRequest = null;
            });
        });
    },
    /**
     * 清空文章数据
     * @param  {[type]} panel 当前的panel的dom对象
     * @return {[type]}       [description]
     */
    clearArticle: function(panel) {
        this.initPanelLoading(panel);
    },
    /**
     * 显示正在加载信息
     * @param  {[type]} panel [description]
     * @return {[type]}       [description]
     */
    initPanelLoading: function(panel) {
        var htmlContent = '<div class="article-masker">' 
                        + '    <span class="loading-icon spin"></span>' 
                        + '</div>';
        $.ui.updatePanel($(panel).prop("id"), htmlContent);
    },
    /**
     * 显示网络异常
     * @return {[type]} [description]
     */
    initExceptionContent: function(panel) {
        var that = this;
        var htmlContent = '<div class="article-masker">' 
                        + '    <span class="reload">点击重新加载</span>' 
                        + '</div>';
        $.ui.updatePanel($(panel).prop("id"), htmlContent);

        $(".article-masker span.reload").on("click", function(e) {
            that.reloadPage();
        });
    },
    /**
     * 转换经度表示方式
     * @param  {[type]} lng [description]
     * @return {[type]}     [description]
     */
    translateLng: function(lngStr) {
        if (!lngStr) {
            return "未知经度"
        };

        var lng = parseFloat(lngStr),
            angleString = $.maya.utils.toAngleString(lng);

        return (lng < 0 ? "西经" : "东经") + angleString;
    },
    /**
     * 转化纬度表示方式
     * @param  {[type]} latStr [description]
     * @return {[type]}        [description]
     */
    translateLat: function(latStr) {
        if (!latStr) {
            return "未知纬度"
        };

        var lat = parseFloat(latStr),
            angleString = $.maya.utils.toAngleString(lat);

        return (lat < 0 ? "南纬" : "北纬") + angleString;
    },
    /**
     * 清除浏览器localStorage缓存
     */
    clearCache: function() {
        $.maya.utils.confirm({
            message: "确定要清空所有缓存吗？",
            doneCallback: function() {
                $.ui.toggleSideMenu();
                app.clearLocation();
                app.changeLocation();
            }
        });
    },
    /**
     * 设置日出日落时间
     * @return {[type]} [description]
     */
    calc_res: function() {
        var dateStr = $("#date-input").val();

        // 验证日期格式
        if (!dateStr || !$.maya.utils.isValidDate(dateStr)) {
            return;
        }
        // 验证日期范围
        var date = new Date(dateStr);
        if (!$.maya.utils.checkDateRange(date)) {
            return;
        }

        var d = date.getDate(),
            m = date.getMonth() + 1,
            y = date.getFullYear(),
            z = parseInt($.maya.appData.getItem("TimeZone")),
            lo = parseFloat($.maya.appData.getItem("Lng")),
            la = parseFloat($.maya.appData.getItem("Lat"));

        var ac = new AstroCalculator();

        var obj = ac.calculate(ac.mjd(d, m, y, 0.0), z, lo, la);
        var ret = "";
        if (obj["rise"] == undefined) {
            ret = "太阳不升";
        } else {
            ret = "日出时间：<span><strong>" + obj["rise"] + "</strong> (当地时间)</span><br />";
            if (obj["set"] == undefined) {
                ret += "太阳不落";
            } else {
                ret += "日落时间：<span class='nr'><strong>" + obj["set"] + "</strong> (当地时间)</span>";
            }
        }

        $(".sunrise-result").html(ret);
    },
    /**
     * 检测用户是否已经选择了地理位置
     * @param  {[type]} forceToSelect 如果未选择地点，是否弹出地点选择器
     * @return {[type]}               [description]
     */
    checkLocation: function(forceToSelect) {
        if (!$.maya.appData.getItem("Id")) {
            if (forceToSelect) this.changeLocation();
            return false;
        }
        return true;
    },
    /**
     * 在页面上显示地理位置信息
     * @return {[type]}       [description]
     */
    showLocation: function() {
        var that = this;

        var locName = $.maya.appData.getItem("Name") || "未设置";
        var locLng = $.maya.appData.getItem("Lng");
        var locLat = $.maya.appData.getItem("Lat");

        // 文章页顶部显示地点信息
        $(".headinfo p.infocont a").text(locName);
        $(".headinfo p.infocont span").text(that.translateLat(locLat) + "," + that.translateLng(locLng));
        // 设置旅游城市页面显示地点信息
        $("#citybox22 .citybox-hd span").text(locName);
        // 首页顶部显示地点信息
        $("#main .logocity").text("旅行目的地：" + locName);
    },
    /**
     * 修改地理位置信息
     * @return {[type]} [description]
     */
    changeLocation: function() {
        $.ui.showModal('#pageCity', 'slide');
    },
    /**
     * 清除localStorage的地理位置信息
     * @return {[type]} [description]
     */
    clearLocation: function() {
        $.maya.appData.removeItem("Id")
                      .removeItem("Name")
                      .removeItem("Lng")
                      .removeItem("Lat")
                      .removeItem("TimeZone")
                      .removeItem("ShowTips");

        this.showLocation();
    },
    /**
     * 保存地理位置到localStorage
     * @param  {[type]} district [description]
     * @return {[type]}          [description]
     */
    saveLocation: function(district) {
        try {
            $.maya.appData.setItem("Id", district.DistrictId)
                          .setItem("Name", district.Name)
                          .setItem("Lng", district.Lng)
                          .setItem("Lat", district.Lat)
                          .setItem("TimeZone", district.TimeZone || 8);
        }
        catch (errorThrown) {
            $.maya.utils.alert({
                title: "警告",
                message: "您的浏览器设置为无痕浏览，请退出无痕浏览模式再运行此应用。"
            });
            return;
        }
    },
    /**
     * 解决ios7以上系统状态栏的问题
     * @return {[type]} [description]
     */
    fixStatusBarIssue: function() {
        if (window.device && window.device.platform === "iOS" && window.device.version.substr(0, 1) >= 7) {
            $("body").addClass("fix-statusbar");
            var viewContainer = $("#afui");
            viewContainer.height(viewContainer.height() - 20);
        };
    }
}
