var VOW = require('vow'),
    PATH = require('path'),
    EXTEND = require('extend'),
    CRYPTO = require('crypto'),
    GLOBULE = require('globule'),
    SPRITER = require('bonder');

var SPEC_COMMENT = '/*~*/';

/**
 * @constructor
 * @param {Object} procss
 */
var ProcssSprite = function(procss) {
    this.procss = procss;
    this.sprites = {};
    this._spriting = [];
};

ProcssSprite.api = (function() {
    var instance;

    return {

        before : function(procss) {
            instance = new ProcssSprite(procss);
        },

        beforeEach : function(procss, pluginConfig) {
            instance.config = Array.isArray(pluginConfig) ?
                pluginConfig :
                [ {
                    image_paths : '**/*',
                    config : pluginConfig
                } ];
        },

        process : function(procss) {
            var command = procss.command,
                isProcessed = command.name === 'sprited';

            if ( ! isProcessed && command.name !== 'sprite') {
                return;
            }

            instance._spriting.push({
                file : procss.file,
                decl : procss.decl,
                command : command,
                name : command.params[0],
                padding : command.params[1] && command.params[1].split(' '),
                relativeSize : [ 'width', 'height', 'both' ].indexOf(command.params[3]) !== -1 ?
                    command.params[3] :
                    null
            });
        },

        after : function(procss) {
            return instance
                .makeSprites()
                .then(function(images) {
                    var spritedImages = images;

                    spritedImages && spritedImages.length !== 0 &&
                        instance._spriting.forEach(function(spr) {
                            var rule = spr.decl.parent,
                                images = spr.images,
                                params = spr.command.params,
                                isAtLeastOneSprited,
                                isFileChanged,
                                decls,
                                bg;

                            if ( ! images || images.length === 0) {
                                return;
                            }

                            bg = images.reduce(function(bg, image) {
                                var spritedData = instance.getSprited(image);

                                if (spritedData) {
                                    image.sprited = spritedData;
                                    bg.urls.push('url(' + spritedData.url + ')');
                                    bg.positions.push(spritedData.position);
                                    bg.repeats.push(spritedData.repeat);
                                    bg.size.push(spritedData.size || null);
                                    isAtLeastOneSprited || (isAtLeastOneSprited = true);
                                } else {
                                    bg.urls.push('url(' + image.origUrl + ')');
                                    bg.positions.push(image.position);
                                    bg.repeats.push(image.repeat);
                                    bg.size.push(image.size || null);
                                }

                                return bg;
                            }, {
                                urls : [],
                                positions : [],
                                repeats : [],
                                size : []
                            });

                            if ( ! isAtLeastOneSprited || bg.urls.length === 0) {
                                return;
                            }

                            decls = {
                                'background-image' : {
                                    value : bg.urls.join(', ')
                                },
                                'background-position' : {
                                    value : ProcssSprite
                                        ._uniqueSequence(bg.positions.map(function(pos) {
                                            return [ pos.x, pos.y ].join(' ');
                                        })).join(', ')
                                },
                                'background-repeat' : {
                                    value : ProcssSprite._uniqueSequence(bg.repeats).join(', ')
                                }
                            };

                            if (bg.size.some(function(s) { return s; })) {
                                decls['background-size'] = {
                                    value : ProcssSprite._uniqueSequence(bg.size.map(function(size) {
                                        return size ? size.join(' ') : 'auto auto';
                                    })).join(', ')
                                };
                            }

                            rule.eachDecl(function(decl) {
                                var hash = decls[decl.prop];

                                if (hash) {
                                    if (hash.last) {
                                        hash.last.removeSelf();
                                        hash.last = null;
                                    }
                                    if ((decl._value && decl._value.raw || decl.value).indexOf(SPEC_COMMENT) !== -1) {
                                        hash.last = decl;
                                    }
                                }
                            });

                            isFileChanged = spr.file.isChanged;

                            Object.keys(decls).forEach(function(prop) {
                                var hash = decls[prop];

                                if (hash.last) {
                                    if (hash.last.value !== hash.value) {
                                        hash.last.value = hash.value + ' ' + SPEC_COMMENT;
                                        isFileChanged = true;
                                    }
                                } else {
                                    rule.append({ prop : prop, value : hash.value + ' ' + SPEC_COMMENT });
                                    isFileChanged || (isFileChanged = true);
                                }
                            });

                            spr.file.isChanged = isFileChanged;
                            spr.decl.value += ' ' + procss.pcss.comment({
                                text : 'procss.sprited(' + (
                                    params[1] && params[0] ? [ params[0], params[1] ] :
                                        params[1] ? [ '', params[1] ] :
                                            params[0] ? [ params[0] ] :
                                            []
                                    ).join() +
                                ')'
                            });
                        });
                });
        }

    };
})();

/**
 * @returns {VOW.Deferred} Array of sprited images
 */
ProcssSprite.prototype.makeSprites = function() {
    var _this = this,
        spritesData = _this._prepareSprites();

    return VOW
        .all(Object
            .keys(spritesData)
            .map(function(spriteId) {
                var spriteData = spritesData[spriteId],
                    config = spriteData.config,
                    defer = VOW.defer();

                config.src = spriteData.images;

                SPRITER
                    .api(config)
                    // to avoid `Promise.valueOf` error
                    .then(function() {
                        defer.resolve.apply(defer, arguments);
                    })
                    .fail(function(e) {
                        defer.reject(e);
                    });

                return defer.promise();
            }))
        .spread(function() {
            var spritedImages = Array.prototype.slice.apply(arguments),
                images = [],
                sprites = [];

            spritedImages.forEach(function(sprited) {
                images = images.concat(sprited[0]);
                sprites = sprites.concat(sprited[1]);
            });

            _this.images = images;

            return images;
        });
};

/**
 * @param {Object} image
 * @returns {?Object} Sprited data by image id
 */
ProcssSprite.prototype.getSprited = function(image) {
    if ( ! image.sprite) {
        return null;
    }

    var relative = image.relativeSize,
        spriteHeight,
        spriteWidth,
        pos,
        unit,
        size;

    if (relative) {
        spriteWidth = image.sprite.swidth;
        spriteHeight = image.sprite.sheight;

        pos = {
            x : image.positionX && (100 * image.positionX / (spriteWidth - image.swidth)).toFixed(3),
            y : image.positionY && (100 * image.positionY / (spriteHeight - image.sheight)).toFixed(3)
        };
        size = [
            relative === 'height' ? 'auto' : parseFloat((100 * spriteWidth / image.swidth).toFixed(3)) + '%',
            relative === 'width' ? 'auto' : parseFloat((100 * spriteHeight / image.sheight).toFixed(3)) + '%'
        ];
        unit = '%';
    } else {
        pos = {
            x : 0 - image.sx + parseInt(image.position.x, 10),
            y : 0 - image.sy + parseInt(image.position.y, 10)
        };
        unit = 'px';
    }

    pos.x && (pos.x = parseFloat(pos.x) + unit);
    pos.y && (pos.y = parseFloat(pos.y) + unit);

    return {
        url : PATH.relative(image.basePath, image.spriteUrl),
        position : pos,
        repeat : 'no-repeat',
        size : size
    };
};

/**
 * @private
 * @returns {Object}
 */
ProcssSprite.prototype._prepareSprites = function() {
    var _this = this,
        defBasePath = PATH.relative('.', process.cwd()),
        defResolve = PATH.resolve.bind(PATH),
        defDefaultPath = PATH.resolve(defBasePath, 'sprites/');

    return _this._spriting.reduce(function(spritesData, spr) {
        var file = spr.file,
            output = file.config.output,
            defaultName = file.config.input && file.config.input !== '-' ?
                PATH.basename(file.config.input, '.css') :
                'sprite',
            defaultPath,
            basePath,
            resolve;

        if (output === '-') {
            basePath = defBasePath;
            resolve = defResolve;
            defaultPath = defDefaultPath;
        } else {
            basePath = PATH.relative('.', PATH.dirname(output));
            resolve = PATH.resolve.bind(PATH, PATH.dirname(output));
            defaultPath = PATH.resolve(basePath, 'sprites/');
        }

        spr.images = _this
            ._parseImages(spr)
            .reduce(function(images, image) {
                var spriteConfig,
                    spriteData,
                    spriteId,
                    hash;

                image.origUrl = image.url;
                image.url = PATH.relative('.', resolve(image.url));
                image.basePath = basePath;

                if (ProcssSprite._isImageSpritable(image)) {
                    image.spriteName = spr.name;
                    image.padding = spr.padding;

                    if ( ! image.id) {
                        hash = CRYPTO.createHash('sha1');
                        hash.update(JSON.stringify(image));
                        image.id = hash.digest('hex');
                    }

                    spriteConfig = _this._getSpriteConfig(file, image);

                    spriteConfig.path = PATH.relative('.',
                        spriteConfig.path ?
                            PATH.resolve(spriteConfig.path) :
                            defaultPath);

                    spriteConfig.name = spriteConfig.name ?
                        spriteConfig.name.replace('?', defaultName) :
                        'common';

                    image.relativeSize = spr.relativeSize || spriteConfig.relativeSize;
                    if (PATH.extname(image.url) === '.svg') {
                        if (typeof image.relativeSize === 'undefined') {
                            image.relativeSize = 'both';
                        }
                        spriteConfig.ext = 'svg';
                    }

                    spriteId = CRYPTO.createHash('sha1');
                    spriteId.update(JSON.stringify(spriteConfig));
                    spriteId = spriteId.digest('hex');

                    spriteData = spritesData[spriteId];

                    if (spriteData) {
                        spriteData.images.push(image);
                    } else {
                        spritesData[spriteId] = {
                            images : [ image ],
                            config : spriteConfig
                        };
                    }
                }

                images.push(image);

                return images;
            }, []);

        return spritesData;
    }, {});
};

/**
 * @private
 * @param {Object} file
 * @param {Object} image
 * @returns {Object} Sprite config
 */
ProcssSprite.prototype._getSpriteConfig = function(file, image) {
    var defaultConfig,
        imagePath = image.url,
        spriteName = image.spriteName,
        config = [].concat(this.config).reduce(function(config, cnfg) {
            if (GLOBULE.isMatch(cnfg.image_paths, imagePath)) {
                EXTEND(true, config, cnfg.config);
            }

            return config;
        }, {}),
        res;

    defaultConfig = config.hasOwnProperty('default') ?
        config['default'] :
    {};

    if (spriteName) {
        res = config[spriteName];

        if (res) {
            res.name || (res.name = spriteName);
            config = EXTEND(true, {}, defaultConfig, config[spriteName]);
        } else {
            config = defaultConfig;
            config.name = spriteName;
        }
    } else {
        config = defaultConfig;
    }

    return config;
};

/**
 * @private
 * @param {Object} spriting
 * @returns {{url: String, repeat: String, position: String[]}[]} Parsed images
 */
ProcssSprite.prototype._parseImages = function(spriting) {
    var parser = this.procss.parser,
        declaration = spriting.decl,
        parsedImages = [];

    if (declaration.prop === 'background') {
        parsedImages = declaration.value
            .split(',')
            .reduce(function(parsedImages, bg) {
                parsedImages.push({
                    url : parser.parseBgUrl(bg),
                    repeat : parser.parseBgRepeat(bg),
                    position : parser.parseBgPosition(bg)
                });

                return parsedImages;
            }, []);
    } else if (declaration.prop === 'background-image') {
        var urls = declaration.value.split(','),
            repeats,
            positions,
            repeatsCount,
            positionsCount;

        declaration.parent.eachDecl(function(decl) {
            if ((decl._value && decl._value.raw || decl.value).indexOf(SPEC_COMMENT) === -1) {
                if (decl.prop === 'background-repeat') {
                    repeats = decl.value.split(',');
                } else if (decl.prop === 'background-position') {
                    positions = decl.value.split(',');
                }
            }
        });

        repeatsCount = repeats ? repeats.length : 0;
        positionsCount = positions ? positions.length : 0;

        parsedImages = urls.map(function(url, index) {
            var repeat = repeatsCount > 0 && repeats[index % repeatsCount] || '',
                position = positionsCount > 0 && positions[index % positionsCount] || '';

            return {
                url : parser.parseBgUrl(url),
                repeat : parser.parseBgRepeat(repeat),
                position : parser.parseBgPosition(position)
            };
        });
    }

    return parsedImages;
};

/**
 * @static
 * @private
 * @param {SpriteImage} img Image data to check
 * @returns {Boolean} Is it possible to sprite the image
 */
ProcssSprite._isImageSpritable = function(img) {
    var isImageSpritable,
        path = img.url,
        position = img.position,
        repeat = img.repeat || 'no-repeat';

    isImageSpritable = path &&
        path.indexOf('data') !== 0 &&
        repeat === 'no-repeat' &&
        position &&
        String(position.x).indexOf('px') !== -1 &&
        String(position.y).indexOf('px') !== -1;

    return isImageSpritable;
};

/**
 * @static
 * @private
 * @param {(String|Number)[]} items
 * @returns {(String|Number)[]} Unique sequence of array items
 */
ProcssSprite._uniqueSequence = function(items) {
    var str = items.join(', '),
        unique = items;

    items.length > 1 && items.some(function(elem, i) {
        var prevs = items.slice(0, i + 1),
            re = prevs.length > 1 ? prevs.join('(?:,\\s)?') : '(' + prevs[0] + '(?:,?\\s?))+';

        if (new RegExp('^' + re + '$').test(str)) {
            unique = prevs;

            return true;
        }
    });

    return unique;
};

module.exports = ProcssSprite.api;
