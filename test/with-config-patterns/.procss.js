module.exports = [ {
    patterns : '**',
    config : {
        output : 'out',
        plugins : [ {
            plugin : '../..',
            config : [
                {
                    image_paths : '**/with-config-patterns/**/*.png',
                    config : {
                        'default' : {
                            name : 'all',
                            layout : 'horizontal'
                        }
                    }
                },
                {
                    image_paths : '**/with-config-patterns/winged/*.png',
                    config : {
                        'default' : {
                            name : 'winged'
                        }
                    }
                }
            ]
        } ]
    }
} ];
