/*globals videojs, PREF_FORMATS, FORMATS, OPTIONS, createNode, asyncGet, logify*/
(function() {
    "use strict";

    function main() {
        getConfig()
            .then(getVideoInfo);
    }

    function injectPlayer(conf) {
        logify("injectPlayer", conf);
        try {
            var player_container, player;
            //                    if (player_container )
            //                        player_container.innerHTML = "";
            if (conf.isEmbed) {
                player_container = document.body;
                player_container.innerHTML = "";
            } else if (conf.isWatch) {
                player_container = document.getElementById("video");
                player_container.children[1].remove();
            } else {
                player_container = document.getElementById("clip_" + conf.id);
                player_container.innerHTML = "";
            }
            if (!player_container)
                return;
            var player_opt = {
                className: conf.className,
                controls: true,
                volume: OPTIONS.volume / 100
            };
            player = createNode("video", player_opt);
            player.appendChild(createNode("source", {
                src: conf.url
                    //                        type: conf.type
            }));
            player_container.appendChild(player);
        } catch (e) {
            console.error("Exception on changePlayer()", e.lineNumber, e.columnNumber, e.message, e.stack);
        }
    }

    function getConfig() {
        return new Promise(function(resolve, reject) {
            var isWatch = /https?:\/\/vimeo.com\/[\d]+/.test(location.href);
            var isEmbed = /https?:\/\/player.vimeo.com\/video/.test(location.href);
            var isChannel = /https?:\/\/vimeo.com\/channels\/\w+/.test(location.href);
            if (!isWatch && !isChannel && !isEmbed)
                reject();
            var player_id, player_class;
            if (isWatch) {
                player_id = location.pathname.match(/^\/([\d]+)/)[1];
                player_class = "player";
            } else if (isEmbed) {
                player_id = location.pathname.match(/video\/([\d]+)/)[1];
                player_class = "fallback";
            } else if (isChannel) {
                player_class = "player";
            }
            if (!player_id && !isChannel)
                reject();
            resolve({
                isWatch: isWatch,
                isEmbed: isEmbed,
                isChannel: isChannel,
                id: player_id,
                className: player_class
            });
        });
    }

    function getVideoInfo(conf) {
        function processData(conf) {
            return function(data) {
                data = JSON.parse(data);
                conf.poster = data.video.thumbs.base + ".jpg";
                conf.url = data.request.files.h264.sd.url;
                return Promise.resolve(conf);
            };
        }
        var INFO_URL = "https://player.vimeo.com/video/";
        if (conf.isChannel) {
            return Array.map(document.getElementsByClassName("player_container"),
                function(el) {
                    var _conf = {};
                    for (var va in conf)
                        _conf[va] = conf[va];
                    _conf.id = el.id.replace("clip_", "");
                    return asyncGet(INFO_URL + _conf.id + "/config").then(processData(_conf)).then(injectPlayer);
                });
        } else {
            return asyncGet(INFO_URL + conf.id + "/config").then(processData(conf)).then(injectPlayer);
        }
    }
    try {
        if (document.readyState !== "loading")
            main();
        else
            document.addEventListener("DOMContentLoaded", main);
    } catch (e) {
        console.error("Exception on main()", e.lineNumber, e.columnNumber, e.message, e.stack);
    }
}());