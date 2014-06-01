module.exports = [
	{
		patterns : '**',
		config : {
			output : 'out',
			plugins : [
				{
					plugin : '../..',
					config : [
						{
							patterns : '**/with-config-patterns/**/*.png',
							config : {
								default : {
									name : 'all',
									layout : 'horizontal'
								}
							}
						},
						{
							patterns : '**/with-config-patterns/winged/*.png',
							config : {
								default : {
									name : 'winged'
								}
							}
						}
					]
				}
			]
		}
	}
]
