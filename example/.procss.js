module.exports = [
	{
		patterns : '**/blocks/**/*.css',
		config : {
			plugins : [ {
                plugin : 'node_modules/procss-sprite',
                config : [
                    {
                        image_paths : '**/*.png',
                        config : {
                            'default' : {
                                name : 'cars',
                                path : 'sprites/a/'
                            }
                        }
                    },
                    {
                        image_paths : '**/images/seats/*.png',
                        config : {
                            'default' : {
                                name : 'seats',
                                path : 'sprites/b/'
                            }
                        }
                    }
                ]
            } ]
		}
	}
];
