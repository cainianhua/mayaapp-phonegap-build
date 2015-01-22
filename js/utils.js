/**
 * 通用方法类
 */
function Utils() {
	/**
	 * 格式化日期为yyyy-MM-dd
	 * @param  {[type]} date [description]
	 * @return {[type]}      [description]
	 */
	this.formatDate = function(date) {
		date = date || new Date();
	    var y = date.getFullYear(),
	    	m = date.getMonth() + 1,
	    	d = date.getDate();

	    return y + "-" + ("0" + m).slice(-2) + "-" + ("0" + d).slice(-2);
	};
	/**
	 * 验证日期是否合法
	 * @param  {[type]}  dateStr [description]
	 * @return {Boolean}         [description]
	 */
	this.isValidDate = function(dateStr) {
		return (new Date(dateStr).toString() != "Invalid Date");
	};
	/**
	 * 验证日期范围
	 * @param  {[type]} date [description]
	 * @return {[type]}      [description]
	 */
	this.checkDateRange = function(date) {
		var _minDate = new Date(2010, 1, 1);
		var _maxDate = new Date(2030, 12, 31);

		return date <= _maxDate && date >= _minDate;
	};
	/**
	 * 显示通知，3秒之后自动隐藏
	 * @param  {[type]} content [description]
	 * @return {[type]}         [description]
	 */
	this.showNotice = function(content) {
		var _notice = $("#afui").notice({ 
	        message: content, 
	        onShow: function() {
	            setTimeout(function() { _notice.hide(); }, 3000);
	        }
	    });
	};
	/**
	 * AfUI的动画效果完成之后，执行指定的方法
	 * @param  {Function} callback 回调方法
	 * @return {[type]}            [description]
	 */
	this.afterAfuiTransitionCompleted = function(callback) {
		if ($.ui.doingTransition == false) {
			callback();
		}
		else {
			// 监听doingTransition的状态
			var transitionInterval = setInterval(function() {
				console.log("doingTransition: " + $.ui.doingTransition);
				if ($.ui.doingTransition == false) {
					clearInterval(transitionInterval);
					callback();
				}
			}, 500);
		}
	};
	/**
	 * 把弧度值转成角度值
	 * @param  {Number} s 需要转换的值
	 * @return {[type]}   [description]
	 */
	this.toAngleString = function(s) {
		var positiveValue = Math.abs(parseFloat(s)),
            degree = parseInt(positiveValue),
            minute = parseInt((positiveValue - degree) * 60),
            second = Math.round(parseInt(((positiveValue - degree) * 60 - minute) * 60));

        return degree + "°" + minute + "′" + second + "\"";
	}
}

// 挂载到jQuery对象上
if (typeof $.maya === "undefined") $.maya = {};
$.maya.utils = new Utils();