'use strict';

var commands;

commands = {
    cacheObject: function(id, html, updateTime) {
        caches.open('app').then(function(cache) {
            return cache.put(id, new Response(JSON.stringify({
                id: id,
                html: html,
                updateTime: updateTime
            })))
        });
    },

    getCachedPart: function(id) {
        return caches.open('app').then(function(cache) {
            return cache.match(id).then(function(response) {
                return response.text().then(JSON.parse);
            });
        })
    },

    getCachedParts: function() {
        return caches.open('app').then(function(cache) {
            return cache.keys().then(function(keys) {
                return Promise.all(keys.map(function(key) {
                    return cache.match(key).then(function(response) {
                        return response.text().then(JSON.parse);
                    });
                }));
            })
        });
    },

    clear: function() {
        caches.delete('app');
    }
};

self.addEventListener('fetch', function(ev) {
    if (ev.request.mode !== 'navigate') {
        return fetch(ev.request)
    }

    ev.respondWith(fetch(ev.request).then(function(response) {
        var respCopy;

        return commands.getCachedParts().then(function(cacheArr) {
            if ( !! cacheArr.length) {
                respCopy = response.clone();

                return respCopy.text().then(function(html) {
                    var responseOptions;

                    cacheArr.forEach(function(cachePart, index, arr) {
                        var replaceBegin;
                        var replaceEnd;
                        var startInd;
                        var endInd;

                        replaceBegin = new RegExp('<!--\\s*sw-template-cache:' + cachePart.id + '\\s*-->');
                        replaceEnd = new RegExp('<!--\\s*/sw-template-cache:' + cachePart.id + '\\s*-->');
                        startInd = html.match(replaceBegin);
                        endInd = html.match(replaceEnd);

                        if (startInd && endInd) {
                            html = html.substr(0, startInd.index + startInd[0].length) + '\n' + cachePart.html + '\n' + html.substr(endInd.index);
                        }
                    });

                    responseOptions = {
                        status: 200,
                        headers: {
                            'Content-Type': 'text/html charset=UTF-8'
                        }
                    }

                    return new Response(html, responseOptions)
                });
            } else {
                return response;
            }
        });

    }));
});

self.addEventListener('message', function(ev) {
    if (typeof commands[ev.data.command] === 'function') {
        commands[ev.data.command].apply(null, ev.data.params);
    }
});
