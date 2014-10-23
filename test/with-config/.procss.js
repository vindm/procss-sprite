module.exports = [ {
    file_paths : '**/*.css',
    config : {
        output : 'out',
        plugins : [ {
            plugin : '../..',
            config : {
                default : {
                    name : 'test_sprite',
                    path : require('path').resolve('test/with-config', 'sprites/test/'),
                    layout : 'vertical'
                },
                test : {
                    name : 'test_sprite'
                }
            }
        } ]
    }
} ];
