var VOW = require('vow'),
    PATH = require('path'),
    EXTEND = require('extend'),
    CRYPTO = require('crypto'),
    GLOBULE = require('globule'),
    SPRITER = require('spriter');

var SPEC_COMMENT = '/*~~*/';

require('colors');

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
                    patterns : '**',
                    config : pluginConfig
                } ];
        },

        process : function(procss) {
            var command = procss.command,
                spriting;

            if (command.name !== 'sprite') {
                return;
            }

            spriting = {
                file : procss.file,
                decl : procss.decl
            };

            if (command.params[0] && command.params[0].indexOf('sum:') === 0) {
                spriting.sprited = command.params[0].substr(4);
                command.params = command.params.slice(1);
            }

            spriting.command = command;
            spriting.name = command.params[0];
            spriting.padding = command.params[1] && command.params[1].split(' ');

            instance._spriting.push(spriting);
        },

        after : function(procss) {
            return instance
                .makeSprites()
                .then(function(images) {
                    var spritedImages = images;

                    if ( ! spritedImages || spritedImages.length === 0) {
                        return;
                    }

                    instance._spriting.forEach(function(spr) {
                        var rule = spr.decl.parent,
                            images = spr.images,
                            isAtLeastOneSprited,
                            hashSum,
                            cmt,
                            bg;

                        if ( ! images || images.length === 0) {
                            return;
                        }

                        isAtLeastOneSprited = false;
                        bg = images.reduce(function(bg, image) {
                            var spritedData = instance.getSprited(image);

                            if (spritedData) {
                                bg.urls.push('url(' + spritedData.url + ')');
                                bg.positions.push(spritedData.position);
                                bg.repeats.push(spritedData.repeat);
                                isAtLeastOneSprited || (isAtLeastOneSprited = true);
                            } else {
                                bg.urls.push('url(' + image.origUrl + ')');
                                bg.positions.push(image.position);
                                bg.repeats.push(image.repeat);
                            }

                            return bg;
                        }, {
                            urls : [],
                            positions : [],
                            repeats : []
                        });

                        if ( ! isAtLeastOneSprited || bg.urls.length === 0) {
                            return;
                        }

                        hashSum = CRYPTO.createHash('sha1');
                        hashSum.update(JSON.stringify(bg));
                        hashSum = hashSum.digest('hex');

                        cmt = [ 'sum:' + hashSum ];
                        spr.command.params[0] && cmt.push(spr.command.params[0]);
                        spr.command.params[1] && cmt.push(spr.command.params[1]);

                        spr.decl.value += ' ' + procss.pcss.comment({
                            text : 'procss.sprite(' + cmt.join(', ') + ')'
                        });

                        if (hashSum === spr.sprited ) {
                            return;
                        }

                        rule.eachDecl(function(decl) {
                            if ((decl._value && decl._value.raw || decl.value).indexOf(SPEC_COMMENT) !== -1) {
                                decl.removeSelf();
                            }
                        });

                        rule.append({
                            prop : 'background-image',
                            value : bg.urls.join(', ') + ' ' + SPEC_COMMENT
                        });
                        rule.append({
                            prop : 'background-position',
                            value : ProcssSprite
                                ._uniqueSequence(bg.positions.map(function(pos) {
                                    return [ pos.x, ' ', pos.y ].join('');
                                }))
                                .join(', ') + ' ' + SPEC_COMMENT
                        });
                        rule.append({
                            prop : 'background-repeat',
                            value : ProcssSprite
                                ._uniqueSequence(bg.repeats)
                                .join(', ') + ' ' + SPEC_COMMENT
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
            .map(function(spritePath) {
                var spriteData = spritesData[spritePath],
                    config = spriteData.config,
                    defer = VOW.defer();

                config.src = spriteData.images;

                SPRITER
                    .api(config)
                    .then(function() {
                        defer.resolve.apply(defer, arguments);
                    }, defer.reject);

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
    var spritedImages = this.images || [],
        imageId = image.id,
        properties;

    imageId && spritedImages.some(function(spritedImage) {
        var pos;

        if (spritedImage.id === imageId) {
            pos = {
                x : spritedImage.positionX + spritedImage.padding[3] + parseInt(image.position.x, 10),
                y : spritedImage.positionY + spritedImage.padding[0] + parseInt(image.position.y, 10)
            };
            pos.x && (pos.x = 0 - pos.x + 'px');
            pos.y && (pos.y = 0 - pos.y + 'px');

            properties = {
                url : PATH.relative(spritedImage.basePath, spritedImage.spriteUrl),
                position : pos,
                repeat : 'no-repeat'
            };

            return true;
        }

        return false;
    });

    return properties;
};

/**
 *
 * @returns {Object}
 * @private
 */
ProcssSprite.prototype._prepareSprites = function() {
    var _this = this;

    return _this._spriting.reduce(function(spritesData, spr) {
        var file = spr.file,
            output = file.config.output,
            defaultName = ! file.config.input || file.config.input === '-' ?
                'sprite' :
                PATH.basename(file.config.input, '.css'),
            defaultPath,
            basePath,
            resolve;

        if (output === '-') {
            basePath = PATH.relative('.', process.cwd());
            resolve = PATH.resolve.bind(PATH);
        } else {
            basePath = PATH.relative('.', PATH.dirname(output));
            resolve = PATH.resolve.bind(PATH, PATH.dirname(output));
        }

        defaultPath = PATH.resolve(basePath, 'sprites/');

        spr.images = _this
            ._parseImages(spr.decl)
            .reduce(function(images, image) {
                image.origUrl = image.url;
                image.url = PATH.relative('.', resolve(image.url));
                image.basePath = basePath;

                if (ProcssSprite._isImageSpritable(image)) {
                    var spriteConfig,
                        spriteData,
                        spritePath,
                        hash;

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

                    spritePath = PATH.resolve(spriteConfig.path, PATH.basename(spriteConfig.name, '.css'));
                    spriteData = spritesData[spritePath];

                    if (spriteData) {
                        spriteData.images.push(image);
                    } else {
                        spritesData[spritePath] = {
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
            if (GLOBULE.isMatch(cnfg.patterns, imagePath)) {
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
 * @param {Object} declaration
 * @returns {{url: String, repeat: String, position: String[]}[]} Parsed images
 */
ProcssSprite.prototype._parseImages = function(declaration) {
    var parser = this.procss.parser,
        parsedImages = [];

    if (declaration.prop === 'background') {
        var bgs = declaration.value.split(',');

        parsedImages = bgs.map(function(bg) {
            return {
                url : parser.parseBgUrl(bg),
                repeat : parser.parseBgRepeat(bg),
                position : parser.parseBgPosition(bg)
            };
        });
    } else if (declaration.prop === 'background-image') {
        var urls = declaration.value.split(','),
            repeats,
            positions,
            repeatsCount,
            positionsCount;

        declaration.parent.eachDecl(function(decl) {
            if ((decl._value && decl._value.raw || decl.value).indexOf('/*~~*/') === -1) {

                if (decl.prop === 'background-repeat') {
                    repeats = decl.value.split(',');
                }
                if (decl.prop === 'background-position') {
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
