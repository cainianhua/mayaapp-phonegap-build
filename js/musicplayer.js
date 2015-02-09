/**
 * Music player plugin
 * 参考资料: 
 * http://www.w3cschool.cc/jsref/prop-audio-preload.html
 * http://codetheory.in/html5-audio-behaviour-and-support-in-ios-and-android/
 * http://www.alanoy.com/problems-of-html5-audio-on-ios-safari/
 * http://stackoverflow.com/questions/3009888/autoplay-audio-files-on-an-ipad-with-html5/
 * 重要说明：
 * 1. iOS Safari 中的 HTML5 媒体元素都是单例的，所以一次只能播放一个 HTML5 音频（和 HTML5 视频）流（估计是为了减少数据费用）
 * 
 */
;(function ($) {
    "use strict";
    /**
     * 音乐播放控件
     * @param {[type]} el      [description]
     * @param {[type]} options [description]
     */
    function MusicPlayer(el, options) {
        var that = this,
            defaults = {
                serviceUrl: "",     // 音乐数据接口
                did: false,         // 地点的编号，用于查询对应地点的音乐设置，必须
                onPlay: null,       // 播放事件处理方法（未实现）
                onPause: null       // 暂停事件处理方法（未实现）
            };

        // Shared variables;
        that.element = el;          // 当前元素dom对象
        that.el = $(el);            // 当前元素jQuery对象
        that.options = $.extend({}, defaults, options);
        that.isPlaying = false;     // 播放器状态，只有在用户点击播放或者暂停的时候改变状态
        that.currAjaxRequest = null;// 异步请求对象
        that.audioElement = null;   // html5 audio控件
        that.controlButton = null;  // 点击可以控制播放或者暂停

        that.musics = [];           // 播放音乐列表
        that.currIndex = 0;         // 当前播放的音乐序号
        that.firstPlay = true;      // 是否第一次点击播放
        that.FirstLoadSongErrorIndex = -1;   // 第一次歌曲加载出错（格式不支持）的序号

        // 必须在加载完音乐之后再初始化音乐控件
        // 否则会出现点击播放之后，虽然已经显示开始播放，
        // 但是实际无法播放，原因是因为音乐还没加载
        that.getMusics(function(error, musics) {
            if (error) {
                $.maya.utils.showNotice(error.message);
                return;
            };

            console.log("Song's count: " + musics.length);

            // 没有设置音乐不显示播放器控件
            if (musics.length > 0) {
                that.initialize();
            };
        });
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

            container.html('<a href="javascript:void(0);" class="u-globalAudio audio_btn">' 
                         + '    <i class="icon-music"></i>' 
                         + '</a>' 
                         + '<audio class="audio_control"></audio>');

            that.controlButton = $('.audio_btn', container);
            that.audioElement = $(".audio_control", container)[0];
            // 初始化audio控件
            // 
            //// 取消循环播放
            //that.audioElement.loop = true;
            // 取消自动播放
            that.audioElement.autoplay = false;
            // 取消数据预加载
            // 注意：preload设置为none至关重要，否则error的事件处理逻辑会导致导致死循环
            that.audioElement.preload = "none";
            // 加载音乐文件
            that.loadSong();
            // 事件绑定
            that.controlButton.on('singleTap.musicplayer', function() {
                if (that.isPlaying) {
                    that.pause();
                } 
                else {
                    if (!that.canPlay()) {
                        $.maya.utils.showNotice("没有可以播放的音乐");
                        return;
                    };

                    // 手机系统要求必须用户手动点击audio播放音乐，程序支持播放会被浏览器阻止
                    // dialogs插件的confirm方法会改变当前的event值，从而导致浏览器认为当前的
                    // 播放操作不是用户点击的，因此会被阻止。
                    // 我们在这里先初始化，然后就可以通过程序控制播放器的播放和暂停，
                    // 从而绕过了浏览器的默认行为
                    that.play();
                    that.pause();
                    
                    // 检测用户使用的网络类型
                    if (that.firstPlay && $.maya.network.isCell()) {
                        $.maya.utils.confirm({ 
                            title: "流量提醒",
                            message: "您正在使用流量播放旅行音乐，可能会产生高额费用，是否继续播放？",
                            doneCallback: function() { 
                                that.firstPlay = false;
                                that.play();
                            }
                        });
                    } else { 
                        that.play();
                    }
                }
            });
            that.controlButton.on('doubleTap.musicplayer', function() {
                that.pause();
                that.nextSong();
            });

            that.bindEvents();
        },
        /**
         * [bindEvents description]
         * @return {[type]} [description]
         */
        bindEvents: function() {
            var that = this;
            // ++++音乐播放控件绑定事件
            // 歌曲播放完毕
            that.audioElement.addEventListener("ended", function() {
                console.log("ended invoke.");
                that.nextSong();
            }, false);
            // 音频开始播放
            that.audioElement.addEventListener("play", function() {
                console.log("play invoke.");
                that.playStatus();
            }, false);
            // 音频暂停播放
            that.audioElement.addEventListener("pause", function() {
                console.log("pause invoke.");
                that.pauseStatus();
                // 隐藏正在加载...
            }, false);
            // 可以开始播放视频/音频（audio/video）时触发
            that.audioElement.addEventListener("canplay", function() {
                console.log("canplay invoke");
                //that.playStatus();
                // 隐藏正在加载...
            }, false);
            // 浏览器开始寻找指定视频/音频（audio/video）触发。
            that.audioElement.addEventListener("loadstart", function() {
                console.log("loadstart invoke");
                //that.playStatus();
                // 显示正在加载...
            }, false);
            // 音频数据加载期间发生错误时触发
            that.audioElement.addEventListener("error", function() {
                var me = this; // audio control本身
                switch (me.error.code) {
                    case 1:
                        console.log("error：取回过程被用户中止");
                        //alert('取回过程被用户中止');
                        break;
                    case 2:
                        console.log("error：当下载时发生错误");
                        //alert('当下载时发生错误');
                        break;
                    case 3:
                        console.log("error：当解码时发生错误");
                        //alert('当解码时发生错误');
                        break;
                    case 4:
                        console.log("error：不支持音频/视频");
                        //alert('不支持音频/视频');
                        $.maya.utils.showNotice("<" + that.musics[that.currIndex].Name + ">无法播放");
                        break;
                    default:
                        console.log("error: 未知错误");
                        break;
                }
            }, false);
            // 浏览器读取音频数据中止时触发
            // 兼容处理，当浏览器刻意不获取媒体数据时
            that.audioElement.addEventListener("suspend", function() {
                console.log("suspend invoke");
                //that.playStatus();
                // 隐藏正在加载...
            }, false);
        },
        /**
         * 异步获取指定地点的音乐设置信息
         * @param  {Function} callback   [description]
         * @return {[type]}              [description]
         */
        getMusics: function(callback) {
            var that = this,
                opts = that.options;
            // ajax music data.
            var ajaxSettings = {
                url: opts.serviceUrl,
                dataType: "json",
                data: { did: opts.did }
            }

            if (that.currAjaxRequest) {
                that.currAjaxRequest.abort();
            };

            that.currAjaxRequest = $.ajax(ajaxSettings).done(function(musics) {
                that.musics = musics;
                callback(null, musics);
            }).fail(function(jqXHR, textStatus, errorThrown) {
                callback({
                    code: -1,
                    message: "请求旅行音乐数据异常"
                });
            }).always(function() {
                that.currAjaxRequest = null;
            });
        },
        /**
         * 循环播放下一首歌曲
         * @return {[type]} [description]
         */
        nextSong: function() {
            var that = this;
            that.currIndex++;

            if (that.currIndex < that.musics.length) {
                that.loadSong();
                that.play();
            } else {
                // 暂停播放，播放曲目
                that.reset();
            }
        },
        /**
         * 创建或者更新一个音频对象
         * @return {[type]} [description]
         */
        loadSong: function() {
            var that = this;

            console.log("loading song index: " + that.currIndex);

            that.audioElement.src = that.musics[that.currIndex].LinkTo;
            that.audioElement.load();
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

            // 必须设置为auto，否则第二首歌曲将不会自动播放（手机上）
            if (that.audioElement.preload == "none") {
                that.audioElement.preload = "auto";
            };

            that.audioElement.play();
            that.playStatus();
        },
        /**
         * 设置为播放的状态
         * @return {[type]} [description]
         */
        playStatus: function() {
            this.controlButton.addClass("z-play");
            this.isPlaying = true;
        },
        /**
         * 暂停播放
         * 如果播放的过程中，出现下载错误、格式不支持等问题，
         * @return {[type]} [description]
         */
        pause: function() {
            this.audioElement.pause();
            this.pauseStatus();
        },
        /**
         * 设置为暂停的状态
         * @return {[type]} [description]
         */
        pauseStatus: function() {
            this.controlButton.removeClass("z-play");
            this.isPlaying = false;
        },
        /**
         * 重置播放器
         * @return {[type]} [description]
         */
        reset: function() {
            var that = this;
            that.pause();

            // 阻止预加载，否则会导致死循环
            that.audioElement.preload = "none";
            that.currIndex = 0;
            that.loadSong();
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
})(jQuery);
