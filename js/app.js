/**
 * [formatDate description]
 * @param  {[type]} date [description]
 * @return {[type]}      [description]
 */
function formatDate(date) {
	date = date || new Date();
    var y = date.getFullYear(),
    	m = date.getMonth() + 1,
    	d = date.getDate();

    return y + "-" + ("0" + m).slice(-2) + "-" + ("0" + d).slice(-2);
}
/**
 * [isValidDate description]
 * @param  {[type]}  dateStr [description]
 * @return {Boolean}         [description]
 */
function isValidDate(dateStr) {
	return (new Date(dateStr).toString() != "Invalid Date");
}
/**
 * [checkDateRange description]
 * @param  {[type]} date [description]
 * @return {[type]}      [description]
 */
function checkDateRange(date) {
	var _minDate = new Date(2010, 1, 1);
	var _maxDate = new Date(2030, 12, 31);

	return date <= _maxDate && date >= _minDate;
}
/**
 * [calc_res description]
 * @return {[type]} [description]
 */
function calc_res() {
	var dateStr = $("#date-input").val();

	// 验证日期格式
	if (!dateStr || !isValidDate(dateStr)) { return; }
	// 验证日期范围
	var date = new Date(dateStr);
	if (!checkDateRange(date)) { return; }
    
    var d = date.getDate(),
        m = date.getMonth() + 1,
        y = date.getFullYear(),
        z = parseInt(localStorage.TimeZone),
        lo = parseFloat(localStorage.Lng),
        la = parseFloat(localStorage.Lat);

    var obj = Cal(mjd(d,m,y,0.0), z, lo, la);
    var ret = "";
    if(obj["rise"] == undefined){
        ret = "太阳不升";
    }
    else{
        ret = "日出时间：<span><strong>" + obj["rise"] + "</strong> (当地时间)</span><br />";
        if(obj["set"] == undefined){
            ret += "太阳不落";
        } else {
            ret += "日落时间：<span class='nr'><strong>" + obj["set"] + "</strong> (当地时间)</span>";
        }
    }
    
    $(".sunrise-result").html(ret);
};
function clearCache() {
	$("#afui").popup({
        title: "警告",
        message: "确定要清楚所有缓存吗？",
        cancelText: "取消",
        cancelCallback: function () {
            console.log("cancelled");
        },
        doneText: "确定",
        doneCallback: function () {
            console.log("Done for!");
            app.clearLocation();
            window.location.reload();
        },
        cancelOnly: false
    });
}
/**
 * [app description]
 * @type {Object}
 */
var app = {
	/**
	 * [initialize description]
	 * @return {[type]} [description]
	 */
	initialize: function() {
		var that = this;
		// 显示地点信息
	    that.showLocation();
	    // 初始化地址选择控件
	    $("#citybox22 .citybox-bd").locationsetter({
	        serviceUrl: config.serviceUrl + '/services/locations',
	        paramName: "dn",
	        ajaxSettings: { dataType: "jsonp" },
	        idField: "DistrictId",
	        onSelect: function (suggestion) {
	            //af.ui.toggleSideMenu();
	            //$.ui.loadContent("#main",false,false,"slide");
	            $.ui.hideModal();
	            //alert('You selected: ' + suggestion.Name + ', ' + suggestion.DistrictId);
	            that.saveLocation(suggestion);

	            that.showLocation();

	            window.location.reload();
	        }
	    });
	    // 初始化日期日期选择控件
	    $('#date-input').val(formatDate(new Date())).on("change", function(e){
	    	calc_res();
	    }).datepicker({ 
	    	monthNames: ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月" ], 
	    	shortDayNames: ["日", "一", "二", "三", "四", "五", "六"]
	    });
	    // 计算日出日落时间
	    calc_res();
	    // 播放音乐
	    that.playAudio();
	},
	playAudio: function() {
		//music
		//
		var that = this;

		if (!that.checkLocation()) return;
		//

		var initAudio = function(musics) {
			if (musics.length <= 0) return;
			var i = 0;
			var endIndex = musics.length;
			var audioHost = $("#audio_host");
			var au = $('.audio_btn');

			console.log("music index is:" + i);

	        audioHost.attr('src', musics[0].LinkTo);
	        //audioHost.attr('loop', true);
	        audioHost.attr('autoplay', false);
	        audioHost.on("ended", function() {
	        	i++;
	        	console.log("music index is:" + i);
	        	if (i > endIndex - 1) {
	        		// 从头开始
	        		i  = 0;
	        		audioHost.attr('src', musics[i].LinkTo);
	        		au.toggleClass('z-play');
	        		audioHost.get(0).pause();
	        		return false;
	        	}
	        	audioHost.attr('src', musics[i].LinkTo);
	        	au.addClass('z-play');
	        	audioHost.get(0).play();
	        });
	        // 播放状态
	        au.addClass('z-play');
	        audioHost.get(0).play();

	        au.on('click', function() {
	            if ($(this).data('status') === 'off') {
	                $(this).data('status', 'on');
	                audioHost.get(0).play();
	            } else {
	                $(this).data('status', 'off');
	                audioHost.get(0).pause();
	            }
	            au.toggleClass('z-play');
	        });
		};

		// ajax music data.
		var ajaxSettings = {
			url: config.serviceUrl + "/services/musics",
			dataType: "json",
			data: { did: localStorage.Id }
		}

		$.ajax(ajaxSettings).fail(function(jqXHR, textStatus, errorThrown) {			
			$("#afui").popup({ title: "提示", message: "网络不可用" });
		}).always(function() {
			//$.ui.hideMask();
		}).done(function(musics) {
			console.log("music's count: " + musics.length);
			initAudio(musics);
		});
	},
	/**
	 * [checkLocation description]
	 * @return {[type]} [description]
	 */
	checkLocation: function() {
		if (!localStorage.Id) {
            return false;
        }
        return true;
	},
	/**
	 * [showLocation description]
	 * @return {[type]} [description]
	 */
	showLocation: function() {
		var that = this;

		if (!that.checkLocation()) { 
			that.changeLocation();
			return; 
		};

		var locName = localStorage.Name;
        var locLng = localStorage.Lng;
        var locLat = localStorage.Lat;

        $(".headinfo p.infocont a").text(locName);
        $("#citybox22 .citybox-hd span").text(locName);
        $("#main .logocity").text("当前城市：" + locName);
        $(".headinfo p.infocont span").text(that.translateLat(locLat) + "," + that.translateLng(locLng));
	},
	/**
	 * [changeLocation description]
	 * @return {[type]} [description]
	 */
	changeLocation: function() {
		//af.ui.toggleSideMenu();
	    //$.ui.loadContent("#main",false,false,"slide");
	    $.ui.showModal('#pageCity','slide');
	},
	/**
	 * [clearLocation description]
	 * @return {[type]} [description]
	 */
	clearLocation: function() {
		localStorage.removeItem("Id");
		localStorage.removeItem("Name");
		localStorage.removeItem("Lng");
		localStorage.removeItem("Lat");
		localStorage.removeItem("TimeZone");
	},
	/**
	 * [saveLocation description]
	 * @param  {[type]} district [description]
	 * @return {[type]}          [description]
	 */
	saveLocation: function(district) {
		localStorage.Id = district.DistrictId;
        localStorage.Name = district.Name;
        localStorage.Lng = district.Lng;
        localStorage.Lat = district.Lat;
        localStorage.TimeZone = district.TimeZone || 8;

        this.showLocation();
	},
	/**
	 * [showArticle2 description]
	 * @param  {[type]} panel [description]
	 * @return {[type]}       [description]
	 */
	showArticle2: function (panel) {
	    //$.ui.showMask("测试...");

		//debugger;
		var el = $(panel);
		var that = this;

		if (!that.checkLocation()) {
			that.changeLocation();
			return;
		}

		var showLoading = function() {
			var htmlContent = '<div class="loading-bd">'
							+ '    <span class="loading-icon spin"></span>'
							+ '</div>';
			$.ui.updatePanel(el.prop("id"), htmlContent);
		}

		showLoading();
		
		var transitionInterval = setInterval(function() {
			if ($.ui.doingTransition == false) clearInterval(transitionInterval);
		}, 1000);
		
		var ajaxSettings = {
			url: config.serviceUrl + "/services/articles",
			dataType: "html",
			data: {
				type: el.prop("id").toUpperCase(),
				did: localStorage.Id
			}
		}

		$.ajax(ajaxSettings).fail(function(jqXHR, textStatus, errorThrown) {			
			$("#afui").popup("网络不可用，请稍候再试。");
		}).always(function() {
			//$.ui.hideMask();
		}).done(function(htmlContent) {
			var idStr = el.prop("id"),
				htmlLocation = '<div class="headinfo"><p class="infotitle"><i class="icon-position"></i>您当前查询的城市</p><p class="infocont"><a href="javascript:$.ui.showModal(\'#pageCity\',\'slide\');">未知城市</a> <span>未设置经纬度</span></p></div>';

			if (idStr != "SSHL" && idStr != "HBDH") {
				htmlContent = htmlLocation + htmlContent;
			};

			$.ui.updatePanel(idStr, htmlContent);
			that.showLocation();
			
			console.log("article load.");
		});
	},
	/**
	 * [translateLng description]
	 * @param  {[type]} lng [description]
	 * @return {[type]}     [description]
	 */
	translateLng: function(lng) {
		if (!lng) { return "未知经度" };
        if (lng.substr(0,1) == "-") { 
            return "西经" + lng.substr(1);
        }
        else {
            return "东经" + lng;
        }
	},
	/**
	 * [translateLat description]
	 * @param  {[type]} lat [description]
	 * @return {[type]}     [description]
	 */
	translateLat: function(lat) {
		if (!lat) { return "未知纬度" };
        if (lat.substr(0,1) == "-") { 
            return "南纬" + lat.substr(1);
        }
        else {
            return "北纬" + lat;
        }
	}
}
