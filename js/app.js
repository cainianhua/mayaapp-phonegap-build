/**
 * app类，包含app操作常用的方法集合
 * @type {Object}
 */
var app = {
    /**
     * 应用初始化入口方法
     * @return {[type]} [description]
     */
    initialize: function() {
        var that = this;
        // 初始化旅游地点选择控件
        that.initLocationSelector();
        // 注册app监听事件
        that.bindEvents();
        // 初始化旅游地点信息
        that.initLocation(true);
        // 初始化panel的内容为正在加载...
        $.each(config.toolHashs, function(index, idStr) {
            // 日出日落时间不需要从服务器动态加载，所以不需要显示loading
            if (idStr == "#RCRLSJ") return;
            that.initLoading($(idStr));
        });
        // 初始化日期选择控件
        $('#date-input').val($.maya.utils.formatDate(new Date()))
            .on("change", function(e) {
                that.calc_res();
            })
            .datepicker({
                monthNames: ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"],
                shortDayNames: ["日", "一", "二", "三", "四", "五", "六"]
            });
        // 初始化日出日落时间
        that.calc_res();
        // 初始化音乐播放控件
        $(".music-area").musicplayer({
            did: localStorage.Id,
            serviceUrl: config.serviceUrl + "/services/musics"
        });
        // 隐藏splashscreen
        setTimeout(function() {
            navigator.splashscreen && navigator.splashscreen.hide();
        }, 2000);
    },
    /**
     * 初始化旅游地点选择器
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
                // 关闭侧边栏
                if ($.ui.isSideMenuOn()) $.ui.toggleSideMenu(false);
                // 重新加载当前页面内容
                var href = location.hash;
                if (href && config.toolHashs.indexOf(href) > -1) {
                    // 说明：可以触发a的click事件，
                    // 但是$.ui.loadDiv方法不会触发panel的load事件
                    //$("#main .navbtn a[href=" + href + "]").trigger("click");
                    if (href != "#RCRLSJ") {
                        app.showArticle2($(location.hash).get(0));
                    }
                };
                // 日出日落时间每次都必须重新计算
                that.calc_res();
            }
        });
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
     * 检测用户是否已经选择了地理位置
     * @return {[type]} [description]
     */
    checkLocation: function() {
        if (!localStorage.Id) {
            return false;
        }
        return true;
    },
    /**
     * 在页面上显示地理位置信息
     * @param  {[type]} force 如果未选择地点，是否弹出地点选择器
     * @return {[type]}       [description]
     */
    initLocation: function(force) {
        var that = this;

        var locName = localStorage.Name || "未设置";
        var locLng = localStorage.Lng;
        var locLat = localStorage.Lat;

        // 文章页顶部显示地点信息
        $(".headinfo p.infocont a").text(locName);
        $(".headinfo p.infocont span").text(that.translateLat(locLat) + "," + that.translateLng(locLng));
        // 设置旅游城市页面显示地点信息
        $("#citybox22 .citybox-hd span").text(locName);
        // 首页顶部显示地点信息
        $("#main .logocity").text("旅行目的地：" + locName);

        if (!that.checkLocation() && force) {
            that.changeLocation();
        };
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
        localStorage.removeItem("Id");
        localStorage.removeItem("Name");
        localStorage.removeItem("Lng");
        localStorage.removeItem("Lat");
        localStorage.removeItem("TimeZone");

        this.initLocation();
    },
    /**
     * 保存地理位置到localStorage
     * @param  {[type]} district [description]
     * @return {[type]}          [description]
     */
    saveLocation: function(district) {
        try {
            localStorage.setItem("Id", district.DistrictId);
            localStorage.setItem("Name", district.Name);
            localStorage.setItem("Lng", district.Lng);
            localStorage.setItem("Lat", district.Lat);
            localStorage.setItem("TimeZone", district.TimeZone || 8);
        }
        catch (errorThrown) {
            $.ui.popup({
                title: "警告",
                message: "您的浏览器设置为无痕浏览，请退出无痕浏览模式再运行此应用。"
            });
            return;
        }

        this.initLocation();
    },
    /**
     * 显示文章内容
     * @param  {[type]} panel 当前的panel的dom对象
     * @return {[type]}       [description]
     */
    showArticle2: function(panel) {
        console.log("Call showArticle2");

        var el = $(panel);
        var that = this;

        if (!that.checkLocation()) {
            that.changeLocation();
            return;
        }

        console.log("doingTransition: " + $.ui.doingTransition);

        // afui动画完成之后执行回调方法
        // 这样可以避免页面多个效果重叠导致卡顿的问题
        $.maya.utils.afterAfuiTransitionCompleted(function() {
            var ajaxSettings = {
                url: config.serviceUrl + "/services/articles",
                dataType: "html",
                data: {
                    type: el.prop("id").toUpperCase(),
                    did: localStorage.Id
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
                that.initLocation();

                console.log("Loaded article.");
            }).fail(function(jqXHR, textStatus, errorThrown) {
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
        console.log("Call clearArticle");

        this.initLoading(panel);
    },
    /**
     * 显示正在加载信息
     * @param  {[type]} panel [description]
     * @return {[type]}       [description]
     */
    initLoading: function(panel) {
        var htmlContent = '<div class="loading-bd">' + '    <span class="loading-icon spin"></span>' + '</div>';
        $.ui.updatePanel($(panel).prop("id"), htmlContent);
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
        $.ui.popup({
            title: "提醒",
            message: "确定要清楚所有缓存吗？",
            cancelText: "取消",
            cancelCallback: function() {
                console.log("cancelled");
            },
            doneText: "确定",
            doneCallback: function() {
                console.log("Done for!");
                $.ui.toggleSideMenu();
                app.clearLocation();
                app.changeLocation();
            },
            cancelOnly: false
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
            z = parseInt(localStorage.TimeZone),
            lo = parseFloat(localStorage.Lng),
            la = parseFloat(localStorage.Lat);

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
        // network disconnection.
        document.addEventListener('offline', function() {
            $.maya.utils.showNotice("网络不给力");
        }, false);
        // network connnection.
        document.addEventListener('online', function() {
            $.maya.utils.showNotice("网络已连接");
        }, false);
    }
}
