describe('Procss-sprite', function() {
    var ASSERT = require('chai').assert,
        PATH = require('path'),
        FS = require('fs'),
        PROCSS = require('procss'),
        ProcssSpriter = PATH.resolve('.');

    describe('with cache', function() {

        var basePath = PATH.resolve(__dirname, 'with-cache'),
            origin1FilePath = PATH.resolve(basePath, 'origin1.css'),
            origin2FilePath = PATH.resolve(basePath, 'origin2.css'),
            result1FilePath = PATH.resolve(basePath, 'result1.css'),
            result2FilePath = PATH.resolve(basePath, 'result2.css');

        before(function(cb) {
            require('child_process').exec([
                'rm -rf', result1FilePath, result2FilePath, PATH.resolve(basePath, 'sprites')
            ].join(' '), function(err) {
                cb(err);
            });
        });

        it('should use cached data', function(cb) {
            require('child_process').exec([
                'cp', origin1FilePath, result1FilePath
            ].join(' '), function(err) {
                err && cb(err);

                PROCSS.api({
                    input : result1FilePath,
                    output : '?',
                    plugins : [ ProcssSpriter ]
                }).then(function() {
                    ASSERT.equal(
                        FS.readFileSync(PATH.resolve(basePath, result1FilePath), 'utf8'),
                        FS.readFileSync(PATH.resolve(basePath, 'expect1.css'), 'utf-8'));

                    require('child_process').exec([
                        'cp', origin2FilePath, result2FilePath
                    ].join(' '), function() {
                        PROCSS.api({
                            input : result2FilePath,
                            output : '?',
                            plugins : [ ProcssSpriter ]
                        }).then(function() {
                            ASSERT.equal(
                                FS.readFileSync(PATH.resolve(basePath, result2FilePath), 'utf8'),
                                FS.readFileSync(PATH.resolve(basePath, 'expect2.css'), 'utf-8'));

                            cb();
                        }).fail(function(err) {
                            cb(err);
                        });
                    });

                }).fail(function(err) {
                    cb(err);
                });
            });
        });

    });

	describe('with-multiple-files', function() {
        var basePath = PATH.resolve(__dirname, 'with-multiple-files');
        var files = [ 'a', 'b', 'c' ];
        var input = [
            PATH.resolve(basePath, 'a.css'),
            PATH.resolve(basePath, 'b.css'),
            PATH.resolve(basePath, 'c.css')
        ];

        beforeEach(function(done) {
            require('child_process').exec('rm -rf ' + PATH.resolve(basePath, 'sprites'), function() {
                done();
            });
        });

        afterEach(function(done) {
            require('child_process').exec('rm ' + files.map(function(name) {
                return PATH.resolve(basePath, name + '.pro.css');
            }).join(' '), function() {
                done();
            });
        });

        it('should process all files and make sprites', function() {
            return PROCSS
                .api({
                    input : input
                })
                .then(function() {
                    files.forEach(function(name) {
                        ASSERT.equal(
                            FS.readFileSync(PATH.resolve(basePath, name + '.pro.css'), 'utf8'),
                            FS.readFileSync(PATH.resolve(basePath, name + '_expect.css'), 'utf-8'));
                    });
                });
        });
    });

	describe('without-config', function() {
        var basePath = PATH.resolve(__dirname, 'without-config');
        var outputFilePath = PATH.resolve(basePath, 'all.pro.css');

        beforeEach(function(done) {
            require('child_process').exec('rm -rf ' + PATH.resolve(basePath, 'sprites'), function() {
                done();
            });
        });

        afterEach(function(done) {
            require('child_process').exec('rm ' + outputFilePath, function() {
                done();
            });
        });

        it('should sprite images in css', function() {
            return PROCSS
                .api({
                    input : PATH.resolve(basePath, 'all.css'),
                    plugins : [ ProcssSpriter ]
                })
                .then(function() {
                    ASSERT.equal(
                        FS.readFileSync(outputFilePath, 'utf8'),
                        FS.readFileSync(PATH.resolve(basePath, 'expect.css'), 'utf-8'));
                });
        });
    });

    describe('with multiple backgrounds', function() {
        var basePath = PATH.resolve(__dirname, 'with-multiple-backgrounds');
        var expectFileContent = FS.readFileSync(PATH.resolve(basePath, 'expect.css'), 'utf8');
        var outputFilePath = PATH.resolve(basePath, 'all.pro.css');

        beforeEach(function(done) {
            require('child_process').exec('rm -rf ' + PATH.resolve(basePath, 'sprites'), function() {
                done();
            });
        });

        afterEach(function(done) {
            require('child_process').exec('rm -rf ' + outputFilePath, function() {
                done();
            });
        });

        it('should sprite multiple background images in css', function() {
            return PROCSS
                .api({
                    input : PATH.resolve(basePath, 'all.css'),
                    plugins : [ ProcssSpriter ]
                })
                .then(function() {
                    ASSERT.equal(
                        FS.readFileSync(outputFilePath, 'utf8'),
                        expectFileContent);
                });
        });
    });

    describe('with padding', function() {
        var basePath = PATH.resolve(__dirname, 'with-padding');
        var expectFileContent = FS.readFileSync(PATH.resolve(basePath, 'expect.css'), 'utf8');
        var outputFilePath = PATH.resolve(basePath, 'all.pro.css');

        beforeEach(function(done) {
            require('child_process').exec('rm -rf ' + PATH.resolve(basePath, 'sprites'), function() {
                done();
            });
        });

        afterEach(function(done) {
            require('child_process').exec('rm -rf ' + outputFilePath, function() {
                done();
            });
        });

        it('should set image padding from parsed padding argument', function() {

            return PROCSS
                .api({
                    input : PATH.resolve(basePath, 'all.css'),
                    plugins : [ ProcssSpriter ]
                })
                .then(function() {
                    ASSERT.equal(
                        FS.readFileSync(outputFilePath, 'utf8'),
                        expectFileContent);
                });
        });
    });

    describe('with background-position', function() {
        var basePath = PATH.resolve(__dirname, 'with-background-position'),
            outputFilePath = PATH.resolve(basePath, 'all.pro.css'),
            expectFileContent = FS.readFileSync(PATH.resolve(basePath, 'expect.css'), 'utf8');

        beforeEach(function(done) {
            require('child_process').exec('rm -rf ' + PATH.resolve(basePath, 'sprites'), function() {
                done();
            });
        });

        afterEach(function(done) {
            require('child_process').exec('rm ' + outputFilePath, function() {
                done();
            });
        });

        it('should use parsed background-position to calc final position', function() {
            return PROCSS
                .api({
                    input : PATH.resolve(basePath, 'all.css'),
                    plugins : [ ProcssSpriter ]
                })
                .then(function() {
                    ASSERT.equal(
                        FS.readFileSync(outputFilePath, 'utf8'),
                        expectFileContent);
                });
        });
    });

    describe('with config', function() {
        var basePath = PATH.resolve(__dirname, 'with-config'),
            outputFilePath = PATH.resolve(basePath, 'out.css');

        beforeEach(function(done) {
            require('child_process').exec('rm -rf ' + PATH.resolve(basePath, 'sprites'), function() {
                done();
            });
        });

        afterEach(function(done) {
            require('child_process').exec('rm ' + outputFilePath, function() {
                done();
            });
        });

        it('should use "default" config if spriteName is undefined', function() {
            return PROCSS
                .api({ input : PATH.resolve(basePath, 'without-name.css') })
                .then(function() {
                    ASSERT.equal(
                        FS.readFileSync(outputFilePath, 'utf8'),
                        FS.readFileSync(PATH.resolve(basePath, 'expect.css'), 'utf8'));
                });
        });

        it('should use "default" config with defined spriteName if sprite config is undefined', function() {
            return PROCSS
                .api({
                    input : PATH.resolve(basePath, 'with-names.css'),
                    output : 'out'
                })
                .then(function() {
                    ASSERT.equal(
                        FS.readFileSync(outputFilePath, 'utf8'),
                        FS.readFileSync(PATH.resolve(basePath, 'expect1.css'), 'utf8'));
                });
        });

        it('should use sprite config by name', function() {
            return PROCSS
                .api({
                    input : PATH.resolve(basePath, 'with-not-config-names.css'),
                    output : 'out'
                })
                .then(function() {
                    ASSERT.equal(
                        FS.readFileSync(outputFilePath, 'utf8'),
                        FS.readFileSync(PATH.resolve(basePath, 'expect2.css'), 'utf8'));
                });
        });

    });

    describe('with configs by patterns', function() {
        var basePath = PATH.resolve(__dirname, 'with-config-patterns');
        var expectFileContent = FS.readFileSync(PATH.resolve(basePath, 'expect.css'), 'utf8');
        var outputFilePath = PATH.resolve(basePath, 'out.css');

        beforeEach(function(done) {
            require('child_process').exec('rm -rf ' + PATH.resolve(basePath, 'sprites'), function() {
                done();
            });
        });

        afterEach(function(done) {
            require('child_process').exec('rm -rf ' + outputFilePath, function() {
                done();
            });
        });

        it('should get and extend sprite configs by matching configs patterns with processing image path', function() {

            return PROCSS
                .api({ input : PATH.resolve(basePath, 'all.css') })
                .then(function() {
                    ASSERT.equal(
                        FS.readFileSync(outputFilePath, 'utf8'),
                        expectFileContent);
                });
        });
    });

    describe('ifexists', function() {

        describe('create', function() {
            var basePath = PATH.resolve(__dirname, 'ifexists/create');
            var existFilePath = PATH.resolve(basePath, 'exists.pro.css');
            var outputFilePath = PATH.resolve(basePath, 'create.pro.css');
            var existFileContent = FS.readFileSync(PATH.resolve(basePath, 'exists_expect.css'), 'utf8');
            var expectFileContent = FS.readFileSync(PATH.resolve(basePath, 'create_expect.css'), 'utf8');

            beforeEach(function(done) {
                require('child_process').exec('rm -rf ' + PATH.resolve(basePath, 'sprites'), done);
            });

            afterEach(function(done) {
                require('child_process').exec('rm ' + outputFilePath + ' ' + existFilePath, function() {
                    done();
                });
            });

            it('should overwrite existent sprite', function() {
                return PROCSS
                    .api({
                        input : PATH.resolve(basePath, 'exists.css'),
                        plugins : [ ProcssSpriter ]
                    })
                    .then(function() {
                        ASSERT.equal(
                            FS.readFileSync(existFilePath, 'utf8'),
                            existFileContent);

                        return PROCSS
                            .api({
                                input : PATH.resolve(basePath, 'create.css'),
                                plugins : [ ProcssSpriter ]
                            })
                            .then(function() {
                                ASSERT.equal(
                                    FS.readFileSync(outputFilePath, 'utf8'),
                                    expectFileContent);
                            });
                    });
            });
        });

        describe('add', function() {
            var basePath = PATH.resolve(__dirname, 'ifexists/add');
            var existFilePath = PATH.resolve(basePath, 'exists.pro.css');
            var outputFilePath = PATH.resolve(basePath, 'add.pro.css');
            var existFileContent = FS.readFileSync(PATH.resolve(basePath, 'exists_expect.css'), 'utf8');
            var expectFileContent = FS.readFileSync(PATH.resolve(basePath, 'add_expect.css'), 'utf8');

            beforeEach(function(done) {
                require('child_process').exec('rm -rf ' + PATH.resolve(basePath, 'sprites'), done);
            });

            afterEach(function(done) {
                require('child_process').exec('rm ' + outputFilePath + ' ' + existFilePath, function() {
                    done();
                });
            });

            it('should use and extend existent sprite', function() {
                return PROCSS
                    .api({
                        input : PATH.resolve(basePath, 'exists.css'),
                        plugins : [ ProcssSpriter ]
                    })
                    .then(function() {
                        ASSERT.equal(
                            FS.readFileSync(existFilePath, 'utf8'),
                            existFileContent);

                        return PROCSS
                            .api({
                                input : PATH.resolve(basePath, 'add.css'),
                                plugins : [ {
                                    plugin : ProcssSpriter,
                                    config : { sprite : { ifexists : 'safeAdd' } }
                                } ]
                            })
                            .then(function() {
                                ASSERT.equal(
                                    FS.readFileSync(outputFilePath, 'utf8'),
                                    expectFileContent);
                            });
                    });

            });
        });

        describe('use', function() {
            var basePath = PATH.resolve(__dirname, 'ifexists/use');
            var existFilePath = PATH.resolve(basePath, 'exists.pro.css');
            var outputFilePath = PATH.resolve(basePath, 'use.pro.css');
            var existFileContent = FS.readFileSync(PATH.resolve(basePath, 'exists_expect.css'), 'utf8');
            var expectFileContent = FS.readFileSync(PATH.resolve(basePath, 'use_expect.css'), 'utf8');

            beforeEach(function(done) {
                require('child_process').exec('rm -rf ' + PATH.resolve(basePath, 'sprites'), done);
            });

            afterEach(function(done) {
                require('child_process').exec('rm ' + outputFilePath + ' ' + existFilePath, function() {
                    done();
                });
            });

            it('should use existent sprite and create a new one', function() {
                return PROCSS
                    .api({
                        input : PATH.resolve(basePath, 'exists.css'),
                        plugins : [ ProcssSpriter ]
                    })
                    .then(function() {
                        ASSERT.equal(
                            FS.readFileSync(existFilePath, 'utf8'),
                            existFileContent);

                        return PROCSS
                            .api({
                                input : PATH.resolve(basePath, 'use.css'),
                                plugins : [ {
                                    plugin : ProcssSpriter,
                                    config : { sprite : { ifexists : 'use' } }
                                } ]
                            })
                            .then(function() {
                                ASSERT.equal(
                                    FS.readFileSync(outputFilePath, 'utf8'),
                                    expectFileContent);
                            });
                        });
            });

        });

    });

});
