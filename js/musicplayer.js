/**
 * Music player plugin
 */
;(function ($) {
    "use strict";
    /**
     * 挂载插件到jQuery上，一般有三种使用方式：
     * 1. 初始化控件
     *     $(selector).musicplayer({...});
     * 2. 调用控件的方法
     *     $(selector).musicplayer("fn");
     * 3. 获取控件实例
     *     $(selector).musicplayer();
     * @param  {[type]} options [description]
     * @param  {[type]} args    [description]
     * @return {[type]}         [description]
     */
    $.fn.musicplayer = function (options, args) {
        var dataKey = 'musicplayer';
        // 获取实例对象
        if (arguments.length === 0) {
            return this.first().data(dataKey);
        }

        return this.each(function () {
            var $self = $(this),
                instance = $self.data(dataKey);

            if (typeof options === 'string') {
                // 调用控件方法
                if (instance && typeof instance[options] === 'function') {
                    instance[options](args);
                }
            } 
            else {
                // 初始化控件
                // If instance already exists, destroy it:
                if (instance && instance.dispose) {
                    instance.dispose();
                }
                instance = new MusicPlayer(this, options);
                $self.data(dataKey, instance);
            }
        });
    };

    function MusicPlayer(el, options) {
        var that = this,
            defaults = {
                serviceUrl: "", // 音乐数据接口
                did: false,     // 地点的编号，用于查询对应地点的音乐设置，必须
                onPlay: null,   // 播放事件处理方法（未实现）
                onPause: null   // 暂停事件处理方法（未实现）
            };

        // Shared variables;
        that.element = el;  // 当前元素dom对象
        that.el = $(el);    // 当前元素jQuery对象
        that.options = $.extend({}, defaults, options);
        that.isPlaying = false; // 播放器状态，只有在用户点击播放或者暂停的时候改变状态
        that.currAjaxRequest = null; // 异步请求对象
        that.audioElement = null; // html5 audio控件
        that.controlButton = null; // 点击可以控制播放或者暂停

        that.musics = []; // 播放音乐列表
        that.currMusicIndex = 0;

        that.initialize();
    }

    MusicPlayer.prototype = {
        /**
         * 音乐播放控件初始化
         * @return {[type]} [description]
         */
        initialize: function() {
            var that = this,
                container = that.el,
                districtId = that.options.did;

            container.html('<a href="javascript:void(0);" class="u-globalAudio audio_btn"  data-status="on">' 
                         + '    <i class="icon-music"></i>' 
                         + '</a>' 
                         + '<audio id="audio_host" data-src=""></audio>');

            that.audioElement = $("#audio_host", container);
            that.controlButton = $('.audio_btn', container);
            that.controlButton.on('click.musicplayer', function() {
                if (that.isPlaying) {
                    that.pause();
                } else {
                    that.play();
                }
            });
            //// 取消循环播放
            //that.audioElement.attr('loop', true);
            // 取消自动播放
            that.audioElement.attr('autoplay', false);

            if (!districtId) return;

            that.getMusics(districtId, function(error, musics) {
                if (error) {
                    $.maya.utils.showNotice(error.message);
                    return;
                };

                that.audioElement.on("ended", function() {
                    that.switchTo(++that.currMusicIndex);
                });

                that.switchTo(0);
            });
        },
        /**
         * 异步获取指定地点的音乐设置信息
         * @param  {[type]}   districtId [description]
         * @param  {Function} callback   [description]
         * @return {[type]}              [description]
         */
        getMusics: function(districtId, callback) {
            var that = this,
                options = that.options;
            // ajax music data.
            var ajaxSettings = {
                url: options.serviceUrl,
                dataType: "json",
                data: {
                    did: districtId
                }
            }

            if (that.currAjaxRequest) {
                that.currAjaxRequest.abort();
            };

            that.currAjaxRequest = $.ajax(ajaxSettings).done(function(musics) {
                console.log("music's count: " + musics.length);
                that.musics = musics;
                callback(null, musics);
            }).fail(function(jqXHR, textStatus, errorThrown) {
                callback({
                    code: -1,
                    message: "网络连接不可用"
                });
            }).always(function() {
                that.currAjaxRequest = null;
            });
        },
        /**
         * 切换音乐
         * @param  {[type]} currIndex [description]
         * @return {[type]}           [description]
         */
        switchTo: function(currIndex) {
            console.log("music play index: " + currIndex);

            var that = this,
                musics = that.musics;

            var endIndex = musics.length - 1;

            // 超出音乐列表，退出播放
            if (currIndex < 0 || currIndex > endIndex) {
                // 重置播放列表，处于暂停状态
                that.reset();
                return;
            }

            that.currMusicIndex = currIndex;

            that.audioElement.attr('src', musics[currIndex].LinkTo);

            that.play();
        },
        /**
         * 是否可以播放
         * @return {[type]} [description]
         */
        canPlay: function() {
            return this.musics.length > 0;
        },
        /**
         * 开始播放
         * @return {[type]} [description]
         */
        play: function() {
            var that = this;

            if (!that.canPlay()) return;

            that.audioElement.get(0).play();
            that.controlButton.addClass("z-play");

            that.isPlaying = true;
        },
        /**
         * 暂停播放
         * @return {[type]} [description]
         */
        pause: function() {
            var that = this;

            that.audioElement.get(0).pause();
            that.controlButton.removeClass("z-play");

            that.isPlaying = false;
        },
        /**
         * 重置播放器
         * @return {[type]} [description]
         */
        reset: function() {
            var that = this,
                musicLink = "";

            that.currMusicIndex = 0;

            if (that.musics.length > 0) {
                musicLink = that.musics[that.currMusicIndex].LinkTo;
            };
            that.audioElement.attr('src', musicLink);
            that.pause();
        },
        /**
         * 释放对象
         * @return {[type]} [description]
         */
        dispose: function() {
            // Refer from: http://api.jquery.com/empty/
            // To avoid memory leaks, 
            // jQuery removes other constructs such as data and event handlers from the child elements before removing the elements themselves.
            this.el.empty().removeData("musicplayer");
        }
    };
})(jQuery);
