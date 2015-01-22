/* notice plugin from af.popup plugin */
(function ($) {
    "use strict";
    $.fn.notice = function (opts) {
        return new notice(this[0], opts);
    };
    
    var queue = [];

    var notice = (function () {
        var notice = function (containerEl, opts) {
            if (typeof containerEl === "string" || containerEl instanceof String) {
                this.container = document.getElementById(containerEl);
            } else {
                this.container = containerEl;
            }
            if (!this.container) {
                window.alert("Error finding container for notice " + containerEl);
                return;
            }

            try {
                if (typeof (opts) === "string" || typeof (opts) === "number") {
                    opts = {
                        message: opts,
                        cancelOnly: "true",
                        cancelText: "OK"
                    };
                }
                this.id = opts.id = opts.id || $.uuid(); //opts is passed by reference
                this.addCssClass = opts.addCssClass ? opts.addCssClass : "";
                this.title = opts.suppressTitle ? "" : (opts.title || "Alert");
                this.message = opts.message || "";
                this.cancelText = opts.cancelText || "Cancel";
                this.cancelCallback = opts.cancelCallback || function () {};
                this.cancelClass = opts.cancelClass || "button";
                this.doneText = opts.doneText || "Done";
                this.doneCallback = opts.doneCallback || function () {
                    // no action by default
                };
                this.doneClass = opts.doneClass || "button";
                this.cancelOnly = opts.cancelOnly || false;
                this.onShow = opts.onShow || function () {};
                this.autoCloseDone = opts.autoCloseDone !== undefined ? opts.autoCloseDone : true;

                queue.push(this);
                if (queue.length === 1)
                    this.show();
            } catch (e) {
                console.log("error adding notice " + e);
            }

        };

        notice.prototype = {
            id: null,
            addCssClass: null,
            title: null,
            message: null,
            cancelText: null,
            cancelCallback: null,
            cancelClass: null,
            doneText: null,
            doneCallback: null,
            doneClass: null,
            cancelOnly: false,
            onShow: null,
            autoCloseDone: true,
            supressTitle: false,
            show: function () {
                var self = this;
                var markup = "<div id='" + this.id + "' class='afNotice hidden "+ this.addCssClass + "'>"+
                            /*"<header>" + this.title + "</header>"+*/
                            "<div>" + this.message + "</div>"+
                            /*"<footer>"+
                                 "<a href='javascript:;' class='" + this.cancelClass + "' id='cancel'>" + this.cancelText + "</a>"+
                                 "<a href='javascript:;' class='" + this.doneClass + "' id='action'>" + this.doneText + "</a>"+
                                 "<div style='clear:both'></div>"+
                            "</footer>"+*/
                            "</div>";

                $(this.container).append(markup);
                var $el = $.query("#" + this.id);
                
                self.positionNotice();

                $el.bind("orientationchange", function () {
                    self.positionNotice();
                });
                //force header/footer showing to fix CSS style bugs
                //$el.find("header").show();
                //$el.find("footer").show();
                setTimeout(function(){
                    $el.removeClass("hidden");
                    self.onShow(self);
                }, 50);
            },

            hide: function () {
                var self = this;
                $.query("#" + self.id).addClass("hidden");
                //$.unblockUI();
                if(!$.os.ie&&!$.os.android){
                    setTimeout(function () {
                        self.remove();
                    }, 250);
                }
                else
                    self.remove();
            },

            remove: function () {
                var self = this;
                var $el = $.query("#" + self.id);
                $el.unbind("close");
                $el.find("BUTTON#action").unbind("click");
                $el.find("BUTTON#cancel").unbind("click");
                $el.unbind("orientationchange").remove();
                queue.splice(0, 1);
                if (queue.length > 0)
                    queue[0].show();
            },

            positionNotice: function () {
                var notice = $.query("#" + this.id);

                //notice.css("top", ((window.innerHeight / 2) + window.pageYOffset) - (notice[0].clientHeight / 2) + "px");
                notice.css("top", ((window.innerHeight * 3 / 4) + window.pageYOffset) + "px");
                notice.css("left", (window.innerWidth / 2) - (notice[0].clientWidth / 2) + "px");
            }
        };

        return notice;
    })();
})(af);
