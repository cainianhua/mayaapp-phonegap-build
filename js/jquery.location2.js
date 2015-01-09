
;(function ($) {
    var utils = (function () {
            return {
                escapeRegExChars: function (value) {
                    return value.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
                }
            };
        }()),

        keys = {
            ESC: 27,
            TAB: 9,
            RETURN: 13,
            LEFT: 37,
            UP: 38,
            RIGHT: 39,
            DOWN: 40
        };


    function LocationSetter(el, options) {
        var that = this;
            defaults = {
                serviceUrl: "",         // 数据接口
                paramName: "s",         // 数据请求的参数名称，在发起请求的时候会把用户输入的搜索关键词作为值传给api
                reqType: "GET",
                dataType: "json",       // ajax请求返回的数据格式
                params: {},             // 请求数据接口需要附带的额外参数
                ajaxSettings: {},
                transformResult: function (response) {
                    return typeof response === 'string' ? $.parseJSON(response) : response;
                },
                formatResult: LocationSetter.formatResult,
                idField: "id",          // 根据接口返回的结果配置
                textField: "Name",
                onSelect: null,
                minChars: 2,            // 输入多少个字符才能触发ajax搜索数据
                deferRequestBy: 1000    // 两次请求的间隔时间，用于处理用户频繁修改搜索关键词
            };  // 默认配置项

        // Shared variables;
        that.element = el;
        that.el = $(el);
        that.suggestions = [];        // it will put the search results for last request.
        that.badQueries = [];
        that.cachedResponse = {};
        that.options = $.extend({}, defaults, options);
        that.searchTextBox = null;          // search box object, it's a textbox.
        that.searchResultContainer = null;  // the container that search results will be put on it.
        that.currSearchText = null;           // current search text value.
        that.currAjaxRequest = null;        // current ajax request to search data from server by keywords.

        // Initialize:
        that.initialize();
    }

    LocationSetter.utils = utils;

    $.LocationSetter = LocationSetter;

    LocationSetter.formatResult = function(value, searchWord) {
        var pattern = '(' + utils.escapeRegExChars(searchWord) + ')';

        return value.replace(new RegExp(pattern, 'gi'), '<strong>$1<\/strong>');
    };

    LocationSetter.prototype = {
        /**
         * [initialize description]
         * @return {[type]} [description]
         */
        initialize: function() {
            var that = this,
                options = that.options,
                container = that.el;
            
            // 创建搜索框以及搜索结果容器
            container.html('<div class="search-box cityfilter-t"><input type="text" class="input-search" placeholder="查找城市" /></div>'
                          +'<div class="search-results cityfilter-c"></div>');

            that.searchTextBox = $(".input-search", container);
            that.searchResultContainer = $(".search-results", container);

            that.searchTextBox.on("keyup.locationsetter", function(e) { that.onKeyUp(e); });

            that.searchTextBox.trigger("keyup");
        },
        /**
         * [onKeyUp description]
         * @param  {[type]} e [description]
         * @return {[type]}   [description]
         */
        onKeyUp: function(e) {
            var that = this;

            switch (e.which) {
                case keys.UP:
                case keys.DOWN:
                    return;
            }

            clearInterval(that.onChangeInterval);

            var searchWord = $.trim(that.searchTextBox.val());
            //if (searchWord == "") return;
            if (that.currSearchText !== searchWord) {
            	that.searchResultContainer.html('<p class="tips">正在加载...</p>');

                if (that.options.deferRequestBy > 0) {
                    // Defer lookup in case when value changes very quickly:
                    that.onChangeInterval = setInterval(function () {
                        that.onValueChange();
                    }, that.options.deferRequestBy);
                } else {
                    that.onValueChange();
                }
            }
        },
        onValueChange: function () {
            var that = this,
                options = that.options,
                value = $.trim(that.searchTextBox.val());

            that.currSearchText = value;

            clearInterval(that.onChangeInterval);

            that.getSuggestions(value);
        },
        /**
         * [getSuggestions description]
         * @param  {[type]} searchWord [description]
         * @return {[type]}            [description]
         */
        getSuggestions: function(searchWord) {
            var response,
                that = this,
                options = that.options,
                serviceUrl = that.options.serviceUrl,
                ajaxSettings;

            //debugger;
            options.params[options.paramName] = searchWord;

            // 从缓存中获取数据
            if ($.isFunction(serviceUrl)) {
                serviceUrl = serviceUrl.call(that.element, q);
            }
            cacheKey = serviceUrl + '?' + $.param(options.params || {});
            response = that.cachedResponse[cacheKey];

            if (response && $.isArray(response.suggestions)) {
                that.suggestions = response.suggestions;
                that.suggest();
            } 
            else if (that.isBadQuery(searchWord)) {
            	that.searchResultContainer.html('<p class="tips">没有匹配的地点</p>');
            }
        	else {
                ajaxSettings = {
                    url: serviceUrl,
                    data: options.params,
                    type: options.reqType,
                    dataType: options.dataType
                };

                $.extend(ajaxSettings, options.ajaxSettings);

                if (that.currAjaxRequest) {
                    that.currAjaxRequest.abort();
                }

                that.currentAjaxRequest = $.ajax(ajaxSettings).done(function(ajaxResponse) {
                    that.currentAjaxRequest = null;

                    that.processResponse(ajaxResponse, searchWord, cacheKey);
                }).fail(function (jqXHR, textStatus, errorThrown) {
                    console.log(errorThrown);
                });
            }
        },

        processResponse: function(ajaxResponse, searchWord, cacheKey) {
            var that = this,
                options = that.options;

            that.cachedResponse[cacheKey] = ajaxResponse;
            // 说明：
            // 如果当前关键词查不到数据，那么在这个关键词基础上，通过在前后添加任何数据都是无法获取到数据的。
            // 因此，我们我们下次会阻止此类的ajax查询。
            if (ajaxResponse.suggestions.length === 0) {
                that.badQueries.push(searchWord);
            }

            // global variable
            that.suggestions = ajaxResponse.suggestions;

            that.suggest();
        },
        suggest: function() {
            var that = this,
                options = that.options,
                results = that.suggestions,
                formatResult = options.formatResult,
                itemsHtml = "";

            $.each(results, function(i, suggestion) {
                itemsHtml += '<p class="search-item" data-id="' + suggestion[options.idField] + '" data-index="' + i + '">' + formatResult(suggestion[options.textField],  that.currSearchText)+ '</p>'
            });

            itemsHtml = itemsHtml || '<p class="tips">没有匹配的地点</p>'
            that.searchResultContainer.html(itemsHtml);

            $("p.search-item", that.searchResultContainer).click(function(e) {
                // https://github.com/01org/appframework/commit/b5206bd1959028909e1cf79f9d53531e1197bab1
                // jq.appframework.js has a bug
                // we can't get correct this object.
                //var self = $(this);
                var self = $(e.target);
                that.onSelect(self.data("index"));
            });
        },
        onSelect: function(index) {
            var that = this,
                options = that.options,
                onSelectCallback = that.options.onSelect,
                suggestion;

            suggestion = that.suggestions[index];

            // 释放对象
            options.suggestions = [];

            if ($.isFunction(onSelectCallback)) {
                onSelectCallback.call(that.element, suggestion);
            };
        },
        isBadQuery: function (q) {
            var badQueries = this.badQueries,
                i = badQueries.length;

            while (i--) {
                if (q.indexOf(badQueries[i]) === 0) {
                    return true;
                }
            }

            return false;
        },
        setOptions: function (suppliedOptions) {
            var that = this,
                options = that.options;

            $.extend(options, suppliedOptions);
        },
        dispose: function () {
            var that = this;
            that.el.off('.autocomplete')
                   .removeData('autocomplete')
                   .html("");
        }
    };

    // Create chainable jQuery plugin:
    $.fn.locationsetter = function (options, args) {
        var dataKey = 'locationsetter';
        // If function invoked without argument return
        // instance of the first matched element:
        if (arguments.length === 0) {
            return this.first().data(dataKey);
        }

        return this.each(function () {
            var callElement = $(this),
                instance = callElement.data(dataKey);

            if (typeof options === 'string') {
                if (instance && typeof instance[options] === 'function') {
                    instance[options](args);
                }
            } else {
                // If instance already exists, destroy it:
                if (instance && instance.dispose) {
                    instance.dispose();
                }
                instance = new LocationSetter(this, options);
                callElement.data(dataKey, instance);
            }
        });
    };
})(jQuery);
