module.exports = [
	{
		patterns : '**',
		config : {
			plugins : [
				{
					plugin : '../..',
					config : {
						default : {
							name : 'multifile_sprite'
						}
					}
				}
			]
		}
	}
];
